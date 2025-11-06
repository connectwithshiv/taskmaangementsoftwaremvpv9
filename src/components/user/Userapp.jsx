import React, { useState, useEffect } from 'react';
import UserSidebar from './Usersidebar';
import UserHeader from './Userheader';
import UserTaskList from './UserTaskList';
import { UserTaskListWithWorksheet } from '../worksheet/UserTaskListWithWorksheet';
import AuthService from '../../services/authService';
import TaskService from '../../services/taskService';
import WorksheetService from '../../services/WorksheetService';
import WalletService from '../../services/walletService';
import { UserIdResolver } from './UserIdResolver';

import { 
  MdTaskAlt, 
  MdCheckCircle,
  MdPending,
  MdError,
  MdFolder,
  MdAccountBalanceWallet,
  MdTrendingUp,
  MdNotifications,
  MdPerson
} from 'react-icons/md';

const UserApp = ({ 
  currentUser, 
  onLogout, 
  isDarkMode, 
  setIsDarkMode 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [userStats, setUserStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    walletBalance: 0,
    categoriesCount: 0,
    notificationsCount: 5
  });

  // Load categories and calculate stats
  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Ensure services are available globally for worksheet/task components
  useEffect(() => {
    window.TaskService = TaskService;
    window.WorksheetService = WorksheetService;
  }, []);

  // Listen for task updates
  useEffect(() => {
    const handleTaskUpdate = () => {
      console.log('🔄 Tasks updated - reloading data...');
      loadData();
    };

    window.addEventListener('tasksUpdated', handleTaskUpdate);
    window.addEventListener('storage', handleTaskUpdate);

    return () => {
      window.removeEventListener('tasksUpdated', handleTaskUpdate);
      window.removeEventListener('storage', handleTaskUpdate);
    };
  }, [currentUser]);

  // Key changes in loadData function to ensure ID consistency

const loadData = () => {
  if (!currentUser) {
    console.log('No current user');
    return;
  }

  try {
    console.log('🔍 Loading data for user:', currentUser.username, 'ID:', currentUser.id);

    // Load categories
    const allCategories = JSON.parse(
      localStorage.getItem('taskManagement_categories') || '[]'
    );
    setCategories(allCategories);

    // Use currentUser.id directly (auth-format)
    const userId = currentUser.id;
    
    if (!userId) {
      console.error(' User has no ID!');
      return;
    }
    
    console.log('User ID:', userId, '(type:', typeof userId, ')');
    
    const userCategoryIds = currentUser.assigned_category_ids || [];

    let userCategories = [];
    if (userCategoryIds.includes('all')) {
      userCategories = allCategories;
    } else {
      userCategories = allCategories.filter(cat => 
        userCategoryIds.includes(cat.id)
      );
    }

    // Load tasks
    const tasksData = JSON.parse(
      localStorage.getItem('taskManagement_tasks') || '{}'
    );
    
    const allTasks = tasksData.tasks || [];
    console.log('📋 All tasks loaded:', allTasks.length);

    // Filter to user's tasks - check all possible ID formats
    const userIds = [userId, currentUser.user_id].filter(Boolean);
    const myTasks = allTasks.filter(task => {
      const matches = userIds.includes(task.assignedTo);
      if (matches) {
        console.log('  ✅ Task matched:', task.title, 'assignedTo:', task.assignedTo);
      }
      return matches;
    });
    
    console.log('📊 My tasks found:', myTasks.length);
    
    if (myTasks.length === 0 && allTasks.length > 0) {
      console.warn('⚠️ No tasks found for user IDs:', userIds);
      console.warn('📋 Available tasks:', allTasks.slice(0, 5).map(t => ({ 
        title: t.title, 
        assignedTo: t.assignedTo,
        assignedToName: t.assignedToName,
        checkerId: t.checkerId,
        checkerName: t.checkerName
      })));
    }

    // Add task counts to categories
    const categoriesWithCounts = userCategories.map(cat => {
      const categoryTasks = myTasks.filter(t => t.categoryId === cat.id);
      return {
        ...cat,
        taskCount: categoryTasks.length
      };
    });

    setAssignedCategories(categoriesWithCounts);

    // Calculate statistics
    const now = new Date();
    const overdueCount = myTasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'completed'
    ).length;

    // Get wallet balance
    const walletStats = WalletService.getUserStats(userId);
    
    setUserStats({
      totalTasks: myTasks.length,
      completedTasks: myTasks.filter(t => t.status === 'completed').length,
      pendingTasks: myTasks.filter(t => t.status === 'pending').length,
      overdueTasks: overdueCount,
      walletBalance: walletStats.balance || 0,
      categoriesCount: categoriesWithCounts.length,
      notificationsCount: 5
    });

    console.log('Stats updated:', {
      total: myTasks.length,
      completed: myTasks.filter(t => t.status === 'completed').length,
      pending: myTasks.filter(t => t.status === 'pending').length
    });
  } catch (error) {
    console.error(' Error loading data:', error);
  }
};

  const handleNavigate = (pageId, data = null) => {
    console.log('Navigating to:', pageId);
    setCurrentPage(pageId);
    if (pageId.startsWith('category-')) {
      setSelectedCategory(data);
    }
  };

  // Dashboard Page
  const DashboardPage = () => (
    <div className="p-6">
      {/* Welcome Section */}
      <div className={`mb-6 p-6 rounded-xl border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-700' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
          } shadow-lg`}>
            <span className="text-white font-bold text-2xl">
              {currentUser?.name?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h1 className={`text-3xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome back, {currentUser?.name || currentUser?.username || 'User'}!
            </h1>
            <p className={`text-lg ${
              isDarkMode ? 'text-blue-200' : 'text-blue-800'
            }`}>
              {currentUser?.role_name || 'Employee'} • {currentUser?.position_name || 'Staff'}
            </p>
            <p className={`mt-2 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              You have {userStats.totalTasks} active tasks across {userStats.categoriesCount} categories
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-6 rounded-xl shadow-lg border ${
          isDarkMode 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500' 
            : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <MdTaskAlt className="text-white" size={32} />
            <span className="text-white/80 text-sm font-medium">Total</span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{userStats.totalTasks}</p>
          <p className="text-white/80 text-sm">Active Tasks</p>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border ${
          isDarkMode 
            ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-500' 
            : 'bg-gradient-to-br from-green-500 to-green-600 border-green-400'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <MdCheckCircle className="text-white" size={32} />
            <span className="text-white/80 text-sm font-medium">Done</span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{userStats.completedTasks}</p>
          <p className="text-white/80 text-sm">Completed</p>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border ${
          isDarkMode 
            ? 'bg-gradient-to-br from-yellow-600 to-orange-600 border-yellow-500' 
            : 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <MdPending className="text-white" size={32} />
            <span className="text-white/80 text-sm font-medium">Pending</span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{userStats.pendingTasks}</p>
          <p className="text-white/80 text-sm">To Start</p>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border ${
          isDarkMode 
            ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500' 
            : 'bg-gradient-to-br from-red-500 to-red-600 border-red-400'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <MdError className="text-white" size={32} />
            <span className="text-white/80 text-sm font-medium">Overdue</span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{userStats.overdueTasks}</p>
          <p className="text-white/80 text-sm">Need Attention</p>
        </div>
      </div>

      {/* Quick Stats & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className={`p-6 rounded-xl border shadow-lg ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-purple-600' : 'bg-purple-500'
            }`}>
              <MdFolder className="text-white" size={24} />
            </div>
            <h2 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              My Categories
            </h2>
          </div>

          <div className="space-y-2">
            {assignedCategories.length === 0 ? (
              <p className={`text-center py-8 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No categories assigned yet
              </p>
            ) : (
              assignedCategories.slice(0, 5).map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleNavigate(`category-${category.id}`, category)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 hover:bg-slate-650' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MdFolder className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                      <span className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {category.name}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {category.taskCount} tasks
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {assignedCategories.length > 5 && (
            <button 
              onClick={() => handleNavigate('all-categories')}
              className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-650 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              View All Categories ({assignedCategories.length})
            </button>
          )}
        </div>

        {/* Recent Tasks Preview */}
        <div className={`p-6 rounded-xl border shadow-lg ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <MdTaskAlt className="text-white" size={24} />
            </div>
            <h2 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Tasks
            </h2>
          </div>

          <div className="mb-4">
            {userStats.totalTasks === 0 ? (
              <p className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No tasks assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  You have {userStats.pendingTasks} pending and {userStats.completedTasks} completed tasks
                </p>
                {userStats.overdueTasks > 0 && (
                  <p className="text-sm text-red-500 font-medium">
                     {userStats.overdueTasks} overdue task{userStats.overdueTasks > 1 ? 's' : ''} need attention!
                  </p>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => handleNavigate('tasks')}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            View All Tasks
          </button>
        </div>
      </div>
    </div>
  );

  // Tasks Page - WITH REAL COMPONENT
  const TasksPage = () => (
    <div className="p-6">
      <h2 className={`text-3xl font-bold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        My Tasks
      </h2>
      <UserTaskListWithWorksheet
        currentUser={currentUser}
        categories={categories}
        isDarkMode={isDarkMode}
        selectedCategoryId={null}
      />
    </div>
  );

  // Category Tasks Page
  const CategoryTasksPage = () => (
    <div className="p-6">
      <h2 className={`text-3xl font-bold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {selectedCategory?.name || 'Category'} Tasks
      </h2>
      <UserTaskListWithWorksheet
        currentUser={currentUser}
        categories={categories}
        isDarkMode={isDarkMode}
        selectedCategoryId={selectedCategory?.id}
      />
    </div>
  );

  // Wallet Page
  const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [earnings, setEarnings] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadWallet = () => {
      setLoading(true);
      try {
        const userId = UserIdResolver.getUserId(currentUser);
        const wallet = WalletService.getOrCreateWallet(userId);
        const earningsHistory = WalletService.getEarningsHistory(userId);
        const userStats = WalletService.getUserStats(userId);
        
        setWallet(wallet);
        setEarnings(earningsHistory);
        setStats(userStats);
      } catch (error) {
        console.error('Error loading wallet:', error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadWallet();
      
      const handleUpdate = () => {
        loadWallet();
      };
      
      window.addEventListener('walletsUpdated', handleUpdate);
      return () => {
        window.removeEventListener('walletsUpdated', handleUpdate);
      };
    }, [currentUser]);

    const getSourceLabel = (source) => {
      const labels = {
        'task_completion': 'Task Approved',
        'mistake_found': 'Task Approved', // Doer sees all earnings as Task Approved
        'bonus': 'Bonus',
        'adjustment': 'Adjustment'
      };
      return labels[source] || source;
    };

    const filteredEarnings = filter === 'all' 
      ? earnings 
      : earnings.filter(e => e.source === filter);

    if (loading) {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <h2 className={`text-3xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          My Wallet
        </h2>
        
        {/* Balance Card */}
        <div className={`mb-6 p-8 rounded-xl border-2 ${
          isDarkMode 
            ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-purple-700' 
            : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-2 ${
                isDarkMode ? 'text-purple-200' : 'text-purple-800'
              }`}>
                Available Balance
              </p>
              <h3 className={`text-5xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ₹{stats?.balance?.toFixed(2) || '0.00'}
              </h3>
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Last updated: {wallet?.updatedAt ? new Date(wallet.updatedAt).toLocaleDateString() : 'Today'}
              </p>
            </div>
            <MdAccountBalanceWallet className={`${
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            }`} size={80} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-6 rounded-xl border-2 ${
            isDarkMode 
              ? 'bg-green-900/20 border-green-700' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className={`text-sm mb-1 ${
              isDarkMode ? 'text-green-300' : 'text-green-700'
            }`}>
              Total Earned
            </p>
            <h4 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ₹{stats?.totalEarned?.toFixed(2) || '0.00'}
            </h4>
          </div>
          <div className={`p-6 rounded-xl border-2 ${
            isDarkMode 
              ? 'bg-blue-900/20 border-blue-700' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm mb-1 ${
              isDarkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Total Transactions
            </p>
            <h4 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {stats?.earningsCount || 0}
            </h4>
          </div>
          <div className={`p-6 rounded-xl border-2 ${
            isDarkMode 
              ? 'bg-orange-900/20 border-orange-700' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-sm mb-1 ${
              isDarkMode ? 'text-orange-300' : 'text-orange-700'
            }`}>
              Withdrawn
            </p>
            <h4 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ₹{stats?.totalWithdrawn?.toFixed(2) || '0.00'}
            </h4>
          </div>
        </div>

        {/* Earnings History */}
        <div className={`rounded-xl border-2 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`px-6 py-4 border-b ${
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Earnings History
              </h3>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Sources</option>
                <option value="task_completion">Task Approved</option>
                <option value="mistake_found">Task Approved</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredEarnings.length === 0 ? (
              <div className="p-8 text-center">
                <MdAccountBalanceWallet className="mx-auto text-gray-400 mb-4" size={48} />
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No earnings history yet
                </p>
              </div>
            ) : (
              filteredEarnings.map((earning) => (
                <div key={earning.id} className={`p-4 hover:bg-opacity-80 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {getSourceLabel(earning.source)}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (earning.source === 'task_completion' || earning.source === 'mistake_found')
                            ? isDarkMode
                              ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                              : 'bg-green-100 text-green-700 border border-green-300'
                            : isDarkMode
                            ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50'
                            : 'bg-purple-100 text-purple-700 border border-purple-300'
                        }`}>
                          {getSourceLabel(earning.source)}
                        </span>
                      </div>
                      {earning.description && (
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {earning.description}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {new Date(earning.timestamp).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        +₹{earning.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Notifications Page
  const NotificationsPage = () => (
    <div className="p-6">
      <h2 className={`text-3xl font-bold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Notifications
      </h2>
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <p className={`text-center py-8 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          No new notifications
        </p>
      </div>
    </div>
  );

  // Profile Page
  const ProfilePage = () => (
    <div className="p-6">
      <h2 className={`text-3xl font-bold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        My Profile
      </h2>
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Username
            </label>
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentUser?.username}
            </p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Email
            </label>
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentUser?.email || 'Not provided'}
            </p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Role
            </label>
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentUser?.role_name || 'User'}
            </p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              User ID
            </label>
            <p className={`text-sm font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentUser?.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Settings Page
  const SettingsPage = () => (
    <div className="p-6">
      <h2 className={`text-3xl font-bold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Settings
      </h2>
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <p className={`text-center py-8 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Settings page coming soon...
        </p>
      </div>
    </div>
  );

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tasks':
        return <TasksPage />;
      case 'wallet':
        return <WalletPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        if (currentPage.startsWith('category-')) {
          return <CategoryTasksPage />;
        }
        return <DashboardPage />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
        assignedCategories={assignedCategories}
      />

      <div className="lg:ml-64">
        <UserHeader
          currentUser={currentUser}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />

        <main className="min-h-screen">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default UserApp;