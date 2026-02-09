// Box Creator - Port from picker.html with enhancements
// Handles PDF rendering and bounding box creation

// Get template ID from URL
const urlParams = new URLSearchParams(window.location.search);
const templateId = urlParams.get('templateId');

if (!templateId) {
    alert('No template ID provided');
    window.location.href = '/';
}

// State
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 0.8;
let boxes = []; // { page, x, y, w, h }
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentBox = null;
let isDragging = false;
let draggedBoxIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// DOM elements
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const boxesOverlay = document.getElementById('boxes-overlay');
const pdfContainer = document.getElementById('pdf-container');
const loading = document.getElementById('loading');

// PDF.js setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Initialize
async function init() {
    try {
        // Get template info
        const response = await fetch(`/api/templates/${templateId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load template');
        }

        // Load PDF (Note: We need to serve the PDF file)
        // For now, we'll load from a proxy endpoint
        const pdfUrl = `/api/templates/${templateId}/pdf`;

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;

        // Update UI
        document.getElementById('page-info').textContent = `${currentPage} / ${totalPages}`;
        document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';

        // Enable/disable navigation buttons
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
        alert('Failed to load PDF: ' + error.message);
    }
}

// Render PDF page
async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Set overlay dimensions
    boxesOverlay.style.width = viewport.width + 'px';
    boxesOverlay.style.height = viewport.height + 'px';

    // Render PDF page
    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    await page.render(renderContext).promise;

    // Render existing boxes for this page
    renderBoxes();
}

// Render all boxes for current page
function renderBoxes() {
    boxesOverlay.innerHTML = '';

    const pageBoxes = boxes.filter(b => b.page === currentPage);

    pageBoxes.forEach((box, index) => {
        const globalIndex = boxes.indexOf(box);
        
        // The box itself
        const boxDiv = document.createElement('div');
        boxDiv.className = 'bounding-box';
        boxDiv.style.position = 'absolute';
        boxDiv.style.left = box.x * scale + 'px';
        boxDiv.style.top = box.y * scale + 'px';
        boxDiv.style.width = box.w * scale + 'px';
        boxDiv.style.height = box.h * scale + 'px';
        boxDiv.dataset.boxIndex = globalIndex;

        // Add box ID label (draggable handle) - outside and above the box
        const label = document.createElement('div');
        label.className = 'box-id-label';
        label.textContent = `#${globalIndex + 1}`;
        label.dataset.boxIndex = globalIndex;
        label.style.cursor = 'move';
        label.addEventListener('mousedown', handleBoxDragStart);
        boxDiv.appendChild(label);
        
        // Delete button (top right, outside the box)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'box-delete-btn';
        deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        deleteBtn.title = 'Delete box';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteBox(globalIndex);
        };
        boxDiv.appendChild(deleteBtn);
        
        boxesOverlay.appendChild(boxDiv);
    });
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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

    // Box height change handler
    document.getElementById('box-height').addEventListener('input', (e) => {
        const newHeight = parseInt(e.target.value);
        const updatePrevious = document.getElementById('update-previous-boxes').checked;

        if (updatePrevious && boxes.length > 0) {
            // Update height of all existing boxes
            boxes.forEach(box => {
                box.h = newHeight;
            });

            // Re-render boxes with new height
            renderBoxes();
            updateBoxesList();
        }
    });

    // Mouse events for drawing boxes
    boxesOverlay.addEventListener('mousedown', handleMouseDown);
    boxesOverlay.addEventListener('mousemove', handleMouseMove);
    boxesOverlay.addEventListener('mouseup', handleMouseUp);
    
    // Mouse events for dragging boxes
    document.addEventListener('mousemove', handleBoxDragMove);
    document.addEventListener('mouseup', handleBoxDragEnd);

    // Save boxes
    document.getElementById('save-boxes-btn').addEventListener('click', saveBoxes);
}

