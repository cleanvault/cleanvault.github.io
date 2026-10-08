/**
 * CleanVault - Batch Processing Tool Module (Pro)
 * 
 * Process multiple PDFs at once with the same operation.
 * Supports: rotate, watermark, page numbers, remove pages, extract pages
 */

// Global state for batch tool
let batchFiles = [];
let batchOperation = 'rotate';

// True while a batch run is in progress. Blocks re-entrant runs and makes the
// mutating handlers ignore calls, so the state a run snapshotted cannot change
// under it. Cleared in performBatch()'s finally.
let batchInFlight = false;

// Pending post-success cleanup timer. Cancelled before a new one is scheduled,
// and the callback is guarded by batch identity, batchInFlight and null-safe
// DOM lookups, so a delayed callback can never wipe a newer selection or throw
// after the tool DOM is torn down (same pattern as watermarkCleanupTimer).
let batchCleanupTimer = null;

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

    // A run that started before the tool was switched away keeps processing
    // its snapshot; keep the freshly rendered controls locked to match. The
    // run's finally unlocks them when it completes.
    if (batchInFlight) setBatchControlsDisabled(true);

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
        // While a run is in flight the visible list belongs to that run (the
        // button is disabled anyway); guard so a programmatic click cannot
        // desynchronise it from the snapshot being processed.
        if (batchInFlight) return;
        batchFiles = [];
        document.getElementById('batch-file-list').innerHTML = '';
        document.getElementById('batch-actions').style.display = 'none';
        fileInput.value = '';
        // Reset the page-number inputs too, otherwise stale entries silently
        // carry over into the next batch (same rationale as extract.js).
        const removePagesInput = document.getElementById('batch-remove-pages');
        if (removePagesInput) removePagesInput.value = '';
        const extractPagesInput = document.getElementById('batch-extract-pages');
        if (extractPagesInput) extractPagesInput.value = '';
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
    // A run processes the snapshot taken when it started. Adding files during
    // the run would desynchronise the visible list from what is being
    // processed and would be wiped by the run's post-success cleanup, so
    // ignore additions until it finishes (the upload controls are disabled
    // meanwhile).
    if (batchInFlight) return;

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
    if (batchInFlight) return;

    // Reassign instead of splicing in place: the array identity is how the
    // post-run cleanup timer recognises that its batch is still the current
    // selection (any removal therefore makes it skip the wipe).
    batchFiles = batchFiles.filter((file, i) => i !== index);
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

/**
 * Lock or unlock every control that can mutate batch state while a run is in
 * progress. The run works from a snapshot, so this is a UI-level guarantee;
 * the mutating handlers additionally guard on batchInFlight.
 * @param {boolean} disabled
 */
function setBatchControlsDisabled(disabled) {
    const ids = [
        'batch-file-input', 'clear-batch-btn', 'batch-rotate-angle',
        'batch-watermark-text', 'batch-watermark-size', 'batch-watermark-opacity',
        'batch-watermark-position', 'batch-pagenumbers-position',
        'batch-remove-pages', 'batch-extract-pages'
    ];
    ids.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
    document.getElementsByName('batch-op').forEach(function (radio) {
        radio.disabled = disabled;
    });
    document.querySelectorAll('.file-remove').forEach(function (btn) {
        btn.disabled = disabled;
    });
    // The upload area is a <div>, so a disabled property would not stop a
    // click or drop; pointer-events does. handleBatchFiles() additionally
    // guards the drop path for programmatic calls.
    const uploadArea = document.getElementById('batch-upload-area');
    if (uploadArea) uploadArea.style.pointerEvents = disabled ? 'none' : '';
}

