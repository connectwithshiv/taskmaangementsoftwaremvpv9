/**
 * RateManagerService - Manages category-wise rates for Doers and Checkers
 * Storage: localStorage key 'taskManagement_rates'
 */

const STORAGE_KEY = 'taskManagement_rates';

// Initialize rates from localStorage
let rates = [];

const loadRates = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      rates = JSON.parse(data);
    } else {
      rates = [];
    }
  } catch (error) {
    console.error('Error loading rates:', error);
    rates = [];
  }
};

const saveRates = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ratesUpdated'));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving rates:', error);
    return { success: false, error: error.message };
  }
};

loadRates();

export const RateManagerService = {
  /**
   * Get all rates
   */
  getAllRates: () => {
    loadRates();
    return rates;
  },

  /**
   * Get rate by category ID
   */
  getRateByCategoryId: (categoryId) => {
    return rates.find(r => r.categoryId === categoryId);
  },

  /**
   * Get rate by ID
   */
  getRateById: (rateId) => {
    return rates.find(r => r.id === rateId);
  },

  /**
   * Create a new rate configuration
   * @param {Object} rateData - { categoryId, doerRate, checkerRatePerMistake (as %), effectiveFrom, effectiveTo }
   */
  createRate: (rateData) => {
    try {
      // Validation
      if (!rateData.categoryId) {
        return { success: false, message: 'Category ID is required' };
      }

      if (!rateData.doerRate && rateData.doerRate !== 0) {
        return { success: false, message: 'Doer rate is required' };
      }

      if (rateData.checkerRatePerMistake === undefined || rateData.checkerRatePerMistake === null) {
        return { success: false, message: 'Checker rate per mistake is required' };
      }

      // Check if rate already exists for this category
      const existing = rates.find(r => r.categoryId === rateData.categoryId && r.status === 'active');
      if (existing) {
        return { success: false, message: 'Active rate already exists for this category' };
      }

      const now = new Date().toISOString();
      const newRate = {
        id: `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        categoryId: rateData.categoryId,
        doerRate: parseFloat(rateData.doerRate) || 0,
        checkerRatePerMistake: parseFloat(rateData.checkerRatePerMistake) || 0,
        effectiveFrom: rateData.effectiveFrom || now.split('T')[0],
        effectiveTo: rateData.effectiveTo || null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: rateData.createdBy || 'system'
      };

      rates.push(newRate);
      const saveResult = saveRates();

      if (!saveResult.success) {
        rates.pop(); // Rollback
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        rate: newRate,
        message: 'Rate created successfully'
      };
    } catch (error) {
      console.error('Error creating rate:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Update rate
   */
  updateRate: (rateId, rateData) => {
    try {
      const index = rates.findIndex(r => r.id === rateId);
      if (index === -1) {
        return { success: false, message: 'Rate not found' };
      }

      const now = new Date().toISOString();
      const updatedRate = {
        ...rates[index],
        ...rateData,
        doerRate: rateData.doerRate !== undefined ? parseFloat(rateData.doerRate) : rates[index].doerRate,
        checkerRatePerMistake: rateData.checkerRatePerMistake !== undefined ? parseFloat(rateData.checkerRatePerMistake) : rates[index].checkerRatePerMistake,
        updatedAt: now
      };

      rates[index] = updatedRate;
      const saveResult = saveRates();

      if (!saveResult.success) {
        rates[index] = rates[index]; // Rollback
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        rate: updatedRate,
        message: 'Rate updated successfully'
      };
    } catch (error) {
      console.error('Error updating rate:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Delete rate
   */
  deleteRate: (rateId) => {
    try {
      const index = rates.findIndex(r => r.id === rateId);
      if (index === -1) {
        return { success: false, message: 'Rate not found' };
      }

      rates.splice(index, 1);
      const saveResult = saveRates();

      if (!saveResult.success) {
        rates.splice(index, 0, rates[index]); // Rollback
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        message: 'Rate deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting rate:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Calculate doer earnings (full amount when approved)
   */
  calculateDoerEarnings: (categoryId) => {
    const rate = RateManagerService.getRateByCategoryId(categoryId);
    if (!rate || rate.status !== 'active') {
      return 0;
    }
    return rate.doerRate || 0;
  },

  /**
   * Calculate checker earnings (per mistake found + base credit for checking)
   * @param {string} categoryId
   * @param {number} mistakesCount - Number of unchecked/incorrect items
   * @param {boolean} stageCompleted - Whether the stage is completed (checker gets base credit)
   */
  calculateCheckerEarnings: (categoryId, mistakesCount = 0, stageCompleted = true) => {
    const rate = RateManagerService.getRateByCategoryId(categoryId);
    if (!rate || rate.status !== 'active') {
      return 0;
    }
    
    const doerRate = rate.doerRate || 0;
    const checkerRatePerMistake = rate.checkerRatePerMistake || 0;
    
    // Base credit for checker when stage is completed (checkerRatePerMistake as percentage of doerRate)
    // If checkerRatePerMistake is set, use it as base percentage; otherwise use a default
    const baseCheckerCredit = (doerRate * checkerRatePerMistake) / 100;
    
    // Additional credit for mistakes found: (doerRate * checkerRatePerMistake / 100) * mistakesCount
    const earningsPerMistake = (doerRate * checkerRatePerMistake) / 100;
    const mistakeEarnings = earningsPerMistake * mistakesCount;
    
    // Checker gets base credit when stage is completed, plus additional credit for mistakes
    return stageCompleted ? (baseCheckerCredit + mistakeEarnings) : mistakeEarnings;
  }
};

export default RateManagerService;

