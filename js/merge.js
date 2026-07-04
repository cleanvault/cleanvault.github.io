/**
 * CleanVault - Merge PDF Tool Module
 */

function getMergeToolHTML() {
    return `
        <div class="tool-header">
            <h2>Merge PDF Files</h2>
            <p>Combine multiple PDFs into one document. Drag to reorder files.</p>
        </div>
        <div class="upload-area" id="merge-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <p><strong>Click to select PDF files</strong> or drag and drop</p>
            <p class="form-hint">You can select multiple PDF files</p>
            <input type="file" id="merge-file-input" accept=".pdf" multiple>
        </div>
        <div class="file-list" id="merge-file-list"></div>
        <div class="tool-actions">
            <button class="btn btn-primary" id="merge-btn" disabled>Merge PDFs</button>
            <button class="btn btn-secondary" id="clear-merge-btn" style="display: none;">Clear All</button>
        </div>
        <div class="status" id="merge-status"></div>
    `;
}

function initializeMergeTool() {
    const uploadArea = document.getElementById('merge-upload-area');
    const fileInput = document.getElementById('merge-file-input');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-merge-btn');

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleMergeFiles(e.target.files));
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleMergeFiles(e.dataTransfer.files); });
    mergeBtn.addEventListener('click', async () => await performMerge());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        updateMergeFileList();
        mergeBtn.disabled = true;
        clearBtn.style.display = 'none';
        fileInput.value = '';
    });
}

function handleMergeFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        if (file.type !== 'application/pdf') {
            showStatus('error', `"${file.name}" is not a PDF file`);
            return false;
        }
        return true;
    });
    if (validFiles.length > 0) {
        currentFiles = [...currentFiles, ...validFiles];
        updateMergeFileList();
        document.getElementById('merge-btn').disabled = currentFiles.length < 2;
        document.getElementById('clear-merge-btn').style.display = 'block';
    }
}

function updateMergeFileList() {
    const fileList = document.getElementById('merge-file-list');
    if (currentFiles.length === 0) { fileList.innerHTML = ''; return; }
    let html = '<h4>Selected Files:</h4>';
    currentFiles.forEach((file, index) => {
        html += `
            <div class="file-item" draggable="true" data-index="${index}">
                <div class="file-info">
                    <span class="drag-handle">☰</span>
                    <svg class="file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${PDFTools.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="removeMergeFile(${index})">×</button>
            </div>`;
    });
    fileList.innerHTML = html;
    initializeDragAndDrop();
}

function removeMergeFile(index) {
    currentFiles.splice(index, 1);
    updateMergeFileList();
    document.getElementById('merge-btn').disabled = currentFiles.length < 2;
    if (currentFiles.length === 0) document.getElementById('clear-merge-btn').style.display = 'none';
}

async function performMerge() {
    if (currentFiles.length < 2) { showStatus('error', 'Please select at least 2 PDF files to merge'); return; }
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('merge');
    if (!limitCheck.allowed) {
        showStatus('error', limitCheck.reason);
        return;
    }
    
    const mergeBtn = document.getElementById('merge-btn');
    try {
        setLoading(mergeBtn, 'Merging...');
        showStatus('info', 'Merging PDFs... This may take a moment.');
        const mergedPdfBytes = await PDFTools.mergePDFs(currentFiles);
        LimitsManager.trackOperation();
        PDFTools.downloadFile(mergedPdfBytes, 'merged.pdf');
        showStatus('success', 'PDFs merged successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            updateMergeFileList();
            mergeBtn.disabled = true;
            document.getElementById('clear-merge-btn').style.display = 'none';
            document.getElementById('merge-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(mergeBtn, 'Merge PDFs');
    }
}

window.removeMergeFile = removeMergeFile;