// Handle mouse down - start drawing
function handleMouseDown(e) {
    // Don't start drawing if clicking on a box or its label
    if (e.target.classList.contains('box-id-label') || 
        e.target.classList.contains('bounding-box') ||
        e.target.classList.contains('box-delete-btn')) {
        return;
    }
    
    isDrawing = true;
    const rect = boxesOverlay.getBoundingClientRect();
    startX = (e.clientX - rect.left) / scale;
    startY = (e.clientY - rect.top) / scale;

    // Create temporary box element
    currentBox = document.createElement('div');
    currentBox.className = 'bounding-box';
    currentBox.style.position = 'absolute';
    currentBox.style.left = e.clientX - rect.left + 'px';
    currentBox.style.top = e.clientY - rect.top + 'px';
    currentBox.style.width = '0px';

    const boxHeight = parseInt(document.getElementById('box-height').value);
    currentBox.style.height = boxHeight * scale + 'px';

    boxesOverlay.appendChild(currentBox);
}

// Handle mouse move - resize box
function handleMouseMove(e) {
    if (!isDrawing || !currentBox) return;

    const rect = boxesOverlay.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const width = currentX - (startX * scale);

    if (width > 0) {
        currentBox.style.width = width + 'px';
    }
}

// Handle mouse up - finalize box
function handleMouseUp(e) {
    if (!isDrawing || !currentBox) return;

    isDrawing = false;

    const rect = boxesOverlay.getBoundingClientRect();
    const endX = (e.clientX - rect.left) / scale;
    const width = Math.abs(endX - startX);
    const boxHeight = parseInt(document.getElementById('box-height').value);

    // Only save if width is significant
    if (width > 10) {
        boxes.push({
            page: currentPage,
            x: Math.min(startX, endX),
            y: startY,
            w: width,
            h: boxHeight
        });

        updateBoxCount();
        updateBoxesList();
    }

    // Remove temporary box and re-render from state
    currentBox.remove();
    currentBox = null;
    renderBoxes();
}

// Delete box
function deleteBox(index) {
    if (confirm(`Delete Box #${index + 1}?`)) {
        boxes.splice(index, 1);
        renderBoxes();
        updateBoxCount();
        updateBoxesList();
    }
}

// Handle box drag start (only from label)
function handleBoxDragStart(e) {
    e.stopPropagation();
    isDragging = true;
    draggedBoxIndex = parseInt(e.target.dataset.boxIndex);
    
    const box = boxes[draggedBoxIndex];
    const rect = boxesOverlay.getBoundingClientRect();
    
    dragOffsetX = e.clientX - rect.left - (box.x * scale);
    dragOffsetY = e.clientY - rect.top - (box.y * scale);
    
    // Prevent text selection while dragging
    e.preventDefault();
}

// Handle box drag move
function handleBoxDragMove(e) {
    if (!isDragging || draggedBoxIndex === null) return;
    
    const rect = boxesOverlay.getBoundingClientRect();
    const newX = (e.clientX - rect.left - dragOffsetX) / scale;
    const newY = (e.clientY - rect.top - dragOffsetY) / scale;
    
    // Update box position
    boxes[draggedBoxIndex].x = Math.max(0, newX);
    boxes[draggedBoxIndex].y = Math.max(0, newY);
    
    // Re-render
    renderBoxes();
}

// Handle box drag end
function handleBoxDragEnd(e) {
    if (isDragging) {
        isDragging = false;
        draggedBoxIndex = null;
        updateBoxesList();
    }
}

// Update box count display
function updateBoxCount() {
    document.getElementById('box-count').textContent = `${boxes.length} boxes`;
    document.getElementById('save-boxes-btn').disabled = boxes.length === 0;
}

// Update boxes list in sidebar
function updateBoxesList() {
    const list = document.getElementById('boxes-list');

    if (boxes.length === 0) {
        list.textContent = 'No boxes created yet';
        return;
    }

    list.innerHTML = boxes.map((box, index) =>
        `<div class="py-1">Box #${index + 1} - Page ${box.page}</div>`
    ).join('');
}

// Update navigation buttons
function updateNavButtons() {
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
    document.getElementById('page-info').textContent = `${currentPage} / ${totalPages}`;
}

// Save boxes to database
async function saveBoxes() {
    if (boxes.length === 0) {
        alert('Please create at least one bounding box');
        return;
    }

    try {
        const response = await fetch('/api/boxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: parseInt(templateId),
                boxes: boxes
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to save boxes');
        }

        alert(`Successfully saved ${data.count} bounding boxes!`);

        // Redirect to field mapper
        window.location.href = `/pages/map-fields.html?templateId=${templateId}`;

    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save boxes: ' + error.message);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
