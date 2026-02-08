const express = require('express');
const router = express.Router();
const boxController = require('../controllers/box.controller');

// Bulk save bounding boxes
router.post('/', boxController.saveBoundingBoxes);

// Get all boxes for a template
router.get('/:templateId', boxController.getBoxesByTemplate);

// Get boxes by page
router.get('/:templateId/page/:page', boxController.getBoxesByPage);

// Delete bounding box
router.delete('/:id', boxController.deleteBox);

module.exports = router;
