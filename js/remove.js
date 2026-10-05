/**
 * CleanVault - Remove Pages Tool Module
 */

// True while a Remove Pages operation is running. Guards against a second
// concurrent invocation performing the work (and spending an operation) a
// second time. Cleared in performRemovePages()'s outer finally.
let removePagesInFlight = false;

/**
 * Parse the "Pages to Remove" input.
 *
 * Only comma-separated whole page numbers are accepted. parseInt() is not used
 * as the validation mechanism because it silently rewrites bad input: "2.5"
 * becomes page 2, "1e1" becomes page 1 and "0x2" is read as hexadecimal. A
 * mixed entry such as "1,abc,3" was likewise discarded without telling the
 * user, so the tool removed a different set of pages than the one displayed.
 *
 * @param {string} pagesText - raw field value
 * @returns {{pages: number[], count: number, error: string|null}}
 */
function parseRemovePageInput(pagesText) {
    const trimmed = pagesText.trim();
    if (!trimmed) {
        return { pages: [], count: 0, error: 'Please enter page numbers to remove' };
    }

    // Empty entries between commas are tolerated so a trailing comma does not
    // fail the whole input, but any non-numeric entry is rejected outright.
    const tokens = trimmed.split(',').map((token) => token.trim()).filter((token) => token !== '');
    if (tokens.length === 0) {
        return { pages: [], count: 0, error: 'Please enter page numbers to remove' };
    }

    const invalid = tokens.filter((token) => !/^\d+$/.test(token));
    if (invalid.length > 0) {
        return {
            pages: [],
            count: 0,
            error: `Invalid page number: ${invalid[0]}. Enter whole page numbers separated by commas (e.g., 1,3,5).`
        };
    }

    const pages = tokens.map((token) => parseInt(token, 10));
    // Report what will actually be removed: repeating a page number does not
    // remove it twice.
    const unique = Array.from(new Set(pages));
    return { pages: unique, count: unique.length, error: null };
}

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
        <div class="page-info" id="remove-page-info" style="display: none;">
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

function initializeRemoveTool() {
    const fileInput = document.getElementById('remove-file-input');
    const removeBtn = document.getElementById('remove-btn');
    const clearBtn = document.getElementById('clear-remove-btn');

    setupUploadArea('remove-upload-area', 'remove-file-input', (file) => handleRemoveFile(file));
    removeBtn.addEventListener('click', async () => await performRemovePages());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('remove-page-info').style.display = 'none';
        document.getElementById('remove-group').style.display = 'none';
        document.getElementById('remove-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleRemoveFile(file) {
    if (!file || !validatePDF(file)) return;
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('remove');
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
        showPageInfo('remove', file, info.pageCount);
        document.getElementById('remove-group').style.display = 'block';
        document.getElementById('remove-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF file.');
    }
}

async function performRemovePages() {
    // Re-entrancy guard. The button is disabled while loading, but that only
    // protects genuine UI clicks - direct or programmatic concurrent calls
    // would otherwise run twice, producing two downloads and consuming two of
    // the user's daily operations.
    if (removePagesInFlight) return;
    removePagesInFlight = true;

    try {
        if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }

        // Re-check the daily allowance at execution time. The limit is shared
        // across every tool and stored in localStorage, so it may have been
        // reached after this file was selected - for example by an operation
        // performed in a second tab.
        const limitCheck = LimitsManager.canUseTool('remove');
        if (!limitCheck.allowed) {
            showStatus('error', limitCheck.reason);
            return;
        }

        // Re-check the page limit at execution time as defence in depth, using
        // the page count read from the file we are about to process rather
        // than the value cached at selection time.
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

        const parsed = parseRemovePageInput(document.getElementById('remove-pages').value);
        if (parsed.error) { showStatus('error', parsed.error); return; }

        const removeBtn = document.getElementById('remove-btn');
        try {
            setLoading(removeBtn, 'Removing...');
            showStatus('info', 'Removing pages... This may take a moment.');
            const result = await PDFTools.removePDFPages(currentFile, parsed.pages);
            PDFTools.downloadFile(result.data, result.name);
            // Count the operation only once the resulting PDF has actually been
            // handed over. A failed transformation or a failed download then
            // costs the user nothing.
            LimitsManager.trackOperation();
            showStatus('success', `Removed ${parsed.count} page(s) successfully! Downloading...`);
            setTimeout(() => {
                currentFiles = [];
                document.getElementById('remove-page-info').style.display = 'none';
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
    } finally {
        removePagesInFlight = false;
    }
}