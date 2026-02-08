// Field Mapper - Multi-box selection and field creation
// Allows selecting multiple boxes and mapping them to form fields

// Get template ID from URL
const urlParams = new URLSearchParams(window.location.search);
const templateId = urlParams.get('templateId');

if (!templateId) {
    alert('No template ID provided');
    window.location.href = '/';
}

// Pastel colors for fields (10 colors)
const PASTEL_COLORS = [
    { name: 'lavender', bg: '#E6E6FA', border: '#9370DB' },
    { name: 'mint', bg: '#F0FFF0', border: '#98FB98' },
    { name: 'peach', bg: '#FFE5CC', border: '#FFB347' },
    { name: 'sky', bg: '#E0F4FF', border: '#87CEEB' },
    { name: 'rose', bg: '#FFE4E1', border: '#FFB6C1' },
    { name: 'lemon', bg: '#FFFACD', border: '#F0E68C' },
    { name: 'aqua', bg: '#E0FFFF', border: '#7FFFD4' },
    { name: 'coral', bg: '#FFF0F5', border: '#FF7F50' },
    { name: 'lilac', bg: '#F5F0FF', border: '#DDA0DD' },
    { name: 'sage', bg: '#F0F8E8', border: '#8FBC8F' }
];

// State
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.0;
let boxes = []; // All boxes from database
let selectedBoxIds = new Set();
let fields = []; // Created field mappings { fieldName, fieldLabel, fieldType, fontSize, boxIds, colorIndex }
let colorIndex = 0;

// DOM elements
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const boxesOverlay = document.getElementById('boxes-overlay');
const pdfContainer = document.getElementById('pdf-container');
const loading = document.getElementById('loading');
const modal = document.getElementById('field-modal');

// PDF.js setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Initialize
async function init() {
    try {
        // Load boxes from database
        const boxesResponse = await fetch(`/api/boxes/${templateId}`);
        const boxesData = await boxesResponse.json();

        if (!boxesData.success) {
            throw new Error('Failed to load boxes');
        }

        boxes = boxesData.boxes;

        if (boxes.length === 0) {
            alert('No boxes found. Please create boxes first.');
            window.location.href = `/pages/create-boxes.html?templateId=${templateId}`;
            return;
        }

        // Load PDF
        const pdfUrl = `/api/templates/${templateId}/pdf`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;

        // Update UI
        updateNavButtons();

        // Render first page
        await renderPage(currentPage);

        // Hide loading, show PDF
        loading.classList.add('hidden');
        pdfContainer.classList.remove('hidden');

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load: ' + error.message);
    }
}

// Render PDF page with boxes
async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    boxesOverlay.style.width = viewport.width + 'px';
    boxesOverlay.style.height = viewport.height + 'px';

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    await page.render(renderContext).promise;

    // Render boxes for this page
    renderBoxes();
}

// Render all boxes for current page
function renderBoxes() {
    boxesOverlay.innerHTML = '';

    const pageBoxes = boxes.filter(b => b.page === currentPage);

    pageBoxes.forEach(box => {
        const boxDiv = document.createElement('div');
        boxDiv.className = 'bounding-box cursor-pointer';
        boxDiv.style.left = box.x * scale + 'px';
        boxDiv.style.top = box.y * scale + 'px';
        boxDiv.style.width = box.width * scale + 'px';
        boxDiv.style.height = box.height * scale + 'px';
        boxDiv.dataset.boxId = box.id;

        // Check if box is already mapped to a field
        const mappedField = fields.find(f => f.boxIds.includes(box.id));
        if (mappedField) {
            const color = PASTEL_COLORS[mappedField.colorIndex];
            boxDiv.style.backgroundColor = color.bg;
            boxDiv.style.borderColor = color.border;

            // Add field label
            const label = document.createElement('div');
            label.className = 'box-id-label';
            label.textContent = mappedField.fieldLabel;
            label.style.backgroundColor = color.border;
            boxDiv.appendChild(label);
        } else {
            // Add box ID label
            const label = document.createElement('div');
            label.className = 'box-id-label';
            label.textContent = `#${box.id}`;
            boxDiv.appendChild(label);
        }

        // Highlight if selected
        if (selectedBoxIds.has(box.id)) {
            boxDiv.classList.add('selected');
        }

        // Click handler for selection
        boxDiv.addEventListener('click', () => toggleBoxSelection(box.id));

        boxesOverlay.appendChild(boxDiv);
    });
}

// Toggle box selection
function toggleBoxSelection(boxId) {
    // Check if box is already mapped
    const isMapped = fields.some(f => f.boxIds.includes(boxId));
    if (isMapped) {
        alert('This box is already mapped to a field. Delete the field first to remap.');
        return;
    }

    if (selectedBoxIds.has(boxId)) {
        selectedBoxIds.delete(boxId);
    } else {
        selectedBoxIds.add(boxId);
    }

    renderBoxes();
    updateSelectedBoxesList();
    updateCreateFieldButton();
}

