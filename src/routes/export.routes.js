const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');

// Export as PDF
router.post('/pdf', exportController.exportPDF);

// Export as DOCX
router.post('/docx', exportController.exportDOCX);

// Get export info
router.get('/info', exportController.getExportInfo);

module.exports = router;
