/**
 * CleanVault - PDF Tools Library
 * 
 * This file contains all PDF manipulation functions using pdf-lib.
 * These functions handle the core PDF operations:
 * - mergePDFs: Combine multiple PDFs into one
 * - splitPDF: Split a PDF by page ranges
 * - extractPages: Extract specific pages from a PDF
 * - rotatePDF: Rotate pages in a PDF
 * 
 * All operations happen locally in the browser - no files are uploaded.
 */

// Wait for PDFLib to be available
function ensurePDFLib() {
    if (typeof PDFLib === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page.');
    }
    return PDFLib;
}

/**
 * Mark an error as one the user caused and can act on, so tool modules can
 * surface the real reason instead of a generic failure message.
 * @param {string} message
 * @returns {Error}
 */
function userFacingError(message) {
    const err = new Error(message);
    err.isUserFacing = true;
    return err;
}

/**
 * Validate a 1-based page number and convert it to a 0-based index.
 *
 * Accepts real integers and strings that are exactly an integer (e.g. "2"),
 * so existing callers keep working. Rejects NaN, +/-Infinity, fractional
 * values and partially-numeric text - values that parseInt() would silently
 * reinterpret (e.g. "2abc" -> 2, 3.9 -> 3) or let through as NaN.
 *
 * @param {number|string} value - 1-based page number
 * @param {number} totalPages
 * @returns {number} zero-based page index
 */
function toPageIndex(value, totalPages) {
    let num;

    if (typeof value === 'number') {
        num = value;
    } else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        num = parseInt(value.trim(), 10);
    } else {
        throw userFacingError('Invalid page number: ' + String(value));
    }

    if (!Number.isInteger(num)) {
        throw userFacingError('Invalid page number: ' + String(value));
    }

    const index = num - 1;
    if (index < 0 || index >= totalPages) {
        throw userFacingError('Page ' + num + ' is out of bounds. PDF has ' + totalPages + ' pages.');
    }
    return index;
}

/**
 * Parse a single split range such as "3" or "1-5" into a [start, end] pair of
 * 1-based page numbers. Strict by design: only digits, optionally joined by a
 * single hyphen, are accepted, so "3.9", "1abc" and "1-2-3" are rejected
 * rather than silently reinterpreted.
 *
 * @param {string} range
 * @returns {Array<number>} [startPage, endPage] (1-based, start <= end)
 */
function parsePageRange(range) {
    const text = String(range).trim();

    if (/^\d+$/.test(text)) {
        const page = parseInt(text, 10);
        return [page, page];
    }

    const match = /^(\d+)\s*-\s*(\d+)$/.exec(text);
    if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }

    throw userFacingError('Invalid page range: ' + text);
}

/**
 * Strip identifying document metadata from an already-loaded PDFDocument.
 *
 * Clears the standard Info dictionary text fields, deletes the CreationDate and
 * ModDate keys outright (rather than replacing them with a neutral value, which
 * would still be a date), and removes the XMP metadata object entirely.
 *
 * pdf-lib rewrites /Producer and /ModDate during PDFDocument.load(), so dates
 * are removed after loading. Note that deleting only the Catalog's /Metadata
 * key is not enough: pdf-lib serialises every registered object, so the XMP
 * packet itself would survive as an orphan and stay recoverable.
 *
 * Two object-graph traps this deliberately avoids:
 *   - PDFContext.indirectObjects is keyed by PDFRef *identity*, so a
 *     reconstructed PDFRef.of("7 0 R") never matches and silently deletes
 *     nothing. The real ref instances come from enumerateIndirectObjects().
 *   - The Catalog's /Metadata entry is an entry *in the Catalog* pointing at
 *     the XMP object. Deleting the Catalog's own ref would corrupt the
 *     document, so the target ref is resolved and deleted instead.
 *
 * Only the Catalog's /Metadata key and /Type /Metadata objects are removed;
 * this is not a general garbage collector and touches nothing else.
 *
 * @param {Object} pdf - a loaded PDFLib.PDFDocument
 * @returns {void}
 */
