/**
 * CleanVault - Rotate PDF Tool Module
 */

// True while a Rotate PDF operation is running. Guards against a second
// concurrent invocation performing the work (and spending an operation) a
// second time. Cleared in performRotate()'s outer finally.
let rotateInFlight = false;

function getRotateToolHTML() {
    return `
        <div class="tool-header">
            <h2>Rotate PDF</h2>
            <p>Rotate pages clockwise or counter-clockwise</p>
        </div>
        <div class="upload-area" id="rotate-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v8l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M24 32a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to rotate</p>
            <input type="file" id="rotate-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="rotate-page-info" style="display: none;">
            <strong>File:</strong> <span id="rotate-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="rotate-total-pages"></span>
        </div>
        <div class="form-group" id="rotate-options-group" style="display: none;">
            <label>Rotation Angle</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="rotation" value="90" checked><span>90° Clockwise</span></label>
                <label class="radio-option"><input type="radio" name="rotation" value="180"><span>180°</span></label>
                <label class="radio-option"><input type="radio" name="rotation" value="270"><span>270° Clockwise</span></label>
            </div>
        </div>
        <div class="tool-actions" id="rotate-actions" style="display: none;">
            <button class="btn btn-primary" id="rotate-btn">Rotate PDF</button>
            <button class="btn btn-secondary" id="clear-rotate-btn">Clear</button>
        </div>
        <div class="status" id="rotate-status"></div>
    `;
}

function initializeRotateTool() {
    const fileInput = document.getElementById('rotate-file-input');
    const rotateBtn = document.getElementById('rotate-btn');
    const clearBtn = document.getElementById('clear-rotate-btn');

    setupUploadArea('rotate-upload-area', 'rotate-file-input', (file) => handleRotateFile(file));
    rotateBtn.addEventListener('click', async () => await performRotate());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('rotate-page-info').style.display = 'none';
        document.getElementById('rotate-options-group').style.display = 'none';
        document.getElementById('rotate-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleRotateFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('rotate');
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
        
        currentFiles = [file];
        showPageInfo('rotate', file, info.pageCount);
        document.getElementById('rotate-options-group').style.display = 'block';
        document.getElementById('rotate-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performRotate() {
    // Re-entrancy guard. The button is disabled while loading, but that only
    // protects genuine UI clicks - direct or programmatic concurrent calls
    // would otherwise run twice, producing two downloads and consuming two of
    // the user's daily operations.
    if (rotateInFlight) return;
    rotateInFlight = true;

    try {
        if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

        // Re-check the daily allowance at execution time. The limit is shared
        // across every tool and stored in localStorage, so it may have been
        // reached after this file was selected - for example by an operation
        // performed in a second tab.
        const limitCheck = LimitsManager.canUseTool('rotate');
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

        // Scoped to this tool's options group so foreign markup with the same
        // radio name can never supply the angle. rotatePDF() itself rejects
        // anything but 90/180/270, so a missing selection surfaces as a safe
        // validation error rather than an exception.
        const checked = document.querySelector('#rotate-options-group input[name="rotation"]:checked');
        const selectedRotation = checked ? parseInt(checked.value, 10) : NaN;

        const rotateBtn = document.getElementById('rotate-btn');
        try {
            setLoading(rotateBtn, 'Rotating...');
            showStatus('info', 'Rotating PDF... This may take a moment.');
            const result = await PDFTools.rotatePDF(currentFile, selectedRotation);
            PDFTools.downloadFile(result.data, result.name);
            // Count the operation only once the resulting PDF has actually been
            // handed over. A failed transformation or a failed download then
            // costs the user nothing.
            LimitsManager.trackOperation();
            showStatus('success', 'PDF rotated successfully! Downloading...');
            setTimeout(() => {
                currentFiles = [];
                document.getElementById('rotate-page-info').style.display = 'none';
                document.getElementById('rotate-options-group').style.display = 'none';
                document.getElementById('rotate-actions').style.display = 'none';
                document.getElementById('rotate-file-input').value = '';
            }, 2000);
        } catch (error) {
            showStatus('error', error.message);
        } finally {
            unsetLoading(rotateBtn, 'Rotate PDF');
        }
    } finally {
        rotateInFlight = false;
    }
}
