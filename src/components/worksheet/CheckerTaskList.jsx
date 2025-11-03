import React, { useState, useEffect } from 'react';
import { FileText, Search, AlertCircle, CheckCircle } from 'lucide-react';
import TaskReviewModal from '../task/TaskReviewModal';
import TaskService from '../../services/taskService';
import { UserIdResolver } from '../user/UserIdResolver';

/**
 * Checker Task List Component
 * Shows tasks submitted by Doers that need to be checked
 */
const CheckerTaskList = ({ 
  currentChecker, 
  categories = [],
  isDarkMode = false
}) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [taskForReview, setTaskForReview] = useState(null);

  // Load tasks assigned to this checker
  const loadCheckerTasks = () => {
    setLoading(true);
    try {
      const allTasks = TaskService.getAllTasks();
      
      // Use UserIdResolver to get canonical ID (handles all ID formats)
      const checkerId = UserIdResolver.getUserId(currentChecker);
      
      console.log('🔍 Loading checker tasks for:', {
        checkerName: currentChecker.username || currentChecker.name,
        checkerId: checkerId,
        checkerIdType: typeof checkerId,
        currentChecker: {
          id: currentChecker.id,
          user_id: currentChecker.user_id
        },
        totalTasks: allTasks.length
      });
      
      // Filter tasks where this checker is assigned
      const myTasks = allTasks.filter(task => {
        const matches = String(task.checkerId) === String(checkerId);
        if (matches) {
          console.log('✅ Task matched:', task.title, 'checkerId:', task.checkerId, 'type:', typeof task.checkerId);
        }
        return matches;
      });
      
      // Also show tasks that didn't match for debugging
      const tasksWithChecker = allTasks.filter(t => t.checkerId);
      if (tasksWithChecker.length > 0) {
        console.log('🔍 Tasks with checker assigned:', tasksWithChecker.map(t => ({
          title: t.title,
          checkerId: t.checkerId,
          checkerIdType: typeof t.checkerId,
          checkerName: t.checkerName
        })));
      }
      
      // Sort by creation date (newest first)
      myTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTasks(myTasks);
      console.log(`📊 Loaded ${myTasks.length} tasks for checker:`, currentChecker.username);
      
      if (myTasks.length === 0 && tasksWithChecker.length > 0) {
        console.warn('⚠️ No tasks matched but tasks with checker exist. Checking ID format...');
      }
    } catch (error) {
      console.error('Error loading checker tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = [...tasks];

    // Filter by category
    if (selectedCategoryId !== 'all') {
      result = result.filter(t => t.categoryId === selectedCategoryId);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        result = result.filter(t => t.status === 'pending' || t.status === 'in-progress');
      } else if (filterStatus === 'submitted') {
        result = result.filter(t => t.status === 'submitted' || t.status === 'under-review');
      } else if (filterStatus === 'reviewed') {
        result = result.filter(t => t.status === 'approved' || t.status === 'revision-required');
      } else {
        result = result.filter(t => t.status === filterStatus);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.assignedToName?.toLowerCase().includes(term)
      );
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, searchTerm, selectedCategoryId]);

  // Load tasks on mount and user change
  useEffect(() => {
    loadCheckerTasks();
    
    // Listen for task updates
    const handleTaskUpdate = () => {
      loadCheckerTasks();
    };
    
    window.addEventListener('tasksUpdated', handleTaskUpdate);
    return () => {
      window.removeEventListener('tasksUpdated', handleTaskUpdate);
    };
  }, [currentChecker]);

  // Handle review task
  const handleReviewTask = (task) => {
    setTaskForReview(task);
    setShowReviewModal(true);
  };

  // Handle approve task
  const handleApproveTask = async (approvedChecklistItems, feedback) => {
    try {
      const result = await TaskService.approveTask(
        taskForReview.id,
        currentChecker.id || currentChecker.user_id,
        feedback,
        null,
        approvedChecklistItems
      );
      
      if (result.success) {
        alert('✅ Task approved successfully!');
        loadCheckerTasks();
        setShowReviewModal(false);
        setTaskForReview(null);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Error approving task');
    }
  };

  // Handle require revision
  const handleRequireRevision = async (approvedChecklistItems, feedback) => {
    try {
      const result = await TaskService.requireRevision(
        taskForReview.id,
        currentChecker.id || currentChecker.user_id,
        feedback,
        approvedChecklistItems
      );
      
      if (result.success) {
        alert('✅ Revision requested successfully!');
        loadCheckerTasks();
        setShowReviewModal(false);
        setTaskForReview(null);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error requiring revision:', error);
      alert('Error requiring revision');
    }
  };

  // Task Card Component
  const TaskCard = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'approved';
    
    return (
      <div className={`p-6 rounded-lg ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      } shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${
        task.status === 'approved' ? 'border-green-500' :
        task.status === 'revision-required' ? 'border-orange-500' :
        task.status === 'submitted' || task.status === 'under-review' ? 'border-blue-500' :
        task.status === 'in-progress' ? 'border-blue-500' :
        isOverdue ? 'border-red-500' : 'border-gray-300'
      }`}>
        <div className="flex items-start justify-between gap-4">
          {/* Task Info */}
          <div className="flex-1 space-y-3">
            {/* Title and Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                task.status === 'approved' ? 'bg-green-100 text-green-700' :
                task.status === 'revision-required' ? 'bg-orange-100 text-orange-700' :
                task.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                task.status === 'under-review' ? 'bg-blue-100 text-blue-700' :
                task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.status === 'in-progress' ? 'In Progress' : 
                 task.status === 'submitted' ? 'Submitted' :
                 task.status === 'under-review' ? 'Under Review' :
                 task.status === 'revision-required' ? 'Revision Required' :
                 task.status === 'approved' ? 'Approved' :
                 task.status}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {task.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              {/* Category */}
              {task.categoryPath && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {task.categoryPath}
                  </span>
                </div>
              )}
              
              {/* Assigned To */}
              {task.assignedToName && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={isDarkMode ? 'text-blue-300' : 'text-blue-700'}>
                    By: {task.assignedToName}
                  </span>
                </div>
              )}

              {/* Submission Date */}
              {task.review?.submittedAt && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    Submitted: {new Date(task.review.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {/* Revision Count */}
              {task.revisedCount > 0 && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    {task.revisedCount} {task.revisedCount === 1 ? 'revision' : 'revisions'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 min-w-[140px]">
            {/* Review Button */}
            {(task.status === 'submitted' || task.status === 'under-review') && (
              <button
                onClick={() => handleReviewTask(task)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <CheckCircle size={20} />
                Review Task
              </button>
            )}

            {/* Locked Info */}
            {(task.status === 'pending' || task.status === 'in-progress') && (
              <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                isDarkMode ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                <AlertCircle size={20} />
                Not Submitted
              </div>
            )}

            {/* Reviewed Status */}
            {(task.status === 'approved' || task.status === 'revision-required') && (
              <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                task.status === 'approved'
                  ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                  : isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
              }`}>
                <CheckCircle size={20} />
                Reviewed
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
            />
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className={`px-4 py-2.5 rounded-lg border font-medium ${
            isDarkMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-700'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer`}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`px-4 py-2.5 rounded-lg border font-medium ${
            isDarkMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-700'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer`}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending/In Progress</option>
          <option value="submitted">Submitted/Under Review</option>
          <option value="reviewed">Reviewed</option>
        </select>

        {/* Refresh Button */}
        <button
          onClick={loadCheckerTasks}
          className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } shadow hover:shadow-md flex items-center gap-2`}
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className={`text-center py-16 rounded-xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          } shadow-lg border-2 border-dashed ${
            isDarkMode ? 'border-slate-600' : 'border-gray-300'
          }`}>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className={`text-lg font-medium ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Loading tasks...
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={`text-center py-16 rounded-xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          } shadow-lg border-2 border-dashed ${
            isDarkMode ? 'border-slate-600' : 'border-gray-300'
          }`}>
            <div className="flex flex-col items-center gap-4">
              <div className={`w-24 h-24 rounded-full ${
                isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
              } flex items-center justify-center`}>
                <svg className={`w-12 h-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className={`text-xl font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {searchTerm || filterStatus !== 'all' || selectedCategoryId !== 'all' 
                    ? 'No tasks match your filters' 
                    : 'No tasks assigned for checking'}
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchTerm || filterStatus !== 'all' || selectedCategoryId !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Tasks will appear here when assigned to you'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Showing <span className="font-semibold">{filteredTasks.length}</span> {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </div>
            
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </>
        )}
      </div>

      {/* Review Modal */}
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

export default CheckerTaskList;

