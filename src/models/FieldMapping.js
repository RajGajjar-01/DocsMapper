const { dbRun, dbGet, dbAll } = require('../config/database');

class FieldMapping {
    /**
     * Create a field mapping with associated bounding boxes
     * @param {Object} data - Field data
     * @param {number} data.templateId - Template ID
     * @param {string} data.fieldName - Unique field name
     * @param {string} data.fieldLabel - Display label
     * @param {string} data.fieldType - Field type (text, number, date, email)
     * @param {number} data.fontSize - Font size (default: 10)
     * @param {Array<number>} data.boxIds - Array of bounding box IDs
     * @returns {Promise<number>} - Field mapping ID
     */
    static async create({ templateId, fieldName, fieldLabel, fieldType = 'text', fontSize = 10, boxIds = [] }) {
        // Create field mapping
        const sql = `
            INSERT INTO field_mappings (template_id, field_name, field_label, field_type, font_size)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await dbRun(sql, [templateId, fieldName, fieldLabel, fieldType, fontSize]);
        const fieldMappingId = result.lastID;

        // Create junction table entries for each box
        if (boxIds.length > 0) {
            await this.addBoxes(fieldMappingId, boxIds);
        }

        return fieldMappingId;
    }

    /**
     * Add bounding boxes to a field mapping
     * @param {number} fieldMappingId - Field mapping ID
     * @param {Array<number>} boxIds - Array of box IDs
     * @returns {Promise<void>}
     */
    static async addBoxes(fieldMappingId, boxIds) {
        const sql = `
            INSERT INTO field_box_mappings (field_mapping_id, bounding_box_id)
            VALUES (?, ?)
        `;

        for (const boxId of boxIds) {
            try {
                await dbRun(sql, [fieldMappingId, boxId]);
            } catch (error) {
                // Skip if duplicate (UNIQUE constraint violation)
                if (!error.message.includes('UNIQUE')) {
                    throw error;
                }
            }
        }
    }

    /**
     * Get field mapping by ID
     * @param {number} id - Field mapping ID
     * @returns {Promise<Object|null>}
     */
    static async findById(id) {
        const sql = 'SELECT * FROM field_mappings WHERE id = ?';
        return await dbGet(sql, [id]);
    }

    /**
     * Get all field mappings for a template with associated boxes
     * @param {number} templateId - Template ID
     * @returns {Promise<Array>} - Array of field mappings with boxes
     */
    static async findByTemplateId(templateId) {
        const sql = `
            SELECT 
                fm.*,
                GROUP_CONCAT(fbm.bounding_box_id) as box_ids
            FROM field_mappings fm
            LEFT JOIN field_box_mappings fbm ON fm.id = fbm.field_mapping_id
            WHERE fm.template_id = ?
            GROUP BY fm.id
            ORDER BY fm.created_at
        `;

        const mappings = await dbAll(sql, [templateId]);

        // Convert box_ids from string to array
        return mappings.map(mapping => ({
            ...mapping,
            box_ids: mapping.box_ids ? mapping.box_ids.split(',').map(Number) : []
        }));
    }

    /**
     * Get field mappings with full box details (coordinates, page)
     * @param {number} templateId - Template ID
     * @returns {Promise<Array>} - Field mappings with full box objects
     */
    static async findWithBoxDetails(templateId) {
        const sql = `
            SELECT 
                fm.id as field_id,
                fm.field_name,
                fm.field_label,
                fm.field_type,
                fm.font_size,
                bb.id as box_id,
                bb.page,
                bb.x,
                bb.y,
                bb.width,
                bb.height
            FROM field_mappings fm
            LEFT JOIN field_box_mappings fbm ON fm.id = fbm.field_mapping_id
            LEFT JOIN bounding_boxes bb ON fbm.bounding_box_id = bb.id
            WHERE fm.template_id = ?
            ORDER BY fm.id, bb.page, bb.id
        `;

        const rows = await dbAll(sql, [templateId]);

        // Group by field
        const fieldsMap = new Map();

        rows.forEach(row => {
            if (!fieldsMap.has(row.field_id)) {
                fieldsMap.set(row.field_id, {
                    id: row.field_id,
                    fieldName: row.field_name,
                    fieldLabel: row.field_label,
                    fieldType: row.field_type,
                    fontSize: row.font_size,
                    boxes: []
                });
            }

            if (row.box_id) {
                fieldsMap.get(row.field_id).boxes.push({
                    id: row.box_id,
                    page: row.page,
                    x: row.x,
                    y: row.y,
                    width: row.width,
                    height: row.height
                });
            }
        });

        return Array.from(fieldsMap.values());
    }

    /**
     * Update field mapping
     * @param {number} id - Field mapping ID
     * @param {Object} data - Updated data
     * @returns {Promise<void>}
     */
    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.fieldLabel) {
            fields.push('field_label = ?');
            values.push(data.fieldLabel);
        }
        if (data.fieldType) {
            fields.push('field_type = ?');
            values.push(data.fieldType);
        }
        if (data.fontSize !== undefined) {
            fields.push('font_size = ?');
            values.push(data.fontSize);
        }

        if (fields.length === 0) return;

        values.push(id);
        const sql = `UPDATE field_mappings SET ${fields.join(', ')} WHERE id = ?`;
        await dbRun(sql, values);
    }

    /**
     * Remove boxes from field mapping
     * @param {number} fieldMappingId - Field mapping ID
     * @param {Array<number>} boxIds - Box IDs to remove
     * @returns {Promise<void>}
     */
    static async removeBoxes(fieldMappingId, boxIds) {
        const placeholders = boxIds.map(() => '?').join(',');
        const sql = `
            DELETE FROM field_box_mappings 
            WHERE field_mapping_id = ? AND bounding_box_id IN (${placeholders})
        `;
        await dbRun(sql, [fieldMappingId, ...boxIds]);
    }

    /**
     * Delete field mapping (cascade deletes junction table entries)
     * @param {number} id - Field mapping ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        const sql = 'DELETE FROM field_mappings WHERE id = ?';
        await dbRun(sql, [id]);
    }

    /**
     * Delete all field mappings for a template
     * @param {number} templateId - Template ID
     * @returns {Promise<number>} - Number of deleted mappings
     */
    static async deleteByTemplateId(templateId) {
        const sql = 'DELETE FROM field_mappings WHERE template_id = ?';
        const result = await dbRun(sql, [templateId]);
        return result.changes;
    }
}

module.exports = FieldMapping;
