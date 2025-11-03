import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Download, Filter, Calendar, Search } from 'lucide-react';
import WalletService from '../services/walletService';
import UserService from '../services/userService';
import CategoryService from '../services/categoryService';
import { UserIdResolver } from '../components/user/UserIdResolver';

const EarningsStatementPage = ({ isDarkMode = false }) => {
  const [allWallets, setAllWallets] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredWallets, setFilteredWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    searchQuery: '',
    userId: 'all',
    categoryId: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadData();
    
    const handleUpdate = () => {
      loadData();
    };
    
    window.addEventListener('walletsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('walletsUpdated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allWallets, filters]);

  const loadData = () => {
    setLoading(true);
    try {
      const wallets = WalletService.getAllUsersWithWallets();
      const usersData = UserService.getAllUsers();
      const categoriesData = CategoryService.getAll();
      
      setAllWallets(wallets || []);
      setUsers(usersData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      setAllWallets([]);
      setUsers([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = allWallets.map(wallet => {
      const userId = UserIdResolver.getUserId(users.find(u => u.id === wallet.userId || u.user_id === wallet.userId));
      const earningsHistory = WalletService.getEarningsHistory(userId, {
        categoryId: filters.categoryId !== 'all' ? filters.categoryId : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      });
      
      return {
        ...wallet,
        earningsHistory,
        user: users.find(u => u.id === wallet.userId || u.user_id === wallet.userId)
      };
    });

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(w => 
        w.user?.username?.toLowerCase().includes(query) ||
        w.user?.email?.toLowerCase().includes(query)
      );
    }

    // Filter by user
    if (filters.userId !== 'all') {
      result = result.filter(w => w.userId === filters.userId);
    }

    setFilteredWallets(result);
  };

  const getTotalEarnings = () => {
    return filteredWallets.reduce((sum, w) => sum + (w.totalEarned || 0), 0);
  };

  const getTotalBalance = () => {
    return filteredWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  };

  const getTotalWithdrawn = () => {
    return filteredWallets.reduce((sum, w) => sum + (w.totalWithdrawn || 0), 0);
  };

  const getUserName = (wallet) => {
    const user = users.find(u => u.id === wallet.userId || u.user_id === wallet.userId);
    return user?.username || user?.name || 'Unknown User';
  };

  const getUserEmail = (wallet) => {
    const user = users.find(u => u.id === wallet.userId || u.user_id === wallet.userId);
    return user?.email || '-';
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`mb-6 p-5 rounded-xl border-2 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Earnings Statement
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              View earnings summary and detailed history for all users
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                Total Earnings
              </span>
              <TrendingUp size={18} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ₹{getTotalEarnings().toFixed(2)}
            </p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Current Balance
              </span>
              <DollarSign size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ₹{getTotalBalance().toFixed(2)}
            </p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                Total Withdrawn
              </span>
              <Users size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
            </div>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ₹{getTotalWithdrawn().toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`mb-6 p-5 rounded-xl border-2 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              placeholder="Search users..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm ${
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* User Filter */}
          <select
            value={filters.userId}
            onChange={(e) => setFilters({...filters, userId: e.target.value})}
            className={`w-full px-4 py-2 border rounded-lg text-sm ${
              isDarkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id || user.user_id} value={user.id || user.user_id}>
                {user.username || user.name}
              </option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            placeholder="From Date"
            className={`w-full px-4 py-2 border rounded-lg text-sm ${
              isDarkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />

          {/* Date To */}
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            placeholder="To Date"
            className={`w-full px-4 py-2 border rounded-lg text-sm ${
              isDarkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Users List */}
      <div className={`rounded-xl border-2 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${
              isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  User
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Balance
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total Earned
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Withdrawn
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Transactions
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? 'divide-slate-700' : 'divide-gray-200'
            }`}>
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No wallet data found
                  </td>
                </tr>
              ) : (
                filteredWallets.map((wallet) => (
                  <tr key={wallet.userId} className="hover:opacity-80 transition-opacity">
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <div>
                        <p className="font-medium">{getUserName(wallet)}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getUserEmail(wallet)}
                        </p>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      ₹{wallet.balance.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ₹{wallet.totalEarned.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ₹{wallet.totalWithdrawn.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {wallet.earningsHistory?.length || 0}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {wallet.lastEarning
                        ? new Date(wallet.lastEarning.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EarningsStatementPage;

