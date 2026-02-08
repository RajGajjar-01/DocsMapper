const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const templateController = require('../controllers/template.controller');

// Upload PDF template
router.post('/upload', upload.single('pdf'), templateController.uploadTemplate);

// Get template by ID
router.get('/:id', templateController.getTemplate);

// Serve PDF file for viewing
router.get('/:id/pdf', templateController.servePDF);

// Get template from session
router.get('/session/current', templateController.getSessionTemplate);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
