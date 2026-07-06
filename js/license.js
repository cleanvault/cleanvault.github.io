/**
 * CleanVault - License Management System
 * 
 * Handles Pro license activation and validation with cryptographic signing.
 * All activation is stored locally in the browser using localStorage.
 * No backend, no server, no accounts required.
 * 
 * SECURITY NOTICE: This provides deterrence against casual bypass.
 * The "secret key" is embedded in client-side JavaScript and can be
 * extracted by determined users. For stronger protection, a backend
 * validation service would be required.
 */

const LicenseManager = (function() {
    const STORAGE_KEY = 'cleanvault_pro_activated';
    const STORAGE_DATE_KEY = 'cleanvault_pro_activated_date';
    const STORAGE_LICENSE_KEY = 'cleanvault_pro_license_key';
    
    // Secret key for signature generation (matches tools/generate-license.js)
    // Embedded in client code - provides deterrence against casual bypass.
    const SECRET_KEY = 'CleanVault-Pro-License-Secret-2024-Secure-Key';
    
    // Valid plan suffixes (extracted from 5-char version+plan block)
    const VALID_PLAN_SUFFIXES = ['PRO', 'COR'];
    
    /**
     * Generate a simple hash-based signature (must match tools/generate-license.js)
     * @param {string} data - Data to sign
     * @returns {string} - 16-character hex signature
     */
    function generateSignature(data) {
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
     * Verify license signature
     * @param {string} dataToVerify - Data that was signed
     * @param {string} signature - Signature to verify
     * @returns {boolean} - True if signature is valid
     */
    function verifySignature(dataToVerify, signature) {
        const expectedSignature = generateSignature(dataToVerify);
        return signature === expectedSignature;
    }
    
    /**
     * Check if Pro version is activated
     * @returns {boolean} - True if Pro is activated
     */
    function isActivated() {
        try {
            const activated = localStorage.getItem(STORAGE_KEY);
            return activated === 'true';
        } catch (error) {
            console.error('Error checking activation status:', error);
            return false;
        }
    }
    
    /**
     * Validate license expiry date
     * @param {string} expiryStr - Expiry date in YYYYMMDD format
     * @returns {boolean} - True if not expired
     */
    function validateExpiry(expiryStr) {
        try {
            if (!expiryStr || expiryStr.length !== 8) return false;
            
            const year = parseInt(expiryStr.substring(0, 4));
            const month = parseInt(expiryStr.substring(4, 6));
            const day = parseInt(expiryStr.substring(6, 8));
            
            const expiryDate = new Date(year, month - 1, day);
            const now = new Date();
            
            // Reset time components for date-only comparison
            expiryDate.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);
            
            return expiryDate >= now;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Validate a license key with cryptographic verification
     * License key format: CV-PRO-XXXXX-XXXXXXXX-YYYYMMDDSSSSSSSSSSSSSSSS
     *   - CV-PRO: Prefix
     *   - XXXXX: 5 chars version+plan (e.g., "01PRO" or "01COR")
     *   - XXXXXXXX: 8 uppercase hex chars (random)
     *   - YYYYMMDD: 8 digits (expiry date)
     *   - SSSSSSSSSSSSSSSS: 16 uppercase hex chars (signature)
     * split('-') always produces exactly 5 parts
     * part[4] = [8-digit expiry][16-char signature] (24 chars, NO dash)
     * 
     * Example: CV-PRO-01PRO-A1B2C3D4-20271231ABCDEF1234567890
     * 
     * @param {string} licenseKey - The license key to validate
     * @param {string} email - Email for signature verification (optional)
     * @returns {Object} - Validation result with success, message, plan, expiry
     */
    function validateLicense(licenseKey, email) {
        const result = {
            valid: false,
            reason: null,
            plan: null,
            expiry: null
        };
        
        if (!licenseKey || typeof licenseKey !== 'string') {
            result.reason = 'License key is required';
            return result;
        }
        
        const trimmed = licenseKey.trim().toUpperCase();
        
        // Check prefix
        if (!trimmed.startsWith('CV-PRO-')) {
            result.reason = 'Invalid license format';
            return result;
        }
        
        // Parse license: CV-PRO-VERSIONPLAN-RANDOM8-EXPIRY8SIG16
        const parts = trimmed.split('-');
        if (parts.length !== 5) {
            result.reason = 'Invalid license structure';
            return result;
        }
        
        const versionPlanBlock = parts[2]; // 5 chars: version + plan (e.g., "01PRO")
        const randomPart = parts[3]; // 8 hex chars
        const expirySigPart = parts[4]; // YYYYMMDD + SIG = 24 chars
        
        // Validate version+plan block (must be exactly 5 chars)
        if (versionPlanBlock.length !== 5) {
            result.reason = 'Invalid license format';
            return result;
        }
        
        // Extract plan suffix (last 3 chars of version+plan block)
        const planPart = versionPlanBlock.substring(versionPlanBlock.length - 3); // Get last 3 chars
        
        // Validate plan
        if (!VALID_PLAN_SUFFIXES.includes(planPart)) {
            result.reason = 'Invalid license plan';
            result.plan = planPart;
            return result;
        }
        
        // Validate random part (8 uppercase hex chars)
        if (!/^[A-F0-9]{8}$/.test(randomPart)) {
            result.reason = 'Invalid license key';
            return result;
        }
        
        // Last part must be exactly 24 chars (8 date + 16 sig)
        if (expirySigPart.length !== 24) {
            result.reason = 'Invalid license key length';
            return result;
        }
        
        const expiryStr = expirySigPart.substring(0, 8);
        const signature = expirySigPart.substring(8, 24);
        
        // Validate expiry format (must be 8 digits)
        if (!/^\d{8}$/.test(expiryStr)) {
            result.reason = 'Invalid expiry date format';
            return result;
        }
        
        // Validate signature format (must be 16 uppercase hex chars)
        if (!/^[A-F0-9]{16}$/.test(signature)) {
            result.reason = 'Invalid signature format';
            return result;
        }
        
        // Check expiry
        if (!validateExpiry(expiryStr)) {
            result.reason = 'License has expired';
            result.expiry = expiryStr;
            result.plan = planPart;
            return result;
        }
        
        // Verify signature covers: versionPlan|random|expiry (email-independent)
        const dataToVerify = `${versionPlanBlock}|${randomPart}|${expiryStr}`;
        if (!verifySignature(dataToVerify, signature)) {
            result.reason = 'License key signature is invalid';
            result.plan = planPart;
            result.expiry = expiryStr;
            return result;
        }
        
        result.valid = true;
        result.plan = planPart;
        result.expiry = expiryStr;
        result.reason = null;
        
        return result;
    }
    
    /**
     * Activate Pro license
     * @param {string} licenseKey - The license key to activate
     * @param {string} email - Customer email (optional, for signature verification)
     * @returns {Object} - Result object with success status and message
     */
    function activate(licenseKey, email) {
        try {
            // Validate the license
            const validation = validateLicense(licenseKey, email || '');
            
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.reason || 'Invalid license key'
                };
            }
            
            // Save activation to localStorage
            localStorage.setItem(STORAGE_KEY, 'true');
            localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
            localStorage.setItem(STORAGE_LICENSE_KEY, licenseKey.trim());
            localStorage.setItem(STORAGE_KEY + '_plan', validation.plan);
            localStorage.setItem(STORAGE_KEY + '_expiry', validation.expiry);
            
            const planName = validation.plan === 'COR' ? 'Corporate' : 'Personal';
            
            return {
                success: true,
                message: `CleanVault Pro ${planName} activated successfully!`
            };
            
        } catch (error) {
            console.error('Error activating license:', error);
            return {
                success: false,
                message: 'Failed to activate license. Please try again.'
            };
        }
    }
    
    /**
     * Deactivate Pro license
     * @returns {boolean} - True if deactivated successfully
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
     * Get activation date
     * @returns {string|null} - ISO date string or null
     */
    function getActivationDate() {
        try {
            return localStorage.getItem(STORAGE_DATE_KEY);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get stored license key
     * @returns {string|null} - License key or null
     */
    function getStoredLicense() {
        try {
            return localStorage.getItem(STORAGE_LICENSE_KEY);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get license plan
     * @returns {string|null} - Plan (PRO  or CORP) or null
     */
    function getPlan() {
        try {
            return localStorage.getItem(STORAGE_KEY + '_plan');
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get license expiry
     * @returns {string|null} - Expiry date (YYYYMMDD) or null
     */
    function getExpiry() {
        try {
            return localStorage.getItem(STORAGE_KEY + '_expiry');
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Initialize license manager
     * Checks activation status on page load
     */
    function init() {
        const activated = isActivated();
        
        // Update UI based on activation status
        updateUIForActivation(activated);
        
        return activated;
    }
    
    /**
     * Update UI elements based on activation status
     * @param {boolean} activated - Whether Pro is activated
     */
    function updateUIForActivation(activated) {
        // Update header badge
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
        
        // Update activation section if it exists
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