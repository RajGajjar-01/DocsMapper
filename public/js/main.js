// Main JavaScript entry point
console.log('DocsMapper initialized');

// Upload form handler
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(uploadForm);

            try {
                const response = await fetch('/api/templates/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();
                console.log('Upload successful:', data);

                // Redirect to box creation page
                window.location.href = `/pages/create-boxes.html?templateId=${data.templateId}`;

            } catch (error) {
                console.error('Error uploading PDF:', error);
                alert('Failed to upload PDF. Please try again.');
            }
        });
    }
});
