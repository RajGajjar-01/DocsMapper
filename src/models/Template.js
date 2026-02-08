const { dbRun, dbGet, dbAll } = require('../config/database');

class Template {
    /**
     * Create a new template
     * @param {Object} data - Template data
     * @param {string} data.name - Template name
     * @param {string} data.filename - Original filename
     * @param {string} data.filePath - File path on server
     * @param {number} data.pageCount - Number of pages
     * @param {string} data.sessionId - Session ID
     * @returns {Promise<number>} - Template ID
     */
    static async create({ name, filename, filePath, pageCount, sessionId }) {
        const sql = `
            INSERT INTO templates (name, filename, file_path, page_count, session_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await dbRun(sql, [name, filename, filePath, pageCount, sessionId]);
        return result.lastID;
    }

    /**
     * Get template by ID
     * @param {number} id - Template ID
     * @returns {Promise<Object|null>} - Template object or null
     */
    static async findById(id) {
        const sql = 'SELECT * FROM templates WHERE id = ?';
        return await dbGet(sql, [id]);
    }

    /**
     * Get template by session ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object|null>} - Template object or null
     */
    static async findBySessionId(sessionId) {
        const sql = 'SELECT * FROM templates WHERE session_id = ? ORDER BY created_at DESC LIMIT 1';
        return await dbGet(sql, [sessionId]);
    }

    /**
     * Get all templates
     * @returns {Promise<Array>} - Array of templates
     */
    static async findAll() {
        const sql = 'SELECT * FROM templates ORDER BY created_at DESC';
        return await dbAll(sql);
    }

    /**
     * Update template
     * @param {number} id - Template ID
     * @param {Object} data - Updated data
     * @returns {Promise<void>}
     */
    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.name) {
            fields.push('name = ?');
            values.push(data.name);
        }

        if (fields.length === 0) return;

        values.push(id);
        const sql = `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`;
        await dbRun(sql, values);
    }

    /**
     * Delete template and cascade delete related records
     * @param {number} id - Template ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        const sql = 'DELETE FROM templates WHERE id = ?';
        await dbRun(sql, [id]);
    }

    /**
     * Delete templates older than specified days
     * @param {number} days - Number of days
     * @returns {Promise<number>} - Number of deleted templates
     */
    static async deleteOlderThan(days) {
        const sql = `
            DELETE FROM templates 
            WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
        `;
        const result = await dbRun(sql, [days]);
        return result.changes;
    }
}

module.exports = Template;
