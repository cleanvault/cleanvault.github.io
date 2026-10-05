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
 * Split a PDF into multiple PDFs based on page ranges
 * @param {File} pdfFile - The PDF file to split
 * @param {Array<string>|number} pageRanges - Array of page range strings, or number for "every N pages"
 * @returns {Promise<Array<{name: string, data: Uint8Array}>>} - Array of split PDFs
 */
async function splitPDF(pdfFile, pageRanges) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Get total pages
        const totalPages = pdf.getPageCount();
        
        if (totalPages === 0) {
            throw new Error('PDF has no pages.');
        }
        
        const splitResults = [];
        
        // Handle "every N pages" mode (pageRanges is a number)
        if (typeof pageRanges === 'number') {
            const n = pageRanges;
            // Must be a whole number of at least 1. Testing `n < 1` alone would
            // also let NaN and Infinity through, since every comparison
            // against NaN is false.
            if (!Number.isInteger(n)) {
                throw userFacingError('Split size must be a whole number of pages.');
            }
            if (n < 1) throw userFacingError('Split size must be at least 1 page.');
            
            let partNum = 0;
            for (let start = 0; start < totalPages; start += n) {
                const end = Math.min(start + n, totalPages) - 1;
                partNum++;
                
                const newPdf = await PDFLib.PDFDocument.create();
                const pageIndices = [];
                for (let p = start; p <= end; p++) {
                    pageIndices.push(p);
                }
                const pages = await newPdf.copyPages(pdf, pageIndices);
                pages.forEach((page) => newPdf.addPage(page));
                
                const newPdfBytes = await newPdf.save();
                const baseName = pdfFile.name.replace('.pdf', '');
                const fileName = `${baseName}-part-${partNum}.pdf`;
                
                splitResults.push({ name: fileName, data: newPdfBytes });
            }
            
            if (splitResults.length === 0) {
                throw new Error('No pages to split.');
            }
            return splitResults;
        }
        
        // Handle "every page" mode (pageRanges is 'all')
        if (pageRanges === 'all') {
            for (let i = 0; i < totalPages; i++) {
                const newPdf = await PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, [i]);
                pages.forEach((page) => newPdf.addPage(page));
                
                const newPdfBytes = await newPdf.save();
                const baseName = pdfFile.name.replace('.pdf', '');
                const fileName = `${baseName}-page-${i + 1}.pdf`;
                
                splitResults.push({ name: fileName, data: newPdfBytes });
            }
            
            if (splitResults.length === 0) {
                throw new Error('No pages to split.');
            }
            return splitResults;
        }
        
        // Handle custom ranges (array of strings)
        // Support comma-separated ranges on a single line: "1-5, 10, 20-25"
        const expandedRanges = [];
        for (const line of pageRanges) {
            const parts = line.split(',').map(s => s.trim()).filter(s => s);
            for (const part of parts) {
                expandedRanges.push(part);
            }
        }
        
        for (let i = 0; i < expandedRanges.length; i++) {
            const range = expandedRanges[i];
            if (!range) continue;
            
            // Parse the range (e.g., "1-5" or "3"). Strict parsing: only
            // digits and at most one hyphen are accepted, so malformed input
            // is reported instead of silently reinterpreted by parseInt()
            // ("1-2-3" used to quietly become pages 1-2).
            const [startPageNum, endPageNum] = parsePageRange(range);
            const startPage = startPageNum - 1; // Convert to 0-based index
            const endPage = endPageNum - 1;

            // Validate page numbers
            if (startPage < 0 || endPage >= totalPages) {
                throw userFacingError(`Page range ${range} is out of bounds. PDF has ${totalPages} pages.`);
            }
            
            if (startPage > endPage) {
                throw userFacingError(`Invalid range: start page (${startPage + 1}) is greater than end page (${endPage + 1})`);
            }
            
            // Create a new PDF for this range
            const newPdf = await PDFLib.PDFDocument.create();
            
            // Copy pages in the range
            const pageIndices = [];
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                pageIndices.push(pageNum);
            }
            
            const pages = await newPdf.copyPages(pdf, pageIndices);
            pages.forEach((page) => {
                newPdf.addPage(page);
            });
            
            // Save the new PDF
            const newPdfBytes = await newPdf.save();
            
            // Create filename
            const baseName = pdfFile.name.replace('.pdf', '');
            const partNumber = i + 1;
            const fileName = `${baseName}-part-${partNumber}.pdf`;
            
            splitResults.push({
                name: fileName,
                data: newPdfBytes
            });
        }
        
        if (splitResults.length === 0) {
            throw new Error('No valid page ranges provided');
        }
        
        return splitResults;
        
    } catch (error) {
        console.error('Error splitting PDF:', error);
        throw error;
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
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Validate rotation angle
        const validAngles = [90, 180, 270];
        if (!validAngles.includes(degrees)) {
            throw new Error('Invalid rotation angle. Must be 90, 180, or 270 degrees.');
        }
        
        // Rotate each page
        const pages = pdf.getPages();
        pages.forEach((page) => {
            const currentRotation = page.getRotation().angle;
            const newRotation = (currentRotation + degrees) % 360;
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
        throw error;
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
        
        // Get all page indices
        const allIndices = Array.from({ length: totalPages }, (_, i) => i);
        
        // Filter out pages to remove
        const keepIndices = allIndices.filter(index => !removeIndices.includes(index));
        
        if (keepIndices.length === 0) {
            throw new Error('Cannot remove all pages from the PDF');
        }
        
        // Create new PDF with remaining pages
        const newPdf = await PDFLib.PDFDocument.create();
        const pages = await newPdf.copyPages(pdf, keepIndices);
        pages.forEach((page) => {
            newPdf.addPage(page);
        });
        
        const newPdfBytes = await newPdf.save();
        
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-pages-removed.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes
        };
        
    } catch (error) {
        console.error('Error removing pages:', error);
        throw error;
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
 * @param {Array<number>} newOrder - Array of page numbers in desired order (1-based)
 * @returns {Promise<{name: string, data: Uint8Array}>}
 */
async function reorderPDF(pdfFile, newOrder) {
    const PDFLib = ensurePDFLib();
    
    try {
        // Read the PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const totalPages = pdf.getPageCount();
        
        if (!newOrder || newOrder.length === 0) {
            throw new Error('Please specify page order');
        }
        
        // Convert to 0-based indices and validate. Ordering and duplicates are
        // intentional and left to the caller; only each page number itself is
        // validated.
        const pageIndices = newOrder.map(num => toPageIndex(num, totalPages));
        
        // Create new PDF with pages in specified order
        const newPdf = await PDFLib.PDFDocument.create();
        const pages = await newPdf.copyPages(pdf, pageIndices);
        pages.forEach((page) => {
            newPdf.addPage(page);
        });
        
        const newPdfBytes = await newPdf.save();
        
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