function stripDocumentMetadata(pdf) {
    const PDFLib = ensurePDFLib();

    // Standard Info dictionary text fields.
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setCreator('');
    pdf.setProducer('');

    // Dates: delete the keys rather than writing a substitute value.
    const info = pdf.context.lookup(pdf.context.trailerInfo.Info);
    if (info && typeof info.delete === 'function') {
        info.delete(PDFLib.PDFName.of('CreationDate'));
        info.delete(PDFLib.PDFName.of('ModDate'));
    }

    // Map object numbers to the real PDFRef instances held by the context.
    const realRefs = new Map();
    for (const pair of pdf.context.enumerateIndirectObjects()) {
        realRefs.set(pair[0].objectNumber + ' ' + pair[0].generationNumber, pair[0]);
    }

    // Collect the XMP objects to delete: whatever the Catalog points at, plus
    // any /Type /Metadata object (covers orphans and object-stream members).
    const targets = new Set();
    const isRef = (value) => value && typeof value === 'object' &&
        value.objectNumber !== undefined && value.generationNumber !== undefined;
    const realRefFor = (value) => realRefs.get(value.objectNumber + ' ' + value.generationNumber);

    const catalogMetadata = pdf.catalog.get(PDFLib.PDFName.of('Metadata'));
    if (isRef(catalogMetadata)) {
        const target = realRefFor(catalogMetadata);
        if (target) targets.add(target);
    }

    for (const pair of pdf.context.enumerateIndirectObjects()) {
        const object = pair[1];
        let type = null;
        try {
            type = object && object.dict && typeof object.dict.get === 'function'
                ? object.dict.get(PDFLib.PDFName.of('Type'))
                : null;
        } catch (error) {
            type = null;
        }
        if (type && type.toString() === '/Metadata') targets.add(pair[0]);
    }

    // Remove the Catalog reference first, then the objects themselves.
    pdf.catalog.delete(PDFLib.PDFName.of('Metadata'));
    for (const ref of targets) {
        pdf.context.delete(ref);
    }
}

/**
 * Merge multiple PDF files into a single PDF
 * @param {Array<File>} pdfFiles - Array of PDF File objects
 * @returns {Promise<Uint8Array>} - Merged PDF as Uint8Array
 */
async function mergePDFs(pdfFiles) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Create a new PDF document to merge into
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Process each PDF file
        for (const file of pdfFiles) {
            // Read the file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Load the PDF
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Copy all pages from this PDF to the merged PDF
            const pageIndices = pdf.getPageIndices();
            const pages = await mergedPdf.copyPages(pdf, pageIndices);
            
            // Add each copied page to the merged PDF
            pages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }
        
        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        
        return mergedPdfBytes;
        
    } catch (error) {
        console.error('Error merging PDFs:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to merge PDFs. Please ensure all files are valid PDFs.');
    }
}

/**
 * Delete indirect objects that are no longer reachable from the document's
 * trailer roots, treating the given page refs as permanently excluded.
 *
 * pdf-lib's removePage() only unlinks a leaf from the page tree: the page
 * object itself stays in the context and is serialised on save(), so an
 * excluded page's content stream, images and annotations would otherwise
 * survive inside the output file. That is unacceptable for a splitter, where
 * every output must contain only its own pages - a user splitting off a
 * confidential section must not ship the confidential bytes along with it.
 *
 * A mark-and-sweep from the trailer (Root, Info, Encrypt, ID) keeps every
 * object a viewer can still reach - AcroForm fields, outlines, named
 * destinations, embedded files, page labels, XMP metadata, document actions,
 * page resources - and drops the unlinked pages plus anything referenced only
 * by them. Shared resources (a font used by a surviving page, for example)
 * stay because a kept page still reaches them.
 *
 * Excluded page refs are never marked, so outlines, named destinations or
 * links that point at an excluded page end up with a dangling (but harmless)
 * destination reference instead of dragging the whole removed page graph back
 * into the output. Dangling destinations are legal in PDF; Remove Pages and
 * Reorder already leave bookmarks pointing at pages that are no longer in the
 * tree, so viewers handle this class of reference the same way.
 *
 * Note on pdf-lib internals: PDFDict.entries() yields JS Map-style
 * [key, value] pairs, so this traversal walks values() - reading .value off
 * an entries() pair is always undefined and would silently mark nothing,
 * sweeping the document down to an empty shell.
 *
 * @param {Object} pdf - a loaded PDFLib.PDFDocument
 * @param {Array<Object>} excludedPageRefs - PDFRefs of pages that must not survive
 * @returns {void}
 */
