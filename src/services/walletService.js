/**
 * WalletService - Manages user wallets and earnings
 * Storage: localStorage key 'taskManagement_wallets'
 */

const STORAGE_KEY = 'taskManagement_wallets';

// Initialize wallets from localStorage
let wallets = [];

const loadWallets = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      wallets = JSON.parse(data);
    } else {
      wallets = [];
    }
  } catch (error) {
    console.error('Error loading wallets:', error);
    wallets = [];
  }
};

const saveWallets = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('walletsUpdated'));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving wallets:', error);
    return { success: false, error: error.message };
  }
};

loadWallets();

export const WalletService = {
  /**
   * Get all wallets
   */
  getAllWallets: () => {
    loadWallets();
    return wallets;
  },

  /**
   * Get wallet by user ID
   */
  getWalletByUserId: (userId) => {
    return wallets.find(w => w.userId === userId);
  },

  /**
   * Get or create wallet for a user
   */
  getOrCreateWallet: (userId) => {
    let wallet = wallets.find(w => w.userId === userId);
    
    if (!wallet) {
      // Create new wallet
      wallet = {
        userId: userId,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        earningsHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      wallets.push(wallet);
      saveWallets();
    }
    
    return wallet;
  },

  /**
   * Add earnings to user wallet
   * @param {Object} earningData - { userId, amount, source, taskId, categoryId, description, metadata }
   */
  addEarnings: (earningData) => {
    try {
      const { userId, amount, source, taskId, categoryId, description, metadata } = earningData;

      if (!userId || !amount) {
        return { success: false, message: 'User ID and amount are required' };
      }

      const wallet = WalletService.getOrCreateWallet(userId);

      const now = new Date().toISOString();
      const earning = {
        id: `earning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        amount: parseFloat(amount) || 0,
        source: source || 'task_completion', // 'task_completion', 'mistake_found', 'bonus', etc.
        taskId: taskId || null,
        categoryId: categoryId || null,
        description: description || '',
        metadata: metadata || {},
        timestamp: now
      };

      // Update wallet
      wallet.balance += earning.amount;
      wallet.totalEarned += earning.amount;
      wallet.earningsHistory.push(earning);
      wallet.updatedAt = now;

      const saveResult = saveWallets();

      if (!saveResult.success) {
        // Rollback
        wallet.balance -= earning.amount;
        wallet.totalEarned -= earning.amount;
        wallet.earningsHistory.pop();
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        earning: earning,
        wallet: wallet,
        message: 'Earnings added successfully'
      };
    } catch (error) {
      console.error('Error adding earnings:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get earnings history for a user
   */
  getEarningsHistory: (userId, filters = {}) => {
    const wallet = WalletService.getWalletByUserId(userId);
    if (!wallet) {
      return [];
    }

    let history = wallet.earningsHistory || [];

    // Apply filters
    if (filters.source) {
      history = history.filter(e => e.source === filters.source);
    }
    if (filters.categoryId) {
      history = history.filter(e => e.categoryId === filters.categoryId);
    }
    if (filters.dateFrom) {
      history = history.filter(e => e.timestamp >= filters.dateFrom);
    }
    if (filters.dateTo) {
      history = history.filter(e => e.timestamp <= filters.dateTo);
    }

    // Sort by timestamp (newest first)
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /**
   * Get wallet balance for a user
   */
  getBalance: (userId) => {
    const wallet = WalletService.getWalletByUserId(userId);
    return wallet ? wallet.balance : 0;
  },

  /**
   * Get user statistics
   */
  getUserStats: (userId) => {
    const wallet = WalletService.getWalletByUserId(userId);
    if (!wallet) {
      return {
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        earningsCount: 0
      };
    }

    const earningsHistory = wallet.earningsHistory || [];
    
    return {
      balance: wallet.balance || 0,
      totalEarned: wallet.totalEarned || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      earningsCount: earningsHistory.length
    };
  },

  /**
   * Get all users with wallet data (for admin view)
   */
  getAllUsersWithWallets: () => {
    loadWallets(); // Ensure fresh data
    return wallets.map(wallet => ({
      userId: wallet.userId,
      balance: wallet.balance || 0,
      totalEarned: wallet.totalEarned || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      lastEarning: wallet.earningsHistory && wallet.earningsHistory.length > 0
        ? wallet.earningsHistory[wallet.earningsHistory.length - 1]
        : null
    }));
  },

  /**
   * Record withdrawal (future feature)
   */
  recordWithdrawal: (userId, amount, description) => {
    try {
      const wallet = WalletService.getWalletByUserId(userId);
      if (!wallet) {
        return { success: false, message: 'Wallet not found' };
      }

      if (wallet.balance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      wallet.balance -= amount;
      wallet.totalWithdrawn += amount;
      wallet.updatedAt = new Date().toISOString();

      const saveResult = saveWallets();
      if (!saveResult.success) {
        // Rollback
        wallet.balance += amount;
        wallet.totalWithdrawn -= amount;
        return { success: false, message: saveResult.error };
      }

      return { success: true, message: 'Withdrawal recorded successfully' };
    } catch (error) {
      console.error('Error recording withdrawal:', error);
      return { success: false, message: error.message };
    }
  }
};

export default WalletService;

