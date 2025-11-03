// pages/TaskPage.jsx - Main Task Management Page
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Upload,
  RefreshCw,
  CheckSquare,
  Trash2,
  Clock,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  GitBranch,
  BarChart3
} from 'lucide-react';
import TaskService from '../services/taskService';
import TaskCard from '../components/task/TaskCard';
import TaskForm from '../components/task/TaskForm';
import TaskRow from '../components/task/TaskRow';
import SubmissionViewer from '../components/worksheet/SubmissionViewer';
import TaskReviewModal from '../components/task/TaskReviewModal';
import TaskWorkflowView from '../components/workflow/TaskWorkflowView';
import WorkflowService from '../services/workflowService';
import UserDependencyService from '../services/userDependencyService';

const TaskPage = ({ isDarkMode, onToggleDarkMode }) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all-tasks'); // 'all-tasks', 'workflows', 'statistics'
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showSubmissionViewer, setShowSubmissionViewer] = useState(false);
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [taskForReview, setTaskForReview] = useState(null);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    categoryId: 'all',
    assignedTo: 'all',
    workflowId: 'all',
    dependencyId: 'all',
    team: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [tasks, searchQuery, filters, sortBy, sortOrder]);

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load tasks
      const allTasks = TaskService.getAllTasks();
      setTasks(allTasks);
      
      // Load categories
      const categoryData = loadCategoriesFromStorage();
      setCategories(categoryData);
      
      // Load users
      const userData = loadUsersFromStorage();
      setUsers(userData);
      
      // Load workflows and dependencies
      const workflowsData = WorkflowService.getAllWorkflows();
      const dependenciesData = UserDependencyService.getAllUserDependencies();
      setWorkflows(workflowsData);
      setDependencies(dependenciesData);
      
      // Load statistics
      const stats = TaskService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories from localStorage
  const loadCategoriesFromStorage = () => {
    try {
      const stored = window.localStorage.getItem('categoryData');
      if (stored) {
        const data = JSON.parse(stored);
        return data.categories?.filter(c => c.status === 'active') || [];
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
    return [];
  };

  // Load users from localStorage - load from both userData and AUTH_USERS
  const loadUsersFromStorage = () => {
    try {
      const allUsers = [];
      const seenIds = new Set();
      const seenEmails = new Set();
      
      // Load from AUTH_USERS (primary source)
      const authUsers = window.localStorage.getItem('taskManagement_users_db');
      if (authUsers) {
        const users = JSON.parse(authUsers);
        if (users && users.length > 0) {
          users.forEach(user => {
            const id = user.id || user.user_id;
            const email = user.email ? user.email.toLowerCase().trim() : '';
            
            // Skip if we've seen this ID or email before
            if (id && !seenIds.has(id) && (!email || !seenEmails.has(email))) {
              seenIds.add(id);
              if (email) seenEmails.add(email);
              allUsers.push(user);
            }
          });
          console.log(`Loaded ${users.length} users from AUTH_USERS, after dedup: ${allUsers.length}`);
        }
      }
      
      // Load from userData (fallback for legacy users)
      const stored = window.localStorage.getItem('userData');
      if (stored) {
        const users = JSON.parse(stored) || [];
        users.forEach(user => {
          const id = user.id || user.user_id;
          const email = user.email ? user.email.toLowerCase().trim() : '';
          
          // Skip if we've seen this ID or email before
          if (id && !seenIds.has(id) && (!email || !seenEmails.has(email))) {
            seenIds.add(id);
            if (email) seenEmails.add(email);
            allUsers.push(user);
          }
        });
        console.log(`Loaded ${users.length} users from userData, after dedup: ${allUsers.length}`);
      }
      
      console.log(`Total unique users: ${allUsers.length}`);
      return allUsers;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  // Apply filters and search
  const applyFilters = () => {
    let result = TaskService.searchTasks(searchQuery, filters);
    result = TaskService.sortTasks(result, sortBy, sortOrder);
    setFilteredTasks(result);
  };

  // Handle create task
  const handleCreateTask = (taskData) => {
    const result = TaskService.createTask(taskData);
    if (result.success) {
      loadData();
      setShowTaskForm(false);
      alert('Task created successfully!');
    } else {
      alert(result.message);
    }
  };

  // Handle update task
  const handleUpdateTask = (taskData) => {
    const result = TaskService.updateTask(editingTask.id, taskData);
    if (result.success) {
      loadData();
      setShowTaskForm(false);
      setEditingTask(null);
      alert('Task updated successfully!');
    } else {
      alert(result.message);
    }
  };

  // Handle delete task
  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const result = TaskService.deleteTask(taskId);
      if (result.success) {
        loadData();
        alert('Task deleted successfully!');
      } else {
        alert(result.message);
      }
    }
  };

  // Handle status change
  const handleStatusChange = (taskId, newStatus) => {
    const result = TaskService.updateTaskStatus(taskId, newStatus);
    if (result.success) {
      loadData();
    } else {
      alert(result.message);
    }
  };

  // Handle edit
  const handleEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  // Handle view worksheet submission
  const handleViewSubmission = (task) => {
    setSelectedTaskForSubmission(task);
    setShowSubmissionViewer(true);
  };

  // Handle review task (for submitted tasks)
  const handleReviewTask = (task) => {
    setTaskForReview(task);
    setShowReviewModal(true);
  };

  // Handle approve task
  const handleApproveTask = async (approvedChecklistItems, feedback) => {
    try {
      const adminId = localStorage.getItem('admin_id') || 'admin';
      const result = TaskService.approveTask(taskForReview.id, adminId, feedback, null, approvedChecklistItems);
      
      if (result.success) {
        loadData();
        setShowReviewModal(false);
        setTaskForReview(null);
        alert('Task approved successfully!');
      } else {
        alert(result.message || 'Failed to approve task');
      }
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Error approving task');
    }
  };

  // Handle require revision
  const handleRequireRevision = async (approvedChecklistItems, feedback) => {
    try {
      const adminId = localStorage.getItem('admin_id') || 'admin';
      
      const result = TaskService.requireRevision(taskForReview.id, adminId, feedback, approvedChecklistItems);
      
      if (result.success) {
        loadData();
        setShowReviewModal(false);
        setTaskForReview(null);
        alert('Task marked as requiring revision');
      } else {
        alert(result.message || 'Failed to require revision');
      }
    } catch (error) {
      console.error('Error requiring revision:', error);
      alert('Error requiring revision');
    }
  };

  // Handle task selection
  const handleSelectTask = (taskId, selected) => {
    if (selected) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedTasks(filteredTasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedTasks.length === 0) {
      alert('Please select tasks to delete');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)?`)) {
      const result = TaskService.bulkDelete(selectedTasks);
      if (result.success) {
        loadData();
        setSelectedTasks([]);
        alert(result.message);
      } else {
        alert(result.message);
      }
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = (status) => {
    if (selectedTasks.length === 0) {
      alert('Please select tasks to update');
      return;
    }
    
    const result = TaskService.bulkUpdateStatus(selectedTasks, status);
    if (result.success) {
      loadData();
      setSelectedTasks([]);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // Handle export
  const handleExport = () => {
    const data = TaskService.exportTasks();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 px-8 py-6 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="text-white">
                <div className="h-10 bg-gray-300 rounded-lg w-80 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded-lg w-96"></div>
              </div>
              <div className="h-12 bg-gray-300 rounded-xl w-40"></div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-100 p-6 rounded-xl animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="h-12 bg-gray-100 rounded-xl w-24 animate-pulse"></div>
              <div className="h-12 bg-gray-100 rounded-xl w-24 animate-pulse"></div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tasks Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className={`min-h-screen p-6 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-2xl shadow-xl border overflow-hidden mb-8 ${
          isDarkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-gray-100'
        }`}>
          {/* Header Background */}
          <div className={`px-8 py-6 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700' 
              : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600'
          }`}>
            <div className="flex justify-between items-center">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">Task Management</h1>
                <p className={`text-lg ${
                  isDarkMode ? 'text-slate-300' : 'text-blue-100'
                }`}>
                  Streamline your workflow with intelligent task management
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold ${
                  isDarkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Plus size={22} />
                Create New Task
              </button>
            </div>
          </div>
          
          {/* Statistics */}
          {statistics && (
            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className={`group p-6 rounded-xl border hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600 border-slate-600' 
                    : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <CheckSquare className="text-white" size={20} />
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-blue-300 bg-blue-900' 
                        : 'text-blue-600 bg-blue-200'
                    }`}>
                      TOTAL
                    </div>
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                    Total Tasks
                  </div>
                  <div className={`text-3xl font-bold ${
                    isDarkMode ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    {statistics.total}
                  </div>
                </div>
                
                <div className={`group p-6 rounded-xl border hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600 border-slate-600' 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-gray-500 rounded-lg">
                      <Clock className="text-white" size={20} />
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-gray-300 bg-gray-800' 
                        : 'text-gray-600 bg-gray-200'
                    }`}>
                      PENDING
                    </div>
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Pending
                  </div>
                  <div className={`text-3xl font-bold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    {statistics.byStatus.pending}
                  </div>
                </div>
                
                <div className={`group p-6 rounded-xl border hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600 border-slate-600' 
                    : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <PlayCircle className="text-white" size={20} />
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-purple-300 bg-purple-900' 
                        : 'text-purple-600 bg-purple-200'
                    }`}>
                      ACTIVE
                    </div>
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-600'
                  }`}>
                    In Progress
                  </div>
                  <div className={`text-3xl font-bold ${
                    isDarkMode ? 'text-purple-200' : 'text-purple-700'
                  }`}>
                    {statistics.byStatus.inProgress}
                  </div>
                </div>
                
                <div className={`group p-6 rounded-xl border hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600 border-slate-600' 
                    : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <CheckCircle className="text-white" size={20} />
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-green-300 bg-green-900' 
                        : 'text-green-600 bg-green-200'
                    }`}>
                      DONE
                    </div>
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-green-300' : 'text-green-600'
                  }`}>
                    Completed
                  </div>
                  <div className={`text-3xl font-bold ${
                    isDarkMode ? 'text-green-200' : 'text-green-700'
                  }`}>
                    {statistics.byStatus.completed}
                  </div>
                </div>
                
                <div className={`group p-6 rounded-xl border hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600 border-slate-600' 
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <AlertCircle className="text-white" size={20} />
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-red-300 bg-red-900' 
                        : 'text-red-600 bg-red-200'
                    }`}>
                      URGENT
                    </div>
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-red-300' : 'text-red-600'
                  }`}>
                    Overdue
                  </div>
                  <div className={`text-3xl font-bold ${
                    isDarkMode ? 'text-red-200' : 'text-red-700'
                  }`}>
                    {statistics.overdue}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className={`rounded-2xl shadow-xl border overflow-hidden mb-8 ${
          isDarkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex gap-2 p-2 border-b-2 border-gray-700">
            <button
              onClick={() => setActiveTab('all-tasks')}
              className={`flex-1 px-6 py-3 font-semibold transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'all-tasks'
                  ? isDarkMode
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : isDarkMode
                  ? 'border-transparent text-gray-400 hover:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckSquare size={20} />
              All Tasks ({tasks.filter(t => !t.workflowId).length})
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 px-6 py-3 font-semibold transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'workflows'
                  ? isDarkMode
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : isDarkMode
                  ? 'border-transparent text-gray-400 hover:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <GitBranch size={20} />
              Task Dependencies ({tasks.filter(t => t.workflowId).length})
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex-1 px-6 py-3 font-semibold transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'statistics'
                  ? isDarkMode
                    ? 'border-blue-500 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : isDarkMode
                  ? 'border-transparent text-gray-400 hover:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 size={20} />
              Statistics
            </button>
          </div>
        </div>

        {/* Filters and Actions Bar - Only show for All Tasks */}
        {activeTab === 'all-tasks' && (
          <div className={`rounded-2xl shadow-xl border overflow-hidden mb-8 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-gray-100'
          }`}>
            {/* Main Controls */}
            <div className={`p-6 border-b ${
              isDarkMode ? 'border-slate-700' : 'border-gray-100'
            }`}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-400'
                }`} size={20} />
                <input
                  type="text"
                  placeholder="Search tasks by title, description, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className={`flex gap-1 p-1 rounded-xl ${
                isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'card' 
                      ? isDarkMode 
                        ? 'bg-slate-600 text-blue-400 shadow-sm' 
                        : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-600' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? isDarkMode 
                        ? 'bg-slate-600 text-blue-400 shadow-sm' 
                        : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-600' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <List size={20} />
                </button>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={loadData}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-md ${
                    isDarkMode 
                      ? 'text-slate-300 bg-slate-700 hover:bg-slate-600' 
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                  title="Refresh"
                >
                  <RefreshCw size={20} />
                </button>
                <button
                  onClick={handleExport}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-md ${
                    isDarkMode 
                      ? 'text-slate-300 bg-slate-700 hover:bg-slate-600' 
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                  title="Export"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
            </div>
            
          {/* Advanced Filters */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              {/* Priority Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              {/* Category Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Category
                </label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              {/* User Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Assigned To
                </label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Users</option>
                  {users.filter(u => u.status === 'active').map(user => (
                    <option key={user.user_id} value={user.user_id}>{user.username}</option>
                  ))}
                </select>
              </div>
              
              {/* Workflow Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Task Dependency
                </label>
                <select
                  value={filters.workflowId}
                  onChange={(e) => setFilters({...filters, workflowId: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Task Dependencies</option>
                  {workflows.map(workflow => (
                    <option key={workflow.id} value={workflow.id}>{workflow.name}</option>
                  ))}
                </select>
              </div>
              
              {/* User Dependency Filter */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  User Dependency
                </label>
                <select
                  value={filters.dependencyId}
                  onChange={(e) => setFilters({...filters, dependencyId: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="all">All Dependencies</option>
                  {dependencies.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Sort */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                >
                  <option value="createdAt">Created Date</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
            
            {/* Date Range Filters - Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Created From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  Created To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' 
                      : 'bg-gray-50 border-gray-200 focus:bg-white'
                  }`}
                />
              </div>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <div className={`px-6 py-4 border-t ${
              isDarkMode 
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 border-slate-600' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CheckSquare className="text-white" size={18} />
                  </div>
                  <span className={`text-sm font-semibold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('in-progress')}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Start Selected
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Complete Selected
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
        
        {/* Task Form Modal - Always visible */}
        {showTaskForm && (
          <TaskForm
            task={editingTask}
            categories={categories}
            users={users}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            isEdit={!!editingTask}
          />
        )}
        
        {/* Tasks Display */}
        {activeTab === 'workflows' ? (
          <TaskWorkflowView 
            tasks={tasks}
            categories={categories}
            users={users}
            isDarkMode={isDarkMode}
          />
        ) : activeTab === 'all-tasks' && filteredTasks.length === 0 ? (
          <div className={`rounded-2xl shadow-xl border overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-gray-100'
          }`}>
            <div className="p-16 text-center">
              <div className="relative mb-8">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-600' 
                    : 'bg-gradient-to-br from-blue-100 to-purple-100'
                }`}>
                  <CheckSquare size={64} className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
              </div>
              
              <h3 className={`text-2xl font-bold mb-3 ${
                isDarkMode ? 'text-slate-200' : 'text-gray-800'
              }`}>
                {searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.categoryId !== 'all'
                  ? 'No tasks match your criteria'
                  : 'Ready to get things done?'}
              </h3>
              
              <p className={`mb-8 max-w-md mx-auto leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-gray-600'
              }`}>
                {searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.categoryId !== 'all'
                  ? 'Try adjusting your filters or search query to find what you\'re looking for.'
                  : 'Start organizing your work by creating your first task. It\'s easy to get started!'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!showTaskForm && (
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Plus size={20} className="inline mr-2" />
                    Create Your First Task
                  </button>
                )}
                
                {(searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.categoryId !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({
                        status: 'all',
                        priority: 'all',
                        categoryId: 'all',
                        assignedTo: 'all'
                      });
                    }}
                    className={`px-8 py-4 rounded-xl transition-all duration-200 font-semibold ${
                      isDarkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
              
              {/* Quick Stats */}
              {tasks.length > 0 && (
                <div className={`mt-12 pt-8 border-t ${
isDarkMode ? 'border-slate-700' : 'border-gray-100'
                }`}>
                  <p className={`text-sm mb-4 ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Quick Stats
                  </p>
                  <div className="flex justify-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                      <div className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {tasks.filter(t => t.status === 'completed').length}
                      </div>
                      <div className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {tasks.filter(t => t.status === 'in-progress').length}
                      </div>
                      <div className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>In Progress</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'all-tasks' ? (
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    onViewSubmission={handleViewSubmission}
                    onReviewTask={handleReviewTask}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className={`rounded-2xl shadow-xl border overflow-hidden ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-gray-100'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`border-b ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600 border-slate-600' 
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                    }`}>
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Task
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Category
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Assigned To
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Status
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Priority
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Due Date
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-bold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      isDarkMode ? 'divide-slate-700' : 'divide-gray-100'
                    }`}>
                      {filteredTasks.map((task, index) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onEdit={handleEdit}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          onViewSubmission={handleViewSubmission}
                          selected={selectedTasks.includes(task.id)}
                          onSelect={handleSelectTask}
                          index={index}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Results Count */}
            <div className="mt-8 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                isDarkMode 
                  ? 'bg-slate-700 text-slate-300' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </span>
                {filteredTasks.length !== tasks.length && (
                  <span className={isDarkMode ? 'text-slate-500' : 'text-gray-400'}>
                    • {tasks.length - filteredTasks.length} filtered out
                  </span>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Worksheet Submission Viewer Modal */}
      {showSubmissionViewer && selectedTaskForSubmission && (
        <SubmissionViewer
          taskId={selectedTaskForSubmission.id}
          onClose={() => {
            setShowSubmissionViewer(false);
            setSelectedTaskForSubmission(null);
          }}
        />
      )}

      {/* Task Review Modal */}
      {showReviewModal && taskForReview && (
        <TaskReviewModal
          task={taskForReview}
          onApprove={handleApproveTask}
          onRequireRevision={handleRequireRevision}
          onCancel={() => {
            setShowReviewModal(false);
            setTaskForReview(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default TaskPage;