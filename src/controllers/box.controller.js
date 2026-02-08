const { BoundingBox } = require('../models');

/**
 * Bulk save bounding boxes
 * POST /api/boxes
 * Body: { templateId, boxes: [{ page, x, y, w, h }] }
 */
exports.saveBoundingBoxes = async (req, res) => {
    try {
        const { templateId, boxes } = req.body;

        if (!templateId || !boxes || !Array.isArray(boxes)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'templateId and boxes array are required'
            });
        }

        if (boxes.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'At least one bounding box is required'
            });
        }

        // Bulk create boxes
        const boxIds = await BoundingBox.bulkCreate(templateId, boxes);

        res.status(201).json({
            success: true,
            boxIds: boxIds,
            count: boxIds.length,
            message: `Created ${boxIds.length} bounding boxes`
        });

    } catch (error) {
        console.error('Save boxes error:', error);
        res.status(500).json({
            error: 'Failed to save bounding boxes',
            message: error.message
        });
    }
};

/**
 * Get all boxes for a template
 * GET /api/boxes/:templateId
 */
exports.getBoxesByTemplate = async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const boxes = await BoundingBox.findByTemplateId(templateId);

        res.json({
            success: true,
            boxes: boxes,
            count: boxes.length
        });

    } catch (error) {
        console.error('Get boxes error:', error);
        res.status(500).json({
            error: 'Failed to get bounding boxes',
            message: error.message
        });
    }
};

/**
 * Get boxes by template and page
 * GET /api/boxes/:templateId/page/:page
 */
exports.getBoxesByPage = async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const page = parseInt(req.params.page);

        const boxes = await BoundingBox.findByPage(templateId, page);

        res.json({
            success: true,
            boxes: boxes,
            count: boxes.length,
            page: page
        });

    } catch (error) {
        console.error('Get boxes by page error:', error);
        res.status(500).json({
            error: 'Failed to get boxes by page',
            message: error.message
        });
    }
};

/**
 * Delete bounding box
 * DELETE /api/boxes/:id
 */
exports.deleteBox = async (req, res) => {
    try {
        const boxId = parseInt(req.params.id);
        await BoundingBox.delete(boxId);

        res.json({
            success: true,
            message: 'Bounding box deleted successfully'
        });

    } catch (error) {
        console.error('Delete box error:', error);
        res.status(500).json({
            error: 'Failed to delete bounding box',
            message: error.message
        });
    }
};