async function performBatch() {
    // Re-entrancy guard: the Process button is disabled while a run is
    // active, but that only blocks genuine clicks - a programmatic or
    // double-triggered call would otherwise start a second concurrent run
    // over the same state (mirrors page-numbers.js's in-flight guard).
    if (batchInFlight) return;
    batchInFlight = true;

    const batchBtn = document.getElementById('batch-btn');

    try {
        if (batchFiles.length === 0) {
            showStatus('error', 'Please select at least one PDF file');
            return;
        }

        // Re-check Pro status at execution time. The licence may have been
        // deactivated or may have expired since the tool was opened.
        if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
            showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock batch processing and all Pro features.');
            return;
        }

        // Re-check the limits at execution time: the daily allowance may have
        // been consumed since this tool was opened, and the batch gate must
        // hold at the moment the work actually starts.
        const limitCheck = LimitsManager.canUseTool('batch');
        if (!limitCheck.allowed) {
            showStatus('error', limitCheck.reason);
            return;
        }

        // Snapshot the batch before any async work. The run processes ONLY
        // these files, this operation and these option values: the controls
        // that could change them are locked for the duration of the run and
        // the mutating handlers ignore calls while a run is active, so
        // clearing the list, adding files or switching operation/options
        // mid-run - or reopening the tool - cannot redirect the work.
        const filesToProcess = batchFiles.slice();
        const operation = batchOperation;

        // Validate the operation's inputs up front, before any file is
        // processed, so a typo cannot destroy a long-running batch part way
        // through - and, for watermark options, before any PDF is loaded, so
        // a bad value costs no work and consumes no operation.
        let batchPages = null;
        let rotateAngle = null;
        let pagenumbersPosition = null;
        let watermarkOptions = null;

        if (operation === 'remove' || operation === 'extract') {
            const isRemove = operation === 'remove';
            const input = document.getElementById(isRemove ? 'batch-remove-pages' : 'batch-extract-pages');
            const parsed = parseBatchPageList(input ? input.value : '');
            if (!parsed.ok) {
                showStatus('error', parsed.error ||
                    (isRemove ? 'Please enter page numbers to remove' : 'Please enter page numbers to extract'));
                return;
            }
            batchPages = parsed.pages;
        } else if (operation === 'rotate') {
            const angleInput = document.getElementById('batch-rotate-angle');
            if (!angleInput) {
                showStatus('error', 'Batch options are missing. Please reload the page and try again.');
                return;
            }
            rotateAngle = parseInt(angleInput.value, 10);
        } else if (operation === 'pagenumbers') {
            const positionInput = document.getElementById('batch-pagenumbers-position');
            if (!positionInput) {
                showStatus('error', 'Batch options are missing. Please reload the page and try again.');
                return;
            }
            pagenumbersPosition = positionInput.value;
        } else if (operation === 'watermark') {
            // Same validation as the single-file Watermark tool, plus the
            // range checks watermarkPDF applies - run here so an invalid
            // value is rejected before the first PDF is even loaded.
            const textInput = document.getElementById('batch-watermark-text');
            const sizeInput = document.getElementById('batch-watermark-size');
            const opacityInput = document.getElementById('batch-watermark-opacity');
            const positionInput = document.getElementById('batch-watermark-position');
            if (!textInput || !sizeInput || !opacityInput || !positionInput) {
                showStatus('error', 'Watermark options are missing. Please reload the page and try again.');
                return;
            }
            const text = textInput.value.trim();
            if (!text) {
                showStatus('error', 'Please enter watermark text');
                return;
            }
            const fontSize = parseInt(sizeInput.value, 10);
            if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 200) {
                showStatus('error', 'Font size must be a number between 8 and 200');
                return;
            }
            const opacity = parseFloat(opacityInput.value);
            if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
                showStatus('error', 'Opacity must be a number between 0 and 1');
                return;
            }
            const position = positionInput.value;
            const validPositions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
            if (!validPositions.includes(position)) {
                showStatus('error', 'Invalid watermark position.');
                return;
            }
            watermarkOptions = { text: text, fontSize: fontSize, opacity: opacity, position: position };
        }

        setBatchControlsDisabled(true);
        setLoading(batchBtn, 'Processing...');
        const total = filesToProcess.length;
        showStatus('info', `Processing ${total} file(s)... This may take a moment.`);
        
        let succeeded = 0;
        const failures = [];
        
        for (let i = 0; i < total; i++) {
            const file = filesToProcess[i];
            try {
                let result;
                switch (operation) {
                    case 'rotate':
                        result = await PDFTools.rotatePDF(file, rotateAngle);
                        break;
                    case 'watermark':
                        result = await PDFTools.watermarkPDF(file, watermarkOptions);
                        break;
                    case 'pagenumbers':
                        result = await PDFTools.addPageNumbers(file, { position: pagenumbersPosition });
                        break;
                    case 'remove':
                        result = await PDFTools.removePDFPages(file, batchPages);
                        break;
                    case 'extract':
                        result = await PDFTools.extractPages(file, batchPages);
                        break;
                    default:
                        throw new Error(`Unsupported batch operation: ${operation}`);
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
        
        // Track operations: one batch run counts as exactly one operation,
        // and only when at least one file actually succeeded - a run where
        // every file failed consumed no capacity.
        if (succeeded > 0) {
            LimitsManager.trackOperation();
        }

        if (failures.length === 0) {
            showStatus('success', `Successfully processed ${succeeded} file(s)!`);
        } else {
            const detail = failures.map(f => `${f.name} (${f.message})`).join('; ');
            showStatus('error',
                `Processed ${succeeded} of ${total} file(s). ${failures.length} failed: ${detail}`);
        }

        // Delayed cleanup only clears state that still belongs to THIS run:
        // the timer is cancelled before a new one is scheduled, the identity
        // guard skips when the selection has since changed (or the tool was
        // reopened), an in-flight run owns the screen, and every element
        // lookup is null-safe so a tool switch cannot throw.
        clearTimeout(batchCleanupTimer);
        const filesAtCleanup = batchFiles;
        batchCleanupTimer = setTimeout(() => {
            batchCleanupTimer = null;
            if (batchInFlight) return;
            if (batchFiles !== filesAtCleanup) return;
            batchFiles = [];
            const fileList = document.getElementById('batch-file-list');
            if (fileList) fileList.innerHTML = '';
            const actions = document.getElementById('batch-actions');
            if (actions) actions.style.display = 'none';
            const fileInput = document.getElementById('batch-file-input');
            if (fileInput) fileInput.value = '';
        }, 2000);

    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(batchBtn, 'Process All Files');
        // Unlock the controls and the in-flight flag after the run. If the
        // tool was reopened mid-run, this unlocks whatever DOM is current at
        // completion time; on an early validation return these are harmless
        // no-ops on already-unlocked state.
        setBatchControlsDisabled(false);
        batchInFlight = false;
    }
}

window.removeBatchFile = removeBatchFile;