const { dbRun } = require('../config/database');

// Create all database tables
async function createTables() {
    try {
        // Templates table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                page_count INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT NOT NULL
            )
        `);
        console.log('✅ Created templates table');

        // Bounding boxes table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS bounding_boxes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                page INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                width REAL NOT NULL,
                height REAL NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Created bounding_boxes table');

        // Field mappings table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS field_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                field_label TEXT NOT NULL,
                field_type TEXT DEFAULT 'text',
                font_size INTEGER DEFAULT 10,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Created field_mappings table');

        // Junction table for many-to-many relationship
        await dbRun(`
            CREATE TABLE IF NOT EXISTS field_box_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                field_mapping_id INTEGER NOT NULL,
                bounding_box_id INTEGER NOT NULL,
                FOREIGN KEY (field_mapping_id) REFERENCES field_mappings(id) ON DELETE CASCADE,
                FOREIGN KEY (bounding_box_id) REFERENCES bounding_boxes(id) ON DELETE CASCADE,
                UNIQUE(field_mapping_id, bounding_box_id)
            )
        `);
        console.log('✅ Created field_box_mappings table');

        // Create indexes
        await dbRun('CREATE INDEX IF NOT EXISTS idx_boxes_template ON bounding_boxes(template_id)');
        await dbRun('CREATE INDEX IF NOT EXISTS idx_mappings_template ON field_mappings(template_id)');
        await dbRun('CREATE INDEX IF NOT EXISTS idx_field_box_field ON field_box_mappings(field_mapping_id)');
        await dbRun('CREATE INDEX IF NOT EXISTS idx_field_box_box ON field_box_mappings(bounding_box_id)');
        console.log('✅ Created indexes');

        console.log('🎉 Database schema initialized successfully!');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        throw error;
    }
}

// Run migrations
async function runMigrations() {
    console.log('📦 Running database migrations...');
    await createTables();
}

module.exports = { runMigrations };
