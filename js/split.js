/**
 * CleanVault - Split PDF Tool Module
 */

function getSplitToolHTML() {
    return `
        <div class="tool-header">
            <h2>Split PDF</h2>
            <p>Split your PDF into multiple files by page ranges or intervals</p>
        </div>
        <div class="upload-area" id="split-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M20 20l8-4M20 28l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to split</p>
            <input type="file" id="split-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="split-page-info" style="display: none;">
            <strong>File:</strong> <span id="split-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="split-total-pages"></span>
        </div>
        <div class="form-group" id="split-ranges-group" style="display: none;">
            <label>Split Mode</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="split-mode" value="ranges" checked><span>Page Ranges</span></label>
                <label class="radio-option"><input type="radio" name="split-mode" value="every"><span>Every N Pages</span></label>
            </div>
        </div>
        <div class="form-group" id="split-ranges-input" style="display: none;">
            <label for="split-ranges">Page Ranges</label>
            <textarea id="split-ranges" placeholder="Enter page ranges:&#10;1-5, 10-20, 25"></textarea>
            <p class="form-hint">Supports: 1-5, 3,7,10 or 1-5,10,20-25</p>
        </div>
        <div class="form-group" id="split-every-input" style="display: none;">
            <label for="split-every">Split Every N Pages</label>
            <input type="number" id="split-every" min="1" value="5" placeholder="e.g., 5">
            <p class="form-hint">Each split file will contain N pages</p>
        </div>
        <div class="tool-actions" id="split-actions" style="display: none;">
            <button class="btn btn-primary" id="split-btn">Split PDF</button>
            <button class="btn btn-secondary" id="clear-split-btn">Clear</button>
        </div>
        <div class="status" id="split-status"></div>
    `;
}

// True while a Split PDF operation is running. Guards against a second
// concurrent invocation performing the work (and spending an operation) a
// second time. Cleared in performSplit()'s outer finally.
let splitInFlight = false;

// Incremented whenever the split state is replaced (Clear, a new file
// selection, a new run) so a pending delayed UI reset can never wipe the
// state of a newer selection or run.
let splitStateToken = 0;

function initializeSplitTool() {
    const fileInput = document.getElementById('split-file-input');
    const splitBtn = document.getElementById('split-btn');
    const clearBtn = document.getElementById('clear-split-btn');

    setupUploadArea('split-upload-area', 'split-file-input', (file) => handleSplitFile(file));

    // Scoped to this tool's mode group: CleanVault renders tools dynamically,
    // so an unscoped getElementsByName('split-mode') could attach listeners
    // to (and be driven by) foreign markup outside this tool.
    document.querySelectorAll('#split-ranges-group input[name="split-mode"]').forEach(radio => {
        radio.addEventListener('change', () => syncSplitModeVisibility());
    });

    splitBtn.addEventListener('click', async () => await performSplit());
    clearBtn.addEventListener('click', () => {
        // Invalidate any pending delayed reset from a previous run.
        splitStateToken++;
        currentFiles = [];
        document.getElementById('split-page-info').style.display = 'none';
        document.getElementById('split-ranges-group').style.display = 'none';
        document.getElementById('split-actions').style.display = 'none';
        // Hide BOTH mode inputs as well. They are siblings of the mode group,
        // not children of it, so hiding the group alone used to leave the
        // last-used input stranded on screen with no file and no buttons.
        document.getElementById('split-ranges-input').style.display = 'none';
        document.getElementById('split-every-input').style.display = 'none';
        // Reset to the default mode so the next file starts from a known state.
        const rangesRadio = document.querySelector('#split-ranges-group input[name="split-mode"][value="ranges"]');
        if (rangesRadio) rangesRadio.checked = true;
        // Drop the stale status message so it cannot misdescribe the state.
        const statusEl = document.getElementById('split-status');
        if (statusEl) {
            statusEl.className = 'status';
            statusEl.textContent = '';
        }
        fileInput.value = '';
    });
}

/**
 * Show the input that belongs to the currently checked split mode. Scoped to
 * this tool's markup; safe to call at any time (missing elements are ignored).
 */
function syncSplitModeVisibility() {
    const checked = document.querySelector('#split-ranges-group input[name="split-mode"]:checked');
    const mode = checked ? checked.value : 'ranges';
    const rangesInput = document.getElementById('split-ranges-input');
    const everyInput = document.getElementById('split-every-input');
    if (rangesInput) rangesInput.style.display = mode === 'ranges' ? 'block' : 'none';
    if (everyInput) everyInput.style.display = mode === 'every' ? 'block' : 'none';
}

