/**
 * CleanVault - Remove Metadata Tool Module
 */

// True while a Remove Metadata operation is running. Guards against a
// second concurrent invocation performing the work (and spending an operation)
// a second time. Cleared in performRemoveMetadata()'s outer finally.
let removeMetadataInFlight = false;

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
    // Re-entrancy guard. The button is disabled while loading, but that only
    // protects genuine UI clicks - direct or programmatic concurrent calls
    // would otherwise run twice, producing two downloads and consuming two of
    // the user's daily operations.
    if (removeMetadataInFlight) return;
    removeMetadataInFlight = true;

    try {
        if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

        // Re-check the daily allowance at execution time. The limit is shared
        // across every tool, so it may have been reached after this file was
        // selected - for example by another operation in a second tab.
        const limitCheck = LimitsManager.canUseTool('remove-metadata');
        if (!limitCheck.allowed) {
            showStatus('error', limitCheck.reason);
            return;
        }

        // Re-check the page limit at execution time as defence in depth, using
        // the page count read from the file we are about to process rather than
        // anything cached at selection time.
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

        const removeMetadataBtn = document.getElementById('remove-metadata-btn');
        try {
            setLoading(removeMetadataBtn, 'Removing...');
            showStatus('info', 'Removing metadata... This may take a moment.');
            const result = await PDFTools.removeMetadataPDF(currentFile);
            PDFTools.downloadFile(result.data, result.name);
            // Count the operation only once the cleaned PDF has actually been
            // handed over. A failed transformation or a failed download then
            // costs the user nothing.
            LimitsManager.trackOperation();
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
    } finally {
        removeMetadataInFlight = false;
    }
}
