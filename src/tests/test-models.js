/**
 * Test script for database models
 * Run with: node src/tests/test-models.js
 */

const { Template, BoundingBox, FieldMapping } = require('../models');
const { runMigrations } = require('../config/migrations');

async function testModels() {
    console.log('🧪 Starting Model Tests...\n');

    try {
        // Run migrations first
        await runMigrations();
        console.log('');

        // ==================== Test Template Model ====================
        console.log('📋 Testing Template Model...');

        const templateId = await Template.create({
            name: 'Test PDF Form',
            filename: 'test-form.pdf',
            filePath: '/temp/uploads/test-form.pdf',
            pageCount: 3,
            sessionId: 'test-session-123'
        });
        console.log(`✅ Created template with ID: ${templateId}`);

        const template = await Template.findById(templateId);
        console.log(`✅ Found template: ${template.name}`);

        const sessionTemplate = await Template.findBySessionId('test-session-123');
        console.log(`✅ Found template by session: ${sessionTemplate.name}\n`);

        // ==================== Test BoundingBox Model ====================
        console.log('📦 Testing BoundingBox Model...');

        const boxes = [
            { page: 1, x: 100, y: 200, w: 150, h: 30 },
            { page: 1, x: 100, y: 250, w: 150, h: 30 },
            { page: 2, x: 100, y: 200, w: 150, h: 30 },
            { page: 3, x: 100, y: 300, w: 200, h: 30 }
        ];

        const boxIds = await BoundingBox.bulkCreate(templateId, boxes);
        console.log(`✅ Bulk created ${boxIds.length} bounding boxes: ${boxIds.join(', ')}`);

        const templateBoxes = await BoundingBox.findByTemplateId(templateId);
        console.log(`✅ Found ${templateBoxes.length} boxes for template`);

        const page1Boxes = await BoundingBox.findByPage(templateId, 1);
        console.log(`✅ Found ${page1Boxes.length} boxes on page 1\n`);

        // ==================== Test FieldMapping Model ====================
        console.log('🗺️  Testing FieldMapping Model...');

        // Create field 1: "name" mapped to boxes 1 and 2
        const field1Id = await FieldMapping.create({
            templateId,
            fieldName: 'name',
            fieldLabel: 'Full Name',
            fieldType: 'text',
            fontSize: 12,
            boxIds: [boxIds[0], boxIds[1]]  // First two boxes
        });
        console.log(`✅ Created field "name" with ID: ${field1Id} (mapped to ${2} boxes)`);

        // Create field 2: "address" mapped to boxes 3 and 4
        const field2Id = await FieldMapping.create({
            templateId,
            fieldName: 'address',
            fieldLabel: 'Address',
            fieldType: 'text',
            fontSize: 10,
            boxIds: [boxIds[2], boxIds[3]]  // Last two boxes
        });
        console.log(`✅ Created field "address" with ID: ${field2Id} (mapped to ${2} boxes)`);

        // Test findByTemplateId
        const mappings = await FieldMapping.findByTemplateId(templateId);
        console.log(`✅ Found ${mappings.length} field mappings for template`);
        mappings.forEach(m => {
            console.log(`   - ${m.field_name}: ${m.box_ids.length} boxes (${m.box_ids.join(', ')})`);
        });

        // Test findWithBoxDetails (full JOIN query)
        const detailedMappings = await FieldMapping.findWithBoxDetails(templateId);
        console.log(`✅ Found detailed mappings with coordinates:`);
        detailedMappings.forEach(m => {
            console.log(`   - ${m.fieldName} (${m.fieldLabel}):`);
            m.boxes.forEach(b => {
                console.log(`     • Box ${b.id}: Page ${b.page} at (${b.x}, ${b.y}), ${b.width}x${b.height}`);
            });
        });

        // ==================== Test CASCADE Delete ====================
        console.log('\n🗑️  Testing CASCADE Delete...');

        const deleteCount = await Template.delete(templateId);
        console.log(`✅ Deleted template (cascade should delete all related records)`);

        const remainingBoxes = await BoundingBox.findByTemplateId(templateId);
        console.log(`✅ Remaining boxes: ${remainingBoxes.length} (should be 0)`);

        const remainingMappings = await FieldMapping.findByTemplateId(templateId);
        console.log(`✅ Remaining mappings: ${remainingMappings.length} (should be 0)`);

        console.log('\n🎉 All Model Tests Passed!\n');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
testModels().then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
});
