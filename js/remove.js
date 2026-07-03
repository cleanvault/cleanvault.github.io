/**
 * CleanVault - Remove Pages Tool Module
 * Also contains Password Protect (Pro) since both work on page deletion/security
 */

function getRemoveToolHTML() {
    return `
        <div class="tool-header">
            <h2>Remove Pages</h2>
            <p>Delete specific pages from your PDF</p>
        </div>
        <div class="upload-area" id="remove-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 16h16M16 24h16M16 32h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M28 16l-4 4 4 4M28 32l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to remove pages from</p>
            <input type="file" id="remove-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="remove-info" style="display: none;">
            <strong>File:</strong> <span id="remove-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="remove-total-pages"></span>
        </div>
        <div class="form-group" id="remove-group" style="display: none;">
            <label for="remove-pages">Pages to Remove</label>
            <input type="text" id="remove-pages" placeholder="e.g., 2,5,8">
            <p class="form-hint">Enter page numbers to remove, separated by commas (e.g., 1,3,5)</p>
        </div>
        <div class="tool-actions" id="remove-actions" style="display: none;">
            <button class="btn btn-primary" id="remove-btn">Remove Pages</button>
            <button class="btn btn-secondary" id="clear-remove-btn">Clear</button>
        </div>
        <div class="status" id="remove-status"></div>
    `;
}

function getPasswordProtectToolHTML() {
    return `
        <div class="tool-header">
            <h2>Password Protect PDF <span class="pro-label">Pro</span></h2>
            <p>⚠️ Browser limitation: pdf-lib does not support PDF encryption. This feature outputs the PDF as-is. True encryption requires a server-side solution.</p>
        </div>
        <div class="upload-area" id="password-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v8l6 6M24 32a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to protect</p>
            <input type="file" id="password-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="password-info" style="display: none;">
            <strong>File:</strong> <span id="password-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="password-total-pages"></span>
        </div>
        <div class="form-group" id="password-options-group" style="display: none;">
            <label for="password-input">Password</label>
            <input type="password" id="password-input" placeholder="Enter password to protect PDF">
            <p class="form-hint">Choose a strong password. You will need this to open the PDF.</p>
        </div>
        <div class="tool-actions" id="password-actions" style="display: none;">
            <button class="btn btn-primary" id="password-btn">Protect PDF</button>
            <button class="btn btn-secondary" id="clear-password-btn">Clear</button>
        </div>
        <div class="status" id="password-status"></div>
    `;
}

// ============================================
// REMOVE PAGES
// ============================================

function initializeRemoveTool() {
    const fileInput = document.getElementById('remove-file-input');
    const removeBtn = document.getElementById('remove-btn');
    const clearBtn = document.getElementById('clear-remove-btn');

    setupUploadArea('remove-upload-area', 'remove-file-input', (file) => handleRemoveFile(file));
    removeBtn.addEventListener('click', async () => await performRemovePages());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('remove-info').style.display = 'none';
        document.getElementById('remove-group').style.display = 'none';
        document.getElementById('remove-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleRemoveFile(file) {
    if (!file || !validatePDF(file)) return;
    try {
        const info = await PDFTools.getPDFInfo(file);
        currentFiles = [file];
        showPageInfo('remove', file, info.pageCount);
        document.getElementById('remove-group').style.display = 'block';
        document.getElementById('remove-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file.');
    }
}

async function performRemovePages() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const pagesText = document.getElementById('remove-pages').value.trim();
    if (!pagesText) { showStatus('error', 'Please enter page numbers to remove'); return; }
    const pagesToRemove = pagesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (pagesToRemove.length === 0) { showStatus('error', 'Please enter valid page numbers'); return; }

    const removeBtn = document.getElementById('remove-btn');
    try {
        setLoading(removeBtn, 'Removing...');
        showStatus('info', 'Removing pages... This may take a moment.');
        const result = await PDFTools.removePDFPages(currentFiles[0], pagesToRemove);
        showStatus('success', `Removed ${pagesToRemove.length} page(s) successfully! Downloading...`);
        PDFTools.downloadFile(result.data, result.name);
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('remove-info').style.display = 'none';
            document.getElementById('remove-group').style.display = 'none';
            document.getElementById('remove-actions').style.display = 'none';
            document.getElementById('remove-file-input').value = '';
            document.getElementById('remove-pages').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(removeBtn, 'Remove Pages');
    }
}

// ============================================
// PASSWORD PROTECT (Pro)
// ============================================

function initializePasswordProtectTool() {
    const fileInput = document.getElementById('password-file-input');
    const protectBtn = document.getElementById('password-btn');
    const clearBtn = document.getElementById('clear-password-btn');

    setupUploadArea('password-upload-area', 'password-file-input', (file) => handlePasswordFile(file));
    protectBtn.addEventListener('click', async () => await performPasswordProtect());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('password-info').style.display = 'none';
        document.getElementById('password-options-group').style.display = 'none';
        document.getElementById('password-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handlePasswordFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { showStatus('error', 'Invalid file type. Please select a PDF file.'); return; }
    if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
        showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock password protection and all Pro features.');
        return;
    }
    try {
        const info = await PDFTools.getPDFInfo(file);
        currentFiles = [file];
        showPageInfo('password', file, info.pageCount);
        document.getElementById('password-options-group').style.display = 'block';
        document.getElementById('password-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF. Please ensure it is a valid, non-corrupted PDF file.');
    }
}

async function performPasswordProtect() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const password = document.getElementById('password-input').value;
    if (!password) { showStatus('error', 'Please enter a password'); return; }

    const protectBtn = document.getElementById('password-btn');
    try {
        setLoading(protectBtn, 'Protecting...');
        showStatus('info', 'Protecting PDF... This may take a moment.');
        const result = await PDFTools.passwordProtectPDF(currentFiles[0], password);
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'PDF protected successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('password-info').style.display = 'none';
            document.getElementById('password-options-group').style.display = 'none';
            document.getElementById('password-actions').style.display = 'none';
            document.getElementById('password-file-input').value = '';
            document.getElementById('password-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(protectBtn, 'Protect PDF');
    }
}