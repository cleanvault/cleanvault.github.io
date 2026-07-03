/**
 * CleanVault - Test Fixture Generator
 * 
 * Generates sample PDF files for testing.
 * Run with: node tests/generate-fixtures.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname, 'fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
}

/**
 * Create a simple PDF with specified number of pages
 */
async function createPDF(filename, numPages, pageContent = null) {
    const pdf = await PDFDocument.create();
    
    for (let i = 0; i < numPages; i++) {
        const page = pdf.addPage([600, 400]);
        const content = pageContent || `Page ${i + 1}`;
        page.drawText(content, { x: 50, y: 200, size: 24 });
    }
    
    const pdfBytes = await pdf.save();
    const filepath = path.join(fixturesDir, filename);
    fs.writeFileSync(filepath, pdfBytes);
    console.log(`✓ Created ${filename} (${numPages} pages, ${pdfBytes.length} bytes)`);
    return filepath;
}

/**
 * Create a multi-page PDF with different content per page
 */
async function createMultiContentPDF(filename, pages) {
    const pdf = await PDFDocument.create();
    
    pages.forEach((content, index) => {
        const page = pdf.addPage([600, 400]);
        page.drawText(content, { x: 50, y: 200, size: 24 });
    });
    
    const pdfBytes = await pdf.save();
    const filepath = path.join(fixturesDir, filename);
    fs.writeFileSync(filepath, pdfBytes);
    console.log(`✓ Created ${filename} (${pages.length} pages, ${pdfBytes.length} bytes)`);
    return filepath;
}

async function generateAllFixtures() {
    console.log('Generating test fixtures...\n');
    
    // 1. Small PDF (3 pages)
    await createPDF('small.pdf', 3, 'Small Test PDF');
    
    // 2. Medium PDF (10 pages)
    await createPDF('medium.pdf', 10, 'Medium Test PDF');
    
    // 3. Large PDF (20 pages)
    await createPDF('large.pdf', 20, 'Large Test PDF');
    
    // 4. Multi-content PDF (5 pages with unique content)
    await createMultiContentPDF('multi-content.pdf', [
        'Page 1 - Unique Content',
        'Page 2 - Unique Content',
        'Page 3 - Unique Content',
        'Page 4 - Unique Content',
        'Page 5 - Unique Content'
    ]);
    
    // 5. Two PDFs for merge testing
    await createPDF('merge-part1.pdf', 3, 'Merge Part 1');
    await createPDF('merge-part2.pdf', 4, 'Merge Part 2');
    
    console.log('\n✓ All test fixtures generated successfully!');
    console.log(`Location: ${fixturesDir}`);
}

generateAllFixtures().catch(err => {
    console.error('Error generating fixtures:', err);
    process.exit(1);
});