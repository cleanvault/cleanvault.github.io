/**
 * CleanVault - Page Numbers Tool Module (Pro)
 */

function getPageNumbersToolHTML() {
    return `
        <div class="tool-header">
            <h2>Add Page Numbers <span class="pro-label">Pro</span></h2>
            <p>Automatically number every page in your document</p>
        </div>
        <div class="upload-area" id="pagenumbers-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 20h16M16 28h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to add page numbers</p>
            <input type="file" id="pagenumbers-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="pagenumbers-info" style="display: none;">
            <strong>File:</strong> <span id="pagenumbers-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="pagenumbers-total-pages"></span>
        </div>
        <div class="form-group" id="pagenumbers-options-group" style="display: none;">
            <label>Position</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="page-position" value="bottom-left"><span>Bottom Left</span></label>
                <label class="radio-option"><input type="radio" name="page-position" value="bottom-center" checked><span>Bottom Center</span></label>
                <label class="radio-option"><input type="radio" name="page-position" value="bottom-right"><span>Bottom Right</span></label>
            </div>
        </div>
        <div class="tool-actions" id="pagenumbers-actions" style="display: none;">
            <button class="btn btn-primary" id="pagenumbers-btn">Add Page Numbers</button>
            <button class="btn btn-secondary" id="clear-pagenumbers-btn">Clear</button>
        </div>
        <div class="status" id="pagenumbers-status"></div>
    `;
}

function initializePageNumbersTool() {
    const fileInput = document.getElementById('pagenumbers-file-input');
    const pageNumbersBtn = document.getElementById('pagenumbers-btn');
    const clearBtn = document.getElementById('clear-pagenumbers-btn');

    setupUploadArea('pagenumbers-upload-area', 'pagenumbers-file-input', (file) => handlePageNumbersFile(file));
    pageNumbersBtn.addEventListener('click', async () => await performPageNumbers());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('pagenumbers-info').style.display = 'none';
        document.getElementById('pagenumbers-options-group').style.display = 'none';
        document.getElementById('pagenumbers-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handlePageNumbersFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { showStatus('error', 'Invalid file type. Please select a PDF file.'); return; }
    
    // Check Pro status
    if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
        showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock page numbers and all Pro features.');
        return;
    }
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('pagenumbers');
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
        showPageInfo('pagenumbers', file, info.pageCount);
        document.getElementById('pagenumbers-options-group').style.display = 'block';
        document.getElementById('pagenumbers-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF. Please ensure it is a valid, non-corrupted PDF file.');
    }
}

async function performPageNumbers() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const selectedPosition = document.querySelector('input[name="page-position"]:checked').value;
    const options = { position: selectedPosition, format: 'Page {n}' };

    const pageNumbersBtn = document.getElementById('pagenumbers-btn');
    try {
        setLoading(pageNumbersBtn, 'Adding Page Numbers...');
        showStatus('info', 'Adding page numbers... This may take a moment.');
        const result = await PDFTools.addPageNumbers(currentFiles[0], options);
        LimitsManager.trackOperation();
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'Page numbers added successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('pagenumbers-info').style.display = 'none';
            document.getElementById('pagenumbers-options-group').style.display = 'none';
            document.getElementById('pagenumbers-actions').style.display = 'none';
            document.getElementById('pagenumbers-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(pageNumbersBtn, 'Add Page Numbers');
    }
}
