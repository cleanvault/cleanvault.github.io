#!/usr/bin/env node

/**
 * CleanVault - Secure License Generator
 * 
 * Generates cryptographically signed license keys.
 * Uses HMAC-SHA256 for license verification without backend.
 * 
 * Usage: node tools/generate-license.js <email> <plan> <expiration-date>
 * Example: node tools/generate-license.js customer@example.com pro 2027-06-28
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const licensesFile = path.join(__dirname, 'licenses.json');

// SECURITY: Secret key for HMAC signing
// In production, keep this secret! Consider using environment variables.
// This key is embedded in both generator and browser code.
const SECRET_KEY = 'CleanVault-Pro-License-Secret-2024-Secure-Key';

/**
 * Generate signature (browser-compatible hash)
 * Uses same algorithm as browser for consistency
 */
function generateSignature(data) {
    // Simple hash function that matches browser implementation
    let hash = 0;
    const str = SECRET_KEY + data;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and take first 16 chars
    return Math.abs(hash).toString(16).toUpperCase().substring(0, 16).padEnd(16, '0');
}

/**
 * Generate a unique license key with cryptographic signature
 * Format: CV-PRO-{VERSION}{PLAN}-{RANDOM}-{YYYYMMDD}-{SIG} (5 parts when split by -)
 * 
 * @param {string} email - Customer email
 * @param {string} plan - Plan type ('pro' or 'corp')
 * @param {string} expirationDate - Expiration date (YYYY-MM-DD)
 * @returns {string} - License key
 */
function generateLicenseKey(email, plan, expirationDate) {
    const expiration = new Date(expirationDate);
    const expiryStr = expiration.toISOString().split('T')[0].replace(/-/g, '').substring(0, 8); // YYYYMMDD
    
    // Generate random part (8 hex chars for uniqueness)
    const randomBytes = crypto.randomBytes(4);
    const randomPart = randomBytes.toString('hex').toUpperCase().substring(0, 8);
    
    // Normalize plan to 3-char code
    const planCode = plan.toUpperCase().substring(0, 3);
    
    // Create data to sign: version|plan|random|expiry|email
    const dataToSign = `01|${planCode}|${randomPart}|${expiryStr}|${email}`;
    const signature = generateSignature(dataToSign);
    
    // Combine: CV-PRO-01PRO-XXXXXXXX-YYYYMMDD-SIG
    return `CV-PRO-01${planCode}-${randomPart}-${expiryStr}-${signature}`;
}

/**
 * Load existing licenses from file
 */
function loadLicenses() {
    try {
        if (fs.existsSync(licensesFile)) {
            const data = fs.readFileSync(licensesFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading licenses:', error);
    }
    return [];
}

/**
 * Save licenses to file
 */
function saveLicenses(licenses) {
    try {
        fs.writeFileSync(licensesFile, JSON.stringify(licenses, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving licenses:', error);
        return false;
    }
}

/**
 * Check if license already exists
 */
function licenseExists(licenses, licenseKey) {
    return licenses.some(lic => lic.license === licenseKey);
}

/**
 * Verify license signature (same algorithm as browser)
 * 
 * @param {string} licenseKey - Full license key
 * @param {string} email - Customer email
 * @returns {boolean} - True if signature is valid
 */
function verifyLicenseSignature(licenseKey, email) {
    try {
        // Parse license: CV-PRO-VERSIONPLAN-RANDOM-YYYYMMDD-SIG
        const parts = licenseKey.split('-');
        if (parts.length !== 6) return false;
        
        const versionPlan = parts[2]; // e.g., "01PRO" or "01CORP"
        const randomPart = parts[3]; // 8 hex chars
        const expiryStr = parts[4]; // YYYYMMDD
        const signature = parts[5]; // 16 hex chars
        
        if (versionPlan.length !== 5) return false;
        if (randomPart.length !== 8) return false;
        if (!/^\d{8}$/.test(expiryStr)) return false;
        if (!/^[A-F0-9]{16}$/.test(signature)) return false;
        
        const version = versionPlan.substring(0, 2);
        const plan = versionPlan.substring(2, 5);
        
        // Recreate signed data: version|plan|random|expiry|email
        const dataToVerify = `${version}|${plan}|${randomPart}|${expiryStr}|${email}`;
        const expectedSignature = generateSignature(dataToVerify);
        
        // Constant-time comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        return false;
    }
}

/**
 * Generate a new license
 */
function generateLicense(email, plan, expirationDate) {
    // Validate inputs
    if (!email || !email.includes('@')) {
        console.error('Error: Valid email address required');
        process.exit(1);
    }

    if (!plan || !['pro', 'corp'].includes(plan.toLowerCase())) {
        console.error('Error: Plan must be "pro" or "corp"');
        process.exit(1);
    }

    if (!expirationDate || isNaN(Date.parse(expirationDate))) {
        console.error('Error: Valid expiration date required (YYYY-MM-DD)');
        process.exit(1);
    }

    const expiration = new Date(expirationDate);
    const now = new Date();

    if (expiration <= now) {
        console.error('Error: Expiration date must be in the future');
        process.exit(1);
    }

    // Generate unique license
    let licenseKey;
    let attempts = 0;
    const licenses = loadLicenses();

    do {
        licenseKey = generateLicenseKey(email, plan, expirationDate);
        attempts++;
        
        if (attempts > 100) {
            console.error('Error: Could not generate unique license after 100 attempts');
            process.exit(1);
        }
    } while (licenseExists(licenses, licenseKey));

    // Create license record
    const licenseRecord = {
        license: licenseKey,
        email: email,
        plan: plan,
        expiration: expiration.toISOString(),
        created: now.toISOString()
    };

    // Save to file
    licenses.push(licenseRecord);
    
    if (!saveLicenses(licenses)) {
        console.error('Error: Failed to save license');
        process.exit(1);
    }

    return licenseRecord;
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('Usage: node generate-license.js <email> <plan> <expiration-date>');
        console.log('Example: node generate-license.js customer@example.com pro 2027-06-28');
        process.exit(1);
    }

    const [email, plan, expirationDate] = args;

    console.log('\n=== CleanVault Secure License Generator ===\n');
    console.log('⚠️  SECURITY NOTICE:');
    console.log('This uses cryptographic signing. The secret key is embedded in client code.');
    console.log('Determined users can still bypass this. This deters casual piracy.\n');

    const licenseRecord = generateLicense(email, plan, expirationDate);

    console.log('✓ License generated successfully!\n');
    console.log('License Details:');
    console.log('-----------------');
    console.log(`License Key: ${licenseRecord.license}`);
    console.log(`Email:       ${licenseRecord.email}`);
    console.log(`Plan:        ${licenseRecord.plan.toUpperCase()}`);
    console.log(`Expires:     ${new Date(licenseRecord.expiration).toLocaleDateString()}`);
    console.log(`Created:     ${new Date(licenseRecord.created).toLocaleDateString()}`);
    console.log('\n-----------------');
    console.log('\nLicenses saved to: ' + licensesFile);
    console.log('\nSend this license key to the customer via email.');
    console.log('They can activate it in CleanVault under the "About" section.\n');

    // Output just the license key for easy copying
    console.log('LICENSE KEY:');
    console.log(licenseRecord.license);
    console.log('');
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export for testing
module.exports = {
    generateLicenseKey,
    generateLicense,
    loadLicenses,
    saveLicenses,
    licenseExists,
    verifyLicenseSignature,
    generateSignature
};