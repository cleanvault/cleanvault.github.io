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
            
            const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count":0}');
            return stats;
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
                reason: 'Free plan limit reached. Upgrade to Pro to continue processing PDFs.'
            };
        }
        
        return { allowed: true, reason: null };
    }
    
    /**
     * Check if a file can be processed (page count limit)
     * @param {File} file - PDF file to check
     * @param {number} pageCount - Number of pages in the PDF
     * @returns {Object} - { allowed: boolean, reason: string|null }
     */
    function canProcessFile(file, pageCount) {
        const limits = getLimits();
        
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