/**
 * CleanVault - Shared UI Module
 * 
 * Handles tool switching, status messages, drag-and-drop, license UI, and upgrade flow.
 * All tool modules depend on this file.
 */

// Global state shared across all tool modules
let currentFiles = [];
let currentTool = null;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof PDFLib === 'undefined') {
        console.error('PDFLib not loaded');
        showStatus('error', 'Failed to load PDF library. Please check your internet connection and refresh the page.', 'global-status');
    }
    if (typeof LicenseManager !== 'undefined') {
        LicenseManager.init();
        initializeLicenseUI();
    }
});

/**
 * Show a specific tool interface
 * @param {string} toolName
 */
function showTool(toolName) {
    currentTool = toolName;
    currentFiles = [];

    const toolInterface = document.getElementById('tool-interface');
    const toolContent = document.getElementById('tool-content');

    document.getElementById('tools').style.display = 'none';
    document.getElementById('privacy').style.display = 'none';
    toolInterface.style.display = 'block';

    let content = '';
    switch(toolName) {
        case 'merge':      content = getMergeToolHTML(); break;
        case 'split':      content = getSplitToolHTML(); break;
        case 'extract':    content = getExtractToolHTML(); break;
        case 'rotate':     content = getRotateToolHTML(); break;
        case 'remove-metadata':   content = getRemoveMetadataToolHTML(); break;
        case 'reorder':    content = getReorderToolHTML(); break;
        case 'watermark':  content = getWatermarkToolHTML(); break;
        case 'pagenumbers': content = getPageNumbersToolHTML(); break;
        case 'remove':     content = getRemoveToolHTML(); break;
        case 'batch':      content = getBatchToolHTML(); break;
        default:           content = '<p>Tool not found</p>';
    }

    toolContent.innerHTML = content;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initializeTool(toolName);
}

/**
 * Hide tool interface and show main sections
 */
function hideTool() {
    const toolInterface = document.getElementById('tool-interface');
    document.getElementById('tools').style.display = 'block';
    document.getElementById('privacy').style.display = 'block';
    toolInterface.style.display = 'none';
    currentTool = null;
    currentFiles = [];
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Initialize tool-specific functionality
 * @param {string} toolName
 */
function initializeTool(toolName) {
    switch(toolName) {
        case 'merge':      initializeMergeTool(); break;
        case 'split':      initializeSplitTool(); break;
        case 'extract':    initializeExtractTool(); break;
        case 'rotate':     initializeRotateTool(); break;
        case 'remove-metadata':   initializeRemoveMetadataTool(); break;
        case 'reorder':    initializeReorderTool(); break;
        case 'watermark':  initializeWatermarkTool(); break;
        case 'pagenumbers': initializePageNumbersTool(); break;
        case 'remove':     initializeRemoveTool(); break;
        case 'batch':      initializeBatchTool(); break;
    }
}

/**
 * Show status message in tool-specific element if available, fallback to global
 * @param {string} type - success, error, info
 * @param {string} message
 * @param {string} specificId - Optional tool-specific status element ID
 */
function showStatus(type, message, specificId) {
    // Try tool-specific status element first
    let statusElement = null;
    if (specificId) {
        statusElement = document.getElementById(specificId);
    }
    if (!statusElement) {
        // Try to find status element within current tool
        const toolContent = document.getElementById('tool-content');
        if (toolContent) {
            statusElement = toolContent.querySelector('.status');
        }
    }
    // Fallback to any .status element
    if (!statusElement) {
        statusElement = document.querySelector('.status');
    }
    if (!statusElement) return;
    statusElement.className = `status ${type} show`;
    statusElement.textContent = message;
    if (type === 'success' || type === 'info') {
        setTimeout(() => statusElement.classList.remove('show'), 5000);
    }
}

/**
 * Initialize drag and drop for merge file list items
 * (Used by merge tool for reordering files)
 */
function initializeDragAndDrop() {
    const fileItems = document.querySelectorAll('.file-item');
    let draggedItem = null;

    fileItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && draggedItem !== item) {
                const bounding = item.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                if (e.clientY - offset > 0) {
                    item.parentNode.insertBefore(draggedItem, item.nextSibling);
                } else {
                    item.parentNode.insertBefore(draggedItem, item);
                }
                updateFilesOrder();
            }
        });
    });
}

/**
 * Update the currentFiles array order after drag and drop
 */
