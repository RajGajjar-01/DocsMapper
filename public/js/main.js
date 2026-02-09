// Upload form handler
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        const fileInput = document.getElementById('pdf-file');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a PDF file');
            return;
        }

        formData.append('pdf', file);

        try {
            const response = await fetch('/api/templates/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to box creator page
                window.location.href = `/pages/create-boxes.html?templateId=${data.templateId}`;
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        }
    });
}
