/**
 * CleanVault - Usage Limits System
 * 
 * Centralized limit management for Free vs Pro tiers.
 * All limits are client-side only using localStorage.
 */

const LimitsManager = (function() {
    // Storage keys
    const STORAGE_KEY = 'cleanvault_usage_stats';
    const STORAGE_DATE_KEY = 'cleanvault_usage_date';
    
    // Free tier limits
    const FREE_LIMITS = {
        // Single-file tools are structurally single-file: their file input has
        // no "multiple" attribute and they replace currentFiles rather than
        // appending, so this is documentation of behaviour rather than a value
        // compared at runtime. Merge (the documented exception) and Batch both
        // use a multi-select input and are gated separately.
        maxFilesPerOperation: 1,  // Except Merge PDF
        maxPagesPerPDF: 50,
        maxOperationsPerDay: 10,
        batchProcessing: false
    };
    
    // Pro tier limits (unlimited)
    const PRO_LIMITS = {
        maxFilesPerOperation: Infinity,
        maxPagesPerPDF: Infinity,
        maxOperationsPerDay: Infinity,
        batchProcessing: true
    };
    
    /**
     * Get current date string (YYYY-MM-DD)
     */
    function getTodayString() {
        const now = new Date();
        return now.getFullYear() + '-' + 
               String(now.getMonth() + 1).padStart(2, '0') + '-' + 
               String(now.getDate()).padStart(2, '0');
    }
    
    /**
     * Get usage stats from localStorage, reset if new day
     */
    function getUsageStats() {
        try {
            const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
            const today = getTodayString();
            
            // Reset if new day
            if (storedDate !== today) {
                const freshStats = { count: 0, date: today };
                localStorage.setItem(STORAGE_DATE_KEY, today);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(freshStats));
                return freshStats;
            }
            
            // Read and normalise. localStorage is user-writable, so the stored
            // value can be missing, a string, fractional, negative or otherwise
            // malformed. Normalising here keeps every downstream comparison
            // numeric and stops trackOperation() from concatenating onto a
            // string ("9" + 1 === "91"), which would otherwise let a corrupted
            // counter drift forever without ever reaching the limit.
            let parsed;
            try {
                parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count":0}');
            } catch (error) {
                parsed = null;
            }
            
            const rawCount = (parsed && typeof parsed === 'object') ? parsed.count : 0;
            const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
            
            return { count: count, date: today };
        } catch (error) {
            return { count: 0, date: getTodayString() };
        }
    }
    
    /**
     * Check if user is Pro
     */
    function isProUser() {
        if (typeof LicenseManager !== 'undefined') {
            return LicenseManager.isActivated();
        }
        return false;
    }
    
    /**
     * Get current limits based on user tier
     */
    function getLimits() {
        return isProUser() ? PRO_LIMITS : FREE_LIMITS;
    }
    
    /**
     * Check if user can use a tool
     * @param {string} toolName - Name of the tool
     * @returns {Object} - { allowed: boolean, reason: string|null }
     */
    function canUseTool(toolName) {
        const limits = getLimits();
        
        // Check daily operation limit
        const stats = getUsageStats();
        if (stats.count >= limits.maxOperationsPerDay) {
            return {
                allowed: false,
                reason: 'Free plan limit reached. Upgrade to Pro to continue processing PDFs.'
            };
        }
        
        // Check batch processing (Pro only)
        if (toolName === 'batch' && !limits.batchProcessing) {
            return {
                allowed: false,
                reason: 'Batch Processing is a Pro feature. Upgrade to Pro to unlock batch processing.'
            };
        }
        
        return { allowed: true, reason: null };
    }
    
    /**
     * Check if a file can be processed (page count limit)
     *
     * @param {File} file - The PDF file (kept for call-site clarity and future
     *   per-file rules; the tier limit is currently page-count based)
     * @param {number} pageCount - Number of pages in the PDF
     * @returns {Object} - { allowed: boolean, reason: string|null }
     */
    function canProcessFile(file, pageCount) {
        const limits = getLimits();
        
        // Treat a missing or malformed page count as not processable rather
        // than letting an undefined comparison fall through as "allowed".
        if (!Number.isFinite(pageCount) || pageCount < 1) {
            return {
                allowed: false,
                reason: 'Could not determine the number of pages in this PDF.'
            };
        }
        
        if (pageCount > limits.maxPagesPerPDF) {
            return {
                allowed: false,
                reason: `Free limit: ${limits.maxPagesPerPDF} pages max. Upgrade to Pro for unlimited pages.`
            };
        }
        
        return { allowed: true, reason: null };
    }
    
    /**
     * Track an operation (increment daily counter)
     */
    function trackOperation() {
        try {
            const stats = getUsageStats();
            stats.count += 1;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        } catch (error) {
            console.error('Error tracking operation:', error);
        }
    }
    
    /**
     * Get remaining operations for today
     */
    function getRemainingOperations() {
        const limits = getLimits();
        const stats = getUsageStats();
        return Math.max(0, limits.maxOperationsPerDay - stats.count);
    }
    
    /**
     * Get usage stats for display
     */
    function getUsageInfo() {
        const limits = getLimits();
        const stats = getUsageStats();
        return {
            used: stats.count,
            limit: limits.maxOperationsPerDay,
            remaining: getRemainingOperations(),
            isPro: isProUser()
        };
    }
    
    // Public API
    return {
        isProUser,
        canUseTool,
        canProcessFile,
        trackOperation,
        getRemainingOperations,
        getUsageInfo,
        getLimits
    };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LimitsManager = LimitsManager;
}