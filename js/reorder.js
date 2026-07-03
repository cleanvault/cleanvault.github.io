/**
 * CleanVault - Reorder Pages Tool Module
 */

function getReorderToolHTML() {
    return `
        <div class="tool-header">
            <h2>Reorder Pages</h2>
            <p>Arrange pages in any order with simple drag and drop</p>
        </div>
        <div class="upload-area" id="reorder-upload-area">
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M24 16v8l6 6M24 32a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p><strong>Click to select a PDF file</strong> or drag and drop</p>
            <p class="form-hint">Select one PDF file to reorder pages</p>
            <input type="file" id="reorder-file-input" accept=".pdf">
        </div>
        <div class="page-info" id="reorder-info" style="display: none;">
            <strong>File:</strong> <span id="reorder-file-name"></span><br>
            <strong>Total Pages:</strong> <span id="reorder-total-pages"></span>
        </div>
        <div class="form-group" id="reorder-pages-group" style="display: none;">
            <label>Page Order</label>
            <p class="form-hint">Drag and drop pages to reorder them. The new order will be applied when you click "Reorder PDF".</p>
            <div id="reorder-pages-list" class="reorder-pages-list"></div>
        </div>
        <div class="tool-actions" id="reorder-actions" style="display: none;">
            <button class="btn btn-primary" id="reorder-btn">Reorder PDF</button>
            <button class="btn btn-secondary" id="clear-reorder-btn">Clear</button>
        </div>
        <div class="status" id="reorder-status"></div>
    `;
}

function initializeReorderTool() {
    const fileInput = document.getElementById('reorder-file-input');
    const reorderBtn = document.getElementById('reorder-btn');
    const clearBtn = document.getElementById('clear-reorder-btn');

    setupUploadArea('reorder-upload-area', 'reorder-file-input', (file) => handleReorderFile(file));
    reorderBtn.addEventListener('click', async () => await performReorder());
    clearBtn.addEventListener('click', () => {
        currentFiles = [];
        document.getElementById('reorder-info').style.display = 'none';
        document.getElementById('reorder-pages-group').style.display = 'none';
        document.getElementById('reorder-actions').style.display = 'none';
        fileInput.value = '';
    });
}

async function handleReorderFile(file) {
    if (!file || !validatePDF(file)) return;
    try {
        const info = await PDFTools.getPDFInfo(file);
        currentFiles = [file];
        showPageInfo('reorder', file, info.pageCount);
        document.getElementById('reorder-pages-group').style.display = 'block';
        document.getElementById('reorder-actions').style.display = 'flex';

        const pagesList = document.getElementById('reorder-pages-list');
        pagesList.innerHTML = '';
        for (let i = 1; i <= info.pageCount; i++) {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            pageItem.draggable = true;
            pageItem.setAttribute('data-page', i);
            pageItem.innerHTML = `<span class="drag-handle">☰</span><span class="page-number">Page ${i}</span>`;
            pagesList.appendChild(pageItem);
        }
        initializePageReorderDragDrop();
    } catch (error) {
        showStatus('error', 'Failed to read PDF file. Please ensure it is a valid PDF.');
    }
}

function initializePageReorderDragDrop() {
    const pageItems = document.querySelectorAll('.page-item');
    let draggedItem = null;
    pageItems.forEach(item => {
        item.addEventListener('dragstart', (e) => { draggedItem = item; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
        item.addEventListener('dragend', () => { item.classList.remove('dragging'); draggedItem = null; });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && draggedItem !== item) {
                const bounding = item.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                if (e.clientY - offset > 0) item.parentNode.insertBefore(draggedItem, item.nextSibling);
                else item.parentNode.insertBefore(draggedItem, item);
            }
        });
    });
}

async function performReorder() {
    if (!currentFiles[0]) { showStatus('error', 'Please select a PDF file first'); return; }
    const pageItems = document.querySelectorAll('.page-item');
    const newOrder = Array.from(pageItems).map(item => parseInt(item.getAttribute('data-page')));
    if (newOrder.length === 0) { showStatus('error', 'No pages to reorder'); return; }

    const reorderBtn = document.getElementById('reorder-btn');
    try {
        setLoading(reorderBtn, 'Reordering...');
        showStatus('info', 'Reordering pages... This may take a moment.');
        const result = await PDFTools.reorderPDF(currentFiles[0], newOrder);
        PDFTools.downloadFile(result.data, result.name);
        showStatus('success', 'Pages reordered successfully! Downloading...');
        setTimeout(() => {
            currentFiles = [];
            document.getElementById('reorder-info').style.display = 'none';
            document.getElementById('reorder-pages-group').style.display = 'none';
            document.getElementById('reorder-actions').style.display = 'none';
            document.getElementById('reorder-file-input').value = '';
        }, 2000);
    } catch (error) {
        showStatus('error', error.message);
    } finally {
        unsetLoading(reorderBtn, 'Reorder PDF');
    }
}