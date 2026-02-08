const { dbRun, dbGet, dbAll } = require('../config/database');

class BoundingBox {
    /**
     * Create a single bounding box
     * @param {Object} data - Box data
     * @param {number} data.templateId - Template ID
     * @param {number} data.page - Page number
     * @param {number} data.x - X coordinate
     * @param {number} data.y - Y coordinate
     * @param {number} data.width - Box width
     * @param {number} data.height - Box height
     * @returns {Promise<number>} - Box ID
     */
    static async create({ templateId, page, x, y, width, height }) {
        const sql = `
            INSERT INTO bounding_boxes (template_id, page, x, y, width, height)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await dbRun(sql, [templateId, page, x, y, width, height]);
        return result.lastID;
    }

    /**
     * Bulk create bounding boxes
     * @param {number} templateId - Template ID
     * @param {Array} boxes - Array of box objects {page, x, y, width, height}
     * @returns {Promise<Array<number>>} - Array of created box IDs
     */
    static async bulkCreate(templateId, boxes) {
        const ids = [];

        for (const box of boxes) {
            const id = await this.create({
                templateId,
                page: box.page,
                x: box.x,
                y: box.y,
                width: box.width || box.w,
                height: box.height || box.h
            });
            ids.push(id);
        }

        return ids;
    }

    /**
     * Get bounding box by ID
     * @param {number} id - Box ID
     * @returns {Promise<Object|null>}
     */
    static async findById(id) {
        const sql = 'SELECT * FROM bounding_boxes WHERE id = ?';
        return await dbGet(sql, [id]);
    }

    /**
     * Get all boxes for a template
     * @param {number} templateId - Template ID
     * @returns {Promise<Array>}
     */
    static async findByTemplateId(templateId) {
        const sql = 'SELECT * FROM bounding_boxes WHERE template_id = ? ORDER BY page, id';
        return await dbAll(sql, [templateId]);
    }

    /**
     * Get boxes by page number
     * @param {number} templateId - Template ID
     * @param {number} page - Page number
     * @returns {Promise<Array>}
     */
    static async findByPage(templateId, page) {
        const sql = 'SELECT * FROM bounding_boxes WHERE template_id = ? AND page = ? ORDER BY id';
        return await dbAll(sql, [templateId, page]);
    }

    /**
     * Update bounding box coordinates
     * @param {number} id - Box ID
     * @param {Object} data - Updated coordinates
     * @returns {Promise<void>}
     */
    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.x !== undefined) {
            fields.push('x = ?');
            values.push(data.x);
        }
        if (data.y !== undefined) {
            fields.push('y = ?');
            values.push(data.y);
        }
        if (data.width !== undefined) {
            fields.push('width = ?');
            values.push(data.width);
        }
        if (data.height !== undefined) {
            fields.push('height = ?');
            values.push(data.height);
        }

        if (fields.length === 0) return;

        values.push(id);
        const sql = `UPDATE bounding_boxes SET ${fields.join(', ')} WHERE id = ?`;
        await dbRun(sql, values);
    }

    /**
     * Delete bounding box
     * @param {number} id - Box ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        const sql = 'DELETE FROM bounding_boxes WHERE id = ?';
        await dbRun(sql, [id]);
    }

    /**
     * Delete all boxes for a template
     * @param {number} templateId - Template ID
     * @returns {Promise<number>} - Number of deleted boxes
     */
    static async deleteByTemplateId(templateId) {
        const sql = 'DELETE FROM bounding_boxes WHERE template_id = ?';
        const result = await dbRun(sql, [templateId]);
        return result.changes;
    }
}

module.exports = BoundingBox;
