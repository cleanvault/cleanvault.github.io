/**
 * CleanVault - Watermark Tool Module (Pro)
 */

function getWatermarkToolHTML() {
    return `
        <div class="tool-header">
            <h2>Add Watermark <span class="pro-label">Pro</span></h2>
            <p>Add custom text watermarks to every page</p>
        </div>
        <div class="upload-area" id="watermark-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v16M20 20l8-4M20 28l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="24" cy="32" r="2" fill="currentColor"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to add watermark</p>
            <input type="file" id="watermark-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="watermark-info" style="display: none;">
            <strong>File:</strong> <span id="watermark-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="watermark-total-pages"></span>
        </div>
        <div class="form-group" id="watermark-options-group" style="display: none;">
            <label for="watermark-text">Watermark Text</label>
            <input type="text" id="watermark-text" placeholder="e.g., CONFIDENTIAL, DRAFT" value="CONFIDENTIAL">
            <label>Font Size</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="font-size" value="24"><span>Small (24pt)</span></label>
                <label class="radio-option"><input type="radio" name="font-size" value="48" checked><span>Medium (48pt)</span></label>
                <label class="radio-option"><input type="radio" name="font-size" value="72"><span>Large (72pt)</span></label>
            </div>
            <label>Opacity</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="opacity" value="0.1"><span>Light (10%)</span></label>
                <label class="radio-option"><input type="radio" name="opacity" value="0.3" checked><span>Medium (30%)</span></label>
                <label class="radio-option"><input type="radio" name="opacity" value="0.5"><span>Strong (50%)</span></label>
            </div>
            <label>Rotation</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="watermark-rotation" value="-45"><span>-45°</span></label>
                <label class="radio-option"><input type="radio" name="watermark-rotation" value="0" checked><span>0°</span></label>
                <label class="radio-option"><input type="radio" name="watermark-rotation" value="45"><span>45°</span></label>
            </div>
            <label>Position</label>
            <div class="radio-group">
                <label class="radio-option"><input type="radio" name="position" value="top-left"><span>Top Left</span></label>
                <label class="radio-option"><input type="radio" name="position" value="top-right"><span>Top Right</span></label>
                <label class="radio-option"><input type="radio" name="position" value="center" checked><span>Center</span></label>
                <label class="radio-option"><input type="radio" name="position" value="bottom-left"><span>Bottom Left</span></label>
                <label class="radio-option"><input type="radio" name="position" value="bottom-right"><span>Bottom Right</span></label>
            </div>
        </div>
        <div class="tool-actions" id="watermark-actions" style="display: none;">
            <button class="btn btn-primary" id="watermark-btn">Add Watermark</button>
            <button class="btn btn-secondary" id="clear-watermark-btn">Clear</button>
        </div>
        <div class="status" id="watermark-status"></div>
    `;
}

function initializeWatermarkTool() {
    const fileInput = document.getElementById('watermark-file-input');
    const watermarkBtn = document.getElementById('watermark-btn');
    const clearBtn = document.getElementById('clear-watermark-btn');

    // Check Pro status (same gate placement as the other Pro tools)
    if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
        showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock watermarks and all Pro features.');
        return;
    }

    setupUploadArea('watermark-upload-area', 'watermark-file-input', (file) => handleWatermarkFile(file));
    watermarkBtn.addEventListener('click', async () => await performWatermark());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('watermark-info').style.display = 'none';
        document.getElementById('watermark-options-group').style.display = 'none';
        document.getElementById('watermark-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleWatermarkFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { showStatus('error', 'Invalid file type. Please select a PDF file.'); return; }
    
    // Check Pro status
    if (typeof LicenseManager !== 'undefined' && !LicenseManager.isActivated()) {
        showStatus('error', '⚠️ This is a Pro feature. Please upgrade to CleanVault Pro to unlock watermarks and all Pro features.');
        return;
    }
    
    // Check limits
    const limitCheck = LimitsManager.canUseTool('watermark');
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
        showPageInfo('watermark', file, info.pageCount);
        document.getElementById('watermark-options-group').style.display = 'block';
        document.getElementById('watermark-actions').style.display = 'flex';
    } catch (error) {
        showStatus('error', 'Failed to read PDF. Please ensure it is a valid, non-corrupted PDF file.');
    }
}

async function performWatermark() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const watermarkText = document.getElementById('watermark-text').value.trim();
    if (!watermarkText) { showStatus('error', 'Please enter watermark text'); return; }

    const options = {
        text: watermarkText,
        fontSize: parseInt(document.querySelector('input[name="font-size"]:checked').value),
        opacity: parseFloat(document.querySelector('input[name="opacity"]:checked').value),
        rotation: parseInt(document.querySelector('input[name="watermark-rotation"]:checked').value),
        position: document.querySelector('input[name="position"]:checked').value
    };

    const watermarkBtn = document.getElementById('watermark-btn');
    try {
        setLoading(watermarkBtn, 'Adding Watermark...');
        showStatus('info', 'Adding watermark to all pages... This may take a moment.');
        const result = await PDFTools.watermarkPDF(currentFiles[0], options);
        LimitsManager.trackOperation();
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'Watermark added successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('watermark-info').style.display = 'none';
            document.getElementById('watermark-options-group').style.display = 'none';
            document.getElementById('watermark-actions').style.display = 'none';
            document.getElementById('watermark-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(watermarkBtn, 'Add Watermark');
    }
}
