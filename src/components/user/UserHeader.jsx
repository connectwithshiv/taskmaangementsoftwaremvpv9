// components/user/UserHeader.jsx - Header for Regular Users

import React, { useState, useEffect } from 'react';
import { 
  MdMenu,
  MdNotifications,
  MdPerson,
  MdSettings,
  MdLogout,
  MdDarkMode,
  MdLightMode,
  MdAccountBalanceWallet,
  MdExpandMore
} from 'react-icons/md';
import WalletService from '../../services/walletService';
import { UserIdResolver } from './UserIdResolver';

const UserHeader = ({ 
  onToggleSidebar,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
  onLogout,
  onNavigate
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Sample notifications
  const notifications = [
    { id: 1, type: 'task', title: 'New task assigned', message: 'Review project documentation', time: '5 min ago', unread: true },
    { id: 2, type: 'wallet', title: 'Payment received', message: 'Monthly salary credited', time: '2 hours ago', unread: true },
    { id: 3, type: 'category', title: 'Category updated', message: 'Electronics category modified', time: '1 day ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  // Load wallet balance
  useEffect(() => {
    const loadWalletBalance = () => {
      if (currentUser) {
        try {
          const userId = UserIdResolver.getUserId(currentUser);
          const walletStats = WalletService.getUserStats(userId);
          setWalletBalance(walletStats.balance || 0);
        } catch (error) {
          console.error('Error loading wallet balance:', error);
          setWalletBalance(0);
        }
      }
    };

    loadWalletBalance();

    // Listen for wallet updates
    const handleWalletUpdate = () => {
      loadWalletBalance();
    };

    window.addEventListener('walletsUpdated', handleWalletUpdate);
    return () => {
      window.removeEventListener('walletsUpdated', handleWalletUpdate);
    };
  }, [currentUser]);

  return (
    <header className={`h-16 border-b flex items-center justify-between px-4 lg:px-6 ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-slate-700 text-slate-300' 
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <MdMenu size={24} />
        </button>

        <div>
          <h1 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Task Management
          </h1>
          <p className={`text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Welcome, {currentUser?.name || 'User'}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Wallet Balance */}
        <div 
          onClick={() => onNavigate && onNavigate('wallet')}
          className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
            isDarkMode 
              ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
          title="Click to view wallet details"
        >
          <MdAccountBalanceWallet className="text-green-500 flex-shrink-0" size={20} />
          <div className="hidden sm:block">
            <p className={`text-xs ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Balance
            </p>
            <p className={`font-bold text-sm ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              ₹{walletBalance.toFixed(2)}
            </p>
          </div>
          <div className="sm:hidden">
            <p className={`font-bold text-sm ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              ₹{walletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-slate-700 text-yellow-400' 
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {isDarkMode ? <MdLightMode size={22} /> : <MdDarkMode size={22} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg transition-colors relative ${
              isDarkMode 
                ? 'hover:bg-slate-700 text-slate-300' 
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <MdNotifications size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowNotifications(false)}
              />
              <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-2xl z-40 overflow-hidden border ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate('notifications');
                      }}
                      className={`px-4 py-3 border-b cursor-pointer transition-colors ${
                        isDarkMode 
                          ? 'border-slate-700 hover:bg-slate-750' 
                          : 'border-slate-100 hover:bg-slate-50'
                      } ${notification.unread ? 'bg-blue-500/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'task' ? 'bg-blue-500/20 text-blue-500' :
                          notification.type === 'wallet' ? 'bg-green-500/20 text-green-500' :
                          'bg-purple-500/20 text-purple-500'
                        }`}>
                          {notification.type === 'task' && '📋'}
                          {notification.type === 'wallet' && '💰'}
                          {notification.type === 'category' && '📁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-medium text-sm ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {notification.title}
                            </p>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`px-4 py-3 border-t ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate('notifications');
                    }}
                    className="w-full text-center text-sm font-medium text-blue-500 hover:text-blue-600"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-slate-700' 
                : 'hover:bg-slate-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <span className="text-white font-semibold text-sm">
                {currentUser?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {currentUser?.name || 'User'}
              </p>
              <p className={`text-xs ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {currentUser?.role_name || 'Employee'}
              </p>
            </div>
            <MdExpandMore className={`${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`} />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-40 overflow-hidden border ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentUser?.name || 'User'}
                  </p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {currentUser?.email}
                  </p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('profile');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-slate-300 hover:bg-slate-700' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MdPerson size={18} />
                    My Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('wallet');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-slate-300 hover:bg-slate-700' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MdAccountBalanceWallet size={18} />
                    My Wallet
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('settings');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-slate-300 hover:bg-slate-700' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MdSettings size={18} />
                    Settings
                  </button>
                </div>

                <div className={`border-t py-2 ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:bg-red-900/20' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <MdLogout size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default UserHeader;