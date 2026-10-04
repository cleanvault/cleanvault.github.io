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
        // Reset the page numbers too, otherwise stale entries silently carry
        // over to the next PDF the customer selects.
        document.getElementById('extract-pages').value = '';
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

/**
 * Parse a comma-separated list of 1-based page numbers.
 *
 * Every entry must be a positive whole number. parseInt() is deliberately not
 * used here: it is prefix-based and would silently rewrite "1abc" to 1,
 * "3.9" to 3 and "0x10" to 16, and a filter would silently discard malformed
 * entries. Any invalid entry rejects the whole input instead.
 *
 * Duplicates and the requested order are preserved.
 *
 * @param {string} text - raw input from the page number field
 * @returns {{ok: boolean, pages: number[], error: string}}
 */
function parseExtractPageList(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
        return { ok: false, pages: [], error: '' };
    }

    const parts = trimmed.split(',');
    const pages = [];
    for (const part of parts) {
        const value = part.trim();
        if (!/^\d+$/.test(value)) {
            return {
                ok: false,
                pages: [],
                error: `"${value}" is not a valid page number. Enter whole page numbers separated by commas, for example 1,3,5.`
            };
        }
        const num = parseInt(value, 10);
        if (num < 1) {
            return {
                ok: false,
                pages: [],
                error: 'Page numbers start at 1, so 0 and negative values are not valid.'
            };
        }
        pages.push(num);
    }

    return { ok: true, pages, error: '' };
}

async function performExtract() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

    // Validate the whole input before processing so a typo can never be
    // silently corrected into the wrong set of pages.
    const pagesInput = document.getElementById('extract-pages');
    const parsed = parseExtractPageList(pagesInput ? pagesInput.value : '');
    if (!parsed.ok) {
        showStatus('error', parsed.error || 'Please enter page numbers');
        return;
    }
    const pageNumbers = parsed.pages;

    const extractBtn = document.getElementById('extract-btn');
    try {
        setLoading(extractBtn, 'Extracting...');
        showStatus('info', 'Extracting pages... This may take a moment.');
        const result = await PDFTools.extractPages(currentFiles[0], pageNumbers);
        LimitsManager.trackOperation();
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'Pages extracted successfully!');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('extract-page-info').style.display = 'none';
            document.getElementById('extract-pages-group').style.display = 'none';
            document.getElementById('extract-actions').style.display = 'none';
            document.getElementById('extract-pages').value = '';
            document.getElementById('extract-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(extractBtn, 'Extract Pages');
    }
}
