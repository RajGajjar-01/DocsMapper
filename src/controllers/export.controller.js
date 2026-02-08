const { Template, FieldMapping } = require('../models');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Export filled PDF
 * POST /api/export/pdf
 * Body: { templateId, fieldData: { fieldName: value } }
 */
exports.exportPDF = async (req, res) => {
    try {
        const { templateId, fieldData } = req.body;

        if (!templateId || !fieldData) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'templateId and fieldData are required'
            });
        }

        // Get template
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Get field mappings with box details
        const mappings = await FieldMapping.findWithBoxDetails(templateId);

        // Load PDF
        const pdfBytes = await fs.readFile(template.file_path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        // Fill each field
        for (const mapping of mappings) {
            const value = fieldData[mapping.fieldName] || '';
            if (!value) continue;

            // Fill all boxes mapped to this field
            for (const box of mapping.boxes) {
                const page = pages[box.page - 1];
                const pageHeight = page.getHeight();

                // Calculate text position (centered)
                const textWidth = font.widthOfTextAtSize(value, mapping.fontSize);
                const xPos = box.x + (box.width - textWidth) / 2;
                // PDF.js uses bottom-left origin, pdf-lib uses same
                const yPos = pageHeight - box.y - box.height + (box.height - mapping.fontSize * 0.7) / 2;

                page.drawText(value, {
                    x: Math.max(box.x, xPos),
                    y: yPos,
                    size: mapping.fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                    maxWidth: box.width
                });
            }
        }

        // Save filled PDF
        const filledPdfBytes = await pdfDoc.save();
        const outputFilename = `filled-${Date.now()}.pdf`;

        // Send as download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
        res.send(Buffer.from(filledPdfBytes));

    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({
            error: 'Failed to export PDF',
            message: error.message
        });
    }
};

/**
 * Export filled PDF as DOCX (LibreOffice conversion)
 * POST /api/export/docx
 * Body: { templateId, fieldData: { fieldName: value } }
 */
exports.exportDOCX = async (req, res) => {
    try {
        const { templateId, fieldData } = req.body;

        if (!templateId || !fieldData) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'templateId and fieldData are required'
            });
        }

        // First, generate filled PDF (reuse logic from exportPDF)
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const mappings = await FieldMapping.findWithBoxDetails(templateId);
        const pdfBytes = await fs.readFile(template.file_path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        // Fill PDF
        for (const mapping of mappings) {
            const value = fieldData[mapping.fieldName] || '';
            if (!value) continue;

            for (const box of mapping.boxes) {
                const page = pages[box.page - 1];
                const pageHeight = page.getHeight();
                const textWidth = font.widthOfTextAtSize(value, mapping.fontSize);
                const xPos = box.x + (box.width - textWidth) / 2;
                const yPos = pageHeight - box.y - box.height + (box.height - mapping.fontSize * 0.7) / 2;

                page.drawText(value, {
                    x: Math.max(box.x, xPos),
                    y: yPos,
                    size: mapping.fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                    maxWidth: box.width
                });
            }
        }

        const filledPdfBytes = await pdfDoc.save();

        // Convert PDF to DOCX using LibreOffice
        // NOTE: This requires libreoffice-convert package and LibreOffice installed
        try {
            const libre = require('libreoffice-convert');
            const { promisify } = require('util');
            const convertAsync = promisify(libre.convert);

            const docxBuffer = await convertAsync(Buffer.from(filledPdfBytes), '.docx', undefined);
            const outputFilename = `filled-${Date.now()}.docx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
            res.send(docxBuffer);

        } catch (conversionError) {
            console.error('LibreOffice conversion error:', conversionError);
            res.status(500).json({
                error: 'DOCX conversion failed',
                message: 'LibreOffice may not be installed or configured correctly',
                details: conversionError.message
            });
        }

    } catch (error) {
        console.error('Export DOCX error:', error);
        res.status(500).json({
            error: 'Failed to export DOCX',
            message: error.message
        });
    }
};

/**
 * Get export info (for Google Docs instructions)
 * GET /api/export/info
 */
exports.getExportInfo = async (req, res) => {
    res.json({
        success: true,
        formats: {
            pdf: {
                endpoint: '/api/export/pdf',
                method: 'POST',
                description: 'Export filled PDF directly'
            },
            docx: {
                endpoint: '/api/export/docx',
                method: 'POST',
                description: 'Export as DOCX (requires LibreOffice)',
                requirements: 'LibreOffice must be installed on server'
            },
            googleDocs: {
                description: 'Export as DOCX, then upload to Google Drive and convert to Docs',
                steps: [
                    '1. Export as DOCX using /api/export/docx',
                    '2. Upload DOCX file to Google Drive',
                    '3. Right-click file → Open with Google Docs'
                ]
            }
        }
    });
};
