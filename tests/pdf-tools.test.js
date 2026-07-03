/**
 * CleanVault - PDF Tools Test Suite
 * 
 * Automated tests for all PDF manipulation functions.
 * Run with: node tests/pdf-tools.test.js
 */

const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Import PDF tools functions
const pdfToolsPath = path.join(__dirname, '..', 'js', 'pdf-tools.js');
const pdfToolsCode = fs.readFileSync(pdfToolsPath, 'utf8');

// Extract functions from pdf-tools.js (they're attached to window.PDFTools in browser)
// For Node.js testing, we'll need to mock the browser environment
const { JSDOM } = require('jsdom');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Blob = dom.window.Blob;
global.URL = dom.window.URL;

// Setup PDFLib global (required by pdf-tools.js)
// Use real pdf-lib functions
global.PDFLib = {
    PDFDocument,
    StandardFonts,
    rgb,
    degrees
};

// Load pdf-tools.js
eval(pdfToolsCode);

const PDFTools = window.PDFTools;
const fixturesDir = path.join(__dirname, 'fixtures');

// Test results tracker
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

/**
 * Helper to log test results
 */
function logTest(name, passed, message = '') {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m: ${name}${message ? ` - ${message}` : ''}`);
    
    testResults.tests.push({ name, passed, message });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

/**
 * Helper to create a File object from a file path
 */
function createFileFromPath(filepath, filename) {
    const buffer = fs.readFileSync(filepath);
    return new File([buffer], filename, { type: 'application/pdf' });
}

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
    console.log('='.repeat(60));
    console.log('CleanVault PDF Tools - Automated Test Suite');
    console.log('='.repeat(60));
    console.log('');
    
    // Test 1: Merge PDFs
    console.log('\n--- Testing PDF Merge ---');
    await testMergePDF();
    
    // Test 2: Split PDF
    console.log('\n--- Testing PDF Split ---');
    await testSplitPDF();
    
    // Test 3: Extract Pages
    console.log('\n--- Testing Extract Pages ---');
    await testExtractPages();
    
    // Test 4: Rotate PDF
    console.log('\n--- Testing Rotate PDF ---');
    await testRotatePDF();
    
    // Test 5: Remove Pages
    console.log('\n--- Testing Remove Pages ---');
    await testRemovePages();
    
    // Test 6: Reorder Pages
    console.log('\n--- Testing Reorder Pages ---');
    await testReorderPages();
    
    // Test 7: Watermark (Pro)
    console.log('\n--- Testing Watermark ---');
    await testWatermark();
    
    // Test 8: Password Protect (Pro)
    console.log('\n--- Testing Password Protect ---');
    await testPasswordProtect();
    
    // Test 9: Page Numbers (Pro)
    console.log('\n--- Testing Page Numbers ---');
    await testPageNumbers();
    
    // Print summary
    printSummary();
}

// ============================================
// INDIVIDUAL TESTS
// ============================================

async function testMergePDF() {
    try {
        const file1 = createFileFromPath(path.join(fixturesDir, 'merge-part1.pdf'), 'merge-part1.pdf');
        const file2 = createFileFromPath(path.join(fixturesDir, 'merge-part2.pdf'), 'merge-part2.pdf');
        
        const result = await PDFTools.mergePDFs([file1, file2]);
        
        // Verify result is Uint8Array
        logTest('Merge returns Uint8Array', result instanceof Uint8Array);
        
        // Verify we can load the merged PDF
        const mergedPdf = await PDFDocument.load(result);
        const pageCount = mergedPdf.getPageCount();
        
        // Should have 7 pages (3 + 4)
        logTest('Merged PDF has correct page count', pageCount === 7, 
                `Expected 7, got ${pageCount}`);
        
        // Verify file size is reasonable
        logTest('Merged PDF has content', result.length > 0, 
                `Size: ${result.length} bytes`);
        
    } catch (error) {
        logTest('Merge PDF', false, error.message);
    }
}

async function testSplitPDF() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Split into two ranges: pages 1-5 and 6-10
        const ranges = ['1-5', '6-10'];
        const results = await PDFTools.splitPDF(file, ranges);
        
        // Should return array of 2 PDFs
        logTest('Split returns array', Array.isArray(results));
        logTest('Split creates correct number of files', results.length === 2,
                `Expected 2, got ${results.length}`);
        
        // Verify first part has 5 pages
        const pdf1 = await PDFDocument.load(results[0].data);
        logTest('First split has 5 pages', pdf1.getPageCount() === 5,
                `Expected 5, got ${pdf1.getPageCount()}`);
        
        // Verify second part has 5 pages
        const pdf2 = await PDFDocument.load(results[1].data);
        logTest('Second split has 5 pages', pdf2.getPageCount() === 5,
                `Expected 5, got ${pdf2.getPageCount()}`);
        
        // Verify filenames
        logTest('Split files have correct names', 
                results[0].name.includes('part-1') && results[1].name.includes('part-2'));
        
    } catch (error) {
        logTest('Split PDF', false, error.message);
    }
}

async function testExtractPages() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'multi-content.pdf'), 'multi-content.pdf');
        
        // Extract pages 1, 3, 5
        const pagesToExtract = [1, 3, 5];
        const result = await PDFTools.extractPages(file, pagesToExtract);
        
        // Verify result structure
        logTest('Extract returns object with name and data', 
                result.name && result.data);
        
        // Verify extracted PDF has 3 pages
        const extractedPdf = await PDFDocument.load(result.data);
        logTest('Extracted PDF has 3 pages', extractedPdf.getPageCount() === 3,
                `Expected 3, got ${extractedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Extracted file has correct name', 
                result.name.includes('extracted'));
        
    } catch (error) {
        logTest('Extract Pages', false, error.message);
    }
}

