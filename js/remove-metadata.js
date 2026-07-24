/**
 * CleanVault - Remove Metadata Tool Module
 */

function getRemoveMetadataToolHTML() {
    return `
        <div class="tool-header">
            <h2>Remove Metadata</h2>
            <p>Remove metadata (title, author, keywords, etc.) from your PDF.</p>
        </div>
        <div class="upload-area" id="remove-metadata-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M20 20l8-4M20 28l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="24" cy="32" r="2" fill="currentColor"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to remove metadata</p>
            <input type="file" id="remove-metadata-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="remove-metadata-info" style="display: none;">
            <strong>File:</strong> <span id="remove-metadata-file-name"></span><br>
            <strong>Original Size:</strong> <span id="remove-metadata-original-size"></span>
        </div>
        <div class="tool-actions" id="remove-metadata-actions" style="display: none;">
            <button class="btn btn-primary" id="remove-metadata-btn">Remove Metadata</button>
            <button class="btn btn-secondary" id="clear-remove-metadata-btn">Clear</button>
        </div>
        <div class="status" id="remove-metadata-status"></div>
    `;
}

function initializeRemoveMetadataTool() {
    const fileInput = document.getElementById('remove-metadata-file-input');
    const removeMetadataBtn = document.getElementById('remove-metadata-btn');
    const clearBtn = document.getElementById('clear-remove-metadata-btn');

    setupUploadArea('remove-metadata-upload-area', 'remove-metadata-file-input', (file) => handleRemoveMetadataFile(file));
    removeMetadataBtn.addEventListener('click', async () => await performRemoveMetadata());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('remove-metadata-info').style.display = 'none';
        document.getElementById('remove-metadata-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleRemoveMetadataFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('remove-metadata');
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
        document.getElementById('remove-metadata-file-name').textContent = file.name;
        document.getElementById('remove-metadata-original-size').textContent = PDFTools.formatFileSize(file.size);
        document.getElementById('remove-metadata-info').style.display = 'block';
        document.getElementById('remove-metadata-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performRemoveMetadata() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const removeMetadataBtn = document.getElementById('remove-metadata-btn');
    try {
        setLoading(removeMetadataBtn, 'Removing...');
        showStatus('info', 'Removing metadata... This may take a moment.');
        const result = await PDFTools.removeMetadataPDF(currentFiles[0]);
        LimitsManager.trackOperation();
        const sizeChange = ((1 - result.newSize / result.originalSize) * 100).toFixed(1);
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', `Metadata removed successfully! Downloading...`);
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('remove-metadata-info').style.display = 'none';
            document.getElementById('remove-metadata-actions').style.display = 'none';
            document.getElementById('remove-metadata-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(removeMetadataBtn, 'Remove Metadata');
    }
}