function pruneUnreachableObjects(pdf, excludedPageRefs) {
    const context = pdf.context;

    const excluded = new Set();
    for (const ref of excludedPageRefs) {
        excluded.add(ref.objectNumber + ' ' + ref.generationNumber);
    }

    const marked = new Set();
    const pending = [];

    const markRef = (ref) => {
        const key = ref.objectNumber + ' ' + ref.generationNumber;
        if (excluded.has(key) || marked.has(key)) return;
        marked.add(key);
        pending.push(ref);
    };

    const markValue = (value) => {
        // A PDFRef edge. Duck-typed the same way stripDocumentMetadata()
        // identifies refs: PDFRef exposes numeric objectNumber/generationNumber.
        if (value && typeof value === 'object' &&
            typeof value.objectNumber === 'number' &&
            typeof value.generationNumber === 'number') {
            markRef(value);
            return;
        }
        if (!value || typeof value !== 'object') return;
        // PDFDict and its subclasses (catalog, page trees, page leaves,
        // outlines, AcroForm, name trees, info dictionary, ...).
        if (typeof value.values === 'function') {
            const children = value.values();
            for (let i = 0; i < children.length; i++) markValue(children[i]);
            return;
        }
        // PDFArray
        if (typeof value.asArray === 'function') {
            const children = value.asArray();
            for (let i = 0; i < children.length; i++) markValue(children[i]);
            return;
        }
        // PDFStream: walk its dictionary; the stream bytes hold no object refs.
        if (value.dict && typeof value.getContents === 'function') {
            markValue(value.dict);
        }
    };

    // Trailer roots: catalog, Info dictionary, encryption dict, file ID.
    const trailer = context.trailerInfo || {};
    for (const key of Object.keys(trailer)) {
        markValue(trailer[key]);
    }

    while (pending.length > 0) {
        const ref = pending.pop();
        const obj = context.lookup(ref);
        if (obj) markValue(obj);
    }

    // Sweep everything unmarked (this includes the excluded page refs).
    for (const pair of context.enumerateIndirectObjects()) {
        const key = pair[0].objectNumber + ' ' + pair[0].generationNumber;
        if (!marked.has(key)) {
            context.delete(pair[0]);
        }
    }
}

/**
 * Split a PDF into multiple PDFs based on page ranges
 *
 * Semantics:
 * - Array input: each comma/line segment is one range and produces exactly
 *   one output, in input order (duplicates, overlaps and adjacent ranges are
 *   allowed and each occurrence becomes its own output file).
 * - Number input: split into consecutive chunks of N pages; the final chunk
 *   may be shorter. Never produces empty outputs.
 * - 'all': one output per page (legacy mode kept for API compatibility).
 *
 * Each output is produced by loading a fresh copy of the source and removing
 * every page outside the chunk, rather than by copying pages into a brand new
 * document. A brand new document silently destroys everything that lives in
 * the catalog rather than on the page - AcroForm fields and their values,
 * outlines, named destinations, embedded files, page labels, XMP metadata and
 * document actions - even though every page itself survives. After the
 * removal, pruneUnreachableObjects() drops the excluded pages' objects so no
 * output silently carries pages it does not show.
 *
 * @param {File} pdfFile - The PDF file to split
 * @param {Array<string>|number} pageRanges - Array of page range strings, or number for "every N pages"
 * @returns {Promise<Array<{name: string, data: Uint8Array}>>} - Array of split PDFs
 */
