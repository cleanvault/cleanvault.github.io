/**
 * CleanVault - Optimize PDF Tool Module
 */

function getCompressToolHTML() {
    return `
        <div class="tool-header">
            <h2>Optimize PDF</h2>
            <p>Clean up your PDF by removing metadata and optimizing structure</p>
        </div>
        <div class="upload-area" id="compress-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M20 20l8-4M20 28l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="24" cy="32" r="2" fill="currentColor"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to compress</p>
            <input type="file" id="compress-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="compress-info" style="display: none;">
            <strong>File:</strong> <span id="compress-file-name"></span><br>
            <strong>Original Size:</strong> <span id="compress-original-size"></span>
        </div>
        <div class="tool-actions" id="compress-actions" style="display: none;">
            <button class="btn btn-primary" id="compress-btn">Compress PDF</button>
            <button class="btn btn-secondary" id="clear-compress-btn">Clear</button>
        </div>
        <div class="status" id="compress-status"></div>
    `;
}

function initializeCompressTool() {
    const fileInput = document.getElementById('compress-file-input');
    const compressBtn = document.getElementById('compress-btn');
    const clearBtn = document.getElementById('clear-compress-btn');

    setupUploadArea('compress-upload-area', 'compress-file-input', (file) => handleCompressFile(file));
    compressBtn.addEventListener('click', async () => await performCompress());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('compress-info').style.display = 'none';
        document.getElementById('compress-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleCompressFile(file) {
    if (!file || !validatePDF(file)) return;
    try {
        currentFiles = [file];
        document.getElementById('compress-file-name').textContent = file.name;
        document.getElementById('compress-original-size').textContent = PDFTools.formatFileSize(file.size);
        document.getElementById('compress-info').style.display = 'block';
        document.getElementById('compress-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performCompress() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const compressBtn = document.getElementById('compress-btn');
    try {
        setLoading(compressBtn, 'Compressing...');
        showStatus('info', 'Compressing PDF... This may take a moment.');
        const result = await PDFTools.compressPDF(currentFiles[0]);
        const savings = ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1);
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', `Compressed! ${savings}% smaller (${PDFTools.formatFileSize(result.originalSize)} → ${PDFTools.formatFileSize(result.compressedSize)}). Downloading...`);
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('compress-info').style.display = 'none';
            document.getElementById('compress-actions').style.display = 'none';
            document.getElementById('compress-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(compressBtn, 'Compress PDF');
    }
}