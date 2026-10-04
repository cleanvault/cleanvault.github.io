/**
 * CleanVault - Batch Processing Tool Module (Pro)
 * 
 * Process multiple PDFs at once with the same operation.
 * Supports: rotate, watermark, page numbers, remove pages, extract pages
 */

// Global state for batch tool
let batchFiles = [];
let batchOperation = 'rotate';

function getBatchToolHTML() {
    return `
        <div class="tool-header">
            <h2>Batch Processing <span class="pro-label">Pro</span></h2>
            <p>Process multiple PDFs with the same operation. All files will be processed identically.</p>
        </div>
        <div class="upload-area" id="batch-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 16h16M16 24h16M16 32h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M28 16l-4 4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p><strong>Click to select PDF files</strong> or drag and drop</p>
            <p class="form-hint">Select multiple PDF files to process in batch</p>
            <input type="file" id="batch-file-input" accept=".pdf" multiple>
        </div>
        <div class="file-list" id="batch-file-list"></div>
        
        <div class="form-group" id="batch-operation-group">
            <label>Operation</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="batch-op" value="rotate" checked><span>Rotate</span></label>
                <label class="radio-option"><input type="radio" name="batch-op" value="watermark"><span>Add Watermark</span></label>
                <label class="radio-option"><input type="radio" name="batch-op" value="pagenumbers"><span>Add Page Numbers</span></label>
                <label class="radio-option"><input type="radio" name="batch-op" value="remove"><span>Remove Pages</span></label>
                <label class="radio-option"><input type="radio" name="batch-op" value="extract"><span>Extract Pages</span></label>
            </div>
        </div>
        
        <div class="form-group" id="batch-rotate-options" style="display: none;">
            <label for="batch-rotate-angle">Rotation Angle</label>
            <select id="batch-rotate-angle">
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
            </select>
        </div>
        
        <div class="form-group" id="batch-watermark-options" style="display: none;">
            <label for="batch-watermark-text">Watermark Text</label>
            <input type="text" id="batch-watermark-text" placeholder="CONFIDENTIAL" value="CONFIDENTIAL">
            <label for="batch-watermark-size" style="margin-top: 12px;">Font Size</label>
            <input type="number" id="batch-watermark-size" min="8" max="200" value="48">
            <label for="batch-watermark-opacity" style="margin-top: 12px;">Opacity (0-1)</label>
            <input type="number" id="batch-watermark-opacity" min="0" max="1" step="0.1" value="0.3">
            <label for="batch-watermark-position" style="margin-top: 12px;">Position</label>
            <select id="batch-watermark-position">
                <option value="center">Center</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
            </select>
        </div>
        
        <div class="form-group" id="batch-pagenumbers-options" style="display: none;">
            <label for="batch-pagenumbers-position">Position</label>
            <select id="batch-pagenumbers-position">
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
            </select>
        </div>
        
        <div class="form-group" id="batch-remove-options" style="display: none;">
            <label for="batch-remove-pages">Pages to Remove</label>
            <input type="text" id="batch-remove-pages" placeholder="e.g., 2,5,8">
            <p class="form-hint">Enter page numbers to remove, separated by commas (e.g., 1,3,5)</p>
        </div>
        
        <div class="form-group" id="batch-extract-options" style="display: none;">
            <label for="batch-extract-pages">Pages to Extract</label>
            <input type="text" id="batch-extract-pages" placeholder="e.g., 2,5,8,10">
            <p class="form-hint">Enter page numbers to extract, separated by commas (e.g., 1,3,5,7)</p>
        </div>
        
        <div class="tool-actions" id="batch-actions" style="display: none;">
            <button class="btn btn-primary" id="batch-btn">Process All Files</button>
            <button class="btn btn-secondary" id="clear-batch-btn">Clear</button>
        </div>
        <div class="status" id="batch-status"></div>
    `;
}

