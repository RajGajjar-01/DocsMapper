// Form Builder - Dynamic form generation and export
// Loads field mappings and generates form, handles export to PDF/DOCX

// Get template ID from URL
const urlParams = new URLSearchParams(window.location.search);
const templateId = urlParams.get('templateId');

if (!templateId) {
    alert('No template ID provided');
    window.location.href = '/';
}

// Pastel colors (same as field mapper)
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
let fields = [];
let formData = {};

// DOM elements
const loading = document.getElementById('loading');
const dynamicForm = document.getElementById('dynamic-form');
const formFields = document.getElementById('form-fields');
const exportModal = document.getElementById('export-modal');

// Initialize
async function init() {
    try {
        // Load field mappings from database
        const response = await fetch(`/api/mappings/${templateId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load field mappings');
        }

        fields = data.fields;

        if (fields.length === 0) {
            alert('No field mappings found. Please map fields first.');
            window.location.href = `/pages/map-fields.html?templateId=${templateId}`;
            return;
        }

        // Generate form
        generateForm();

        // Show form, hide loading
        loading.classList.add('hidden');
        dynamicForm.classList.remove('hidden');

        // Setup event listeners
        setupEventListeners();

        // Display mappings info
        displayMappingsInfo();

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load form: ' + error.message);
    }
}

// Generate form fields dynamically
function generateForm() {
    formFields.innerHTML = fields.map((field, index) => {
        const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
        const inputType = getInputType(field.field_type);

        return `
            <div class="form-field-group" style="border-left: 4px solid ${color.border}; background-color: ${color.bg}; padding: 1rem; border-radius: 0.375rem;">
                <label for="${field.field_name}" class="block text-sm font-medium text-gray-900 mb-2">
                    ${field.field_label}
                    <span class="text-xs text-gray-600 font-normal">(${field.box_ids.length} locations)</span>
                </label>
                <input 
                    type="${inputType}" 
                    id="${field.field_name}" 
                    name="${field.field_name}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter ${field.field_label.toLowerCase()}"
                />
            </div>
        `;
    }).join('');
}

// Get HTML input type from field type
function getInputType(fieldType) {
    const typeMap = {
        'text': 'text',
        'number': 'number',
        'email': 'email',
        'date': 'date'
    };
    return typeMap[fieldType] || 'text';
}

// Display mappings info
function displayMappingsInfo() {
    const mappingsInfo = document.getElementById('mappings-info');

    mappingsInfo.innerHTML = fields.map((field, index) => {
        const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
        return `
            <div class="flex items-center gap-2 p-2 rounded" style="background-color: ${color.bg}; border-left: 3px solid ${color.border};">
                <div class="flex-1">
                    <div class="font-semibold text-sm">${field.field_label}</div>
                    <div class="text-xs text-gray-600">${field.box_ids.length} boxes • ${field.field_type} • ${field.font_size}pt</div>
                </div>
            </div>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Export PDF
    document.getElementById('export-pdf-btn').addEventListener('click', () => exportDocument('pdf'));

    // Export DOCX
    document.getElementById('export-docx-btn').addEventListener('click', () => exportDocument('docx'));

    // Reset form
    document.getElementById('reset-form-btn').addEventListener('click', resetForm);

    // Track form changes
    dynamicForm.addEventListener('input', (e) => {
        formData[e.target.name] = e.target.value;
    });
}

// Collect form data
function collectFormData() {
    const data = {};

    fields.forEach(field => {
        const input = document.getElementById(field.field_name);
        if (input) {
            data[field.field_name] = input.value || '';
        }
    });

    return data;
}

// Export document
async function exportDocument(format) {
    // Collect form data
    const fieldData = collectFormData();

    // Validate: check if at least one field is filled
    const hasData = Object.values(fieldData).some(value => value.trim() !== '');

    if (!hasData) {
        alert('Please fill in at least one field before exporting.');
        return;
    }

    // Show loading modal
    exportModal.classList.add('active');

    try {
        const endpoint = format === 'pdf' ? '/api/export/pdf' : '/api/export/docx';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: parseInt(templateId),
                fieldData: fieldData
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Export failed');
        }

        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filled-document-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Hide loading modal
        exportModal.classList.remove('active');

        // Show success message
        alert(`✅ ${format.toUpperCase()} exported successfully!`);

    } catch (error) {
        console.error('Export error:', error);
        exportModal.classList.remove('active');
        alert(`Failed to export ${format.toUpperCase()}: ${error.message}`);
    }
}

// Reset form
function resetForm() {
    if (!confirm('Reset all form data?')) return;

    dynamicForm.reset();
    formData = {};
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
