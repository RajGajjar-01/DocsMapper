const { Template } = require('../models');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Upload PDF template
 * POST /api/templates/upload
 */
exports.uploadTemplate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const filename = req.file.originalname;

        // Load PDF to get page count
        const pdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();

        // Create template record
        const templateId = await Template.create({
            name: path.basename(filename, '.pdf'),
            filename: filename,
            filePath: filePath,
            pageCount: pageCount,
            sessionId: req.sessionID
        });

        // Store template ID in session
        req.session.templateId = templateId;

        res.status(201).json({
            success: true,
            templateId: templateId,
            filename: filename,
            pageCount: pageCount,
            message: 'PDF uploaded successfully'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to upload PDF',
            message: error.message
        });
    }
};

/**
 * Get template by ID
 * GET /api/templates/:id
 */
exports.getTemplate = async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const template = await Template.findById(templateId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({
            success: true,
            template: template
        });

    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({
            error: 'Failed to get template',
            message: error.message
        });
    }
};

/**
 * Get template from current session
 * GET /api/templates/session
 */
exports.getSessionTemplate = async (req, res) => {
    try {
        const template = await Template.findBySessionId(req.sessionID);

        if (!template) {
            return res.status(404).json({ error: 'No template found in session' });
        }

        res.json({
            success: true,
            template: template
        });

    } catch (error) {
        console.error('Get session template error:', error);
        res.status(500).json({
            error: 'Failed to get session template',
            message: error.message
        });
    }
};

/**
 * Serve PDF file for viewing
 * GET /api/templates/:id/pdf
 */
exports.servePDF = async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const template = await Template.findById(templateId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Check if file exists
        const fs = require('fs');
        if (!fs.existsSync(template.file_path)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }

        // Send PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.sendFile(template.file_path, { root: '/' });

    } catch (error) {
        console.error('Serve PDF error:', error);
        res.status(500).json({
            error: 'Failed to serve PDF',
            message: error.message
        });
    }
};

/**
 * Delete template
 * DELETE /api/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const template = await Template.findById(templateId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(template.file_path);
        } catch (err) {
            console.warn('File not found, continuing with database delete');
        }

        // Delete from database (CASCADE deletes related records)
        await Template.delete(templateId);

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });

    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({
            error: 'Failed to delete template',
            message: error.message
        });
    }
};