function initializeBatchTool() {
    const fileInput = document.getElementById('batch-file-input');
    const batchBtn = document.getElementById('batch-btn');
    const clearBtn = document.getElementById('clear-batch-btn');

    // Always start from a clean slate. getBatchToolHTML() always renders
    // "Rotate" as the checked option, so batchOperation must start as
    // 'rotate' too - otherwise the visible radio button and the operation
    // actually applied could disagree, and a previous visit's operation or
    // files could silently carry over into a newly opened Batch tool.
    batchOperation = 'rotate';
    batchFiles = [];
    const staleList = document.getElementById('batch-file-list');
    if (staleList) staleList.innerHTML = '';
    const staleActions = document.getElementById('batch-actions');
    if (staleActions) staleActions.style.display = 'none';
    if (fileInput) fileInput.value = '';

    // Check Pro status
    if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
        showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock batch processing and all Pro features.');
        return;
    }

    setupMultiUploadArea('batch-upload-area', 'batch-file-input', (files) => handleBatchFiles(files));
    
    // Operation selection
    document.getElementsByName('batch-op').forEach(radio => {
        radio.addEventListener('change', () => {
            batchOperation = radio.value;
            updateBatchOptionsVisibility();
        });
    });
    
    batchBtn.addEventListener('click', async () => await performBatch());
    clearBtn.addEventListener('click', () => {
        batchFiles = [];
        document.getElementById('batch-file-list').innerHTML = '';
        document.getElementById('batch-actions').style.display = 'none';
        fileInput.value = '';
    });
    
    // Initial options visibility
    updateBatchOptionsVisibility();
}

function updateBatchOptionsVisibility() {
    document.getElementById('batch-rotate-options').style.display = batchOperation === 'rotate' ? 'block' : 'none';
    document.getElementById('batch-watermark-options').style.display = batchOperation === 'watermark' ? 'block' : 'none';
    document.getElementById('batch-pagenumbers-options').style.display = batchOperation === 'pagenumbers' ? 'block' : 'none';
    document.getElementById('batch-remove-options').style.display = batchOperation === 'remove' ? 'block' : 'none';
    document.getElementById('batch-extract-options').style.display = batchOperation === 'extract' ? 'block' : 'none';
}

function handleBatchFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        if (file.type !== 'application/pdf') {
            showStatus('error', `"${file.name}" is not a PDF file`);
            return false;
        }
        return true;
    });
    
    if (validFiles.length > 0) {
        batchFiles = [...batchFiles, ...validFiles];
        updateBatchFileList();
        document.getElementById('batch-actions').style.display = 'flex';
    }
}

function updateBatchFileList() {
    const fileList = document.getElementById('batch-file-list');
    if (batchFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    // Only the markup is built here. File names and sizes are written with
    // textContent afterwards (the same safe pattern used by showPageInfo in
    // ui.js), so a crafted file name can never inject HTML or script.
    const items = batchFiles.map((file, index) => `
            <div class="file-item">
                <div class="file-info">
                    <svg class="file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div>
                        <div class="file-name"></div>
                        <div class="file-size"></div>
                    </div>
                </div>
                <button class="file-remove" onclick="removeBatchFile(${index})">×</button>
            </div>`).join('');
    
    fileList.innerHTML = `<h4>Selected Files:</h4>${items}`;
    
    const nameEls = fileList.querySelectorAll('.file-name');
    const sizeEls = fileList.querySelectorAll('.file-size');
    batchFiles.forEach((file, i) => {
        if (nameEls[i]) nameEls[i].textContent = file.name;
        if (sizeEls[i]) sizeEls[i].textContent = PDFTools.formatFileSize(file.size);
    });
}

function removeBatchFile(index) {
    batchFiles.splice(index, 1);
    updateBatchFileList();
    if (batchFiles.length === 0) {
        document.getElementById('batch-actions').style.display = 'none';
    }
}

/**
 * Parse a comma-separated list of 1-based page numbers.
 *
 * Every entry must be a positive whole number. Unlike the single-file tools,
 * a malformed entry rejects the whole input instead of being silently
 * discarded, so "2,abc,5" can never quietly become "2,5".
 *
 * @param {string} text - raw input from the page number field
 * @returns {{ok: boolean, pages: number[], error: string}}
 */
function parseBatchPageList(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
        return { ok: false, pages: [], error: '' };
    }

    const parts = trimmed.split(',');
    const pages = [];
    for (const part of parts) {
        const value = part.trim();
        if (!/^\d+$/.test(value)) {
            return {
                ok: false,
                pages: [],
                error: `"${value}" is not a valid page number. Enter whole page numbers separated by commas, for example 1,3,5.`
            };
        }
        const num = parseInt(value, 10);
        if (num < 1) {
            return {
                ok: false,
                pages: [],
                error: 'Page numbers start at 1, so 0 and negative values are not valid.'
            };
        }
        pages.push(num);
    }

    return { ok: true, pages, error: '' };
}

