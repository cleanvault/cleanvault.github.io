/**
 * CleanVault - License Management System
 * 
 * Handles Pro license activation and validation.
 * All activation is stored locally in the browser using localStorage.
 * No backend, no server, no accounts required.
 * 
 * SECURITY MODEL (honest statement of what this provides):
 * CleanVault is intentionally a 100% browser-based product. A determined user
 * controls their own browser, so client-side enforcement can ultimately be
 * bypassed, and this is not presented as protection against such a user. What
 * it does provide:
 *   - Licenses cannot be altered accidentally or by casual inspection.
 *   - Expiry is genuinely enforced: a lapsed license stops granting Pro.
 *   - A valid, signed, unexpired license is required. The stored activation
 *     flag on its own grants nothing.
 * Signatures are SHA-256, computed locally with a built-in implementation so
 * verification can be synchronous and fully offline. No network requests are
 * ever made by this module.
 */

const LicenseManager = (function() {
    const STORAGE_KEY = 'cleanvault_pro_activated';
    const STORAGE_DATE_KEY = 'cleanvault_pro_activated_date';
    const STORAGE_LICENSE_KEY = 'cleanvault_pro_license_key';
    
    // Signing secret. Shared with tools/generate-license.js and success.html.
    // Unchanged so that already-issued licenses keep verifying.
    const SECRET_KEY = 'CleanVault-Pro-License-Secret-2024-Secure-Key';
    
    // Valid plan suffixes (last 3 chars of the 5-char version+plan block).
    // 'PRO' = Personal, 'COR' = Corporate. Both currently unlock the same
    // Pro feature set; the plan is recorded so the distinction is available.
    const VALID_PLAN_SUFFIXES = ['PRO', 'COR'];
    
    const EXPIRY_LENGTH = 8;
    const SHA256_SIGNATURE_LENGTH = 64;
    const LEGACY_SIGNATURE_LENGTH = 16;
    
    // SHA-256 round constants (FIPS 180-4)
    const SHA256_K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    
    function rotr(value, bits) {
        return ((value >>> bits) | (value << (32 - bits))) | 0;
    }
    
    /**
     * Synchronous SHA-256.
     *
     * Implemented locally rather than using crypto.subtle.digest because that
     * API is asynchronous, while activation state is read synchronously from
     * many places (limits.js, the Pro tool gates, the UI badge). This lets
     * isActivated() verify the signature on every call, entirely offline, with
     * no external dependency.
     *
     * Cross-checked against Node's crypto module by
     * tests/license-validator.test.js.
     *
     * @param {string} input
     * @returns {string} 64-character uppercase hex digest
     */
    function sha256Hex(input) {
        const text = String(input);
        let bytes;
        if (typeof TextEncoder !== 'undefined') {
            bytes = Array.from(new TextEncoder().encode(text));
        } else {
            bytes = [];
            for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
        }
        
        const bitLength = bytes.length * 8;
        bytes.push(0x80);
        while (bytes.length % 64 !== 56) bytes.push(0);
        const hi = Math.floor(bitLength / 0x100000000);
        const lo = bitLength >>> 0;
        bytes.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
        bytes.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);
        
        const H = new Uint32Array([
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ]);
        const w = new Uint32Array(64);
        
        for (let offset = 0; offset < bytes.length; offset += 64) {
            for (let t = 0; t < 16; t++) {
                const i = offset + t * 4;
                w[t] = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) | 0;
            }
            for (let t = 16; t < 64; t++) {
                const x = w[t - 15];
                const y = w[t - 2];
                const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
                const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
                w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
            }
            
            let a = H[0], b = H[1], c = H[2], d = H[3];
            let e = H[4], f = H[5], g = H[6], h = H[7];
            
            for (let t = 0; t < 64; t++) {
                const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                const ch = (e & f) ^ (~e & g);
                const t1 = (h + S1 + ch + SHA256_K[t] + w[t]) | 0;
                const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                const maj = (a & b) ^ (a & c) ^ (b & c);
                const t2 = (S0 + maj) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0;
                d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
        }
        
        let hex = '';
        for (let i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
        return hex.toUpperCase();
    }
    
    /**
     * Original 32-bit hash, used by licenses issued before the SHA-256 upgrade.
     * Retained only so already-issued licenses keep validating; never used to
     * sign new licenses.
     * @param {string} data
     * @returns {string} 16-character hex signature
     */
    function legacySignature(data) {
        let hash = 0;
        const str = SECRET_KEY + data;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).toUpperCase().substring(0, 16).padEnd(16, '0');
    }
    
    /**
     * Expected signature for a parsed license, chosen by its algorithm tag.
     * @param {Object} parsed
     * @returns {string}
     */
    function expectedSignature(parsed) {
        return parsed.algorithm === 'sha256'
            ? sha256Hex(SECRET_KEY + parsed.dataToSign)
            : legacySignature(parsed.dataToSign);
    }
    
    /**
     * Strictly parse a YYYYMMDD expiry string into a real calendar date.
     *
     * JavaScript's Date constructor silently rolls out-of-range values over
     * (new Date(2027, 12, 32) becomes 1 Feb 2028), so a naive comparison would
     * accept impossible dates such as 20271332 or 20270230. The constructed
     * date is read back and must match the requested year/month/day exactly.
     *
     * @param {string} expiryStr - 8-digit YYYYMMDD string
     * @returns {Date|null} local-midnight Date, or null if not a real date
     */
    function parseExpiryDate(expiryStr) {
        if (typeof expiryStr !== 'string' || !/^\d{8}$/.test(expiryStr)) return null;
        
        const year = parseInt(expiryStr.substring(0, 4), 10);
        const month = parseInt(expiryStr.substring(4, 6), 10);
        const day = parseInt(expiryStr.substring(6, 8), 10);
        
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;
        if (year < 1000) return null;
        
        // setFullYear avoids the legacy two-digit-year remapping that the
        // Date(y, m, d) constructor performs for years 0-99.
        const date = new Date(0);
        date.setHours(0, 0, 0, 0);
        date.setFullYear(year, month - 1, day);
        
        if (date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day) {
            return null;
        }
        return date;
    }
    
    /**
     * True when the expiry is a real date that is today or later.
     * @param {string} expiryStr - YYYYMMDD
     * @returns {boolean}
     */
    function validateExpiry(expiryStr) {
        const expiryDate = parseExpiryDate(expiryStr);
        if (!expiryDate) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return expiryDate.getTime() >= now.getTime();
    }
    
    /**
     * Pick the signature algorithm from the length of the final segment.
     * @param {number} lastPartLength
     * @returns {'sha256'|'legacy'|null}
     */
    function detectSignatureAlgorithm(lastPartLength) {
        const sigLength = lastPartLength - EXPIRY_LENGTH;
        if (sigLength === SHA256_SIGNATURE_LENGTH) return 'sha256';
        if (sigLength === LEGACY_SIGNATURE_LENGTH) return 'legacy';
        return null;
    }
    
    /**
     * Parse and fully validate a license key.
     *
     * License format: CV-PRO-XXXXX-XXXXXXXX-YYYYMMDD<signature>
     *   - CV-PRO      prefix
     *   - XXXXX      5 chars: 2 version + 3 plan ("01PRO" or "01COR")
     *   - XXXXXXXX   8 uppercase hex chars (random)
     *   - YYYYMMDD    8 digits (expiry date)
     *   - signature  64 hex chars (SHA-256) or 16 hex chars (legacy)
     *
     * The signature covers version|plan, the random part and the expiry, so
     * altering the plan, expiry, random value or version invalidates it.
     *
     * @param {string} licenseKey
     * @returns {Object} {valid, reason, plan, expiry, algorithm}
     */
    function validateLicense(licenseKey) {
        const fail = (reason, extra) =>
            Object.assign({ valid: false, reason: reason, plan: null, expiry: null, algorithm: null }, extra || {});
        
        if (!licenseKey || typeof licenseKey !== 'string') {
            return fail('License key is required');
        }
        
        const trimmed = licenseKey.trim().toUpperCase();
        if (!trimmed.startsWith('CV-PRO-')) {
            return fail('Invalid license format');
        }
        
        const parts = trimmed.split('-');
        if (parts.length !== 5) {
            return fail('Invalid license structure');
        }
        
        const versionPlanBlock = parts[2];
        const randomPart = parts[3];
        const lastPart = parts[4];
        
        if (versionPlanBlock.length !== 5) {
            return fail('Invalid license format');
        }
        
        const plan = versionPlanBlock.substring(versionPlanBlock.length - 3);
        if (!VALID_PLAN_SUFFIXES.includes(plan)) {
            return fail('Invalid license plan', { plan: plan });
        }
        
        if (!/^[A-F0-9]{8}$/.test(randomPart)) {
            return fail('Invalid license key');
        }
        
        const algorithm = detectSignatureAlgorithm(lastPart.length);
        if (!algorithm) {
            return fail('Invalid license key length');
        }
        
        const expiry = lastPart.substring(0, EXPIRY_LENGTH);
        const signature = lastPart.substring(EXPIRY_LENGTH);
        
        if (!/^\d{8}$/.test(expiry)) {
            return fail('Invalid expiry date format', { plan: plan, algorithm: algorithm });
        }
        
        const signaturePattern = algorithm === 'sha256' ? /^[A-F0-9]{64}$/ : /^[A-F0-9]{16}$/;
        if (!signaturePattern.test(signature)) {
            return fail('Invalid signature format', { plan: plan, expiry: expiry, algorithm: algorithm });
        }
        
        const dataToSign = versionPlanBlock + '|' + randomPart + '|' + expiry;
        
        if (signature !== expectedSignature({ algorithm: algorithm, dataToSign: dataToSign })) {
            return fail('License key signature is invalid', { plan: plan, expiry: expiry, algorithm: algorithm });
        }
        
        // The signature is good, but the licence must also be current.
        if (!validateExpiry(expiry)) {
            return fail('License has expired', { plan: plan, expiry: expiry, algorithm: algorithm });
        }
        
        return { valid: true, reason: null, plan: plan, expiry: expiry, algorithm: algorithm };
    }
    
    /**
     * Check if Pro is currently activated.
     *
     * The stored activation flag alone is NOT sufficient. A stored license key
     * must also exist and pass full validation: structure, signature and
     * expiry. Setting cleanvault_pro_activated="true" by hand grants nothing,
     * and an expired license stops working on its own.
     *
     * Synchronous by design: this is read on hot paths (limits.js, the Pro
     * tool gates, the UI badge).
     *
     * @returns {boolean}
     */
    function isActivated() {
        try {
            if (localStorage.getItem(STORAGE_KEY) !== 'true') return false;
            const storedLicense = localStorage.getItem(STORAGE_LICENSE_KEY);
            if (!storedLicense) return false;
            return validateLicense(storedLicense).valid === true;
        } catch (error) {
            console.error('Error checking activation status:', error);
            return false;
        }
    }
    
    /**
     * Activate a Pro license after validating it.
     * @param {string} licenseKey
     * @returns {Promise<Object>} {success, message}
     */
    async function activate(licenseKey) {
        try {
            const validation = validateLicense(licenseKey);
            if (!validation.valid) {
                return { success: false, message: validation.reason || 'Invalid license key' };
            }
            
            localStorage.setItem(STORAGE_KEY, 'true');
            localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
            localStorage.setItem(STORAGE_LICENSE_KEY, licenseKey.trim().toUpperCase());
            localStorage.setItem(STORAGE_KEY + '_plan', validation.plan);
            localStorage.setItem(STORAGE_KEY + '_expiry', validation.expiry);
            
            const planName = validation.plan === 'COR' ? 'Corporate' : 'Personal';
            return { success: true, message: 'CleanVault Pro ' + planName + ' activated successfully!' };
        } catch (error) {
            console.error('Error activating license:', error);
            return { success: false, message: 'Failed to activate license. Please try again.' };
        }
    }
    
    /**
     * Deactivate the Pro license and clear all related stored values.
     * @returns {boolean}
     */
    function deactivate() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_DATE_KEY);
            localStorage.removeItem(STORAGE_LICENSE_KEY);
            localStorage.removeItem(STORAGE_KEY + '_plan');
            localStorage.removeItem(STORAGE_KEY + '_expiry');
            return true;
        } catch (error) {
            console.error('Error deactivating license:', error);
            return false;
        }
    }
    
    /**
     * Get activation date.
     * @returns {string|null} ISO date string or null
     */
    function getActivationDate() {
        try { return localStorage.getItem(STORAGE_DATE_KEY); } catch (error) { return null; }
    }
    
    /**
     * Get stored license key.
     * @returns {string|null}
     */
    function getStoredLicense() {
        try { return localStorage.getItem(STORAGE_LICENSE_KEY); } catch (error) { return null; }
    }
    
    /**
     * Get the stored plan identifier ('PRO' Personal or 'COR' Corporate).
     * Both plans currently unlock the same Pro feature set.
     * @returns {string|null}
     */
    function getPlan() {
        try { return localStorage.getItem(STORAGE_KEY + '_plan'); } catch (error) { return null; }
    }
    
    /**
     * Get stored expiry (YYYYMMDD).
     * @returns {string|null}
     */
    function getExpiry() {
        try { return localStorage.getItem(STORAGE_KEY + '_expiry'); } catch (error) { return null; }
    }
    
    /**
     * Initialize the license manager and reflect the real activation state.
     * @returns {boolean}
     */
    function init() {
        const activated = isActivated();
        updateUIForActivation(activated);
        return activated;
    }
    
    /**
     * Update UI elements based on activation status.
     * @param {boolean} activated
     */
    function updateUIForActivation(activated) {
        const proBadge = document.getElementById('pro-badge');
        if (proBadge) {
            if (activated) {
                proBadge.textContent = 'Pro';
                proBadge.classList.add('active');
            } else {
                proBadge.textContent = 'Free';
                proBadge.classList.remove('active');
            }
        }
        
        const activationSection = document.querySelector('.activation-section');
        if (activationSection) {
            if (activated) {
                activationSection.classList.add('activated');
                const statusText = document.getElementById('activate-btn');
                if (statusText) {
                    statusText.textContent = '✅ Pro Activated';
                    statusText.disabled = true;
                }
                const deactivateBtn = document.getElementById('deactivate-btn');
                if (deactivateBtn) deactivateBtn.style.display = 'inline-block';
            } else {
                activationSection.classList.remove('activated');
                const activateBtn = document.getElementById('activate-btn');
                if (activateBtn) {
                    activateBtn.textContent = 'Activate Pro';
                    activateBtn.disabled = false;
                }
            }
        }
    }
    
    // Public API
    return {
        isActivated,
        validateLicense,
        activate,
        deactivate,
        getActivationDate,
        getStoredLicense,
        getPlan,
        getExpiry,
        init
    };
})();

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.LicenseManager = LicenseManager;
}