// Update selected boxes list in sidebar
function updateSelectedBoxesList() {
    const list = document.getElementById('selected-boxes-list');

    if (selectedBoxIds.size === 0) {
        list.innerHTML = '<p class="text-gray-500">No boxes selected</p>';
        return;
    }

    const selectedBoxes = boxes.filter(b => selectedBoxIds.has(b.id));
    list.innerHTML = selectedBoxes.map(box =>
        `<div class="py-1">Box #${box.id} (Page ${box.page})</div>`
    ).join('');
}

// Update create field button state
function updateCreateFieldButton() {
    document.getElementById('create-field-btn').disabled = selectedBoxIds.size === 0;
}

// Setup event listeners
function setupEventListeners() {
    // Page navigation
    document.getElementById('prev-page').addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderPage(currentPage);
            updateNavButtons();
        }
    });

    document.getElementById('next-page').addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await renderPage(currentPage);
            updateNavButtons();
        }
    });

    // Zoom
    document.getElementById('zoom-slider').addEventListener('input', async (e) => {
        scale = parseFloat(e.target.value);
        document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
        await renderPage(currentPage);
    });

    // Create field button
    document.getElementById('create-field-btn').addEventListener('click', openFieldModal);

    // Modal cancel
    document.getElementById('cancel-modal').addEventListener('click', closeFieldModal);

    // Modal form submit
    document.getElementById('field-form').addEventListener('submit', createField);

    // Finish mapping
    document.getElementById('finish-mapping-btn').addEventListener('click', finishMapping);
}

// Open field creation modal
function openFieldModal() {
    document.getElementById('modal-box-count').textContent = selectedBoxIds.size;
    modal.classList.add('active');
}

// Close modal
function closeFieldModal() {
    modal.classList.remove('active');
    document.getElementById('field-form').reset();
}

// Create field from modal
async function createField(e) {
    e.preventDefault();

    const fieldName = document.getElementById('field-name').value.trim();
    const fieldLabel = document.getElementById('field-label').value.trim();
    const fieldType = document.getElementById('field-type').value;
    const fontSize = parseInt(document.getElementById('field-font-size').value);

    // Validate field name is unique
    if (fields.some(f => f.fieldName === fieldName)) {
        alert('Field name must be unique!');
        return;
    }

    try {
        // Save to database
        const response = await fetch('/api/mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: parseInt(templateId),
                fieldName,
                fieldLabel,
                fieldType,
                fontSize,
                boxIds: Array.from(selectedBoxIds)
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to create field mapping');
        }

        // Add to local fields array
        fields.push({
            id: data.fieldMappingId,
            fieldName,
            fieldLabel,
            fieldType,
            fontSize,
            boxIds: Array.from(selectedBoxIds),
            colorIndex: colorIndex % PASTEL_COLORS.length
        });

        colorIndex++;

        // Clear selection
        selectedBoxIds.clear();

        // Update UI
        closeFieldModal();
        updateFieldsList();
        updateSelectedBoxesList();
        updateCreateFieldButton();
        updateFinishButton();
        renderBoxes();

        alert(`Field "${fieldLabel}" created successfully!`);

    } catch (error) {
        console.error('Create field error:', error);
        alert('Failed to create field: ' + error.message);
    }
}

// Update fields list in sidebar
function updateFieldsList() {
    const list = document.getElementById('fields-list');
    document.getElementById('field-count').textContent = `${fields.length} fields`;

    if (fields.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No fields created yet</p>';
        return;
    }

    list.innerHTML = fields.map(field => {
        const color = PASTEL_COLORS[field.colorIndex];
        return `
            <div class="border rounded p-2" style="border-color: ${color.border}; background-color: ${color.bg}">
                <div class="font-semibold text-sm">${field.fieldLabel}</div>
                <div class="text-xs text-gray-600">${field.boxIds.length} boxes • ${field.fieldType}</div>
                <button onclick="deleteField(${field.id})" class="text-xs text-red-600 hover:text-red-800 mt-1">Delete</button>
            </div>
        `;
    }).join('');
}

// Delete field (global function for onclick)
window.deleteField = async function (fieldId) {
    if (!confirm('Delete this field mapping?')) return;

    try {
        const response = await fetch(`/api/mappings/${fieldId}`, { method: 'DELETE' });
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to delete field');
        }

        // Remove from local array
        fields = fields.filter(f => f.id !== fieldId);

        // Update UI
        updateFieldsList();
        updateFinishButton();
        renderBoxes();

    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete field: ' + error.message);
    }
};

// Update finish button state
function updateFinishButton() {
    document.getElementById('finish-mapping-btn').disabled = fields.length === 0;
}

// Update navigation buttons
function updateNavButtons() {
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
    document.getElementById('page-info').textContent = `Page ${currentPage} / ${totalPages}`;
}

// Finish mapping and go to form builder
function finishMapping() {
    if (fields.length === 0) {
        alert('Please create at least one field mapping');
        return;
    }

    // Redirect to form builder
    window.location.href = `/pages/fill-form.html?templateId=${templateId}`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
