import React, { useState, useEffect } from 'react';
import TaskService from '../../services/taskService';
import TeamLeaderReviewModal from '../task/TeamLeaderReviewModal';
import TaskStatusBadge from '../task/TaskStatusBadge';

const TeamLeaderTaskList = ({ 
  currentTeamLeader, 
  categories = [], 
  isDarkMode = false 
}) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  // Load tasks assigned to this team leader
  const loadTeamLeaderTasks = () => {
    setLoading(true);
    try {
      const allTasks = TaskService.getAllTasks();
      
      // Filter tasks where this user is the team leader
      const teamLeaderId = currentTeamLeader.id || currentTeamLeader.user_id;
      const myTasks = allTasks.filter(task => {
        return task.teamLeaderId && String(task.teamLeaderId) === String(teamLeaderId) &&
               (task.status === 'initially-approved' || task.status === 'team-leader-review');
      });

      setTasks(myTasks);
      console.log(`📋 Loaded ${myTasks.length} tasks for team leader`);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamLeaderTasks();
    
    // Listen for task updates
    const handleTaskUpdate = () => {
      loadTeamLeaderTasks();
    };
    
    window.addEventListener('tasksUpdated', handleTaskUpdate);
    return () => {
      window.removeEventListener('tasksUpdated', handleTaskUpdate);
    };
  }, [currentTeamLeader]);

  // Apply filters
  useEffect(() => {
    let result = [...tasks];

    // Filter by category
    if (selectedCategoryId !== 'all') {
      result = result.filter(t => t.categoryId === selectedCategoryId);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.assignedToName?.toLowerCase().includes(term) ||
        t.checkerName?.toLowerCase().includes(term)
      );
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, searchTerm, selectedCategoryId]);

  // Handle review task
  const handleReviewTask = (task) => {
    setSelectedTask(task);
    setShowReviewModal(true);
  };

  // Handle approve task
  const handleApproveTask = async (feedback) => {
    try {
      const result = await TaskService.teamLeaderApprove(
        selectedTask.id,
        currentTeamLeader.id || currentTeamLeader.user_id,
        feedback
      );
      
      if (result.success) {
        alert('✅ Task finally approved successfully!');
        loadTeamLeaderTasks();
        setShowReviewModal(false);
        setSelectedTask(null);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Error approving task');
    }
  };

  // Handle require correction
  const handleRequireCorrection = async (feedback, corrections) => {
    try {
      const result = await TaskService.teamLeaderRequireCorrection(
        selectedTask.id,
        currentTeamLeader.id || currentTeamLeader.user_id,
        feedback,
        corrections
      );
      
      if (result.success) {
        alert('✅ Corrections requested successfully!');
        loadTeamLeaderTasks();
        setShowReviewModal(false);
        setSelectedTask(null);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error requiring correction:', error);
      alert('Error requiring correction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="all">All Statuses</option>
              <option value="initially-approved">Initially Approved</option>
              <option value="team-leader-review">Under Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No tasks pending your review
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`p-6 rounded-xl border-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <TaskStatusBadge status={task.status} size="sm" />
                  </div>
                  
                  {task.description && (
                    <p className={`mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Assigned To
                      </p>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                        {task.assignedToName}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Checker
                      </p>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                        {task.checkerName}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Category
                      </p>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                        {task.categoryPath}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Priority
                      </p>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                        {task.priority}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleReviewTask(task)}
                  className={`ml-4 px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isDarkMode
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedTask && (
        <TeamLeaderReviewModal
          task={selectedTask}
          onApprove={handleApproveTask}
          onRequireCorrection={handleRequireCorrection}
          onCancel={() => {
            setShowReviewModal(false);
            setSelectedTask(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default TeamLeaderTaskList;

