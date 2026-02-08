const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mapping.controller');

// Create field mapping
router.post('/', mappingController.createFieldMapping);

// Get all mappings for a template
router.get('/:templateId', mappingController.getMappingsByTemplate);

// Get mappings with full box details
router.get('/:templateId/details', mappingController.getMappingsWithDetails);

// Update field mapping
router.put('/:id', mappingController.updateFieldMapping);

// Delete field mapping
router.delete('/:id', mappingController.deleteFieldMapping);

module.exports = router;