async function splitPDF(pdfFile, pageRanges) {
    const PDFLib = ensurePDFLib();

    // Validate the file handle before the expensive read and parse, so a
    // missing/garbage input fails with an actionable message instead of a
    // TypeError from pdfFile.arrayBuffer().
    if (!pdfFile || typeof pdfFile.arrayBuffer !== 'function') {
        throw userFacingError('Invalid PDF file. Please select a valid PDF file.');
    }

    const everyNMode = typeof pageRanges === 'number';
    const allMode = pageRanges === 'all';
    if (!everyNMode && !allMode && !Array.isArray(pageRanges)) {
        throw userFacingError('Invalid split input. Please provide page ranges.');
    }
    if (everyNMode) {
        // Must be a whole number of at least 1. Testing `n < 1` alone would
        // also let NaN and Infinity through, since every comparison
        // against NaN is false.
        if (!Number.isInteger(pageRanges)) {
            throw userFacingError('Split size must be a whole number of pages.');
        }
        if (pageRanges < 1) throw userFacingError('Split size must be at least 1 page.');
    }

    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

        // Get total pages
        const totalPages = pdf.getPageCount();

        if (totalPages === 0) {
            throw userFacingError('PDF has no pages.');
        }

        // Plan every output up front (arrays of 0-based page indices), so all
        // input validation completes before any output PDF is produced. A bad
        // range at the end of the list can no longer leave a half-finished
        // result set behind.
        const chunks = [];

        if (everyNMode) {
            const n = pageRanges;
            for (let start = 0; start < totalPages; start += n) {
                const indices = [];
                const end = Math.min(start + n, totalPages);
                for (let p = start; p < end; p++) indices.push(p);
                chunks.push(indices);
            }
        } else if (allMode) {
            for (let i = 0; i < totalPages; i++) chunks.push([i]);
        } else {
            // Support comma-separated ranges on a single line: "1-5, 10, 20-25"
            // and multiple lines. Blank lines carry no ranges and are skipped;
            // an empty segment between commas ("1,,5", "1,") is malformed input
            // and is reported instead of silently producing fewer outputs than
            // the user asked for.
            const expandedRanges = [];
            for (const line of pageRanges) {
                const parts = String(line).split(',');
                if (parts.length === 1 && parts[0].trim() === '') continue;
                for (const part of parts) {
                    const text = part.trim();
                    if (!text) {
                        throw userFacingError('Invalid page range list: empty entry between commas.');
                    }
                    expandedRanges.push(text);
                }
            }

            if (expandedRanges.length === 0) {
                throw userFacingError('No valid page ranges provided');
            }

            for (const range of expandedRanges) {
                // Parse the range (e.g., "1-5" or "3"). Strict parsing: only
                // digits and at most one hyphen are accepted, so malformed input
                // is reported instead of silently reinterpreted by parseInt()
                // ("1-2-3" used to quietly become pages 1-2).
                const [startPageNum, endPageNum] = parsePageRange(range);
                const startPage = startPageNum - 1; // Convert to 0-based index
                const endPage = endPageNum - 1;

                if (startPage < 0 || endPage >= totalPages) {
                    throw userFacingError(`Page range ${range} is out of bounds. PDF has ${totalPages} pages.`);
                }

                if (startPage > endPage) {
                    throw userFacingError(`Invalid range: start page (${startPageNum}) is greater than end page (${endPageNum})`);
                }

                const indices = [];
                for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    indices.push(pageNum);
                }
                chunks.push(indices);
            }
        }

        if (chunks.length === 0) {
            throw userFacingError('No pages to split.');
        }

        // Strip only a trailing extension (case-insensitive). Replacing the
        // first ".pdf" anywhere in the name would corrupt names like
        // "report.pdf.final.pdf".
        const rawName = (typeof pdfFile.name === 'string' && pdfFile.name) ? pdfFile.name : 'document.pdf';
        const baseName = rawName.replace(/\.pdf$/i, '') || 'document';

        const splitResults = [];
        let partNum = 0;

        for (const keepIndices of chunks) {
            partNum++;

            // Fresh load per output: removals in one output must not affect
            // the page set of the next.
            const outputDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const keep = new Set(keepIndices);
            const outputPages = outputDoc.getPages();

            // Record the refs of the pages being excluded BEFORE unlinking
            // them, so pruneUnreachableObjects() can delete them outright.
            const excludedRefs = [];
            for (let i = 0; i < outputPages.length; i++) {
                if (!keep.has(i)) excludedRefs.push(outputPages[i].ref);
            }

            // Highest index first: removing a page shifts the indexes of every
            // later page, so working downwards keeps the remaining targets valid.
            for (let i = outputPages.length - 1; i >= 0; i--) {
                if (!keep.has(i)) outputDoc.removePage(i);
            }

            if (excludedRefs.length > 0) {
                pruneUnreachableObjects(outputDoc, excludedRefs);
            }

            const newPdfBytes = await outputDoc.save();

            const fileName = allMode
                ? `${baseName}-page-${keepIndices[0] + 1}.pdf`
                : `${baseName}-part-${partNum}.pdf`;

            splitResults.push({ name: fileName, data: newPdfBytes });
        }

        return splitResults;
    } catch (error) {
        console.error('Error splitting PDF:', error);
        // Actionable range/size/file errors are re-thrown unchanged; anything
        // else (pdf-lib parse failures, corrupt structures, I/O problems) is
        // replaced with a generic message so internal parser detail never
        // reaches the UI.
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to split the PDF. Please ensure it is a valid PDF.');
    }
}

