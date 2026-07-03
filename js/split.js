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

function initializeSplitTool() {
    const fileInput = document.getElementById('split-file-input');
    const splitBtn = document.getElementById('split-btn');
    const clearBtn = document.getElementById('clear-split-btn');

    setupUploadArea('split-upload-area', 'split-file-input', (file) => handleSplitFile(file));

    document.getElementsByName('split-mode').forEach(radio => {
        radio.addEventListener('change', () => {
            document.getElementById('split-ranges-input').style.display = radio.value === 'ranges' ? 'block' : 'none';
            document.getElementById('split-every-input').style.display = radio.value === 'every' ? 'block' : 'none';
        });
    });

    splitBtn.addEventListener('click', async () => await performSplit());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('split-page-info').style.display = 'none';
        document.getElementById('split-ranges-group').style.display = 'none';
        document.getElementById('split-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleSplitFile(file) {
    if (!file || !validatePDF(file)) return;
    try {
        const info = await PDFTools.getPDFInfo(file);
        currentFiles = [file];
        showPageInfo('split', file, info.pageCount);
        document.getElementById('split-ranges-group').style.display = 'block';
        document.getElementById('split-ranges-input').style.display = 'block';
        document.getElementById('split-actions').style.display = 'flex';
        const rangesTextarea = document.getElementById('split-ranges');
        rangesTextarea.value = info.pageCount >= 10
            ? `1-5, 10-${Math.min(20, info.pageCount)}`
            : `1-${Math.ceil(info.pageCount / 2)}`;
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

async function performSplit() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    let splitInput;

    if (mode === 'every') {
        const n = parseInt(document.getElementById('split-every').value);
        if (!n || n < 1) { showStatus('error', 'Please enter a valid number of pages per split (minimum 1).'); return; }
        splitInput = n;
    } else {
        const rangesText = document.getElementById('split-ranges').value.trim();
        if (!rangesText) { showStatus('error', 'Please enter at least one page range.'); return; }
        splitInput = rangesText.split('\n').map(l => l.trim()).filter(l => l);
        if (splitInput.length === 0) { showStatus('error', 'Please enter at least one page range.'); return; }
    }

    const splitBtn = document.getElementById('split-btn');
    try {
        setLoading(splitBtn, 'Splitting...');
        showStatus('info', 'Splitting PDF... This may take a moment.');
        const splitResults = await PDFTools.splitPDF(currentFiles[0], splitInput);
        splitResults.forEach((result, index) => {
            setTimeout(() => PDFTools.downloadFile(result.data, result.name), index * 500);
        });
        showStatus('success', `Successfully split into ${splitResults.length} PDF(s)! Downloading...`);
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('split-page-info').style.display = 'none';
            document.getElementById('split-ranges-group').style.display = 'none';
            document.getElementById('split-actions').style.display = 'none';
            document.getElementById('split-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(splitBtn, 'Split PDF');
    }
}