async function handleSplitFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('split');
    if (!limitCheck.allowed) {
        showStatus('error', limitCheck.reason);
        return;
    }
    
    try {
        const info = await PDFTools.getPDFInfo(file);
        
        // Check page limit
        const pageCheck = LimitsManager.canProcessFile(file, info.pageCount);
        if (!pageCheck.allowed) {
            showStatus('error', pageCheck.reason);
            return;
        }
        
        // A new selection supersedes any pending delayed reset from a run
        // that has not cleared the UI yet.
        splitStateToken++;
        currentFiles = [file];
        showPageInfo('split', file, info.pageCount);
        document.getElementById('split-ranges-group').style.display = 'block';
        document.getElementById('split-actions').style.display = 'flex';
        syncSplitModeVisibility();
        const rangesTextarea = document.getElementById('split-ranges');
        rangesTextarea.value = info.pageCount >= 10
            ? `1-5, 10-${Math.min(20, info.pageCount)}`
            : `1-${Math.ceil(info.pageCount / 2)}`;
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performSplit() {
    // Re-entrancy guard. The button is disabled while loading, but that only
    // protects genuine UI clicks - direct or programmatic concurrent calls
    // would otherwise run twice, producing two sets of downloads and
    // consuming two of the user's daily operations.
    if (splitInFlight) return;
    splitInFlight = true;

    try {
        // This run supersedes any delayed reset scheduled by an earlier one.
        splitStateToken++;

        if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

        // Re-check the daily allowance at execution time. The limit is shared
        // across every tool and stored in localStorage, so it may have been
        // reached after this file was selected - for example by an operation
        // performed in a second tab.
        const limitCheck = LimitsManager.canUseTool('split');
        if (!limitCheck.allowed) {
            showStatus('error', limitCheck.reason);
            return;
        }

        // Re-check the page limit at execution time as defence in depth, using
        // the page count read from the file we are about to process rather
        // than the value cached at selection time.
        const currentFile = currentFiles[0];
        let info;
        try {
            info = await PDFTools.getPDFInfo(currentFile);
        } catch (error) {
            showStatus('error', error.message);
            return;
        }
        const pageCheck = LimitsManager.canProcessFile(currentFile, info.pageCount);
        if (!pageCheck.allowed) {
            showStatus('error', pageCheck.reason);
            return;
        }

        // Scoped to this tool's mode group (see initializeSplitTool) so
        // foreign markup with the same radio name can never supply the mode,
        // and a missing selection surfaces as a safe validation error instead
        // of a TypeError from reading .value of null.
        const checked = document.querySelector('#split-ranges-group input[name="split-mode"]:checked');
        if (!checked) {
            showStatus('error', 'Please select a split mode.');
            return;
        }
        const mode = checked.value;

        let splitInput;
        if (mode === 'every') {
            const everyInput = document.getElementById('split-every');
            // Number() instead of parseInt(): parseInt silently truncates
            // ("2.5" -> 2) and misreads scientific notation ("1e3" -> 1),
            // while Number() + Number.isInteger accepts only real integers.
            const n = Number(everyInput ? everyInput.value : '');
            if (!Number.isInteger(n) || n < 1) {
                showStatus('error', 'Please enter a valid number of pages per split (minimum 1).');
                return;
            }
            splitInput = n;
        } else {
            const rangesField = document.getElementById('split-ranges');
            const rangesText = rangesField ? rangesField.value.trim() : '';
            if (!rangesText) { showStatus('error', 'Please enter at least one page range.'); return; }
            splitInput = rangesText.split('\n').map(l => l.trim()).filter(l => l);
            if (splitInput.length === 0) { showStatus('error', 'Please enter at least one page range.'); return; }
        }

        const splitBtn = document.getElementById('split-btn');
        try {
            setLoading(splitBtn, 'Splitting...');
            showStatus('info', 'Splitting PDF... This may take a moment.');
            const splitResults = await PDFTools.splitPDF(currentFile, splitInput);

            // Dispatch every download synchronously, in order, right here.
            // Staggered setTimeout() callbacks used to report success before a
            // single file had been handed over, could not detect a failed
            // download, and kept running after Clear or after a newer run had
            // started. A synchronous loop stays inside the user-gesture window
            // (so browsers do not classify later downloads as unsolicited),
            // gives deterministic output order, and makes failures observable.
            let delivered = 0;
            const failed = [];
            for (const result of splitResults) {
                try {
                    PDFTools.downloadFile(result.data, result.name);
                    delivered++;
                } catch (error) {
                    failed.push(result.name);
                }
            }

            if (delivered === 0) {
                // Nothing was handed over: report the failure and charge
                // nothing (a failed download costs the user nothing, matching
                // the other tools). The file selection is kept so the user can
                // retry immediately without re-selecting the PDF.
                showStatus('error', 'The PDF was split, but downloading the files failed. Please try again.');
                return;
            }

            // One Split action is ONE operation, however many parts it
            // produced - the same accounting every other tool uses (a batch
            // run counts as a single operation as well).
            LimitsManager.trackOperation();

            if (failed.length === 0) {
                showStatus('success', `Successfully split into ${splitResults.length} PDF(s)! Downloading...`);

                // Delayed UI reset, guarded by the state token: if the user
                // selects another file (or clicks Clear) before this fires,
                // the pending reset must not wipe the newer state. The token
                // was captured when this run started; any newer selection,
                // Clear or run increments it.
                const token = splitStateToken;
                setTimeout(() => {
                    if (token !== splitStateToken) return;
                    currentFiles = [];
                    document.getElementById('split-page-info').style.display = 'none';
                    document.getElementById('split-ranges-group').style.display = 'none';
                    document.getElementById('split-actions').style.display = 'none';
                    document.getElementById('split-ranges-input').style.display = 'none';
                    document.getElementById('split-every-input').style.display = 'none';
                    const rangesRadio = document.querySelector('#split-ranges-group input[name="split-mode"][value="ranges"]');
                    if (rangesRadio) rangesRadio.checked = true;
                    document.getElementById('split-file-input').value = '';
                }, 2000);
            } else {
                // Partial delivery: surface exactly what failed and keep the
                // selection so the user can retry without re-uploading. The
                // operation is still counted once - the split ran and part of
                // its output was handed over.
                showStatus('error', `Split into ${splitResults.length} PDF(s), but ${failed.length} download(s) failed: ${failed.join(', ')}. Please try again.`);
            }
        } catch (error) {
            // splitPDF() classifies its errors: actionable validation messages
            // pass through unchanged, everything else arrives as a generic
            // failure with no pdf-lib parser detail attached.
            showStatus('error', error.message);
        } finally {
            unsetLoading(splitBtn, 'Split PDF');
        }
    } finally {
        splitInFlight = false;
    }
}