/**
 * Extract specific pages from a PDF
 * @param {File} pdfFile - The PDF file to extract from
 * @param {Array<number>} pageNumbers - Array of page numbers to extract (1-based)
 * @returns {Promise<Uint8Array>} - New PDF with extracted pages
 */
async function extractPages(pdfFile, pageNumbers) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Get total pages
        const totalPages = pdf.getPageCount();
        
        // Validate page numbers
        if (!pageNumbers || pageNumbers.length === 0) {
            throw new Error('Please specify at least one page number');
        }
        
        // Convert to 0-based indices and validate.
        // Strict validation matters here: a non-integer value would produce a
        // NaN/fractional index that the range check below cannot catch (all
        // comparisons against NaN are false) and that then fails silently or
        // crashes inside pdf-lib.
        const pageIndices = pageNumbers.map(num => toPageIndex(num, totalPages));
        
        // Create a new PDF
        const newPdf = await PDFLib.PDFDocument.create();
        
        // Copy the specified pages
        const pages = await newPdf.copyPages(pdf, pageIndices);
        pages.forEach((page) => {
            newPdf.addPage(page);
        });
        
        // Save the new PDF
        const newPdfBytes = await newPdf.save();
        
        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-extracted.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes
        };
        
    } catch (error) {
        console.error('Error extracting pages:', error);
        throw error;
    }
}

/**
 * Rotate all pages in a PDF
 * @param {File} pdfFile - The PDF file to rotate
 * @param {number} degrees - Rotation angle (90, 180, or 270)
 * @returns {Promise<Uint8Array>} - Rotated PDF as Uint8Array
 */