async function testRotatePDF() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'small.pdf'), 'small.pdf');
        
        // Rotate 90 degrees
        const result = await PDFTools.rotatePDF(file, 90);
        
        // Verify result structure
        logTest('Rotate returns object with name and data', 
                result.name && result.data);
        
        // Verify we can load the rotated PDF
        const rotatedPdf = await PDFDocument.load(result.data);
        logTest('Rotated PDF has correct page count', 
                rotatedPdf.getPageCount() === 3,
                `Expected 3, got ${rotatedPdf.getPageCount()}`);
        
        // Verify rotation was applied (check page rotation)
        const page = rotatedPdf.getPage(0);
        const rotation = page.getRotation();
        logTest('Page rotation changed', rotation.angle === 90,
                `Expected 90°, got ${rotation.angle}°`);
        
        // Verify filename
        logTest('Rotated file has correct name', 
                result.name.includes('rotated'));
        
    } catch (error) {
        logTest('Rotate PDF', false, error.message);
    }
}

async function testRemovePages() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Remove pages 2, 4, 6
        const pagesToRemove = [2, 4, 6];
        const result = await PDFTools.removePDFPages(file, pagesToRemove);
        
        // Verify result structure
        logTest('Remove pages returns object', 
                result.name && result.data);
        
        // Verify resulting PDF has 7 pages (10 - 3)
        const modifiedPdf = await PDFDocument.load(result.data);
        logTest('Removed pages correctly', modifiedPdf.getPageCount() === 7,
                `Expected 7, got ${modifiedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Modified file has correct name', 
                result.name.includes('pages-removed'));
        
    } catch (error) {
        logTest('Remove Pages', false, error.message);
    }
}

async function testReorderPages() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Reorder: reverse the pages
        const newOrder = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        const result = await PDFTools.reorderPDF(file, newOrder);
        
        // Verify result structure
        logTest('Reorder returns object', result && result.name && result.data);
        
        // Verify reordered PDF has correct page count
        const reorderedPdf = await PDFDocument.load(result.data);
        logTest('Reordered PDF has correct page count', 
                reorderedPdf.getPageCount() === 10,
                `Expected 10, got ${reorderedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Reordered file has correct name', 
                result.name.includes('reordered'));
        
    } catch (error) {
        logTest('Reorder pages', false, error.message);
    }
}

async function testWatermark() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Add watermark with custom options
        const options = {
            text: 'CONFIDENTIAL',
            fontSize: 48,
            opacity: 0.3,
            rotation: 0,
            position: 'center'
        };
        
        const result = await PDFTools.watermarkPDF(file, options);
        
        // Verify result structure
        logTest('Watermark returns object', result && result.name && result.data);
        
        // Verify watermarked PDF has correct page count
        const watermarkedPdf = await PDFDocument.load(result.data);
        logTest('Watermarked PDF has correct page count', 
                watermarkedPdf.getPageCount() === 10,
                `Expected 10, got ${watermarkedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Watermarked file has correct name', 
                result.name.includes('watermarked'));
        
    } catch (error) {
        logTest('Watermark', false, error.message);
    }
}

async function testPasswordProtect() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Protect PDF with password
        const result = await PDFTools.passwordProtectPDF(file, 'test123');
        
        // Verify result structure
        logTest('Password protect returns object', result && result.name && result.data);
        
        // Verify protected PDF has correct page count
        const protectedPdf = await PDFDocument.load(result.data);
        logTest('Protected PDF has correct page count', 
                protectedPdf.getPageCount() === 10,
                `Expected 10, got ${protectedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Protected file has correct name', 
                result.name.includes('protected'));
        
    } catch (error) {
        logTest('Password protect', false, error.message);
    }
}

async function testPageNumbers() {
    try {
        const file = createFileFromPath(path.join(fixturesDir, 'medium.pdf'), 'medium.pdf');
        
        // Add page numbers
        const options = {
            position: 'bottom-center',
            format: 'Page {n}'
        };
        
        const result = await PDFTools.addPageNumbers(file, options);
        
        // Verify result structure
        logTest('Page numbers returns object', result && result.name && result.data);
        
        // Verify numbered PDF has correct page count
        const numberedPdf = await PDFDocument.load(result.data);
        logTest('Numbered PDF has correct page count', 
                numberedPdf.getPageCount() === 10,
                `Expected 10, got ${numberedPdf.getPageCount()}`);
        
        // Verify filename
        logTest('Numbered file has correct name', 
                result.name.includes('numbered'));
        
    } catch (error) {
        logTest('Page numbers', false, error.message);
    }
}

// ============================================
// TEST REPORT
// ============================================

function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`\x1b[32mPassed: ${testResults.passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${testResults.failed}\x1b[0m`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n--- Failed Tests ---');
        testResults.tests
            .filter(t => !t.passed)
            .forEach(t => console.log(`  ✗ ${t.name}: ${t.message}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Feature support assessment
    console.log('\n--- Feature Support Assessment ---');
    const compressionTest = testResults.tests.find(t => t.name.includes('Compression'));
    const passwordTest = testResults.tests.find(t => t.name.includes('PDF is encrypted'));
    
    if (compressionTest && !compressionTest.passed) {
        console.log('\x1b[33m⚠ PDF Compression: pdf-lib may not support meaningful compression\x1b[0m');
        console.log('  Recommendation: Consider removing or marking as "optimization only"');
    }
    
    if (passwordTest && !passwordTest.passed) {
        console.log('\x1b[33m⚠ Password Protection: pdf-lib encryption may not be fully functional\x1b[0m');
        console.log('  Recommendation: Consider removing this feature or using a different library');
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with error code if any tests failed
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run all tests
runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});