async function performBatch() {
    if (batchFiles.length === 0) {
        showStatus('error', 'Please select at least one PDF file');
        return;
    }
    
    // Validate page input up front, before any file is processed, so a typo
    // cannot destroy a long-running batch part way through.
    let batchPages = null;
    if (batchOperation === 'remove' || batchOperation === 'extract') {
        const isRemove = batchOperation === 'remove';
        const input = document.getElementById(isRemove ? 'batch-remove-pages' : 'batch-extract-pages');
        const parsed = parseBatchPageList(input ? input.value : '');
        if (!parsed.ok) {
            showStatus('error', parsed.error ||
                (isRemove ? 'Please enter page numbers to remove' : 'Please enter page numbers to extract'));
            return;
        }
        batchPages = parsed.pages;
    }
    
    const batchBtn = document.getElementById('batch-btn');
    
    try {
        setLoading(batchBtn, 'Processing...');
        const total = batchFiles.length;
        showStatus('info', `Processing ${total} file(s)... This may take a moment.`);
        
        let succeeded = 0;
        const failures = [];
        
        for (let i = 0; i < batchFiles.length; i++) {
            const file = batchFiles[i];
            try {
                let result;
                switch (batchOperation) {
                    case 'rotate': {
                        const angle = parseInt(document.getElementById('batch-rotate-angle').value, 10);
                        result = await PDFTools.rotatePDF(file, angle);
                        break;
                    }
                    case 'watermark': {
                        const watermarkText = document.getElementById('batch-watermark-text').value;
                        const watermarkSize = parseInt(document.getElementById('batch-watermark-size').value, 10);
                        const watermarkOpacity = parseFloat(document.getElementById('batch-watermark-opacity').value);
                        const watermarkPosition = document.getElementById('batch-watermark-position').value;
                        result = await PDFTools.watermarkPDF(file, {
                            text: watermarkText,
                            fontSize: watermarkSize,
                            opacity: watermarkOpacity,
                            position: watermarkPosition
                        });
                        break;
                    }
                    case 'pagenumbers': {
                        const pnPosition = document.getElementById('batch-pagenumbers-position').value;
                        result = await PDFTools.addPageNumbers(file, { position: pnPosition });
                        break;
                    }
                    case 'remove': {
                        result = await PDFTools.removePDFPages(file, batchPages);
                        break;
                    }
                    case 'extract': {
                        result = await PDFTools.extractPages(file, batchPages);
                        break;
                    }
                    default:
                        throw new Error(`Unsupported batch operation: ${batchOperation}`);
                }
                
                // Download each result immediately, then drop the reference,
                // so a large batch never retains every generated PDF at once.
                PDFTools.downloadFile(result.data, result.name);
                result = null;
                succeeded++;
            } catch (error) {
                // One bad file must not discard the work already completed.
                failures.push({
                    name: file.name,
                    message: error && error.message ? error.message : String(error)
                });
            }
            showStatus('info', `Processed ${i + 1} of ${total} file(s)...`);
        }
        
        // Track operations: one batch run counts as a single operation.
        LimitsManager.trackOperation();
        
        if (failures.length === 0) {
            showStatus('success', `Successfully processed ${succeeded} file(s)! Downloading...`);
        } else {
            const detail = failures.map(f => `${f.name} (${f.message})`).join('; ');
            showStatus('error',
                `Processed ${succeeded} of ${total} file(s). ${failures.length} failed: ${detail}`);
        }
        
        setTimeout(() => {
            batchFiles = [];
            document.getElementById('batch-file-list').innerHTML = '';
            document.getElementById('batch-actions').style.display = 'none';
            document.getElementById('batch-file-input').value = '';
        }, 2000);
        
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(batchBtn, 'Process All Files');
    }
}

window.removeBatchFile = removeBatchFile;