async function rotatePDF(pdfFile, degrees) {
    const PDFLib = ensurePDFLib();

    // Validate the rotation angle BEFORE the expensive file read and parse,
    // so a tampered/forged angle fails fast without paying for PDF loading.
    const validAngles = [90, 180, 270];
    if (!validAngles.includes(degrees)) {
        throw userFacingError('Invalid rotation angle. Must be 90, 180, or 270 degrees.');
    }

    if (!pdfFile || typeof pdfFile.arrayBuffer !== 'function') {
        throw userFacingError('Invalid PDF file. Please select a valid PDF file.');
    }

    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

        // Rotate each page in place, within the loaded document. Mutating the
        // existing pages (rather than copying them into a brand new document)
        // keeps everything that lives in the catalog rather than on the page -
        // AcroForm fields, outlines, embedded files, named destinations, XMP
        // metadata and page-level annotations - intact.
        const pages = pdf.getPages();
        pages.forEach((page) => {
            const currentRotation = page.getRotation().angle;
            // Real-world PDFs occasionally carry a non-standard /Rotate value
            // (e.g. 45). pdf-lib's setRotation() rejects non-multiples of 90,
            // so normalise to the nearest quarter turn first; a conforming
            // file is unaffected (nearest-90 of 0/90/180/270 is itself).
            const normalised = ((Math.round(currentRotation / 90) * 90) % 360 + 360) % 360;
            const newRotation = (normalised + degrees) % 360;
            page.setRotation({ type: 'degrees', angle: newRotation });
        });

        // Save the rotated PDF
        const rotatedPdfBytes = await pdf.save();

        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-rotated.pdf`;

        return {
            name: fileName,
            data: rotatedPdfBytes
        };

    } catch (error) {
        console.error('Error rotating PDF:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to rotate PDF. Please ensure it is a valid PDF.');
    }
}

/**
 * Get PDF information (page count, etc.)
 * @param {File} pdfFile - The PDF file to analyze
 * @returns {Promise<Object>} - PDF information
 */
async function getPDFInfo(pdfFile) {
    const PDFLib = ensurePDFLib();
    
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        return {
            pageCount: pdf.getPageCount(),
            fileName: pdfFile.name,
            fileSize: pdfFile.size
        };
        
    } catch (error) {
        console.error('Error getting PDF info:', error);
        throw new Error('Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

// Note: pdf-lib does not support password encryption of PDFs.
// Password protection feature cannot be implemented client-side only.
// See js/remove.js for the password protect tool that documents this limitation.

/**
 * Remove specific pages from PDF
 * @param {File} pdfFile - The PDF file to modify
 * @param {Array<number>} pagesToRemove - Array of page numbers to remove (1-based)
 * @returns {Promise<{name: string, data: Uint8Array}>}
 */
async function removePDFPages(pdfFile, pagesToRemove) {
    const PDFLib = ensurePDFLib();
    
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const totalPages = pdf.getPageCount();
        
        if (!pagesToRemove || pagesToRemove.length === 0) {
            throw new Error('Please specify at least one page to remove');
        }
        
        // Convert to 0-based indices and validate
        const removeIndices = pagesToRemove.map(num => toPageIndex(num, totalPages));
        
        // A page listed twice is still one page. De-duplicate before the
        // all-pages check so that e.g. [1,1] on a 1-page PDF is correctly
        // rejected as removing everything rather than passing the check.
        const uniqueIndices = Array.from(new Set(removeIndices));

        if (uniqueIndices.length >= totalPages) {
            throw userFacingError('Cannot remove all pages from the PDF');
        }

        // Remove from the loaded document rather than copying the surviving
        // pages into a brand new one. A new document drops everything that
        // lives in the catalog rather than on the page - notably AcroForm
        // fields, which would otherwise be silently destroyed even when the
        // removed page did not contain them.
        //
        // Highest index first: removing a page shifts the indexes of every
        // later page, so working downwards keeps the remaining targets valid.
        uniqueIndices.sort((a, b) => b - a);
        for (const index of uniqueIndices) {
            pdf.removePage(index);
        }

        const newPdfBytes = await pdf.save();
        
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-pages-removed.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes
        };
        
    } catch (error) {
        console.error('Error removing pages:', error);
        if (error && error.isUserFacing) throw error;
        // Keep pdf-lib parse/internal detail out of the UI; actionable
        // page-number and all-pages errors are re-thrown unchanged above.
        throw new Error('Failed to remove pages from the PDF. Please ensure it is a valid PDF.');
    }
}

/**
 * Add page numbers to all pages in a PDF
 * @param {File} pdfFile - The PDF file to add page numbers to
 * @param {Object} options - Page number options
 * @param {string} options.position - Position (bottom-center, bottom-left, bottom-right)
 * @param {string} options.format - Format (e.g., "Page {n}", "{n} of {total}")
 * @returns {Promise<{name: string, data: Uint8Array}>}
 */
async function addPageNumbers(pdfFile, options = {}) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const {
            position = 'bottom-center',
            format = 'Page {n}'
        } = options;
        
        // Embed a standard font
        const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
        
        const fontSize = 10;
        const pages = pdf.getPages();
        const totalPages = pages.length;
        
        // Add page numbers to each page
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            // Format the page number text
            let pageText = format
                .replace('{n}', i + 1)
                .replace('{total}', totalPages);
            
            const textWidth = font.widthOfTextAtSize(pageText, fontSize);
            const padding = 20;
            
            // Calculate position
            let x;
            switch (position) {
                case 'bottom-left':
                    x = padding;
                    break;
                case 'bottom-right':
                    x = width - textWidth - padding;
                    break;
                case 'bottom-center':
                default:
                    x = (width - textWidth) / 2;
                    break;
            }
            
            const y = padding + fontSize;
            
            // Draw page number
            page.drawText(pageText, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: PDFLib.rgb(0, 0, 0)
            });
        }
        
        // Save the PDF with page numbers
        const numberedPdfBytes = await pdf.save();
        
        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-numbered.pdf`;
        
        return {
            name: fileName,
            data: numberedPdfBytes
        };
        
    } catch (error) {
        console.error('Error adding page numbers:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to add page numbers. Please ensure it is a valid PDF.');
    }
}

