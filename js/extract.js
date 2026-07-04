/**
 * CleanVault - Extract Pages Tool Module
 */

function getExtractToolHTML() {
    return `
        <div class="tool-header">
            <h2>Extract Pages</h2>
            <p>Extract and download specific pages from your PDF</p>
        </div>
        <div class="upload-area" id="extract-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 20h16M16 28h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to extract pages from</p>
            <input type="file" id="extract-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="extract-page-info" style="display: none;">
            <strong>File:</strong> <span id="extract-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="extract-total-pages"></span>
        </div>
        <div class="form-group" id="extract-pages-group" style="display: none;">
            <label for="extract-pages">Page Numbers</label>
            <input type="text" id="extract-pages" placeholder="e.g., 2,5,8,10">
            <p class="form-hint">Enter page numbers separated by commas (e.g., 1,3,5,7)</p>
        </div>
        <div class="tool-actions" id="extract-actions" style="display: none;">
            <button class="btn btn-primary" id="extract-btn">Extract Pages</button>
            <button class="btn btn-secondary" id="clear-extract-btn">Clear</button>
        </div>
        <div class="status" id="extract-status"></div>
    `;
}

function initializeExtractTool() {
    const fileInput = document.getElementById('extract-file-input');
    const extractBtn = document.getElementById('extract-btn');
    const clearBtn = document.getElementById('clear-extract-btn');

    setupUploadArea('extract-upload-area', 'extract-file-input', (file) => handleExtractFile(file));
    extractBtn.addEventListener('click', async () => await performExtract());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('extract-page-info').style.display = 'none';
        document.getElementById('extract-pages-group').style.display = 'none';
        document.getElementById('extract-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleExtractFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('extract');
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
        showPageInfo('extract', file, info.pageCount);
        document.getElementById('extract-pages-group').style.display = 'block';
        document.getElementById('extract-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performExtract() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const pagesText = document.getElementById('extract-pages').value.trim();
    if (!pagesText) { showStatus('error', 'Please enter page numbers'); return; }
    const pageNumbers = pagesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (pageNumbers.length === 0) { showStatus('error', 'Please enter valid page numbers'); return; }

    const extractBtn = document.getElementById('extract-btn');
    try {
        setLoading(extractBtn, 'Extracting...');
        showStatus('info', 'Extracting pages... This may take a moment.');
        const result = await PDFTools.extractPages(currentFiles[0], pageNumbers);
        LimitsManager.trackOperation();
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'Pages extracted successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('extract-page-info').style.display = 'none';
            document.getElementById('extract-pages-group').style.display = 'none';
            document.getElementById('extract-actions').style.display = 'none';
            document.getElementById('extract-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(extractBtn, 'Extract Pages');
    }
}