function updateFilesOrder() {
    const fileItems = document.querySelectorAll('.file-item');
    const newOrder = [];
    fileItems.forEach(item => {
        const index = parseInt(item.getAttribute('data-index'));
        if (currentFiles[index]) newOrder.push(currentFiles[index]);
    });
    currentFiles = newOrder;
    fileItems.forEach((item, newIndex) => item.setAttribute('data-index', newIndex));
}

/**
 * Set up drag-and-drop event listeners on a single-file upload area
 * @param {string} uploadAreaId
 * @param {string} fileInputId
 * @param {Function} onDrop - callback receiving File
 */
function setupUploadArea(uploadAreaId, fileInputId, onDrop) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) onDrop(e.target.files[0]);
    });
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files[0]) onDrop(e.dataTransfer.files[0]);
    });
}

/**
 * Set up drag-and-drop for multi-file upload areas (used by merge tool)
 * @param {string} uploadAreaId
 * @param {string} fileInputId
 * @param {Function} onDrop - callback receiving FileList
 */
function setupMultiUploadArea(uploadAreaId, fileInputId, onDrop) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) onDrop(e.target.files);
    });
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
    });
}

/**
 * Validate a single file is a PDF
 * @param {File} file
 * @returns {boolean}
 */
function validatePDF(file) {
    if (file.type !== 'application/pdf') {
        showStatus('error', 'Please select a valid PDF file');
        return false;
    }
    return true;
}

/**
 * Show page info after loading a PDF
 * @param {string} prefix - tool prefix (e.g. 'split', 'extract')
 * @param {File} file
 * @param {number} pageCount
 */
function showPageInfo(prefix, file, pageCount) {
    const fileNameEl = document.getElementById(`${prefix}-file-name`);
    const totalPagesEl = document.getElementById(`${prefix}-total-pages`);
    const pageInfoEl = document.getElementById(`${prefix}-page-info`);
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (totalPagesEl) totalPagesEl.textContent = pageCount;
    if (pageInfoEl) pageInfoEl.style.display = 'block';
}

/**
 * Set loading state on a button
 * @param {HTMLElement} btn
 * @param {string} loadingText
 */
function setLoading(btn, loadingText) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
}

/**
 * Reset button from loading state
 * @param {HTMLElement} btn
 * @param {string} originalText
 */
function unsetLoading(btn, originalText) {
    btn.disabled = false;
    btn.textContent = originalText;
}

// ============================================
// LICENSE MANAGEMENT
// ============================================

function initializeLicenseUI() {
    const activateBtn = document.getElementById('activate-btn');
    const deactivateBtn = document.getElementById('deactivate-btn');
    const licenseInput = document.getElementById('license-input');

    if (activateBtn) {
        activateBtn.addEventListener('click', async () => {
            const licenseKey = licenseInput.value.trim();
            if (!licenseKey) {
                showActivationStatus('Please enter a license key', 'error');
                return;
            }
            const result = await LicenseManager.activate(licenseKey);
            if (result.success) {
                showActivationStatus(result.message, 'success');
                licenseInput.value = '';
                activateBtn.textContent = '✅ Pro Activated';
                activateBtn.disabled = true;
                if (deactivateBtn) deactivateBtn.style.display = 'inline-block';
                // Update badge
                const proBadge = document.getElementById('pro-badge');
                if (proBadge) {
                    proBadge.textContent = 'Pro';
                    proBadge.classList.add('active');
                }
            } else {
                showActivationStatus(result.message, 'error');
            }
        });
    }

    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to deactivate CleanVault Pro?')) {
                LicenseManager.deactivate();
                showActivationStatus('CleanVault Pro deactivated', 'info');
                deactivateBtn.style.display = 'none';
                if (activateBtn) {
                    activateBtn.textContent = 'Activate Pro';
                    activateBtn.disabled = false;
                }
                const proBadge = document.getElementById('pro-badge');
                if (proBadge) {
                    proBadge.textContent = 'Free';
                    proBadge.classList.remove('active');
                }
            }
        });
    }

    if (LicenseManager.isActivated() && deactivateBtn) {
        deactivateBtn.style.display = 'inline-block';
    }
}

function showActivationStatus(message, type) {
    const statusElement = document.getElementById('activation-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `activation-status ${type}`;
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'activation-status';
        }, 5000);
    }
}

// ============================================
// UPGRADE HANDLER
// ============================================

function showUpgradeModal() {
    // Redirect to pricing section where Stripe links are located
    document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
}

// Make globally available for onclick handlers
window.showTool = showTool;
window.hideTool = hideTool;
window.showUpgradeModal = showUpgradeModal;