/**
 * Add text watermark to all pages in a PDF
 * @param {File} pdfFile - The PDF file to watermark
 * @param {Object} options - Watermark options
 * @param {string} options.text - Watermark text
 * @param {number} options.fontSize - Font size in points
 * @param {number} options.opacity - Opacity (0-1)
 * @param {number} options.rotation - Rotation angle in degrees
 * @param {string} options.position - Position (center, top-left, top-right, bottom-left, bottom-right)
 * @returns {Promise<{name: string, data: Uint8Array}>}
 */
async function watermarkPDF(pdfFile, options) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Default options
        const {
            text = 'CONFIDENTIAL',
            fontSize = 48,
            opacity = 0.3,
            rotation = 0,
            position = 'center'
        } = options;
        
        // Validate options
        if (!text || text.trim() === '') {
            throw userFacingError('Watermark text is required');
        }
        
        // Number.isFinite rejects NaN and Infinity. Without it, a comparison
        // against NaN is always false, so a blank numeric input would slip
        // past these range checks and fail deep inside pdf-lib instead.
        if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 200) {
            throw userFacingError('Font size must be a number between 8 and 200');
        }
        
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
            throw userFacingError('Opacity must be a number between 0 and 1');
        }
        
        // Embed a standard font (Helvetica)
        const font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
        
        // Calculate text width
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;
        
        // Get all pages
        const pages = pdf.getPages();
        
        // Add watermark to each page
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // Calculate position
            let x, y;
            const padding = 20;
            
            switch (position) {
                case 'top-left':
                    x = padding;
                    y = height - padding - textHeight;
                    break;
                case 'top-right':
                    x = width - textWidth - padding;
                    y = height - padding - textHeight;
                    break;
                case 'bottom-left':
                    x = padding;
                    y = padding + textHeight;
                    break;
                case 'bottom-right':
                    x = width - textWidth - padding;
                    y = padding + textHeight;
                    break;
                case 'center':
                default:
                    x = (width - textWidth) / 2;
                    y = (height + textHeight) / 2;
                    break;
            }
            
            // Draw watermark
            page.drawText(text, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: PDFLib.rgb(0.5, 0.5, 0.5), // Gray color
                opacity: opacity,
                rotate: PDFLib.degrees(rotation)
            });
        }
        
        // Save the watermarked PDF
        const watermarkedPdfBytes = await pdf.save();
        
        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-watermarked.pdf`;
        
        return {
            name: fileName,
            data: watermarkedPdfBytes
        };
        
    } catch (error) {
        console.error('Error adding watermark:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to add watermark. Please ensure it is a valid PDF.');
    }
}

/**
 * Reorder pages in a PDF
 * @param {File} pdfFile - The PDF file to reorder
 * @param {Array<number>} newOrder - Page numbers in the desired order (1-based).
 *   Must be a permutation of the document's pages: every page exactly once.
 * @returns {Promise<{name: string, data: Uint8Array}>}
 */
async function reorderPDF(pdfFile, newOrder) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const totalPages = pdf.getPageCount();
        
        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            throw userFacingError('Please specify page order');
        }
        
        // Validate each page number first so the precise per-page message wins
        // (e.g. "Page 6 is out of bounds..." rather than a count complaint).
        // An explicit loop, not map(): map() skips holes in sparse arrays,
        // which would let undefined indices through to insertPage() and
        // silently swap a real page for a blank one.
        const pageIndices = [];
        for (let i = 0; i < newOrder.length; i++) {
            pageIndices.push(toPageIndex(newOrder[i], totalPages));
        }
        
        // A reorder is a permutation. A short order would silently drop pages
        // from the output and a repeated page number would silently duplicate
        // one - data loss the user never asked for - so both are rejected.
        // (Length and range together already imply a permutation; the explicit
        // duplicate check produces the clearest message when they coincide.)
        if (newOrder.length !== totalPages) {
            throw userFacingError('The new order must list every page exactly once. Expected ' +
                totalPages + ' page number' + (totalPages === 1 ? '' : 's') +
                ', got ' + newOrder.length + '.');
        }
        const seen = new Set();
        for (let i = 0; i < pageIndices.length; i++) {
            if (seen.has(pageIndices[i])) {
                throw userFacingError('Page ' + newOrder[i] + ' appears more than once in the new order.');
            }
            seen.add(pageIndices[i]);
        }
        
        // Reorder within the loaded document instead of copying pages into a
        // brand new one. A new document drops everything that lives in the
        // catalog rather than on the page - notably AcroForm fields, but also
        // outlines, embedded files, named destinations and XMP metadata - which
        // would otherwise be silently destroyed even though every page survives.
        //
        // removePage() only unlinks a leaf from the page tree (the page object
        // stays in the document context); insertPage() relinks a page of this
        // same document at the requested index. Unlink every page first, then
        // relink in the requested order, so no page ref is ever in the tree
        // twice and intermediate states stay consistent.
        const originalPages = pdf.getPages();
        const orderedPages = pageIndices.map(index => originalPages[index]);

        for (let i = originalPages.length - 1; i >= 0; i--) {
            pdf.removePage(i);
        }
        for (let i = 0; i < orderedPages.length; i++) {
            pdf.insertPage(i, orderedPages[i]);
        }

        const newPdfBytes = await pdf.save();
        
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-reordered.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes
        };
        
    } catch (error) {
        console.error('Error reordering PDF:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to reorder PDF. Please ensure it is a valid PDF.');
    }
}

/**
 * Remove metadata from a PDF
 * @param {File} pdfFile - The PDF file to remove metadata from
 * @returns {Promise<{name: string, data: Uint8Array, originalSize: number, newSize: number}>}
 */
async function removeMetadataPDF(pdfFile) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const originalSize = arrayBuffer.byteLength;
        
        // Load the PDF
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Remove all identifying document metadata: Info dictionary fields,
        // CreationDate/ModDate and the XMP metadata object itself.
        stripDocumentMetadata(pdf);
        
        // Save the PDF
        const newPdfBytes = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false
        });
        
        const newSize = newPdfBytes.byteLength;
        
        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-cleaned.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes,
            originalSize: originalSize,
            newSize: newSize
        };
        
    } catch (error) {
        console.error('Error removing metadata from PDF:', error);
        if (error && error.isUserFacing) throw error;
        throw new Error('Failed to remove metadata from PDF. Please ensure it is a valid PDF.');
    }
}

/**
 * Download a file from Uint8Array
 * @param {Uint8Array} data - File data
 * @param {string} fileName - Name for the downloaded file
 */
function downloadFile(data, fileName) {
    try {
        // Create a blob from the Uint8Array
        const blob = new Blob([data], { type: 'application/pdf' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        throw new Error('Failed to download file.');
    }
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Export functions for use in app.js
if (typeof window !== 'undefined') {
    window.PDFTools = {
        mergePDFs,
        splitPDF,
        extractPages,
        rotatePDF,
        getPDFInfo,
        removePDFPages,
        reorderPDF,
        removeMetadataPDF,
        watermarkPDF,
        addPageNumbers,
        downloadFile,
        formatFileSize
    };
}
