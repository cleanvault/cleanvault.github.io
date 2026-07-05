/**
 * CleanVault - Remove Metadata Tool Module
 */

function getCompressToolHTML() {
    return `
        <div class="tool-header">
            <h2>Remove Metadata</h2>
            <p>Remove metadata (title, author, keywords, etc.) from your PDF.</p>
        </div>
        <div class="upload-area" id="optimize-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M20 20l8-4M20 28l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="24" cy="32" r="2" fill="currentColor"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to optimize</p>
            <input type="file" id="compress-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="optimize-info" style="display: none;">
            <strong>File:</strong> <span id="optimize-file-name"></span><br>
            <strong>Original Size:</strong> <span id="optimize-original-size"></span>
        </div>
        <div class="tool-actions" id="optimize-actions" style="display: none;">
            <button class="btn btn-primary" id="optimize-btn">Remove Metadata</button>
            <button class="btn btn-secondary" id="clear-optimize-btn">Clear</button>
        </div>
        <div class="status" id="optimize-status"></div>
    `;
}

function initializeCompressTool() {
    const fileInput = document.getElementById('optimize-file-input');
    const optimizeBtn = document.getElementById('optimize-btn');
    const clearBtn = document.getElementById('clear-optimize-btn');

    setupUploadArea('optimize-upload-area', 'optimize-file-input', (file) => handleCompressFile(file));
    optimizeBtn.addEventListener('click', async () => await performCompress());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('optimize-info').style.display = 'none';
        document.getElementById('optimize-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleCompressFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('compress');
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
        document.getElementById('optimize-file-name').textContent = file.name;
        document.getElementById('optimize-original-size').textContent = PDFTools.formatFileSize(file.size);
        document.getElementById('optimize-info').style.display = 'block';
        document.getElementById('optimize-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performCompress() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const optimizeBtn = document.getElementById('optimize-btn');
    try {
        setLoading(optimizeBtn, 'Removing...');
        showStatus('info', 'Removing metadata... This may take a moment.');
        const result = await PDFTools.compressPDF(currentFiles[0]);
        LimitsManager.trackOperation();
        const savings = ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1);
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', `Metadata removed successfully! Downloading...`);
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('optimize-info').style.display = 'none';
            document.getElementById('optimize-actions').style.display = 'none';
            document.getElementById('optimize-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(optimizeBtn, 'Remove Metadata');
    }
}
