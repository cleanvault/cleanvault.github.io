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
            if (n < 1) throw new Error('Split size must be at least 1 page.');
            
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
            
            // Parse the range (e.g., "1-5" or "3")
            let startPage, endPage;
            
            if (range.includes('-')) {
                const parts = range.split('-');
                startPage = parseInt(parts[0]) - 1; // Convert to 0-based index
                endPage = parseInt(parts[1]) - 1;
            } else {
                startPage = parseInt(range) - 1;
                endPage = parseInt(range) - 1;
            }
            
            // Validate page numbers
            if (isNaN(startPage) || isNaN(endPage)) {
                throw new Error(`Invalid page range: ${range}`);
            }
            
            if (startPage < 0 || endPage >= totalPages) {
                throw new Error(`Page range ${range} is out of bounds. PDF has ${totalPages} pages.`);
            }
            
            if (startPage > endPage) {
                throw new Error(`Invalid range: start page (${startPage + 1}) is greater than end page (${endPage + 1})`);
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
        
        // Convert to 0-based indices and validate
        const pageIndices = pageNumbers.map(num => {
            const index = num - 1; // Convert to 0-based
            if (index < 0 || index >= totalPages) {
                throw new Error(`Page ${num} is out of bounds. PDF has ${totalPages} pages.`);
            }
            return index;
        });
        
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
        const removeIndices = pagesToRemove.map(num => {
            const index = num - 1;
            if (index < 0 || index >= totalPages) {
                throw new Error(`Page ${num} is out of bounds. PDF has ${totalPages} pages.`);
            }
            return index;
        });
        
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
            throw new Error('Watermark text is required');
        }
        
        if (fontSize < 8 || fontSize > 200) {
            throw new Error('Font size must be between 8 and 200');
        }
        
        if (opacity < 0 || opacity > 1) {
            throw new Error('Opacity must be between 0 and 1');
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
        
        // Convert to 0-based indices and validate
        const pageIndices = newOrder.map(num => {
            const index = num - 1; // Convert to 0-based
            if (index < 0 || index >= totalPages) {
                throw new Error(`Page ${num} is out of bounds. PDF has ${totalPages} pages.`);
            }
            return index;
        });
        
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
        
        // Remove metadata
        pdf.setTitle('');
        pdf.setAuthor('');
        pdf.setSubject('');
        pdf.setKeywords([]);
        pdf.setCreator('');
        pdf.setProducer('');
        
        // Save the PDF
        const newPdfBytes = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false
        });
        
        const newSize = newPdfBytes.byteLength;
        
        // Create filename
        const baseName = pdfFile.name.replace('.pdf', '');
        const fileName = `${baseName}-metadata-removed.pdf`;
        
        return {
            name: fileName,
            data: newPdfBytes,
            originalSize: originalSize,
            newSize: newSize
        };
        
    } catch (error) {
        console.error('Error removing metadata from PDF:', error);
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
