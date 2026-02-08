const { FieldMapping } = require('../models');

/**
 * Create field mapping with box associations
 * POST /api/mappings
 * Body: { templateId, fieldName, fieldLabel, fieldType, fontSize, boxIds }
 */
exports.createFieldMapping = async (req, res) => {
    try {
        const { templateId, fieldName, fieldLabel, fieldType, fontSize, boxIds } = req.body;

        if (!templateId || !fieldName || !fieldLabel || !boxIds || !Array.isArray(boxIds)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'templateId, fieldName, fieldLabel, and boxIds array are required'
            });
        }

        if (boxIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'At least one box ID must be selected'
            });
        }

        // Create field mapping
        const fieldMappingId = await FieldMapping.create({
            templateId,
            fieldName,
            fieldLabel,
            fieldType: fieldType || 'text',
            fontSize: fontSize || 10,
            boxIds
        });

        res.status(201).json({
            success: true,
            fieldMappingId: fieldMappingId,
            message: 'Field mapping created successfully'
        });

    } catch (error) {
        console.error('Create mapping error:', error);
        res.status(500).json({
            error: 'Failed to create field mapping',
            message: error.message
        });
    }
};

/**
 * Get all field mappings for a template
 * GET /api/mappings/:templateId
 */
exports.getMappingsByTemplate = async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const mappings = await FieldMapping.findByTemplateId(templateId);

        res.json({
            success: true,
            fields: mappings,
            count: mappings.length
        });

    } catch (error) {
        console.error('Get mappings error:', error);
        res.status(500).json({
            error: 'Failed to get field mappings',
            message: error.message
        });
    }
};

/**
 * Get field mappings with full box details (coordinates)
 * GET /api/mappings/:templateId/details
 */
exports.getMappingsWithDetails = async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const mappings = await FieldMapping.findWithBoxDetails(templateId);

        res.json({
            success: true,
            fields: mappings,
            count: mappings.length
        });

    } catch (error) {
        console.error('Get mappings with details error:', error);
        res.status(500).json({
            error: 'Failed to get field mappings with details',
            message: error.message
        });
    }
};

/**
 * Update field mapping
 * PUT /api/mappings/:id
 */
exports.updateFieldMapping = async (req, res) => {
    try {
        const fieldMappingId = parseInt(req.params.id);
        const { fieldLabel, fieldType, fontSize } = req.body;

        await FieldMapping.update(fieldMappingId, {
            fieldLabel,
            fieldType,
            fontSize
        });

        res.json({
            success: true,
            message: 'Field mapping updated successfully'
        });

    } catch (error) {
        console.error('Update mapping error:', error);
        res.status(500).json({
            error: 'Failed to update field mapping',
            message: error.message
        });
    }
};

/**
 * Delete field mapping
 * DELETE /api/mappings/:id
 */
exports.deleteFieldMapping = async (req, res) => {
    try {
        const fieldMappingId = parseInt(req.params.id);
        await FieldMapping.delete(fieldMappingId);

        res.json({
            success: true,
            message: 'Field mapping deleted successfully'
        });

    } catch (error) {
        console.error('Delete mapping error:', error);
        res.status(500).json({
            error: 'Failed to delete field mapping',
            message: error.message
        });
    }
};
