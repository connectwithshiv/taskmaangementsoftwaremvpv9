import { StorageService } from "./storageService";
import { UserIdResolver } from "../components/user/UserIdResolver";
import UserDependencyService from "./userDependencyService";
import WorkflowService from "./workflowService";
import RateManagerService from "./rateManagerService";
import WalletService from "./walletService";
import ChecklistService from "./ChecklistService";
import { getStatusAfterCheckerApproval } from "../utils/workflowStageHelper";

// Task statuses
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SUBMITTED: 'submitted', // Submitted for review
  UNDER_REVIEW: 'under-review', // Admin is reviewing
  APPROVED: 'approved', // Admin approved
  REVISION_REQUIRED: 'revision-required', // Admin requires corrections
  INITIALLY_APPROVED: 'initially-approved', // Checker approved, pending team leader review
  TEAM_LEADER_REVIEW: 'team-leader-review', // Under team leader review
  FINALLY_APPROVED: 'finally-approved' // Team leader approved
};

// Task priorities
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Initialize tasks from localStorage
let tasks = [];

const loadTasks = () => {
  try {
    const data = StorageService.loadTasks();
    tasks = data.tasks || [];
  } catch (error) {
    console.error('Error loading tasks:', error);
    tasks = [];
  }
};

const saveTasks = () => {
  try {
    StorageService.saveTasks({ tasks });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tasksUpdated'));
      console.log(' Tasks saved and event fired');
    }
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
};

loadTasks();

const TaskService = {
  // Get all tasks
  getAllTasks: () => {
    loadTasks();
    return tasks;
  },

  // Get task by ID
  getTaskById: (taskId) => {
    return tasks.find(task => task.id === taskId);
  },

  // Create new task
  createTask: (taskData) => {
    try {
      const now = new Date().toISOString();
      
      if (!taskData.assignedToName && taskData.assignedTo) {
        console.warn('assignedToName missing for task creation. assignedTo:', taskData.assignedTo);
      }
      
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: taskData.title,
        description: taskData.description || '',
        categoryId: taskData.categoryId,
        categoryPath: taskData.categoryPath || '',
        assignedTo: taskData.assignedTo, // Keep whatever ID format is provided
        assignedToName: taskData.assignedToName || '',
        checkerId: taskData.checkerId || null,
        checkerName: taskData.checkerName || '',
        priority: taskData.priority || TASK_PRIORITY.MEDIUM,
        status: taskData.status || TASK_STATUS.PENDING,
        dueDate: taskData.dueDate || null,
        startDate: taskData.startDate || null,
        completedDate: null,
        estimatedHours: taskData.estimatedHours || null,
        actualHours: taskData.actualHours || null,
        tags: taskData.tags || [],
        attachments: taskData.attachments || [],
        comments: taskData.comments || [],
        // Worksheet fields
        hasWorksheet: taskData.hasWorksheet || false,
        worksheetTemplateId: taskData.worksheetTemplateId || null,
        worksheetSubmissions: [],
        // Review and approval fields
        review: null, // Stores review data
        approvedBy: null,
        approvedAt: null,
        revisedCount: 0,
        // Workflow fields
        workflowId: taskData.workflowId || null,
        workflowName: taskData.workflowName || null,
        userDependencyId: taskData.userDependencyId || null,
        userDependencyName: taskData.userDependencyName || null,
        currentStage: taskData.currentStage !== undefined ? taskData.currentStage : 0,
        stageHistory: taskData.stageHistory || [],
        stageCumulativeMistakes: taskData.stageCumulativeMistakes || {}, // Track cumulative mistakes per stage
        isWorkflowComplete: false,
        createdAt: now,
        updatedAt: now,
        createdBy: taskData.createdBy || 'system',
        updatedBy: taskData.createdBy || 'system',
        logs: [{
          action: 'created',
          timestamp: now,
          performedBy: taskData.createdBy || 'system',
          details: `Task created${taskData.hasWorksheet ? ' with worksheet template' : ''}${taskData.workflowId ? ' with workflow' : ''}`
        }]
      };

      // If workflow task, initialize stage history
      if (newTask.workflowId && newTask.userDependencyId && newTask.currentStage === 0) {
        // Get first stage assignment
        const firstStage = UserDependencyService.getStageAssignment(newTask.userDependencyId, 1);
        if (firstStage) {
          newTask.currentStage = 1;
          newTask.categoryId = firstStage.categoryId;
          newTask.categoryPath = firstStage.categoryName;
          newTask.assignedTo = firstStage.userId;
          newTask.assignedToName = firstStage.userName;
          newTask.checkerId = firstStage.checkerId;
          newTask.checkerName = firstStage.checkerName;
          newTask.teamLeaderId = firstStage.teamLeaderId || null;
          newTask.teamLeaderName = firstStage.teamLeaderName || null;
          
          // Initialize stage history
          newTask.stageHistory = [];
          
          // Increment dependency usage
          UserDependencyService.incrementTaskCount(newTask.userDependencyId);
          
          // Increment workflow usage
          WorkflowService.incrementTaskCount(newTask.workflowId);
        }
      }
      
      // For non-workflow tasks, add team leader if assigned
      if (!newTask.workflowId && taskData.teamLeaderId) {
        newTask.teamLeaderId = taskData.teamLeaderId;
        newTask.teamLeaderName = taskData.teamLeaderName || null;
      }
      
      tasks.push(newTask);
      saveTasks();
      
      console.log(' Task created:', {
        title: newTask.title,
        assignedTo: newTask.assignedTo,
        assignedToName: newTask.assignedToName,
        checkerId: newTask.checkerId,
        checkerName: newTask.checkerName,
        hasWorksheet: newTask.hasWorksheet,
        worksheetTemplateId: newTask.worksheetTemplateId,
        workflowId: newTask.workflowId,
        currentStage: newTask.currentStage
      });
      
      return { 
        success: true, 
        task: newTask,
        message: 'Task created successfully' 
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  // Update task
  updateTask: (taskId, updateData) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { 
          success: false, 
          message: 'Task not found' 
        };
      }

      const now = new Date().toISOString();
      const oldTask = tasks[taskIndex];
      
      const finalUpdateData = { ...updateData };
      if (finalUpdateData.assignedTo && !finalUpdateData.assignedToName) {
        finalUpdateData.assignedToName = oldTask.assignedToName || '';
      }
      
      const updatedTask = {
        ...oldTask,
        ...finalUpdateData,
        id: taskId,
        // Preserve worksheet fields if not updating them
        hasWorksheet: finalUpdateData.hasWorksheet !== undefined 
          ? finalUpdateData.hasWorksheet 
          : oldTask.hasWorksheet,
        worksheetTemplateId: finalUpdateData.worksheetTemplateId !== undefined 
          ? finalUpdateData.worksheetTemplateId 
          : oldTask.worksheetTemplateId,
        worksheetSubmissions: finalUpdateData.worksheetSubmissions || oldTask.worksheetSubmissions || [],
        updatedAt: now,
        updatedBy: updateData.updatedBy || 'system',
        logs: [
          ...(oldTask.logs || []),
          {
            action: 'updated',
            timestamp: now,
            performedBy: updateData.updatedBy || 'system',
            details: 'Task information updated'
          }
        ]
      };

      tasks[taskIndex] = updatedTask;
      saveTasks();
      
      return { 
        success: true, 
        task: updatedTask,
        message: 'Task updated successfully' 
      };
    } catch (error) {
      console.error('Error updating task:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  // Delete task
  deleteTask: (taskId, deletedBy = 'system') => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { 
          success: false, 
          message: 'Task not found' 
        };
      }

      tasks.splice(taskIndex, 1);
      saveTasks();
      
      return { 
        success: true, 
        message: 'Task deleted successfully' 
      };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  // Update task status
  updateTaskStatus: (taskId, status, updatedBy = 'system') => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { 
          success: false, 
          message: 'Task not found' 
        };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      const oldStatus = task.status;
      
      tasks[taskIndex] = {
        ...task,
        status: status,
        updatedAt: now,
        updatedBy: updatedBy,
        startDate: status === TASK_STATUS.IN_PROGRESS && !task.startDate ? now : task.startDate,
        completedDate: status === TASK_STATUS.COMPLETED ? now : task.completedDate,
        logs: [
          ...(task.logs || []),
          {
            action: 'status_changed',
            timestamp: now,
            performedBy: updatedBy,
            details: `Status changed from ${oldStatus} to ${status}`
          }
        ]
      };

      saveTasks();
      
      return { 
        success: true, 
        task: tasks[taskIndex],
        message: 'Task status updated successfully' 
      };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  //  Search and filter tasks (with ID resolver)
  searchTasks: (searchTerm = '', filters = {}) => {
    let filteredTasks = [...tasks];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.categoryPath.toLowerCase().includes(term) ||
        task.assignedToName.toLowerCase().includes(term) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    if (filters.status && filters.status !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.categoryId === filters.categoryId);
    }

    //  Filter by user with ID resolver
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      const searchId = String(filters.assignedTo);
      filteredTasks = filteredTasks.filter(task => String(task.assignedTo) === searchId);
    }

    // Filter by workflow
    if (filters.workflowId && filters.workflowId !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.workflowId === filters.workflowId);
    }

    // Filter by dependency
    if (filters.dependencyId && filters.dependencyId !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.userDependencyId === filters.dependencyId);
    }

    // Filter by creation date
    if (filters.dateFrom) {
      filteredTasks = filteredTasks.filter(task => 
        task.createdAt && new Date(task.createdAt) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filteredTasks = filteredTasks.filter(task => 
        task.createdAt && new Date(task.createdAt) <= new Date(filters.dateTo)
      );
    }

    if (filters.dueDateFrom) {
      filteredTasks = filteredTasks.filter(task => 
        task.dueDate && new Date(task.dueDate) >= new Date(filters.dueDateFrom)
      );
    }

    if (filters.dueDateTo) {
      filteredTasks = filteredTasks.filter(task => 
        task.dueDate && new Date(task.dueDate) <= new Date(filters.dueDateTo)
      );
    }

    return filteredTasks;
  },

  // Sort tasks
  sortTasks: (tasksToSort, sortBy, sortOrder = 'asc') => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
          break;
        case 'updatedAt':
          comparison = new Date(b.updatedAt) - new Date(a.updatedAt);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  },

  // Get task statistics
  getStatistics: () => {
    const stats = {
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
        inProgress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
        completed: tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
        cancelled: tasks.filter(t => t.status === TASK_STATUS.CANCELLED).length
      },
      byPriority: {
        urgent: tasks.filter(t => t.priority === TASK_PRIORITY.URGENT).length,
        high: tasks.filter(t => t.priority === TASK_PRIORITY.HIGH).length,
        medium: tasks.filter(t => t.priority === TASK_PRIORITY.MEDIUM).length,
        low: tasks.filter(t => t.priority === TASK_PRIORITY.LOW).length
      },
      overdue: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() && 
        t.status !== TASK_STATUS.COMPLETED
      ).length,
      dueToday: tasks.filter(t => {
        if (!t.dueDate) return false;
        const today = new Date().toDateString();
        return new Date(t.dueDate).toDateString() === today;
      }).length,
      completionRate: tasks.length > 0 
        ? ((tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length / tasks.length) * 100).toFixed(1)
        : 0
    };

    return stats;
  },

  //  Get tasks by user (with ID resolver)
  getTasksByUser: (user) => {
    if (!user) return [];
    
    return tasks.filter(task => UserIdResolver.isTaskAssignedToUser(task, user));
  },

  // Get tasks by category
  getTasksByCategory: (categoryId) => {
    return tasks.filter(task => task.categoryId === categoryId);
  },

  // Get overdue tasks
  getOverdueTasks: () => {
    const now = new Date();
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== TASK_STATUS.COMPLETED &&
      task.status !== TASK_STATUS.CANCELLED
    );
  },

  // Get upcoming tasks
  getUpcomingTasks: (days = 7) => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && 
             dueDate <= future && 
             task.status !== TASK_STATUS.COMPLETED &&
             task.status !== TASK_STATUS.CANCELLED;
    });
  },

  // Add comment
  addComment: (taskId, comment, userId = 'system') => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const newComment = {
        id: `comment_${Date.now()}`,
        text: comment,
        userId: userId,
        timestamp: now
      };

      tasks[taskIndex].comments = [...(tasks[taskIndex].comments || []), newComment];
      tasks[taskIndex].updatedAt = now;
      
      saveTasks();
      
      return { success: true, comment: newComment };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Add attachment
  addAttachment: (taskId, attachment) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const newAttachment = {
        id: `attachment_${Date.now()}`,
        ...attachment,
        uploadedAt: now
      };

      tasks[taskIndex].attachments = [...(tasks[taskIndex].attachments || []), newAttachment];
      tasks[taskIndex].updatedAt = now;
      
      saveTasks();
      
      return { success: true, attachment: newAttachment };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Bulk update status
  bulkUpdateStatus: (taskIds, status, updatedBy = 'system') => {
    try {
      const now = new Date().toISOString();
      let updatedCount = 0;

      taskIds.forEach(taskId => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].status = status;
          tasks[taskIndex].updatedAt = now;
          tasks[taskIndex].updatedBy = updatedBy;
          updatedCount++;
        }
      });

      saveTasks();
      
      return { 
        success: true, 
        message: `${updatedCount} tasks updated successfully` 
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Bulk delete
  bulkDelete: (taskIds) => {
    try {
      tasks = tasks.filter(t => !taskIds.includes(t.id));
      saveTasks();
      
      return { 
        success: true, 
        message: `${taskIds.length} tasks deleted successfully` 
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Clear all tasks
  clearAllTasks: () => {
    tasks = [];
    saveTasks();
  },

  // Export tasks
  exportTasks: () => {
    return {
      tasks: tasks,
      exportedAt: new Date().toISOString()
    };
  },

  // Import tasks
  importTasks: (importedTasks) => {
    tasks = importedTasks;
    saveTasks();
  },

  // Worksheet-related methods
  
  /**
   * Add worksheet submission ID to task
   */
  addWorksheetSubmission: (taskId, submissionId) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const task = tasks[taskIndex];
      
      // Add submission ID if not already present
      if (!task.worksheetSubmissions) {
        task.worksheetSubmissions = [];
      }
      
      if (!task.worksheetSubmissions.includes(submissionId)) {
        task.worksheetSubmissions.push(submissionId);
        task.updatedAt = new Date().toISOString();
        
        saveTasks();
        
        console.log('✅ Worksheet submission added to task:', submissionId);
      }
      
      return { success: true, message: 'Submission added' };
    } catch (error) {
      console.error('Error adding worksheet submission:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get tasks with worksheets
   */
  getTasksWithWorksheets: () => {
    return tasks.filter(t => t.hasWorksheet === true && t.worksheetTemplateId);
  },

  /**
   * Get tasks without worksheets
   */
  getTasksWithoutWorksheets: () => {
    return tasks.filter(t => !t.hasWorksheet || !t.worksheetTemplateId);
  },

  /**
   * Get task worksheet info
   */
  getTaskWorksheetInfo: (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return null;
    }
    
    return {
      taskId: task.id,
      taskTitle: task.title,
      hasWorksheet: task.hasWorksheet,
      worksheetTemplateId: task.worksheetTemplateId,
      submissionCount: task.worksheetSubmissions?.length || 0,
      submissions: task.worksheetSubmissions || []
    };
  },

  /**
   * Check if task has worksheet template
   */
  hasWorksheetTemplate: (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task && task.hasWorksheet && task.worksheetTemplateId;
  },

  /**
   * Get worksheet submission IDs for task
   */
  getWorksheetSubmissions: (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.worksheetSubmissions || [];
  },

  /**
   * Get tasks that are submitted for review
   */
  getSubmittedTasks: () => {
    return tasks.filter(t => t.status === TASK_STATUS.SUBMITTED || t.status === TASK_STATUS.UNDER_REVIEW);
  },

  /**
   * Submit task for review (user action)
   */
  submitTaskForReview: (taskId, submissionData, userId) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      
      tasks[taskIndex] = {
        ...task,
        status: TASK_STATUS.SUBMITTED,
        updatedAt: now,
        updatedBy: userId,
        // Store submission data
        review: {
          submissionData: submissionData,
          submittedAt: now,
          submittedBy: userId
        },
        logs: [
          ...(task.logs || []),
          {
            action: 'submitted_for_review',
            timestamp: now,
            performedBy: userId,
            details: 'Task submitted for admin review'
          }
        ]
      };

      saveTasks();
      
      return { 
        success: true, 
        task: tasks[taskIndex],
        message: 'Task submitted for review successfully' 
      };
    } catch (error) {
      console.error('Error submitting task for review:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  /**
   * Admin reviews and approves task
   * Handles workflow handoff if task is part of a workflow
   */
  approveTask: (taskId, adminId, adminFeedback = null, outputData = null, approvedChecklistItems = []) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      
      console.log('🎯 ApproveTask called:', {
        taskId: task.id,
        title: task.title,
        isWorkflow: !!(task.workflowId && task.userDependencyId),
        workflowId: task.workflowId,
        userDependencyId: task.userDependencyId,
        currentStage: task.currentStage,
        taskTeamLeaderId: task.teamLeaderId,
        status: task.status,
        assignedTo: task.assignedTo,
        assignedToName: task.assignedToName,
        checkerId: task.checkerId,
        checkerName: task.checkerName
      });
      
      // Check if task is part of a workflow
      if (task.workflowId && task.userDependencyId) {
        console.log('✅ Task is part of workflow - processing workflow approval');
        // Get current stage assignment
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        
        console.log('🔍 Getting stage assignment:', {
          dependencyId: task.userDependencyId,
          currentStage: task.currentStage,
          assignment: currentStageAssignment
        });
        
        // Calculate mistakes found in this review cycle
        const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
        let currentMistakesCount = 0;
        if (checklist && checklist.items && checklist.items.length > 0) {
          const totalItems = checklist.items.length;
          const approvedCount = approvedChecklistItems.length;
          currentMistakesCount = totalItems - approvedCount;
        }
        
        // Initialize cumulative mistakes tracking per stage if not exists
        if (!task.stageCumulativeMistakes) {
          task.stageCumulativeMistakes = {};
        }
        
        // Accumulate mistakes for current stage
        const stageKey = `stage_${task.currentStage}`;
        const previousMistakes = task.stageCumulativeMistakes[stageKey] || 0;
        task.stageCumulativeMistakes[stageKey] = previousMistakes + currentMistakesCount;
        
        console.log('📊 Cumulative mistakes tracking:', {
          stage: task.currentStage,
          stageKey: stageKey,
          currentMistakesFound: currentMistakesCount,
          previousCumulative: previousMistakes,
          newCumulative: task.stageCumulativeMistakes[stageKey]
        });
        
        // Save current stage output
        const currentStageHistory = {
          stageOrder: task.currentStage,
          categoryId: task.categoryId,
          categoryName: task.categoryPath.split(' > ').pop() || '',
          userId: task.assignedTo,
          userName: task.assignedToName,
          checkerId: adminId, // Store checker ID who approved
          checkerName: currentStageAssignment?.checkerName || task.checkerName || '',
          status: 'approved',
          inputData: task.stageHistory.length > 0 
            ? task.stageHistory[task.stageHistory.length - 1].outputData 
            : null,
          outputData: outputData || task.review?.submissionData || null,
          approvedAt: now,
          approvedBy: adminId,
          reviewedBy: adminId, // Also store as reviewedBy for consistency
          approvedChecklistItems: approvedChecklistItems || [], // Store approved checklist items
          mistakesFoundInThisReview: currentMistakesCount, // Store mistakes found in this review cycle
          cumulativeMistakesAtThisPoint: task.stageCumulativeMistakes[stageKey] // Store cumulative mistakes
        };
        
        const updatedStageHistory = [...(task.stageHistory || []), currentStageHistory];
        
        // ===== USE CENTRALIZED HELPER FOR CONSISTENT MULTI-STAGE HANDLING =====
        // This ensures ALL stages (first, intermediate, last) behave the same way
        
        // CRITICAL PRE-VALIDATION: Verify task properties before calling helper
        console.log('🔍 PRE-VALIDATION - Task properties before getStatusAfterCheckerApproval:', {
          taskId: task.id,
          title: task.title,
          workflowId: task.workflowId,
          userDependencyId: task.userDependencyId,
          currentStage: task.currentStage,
          currentStageType: typeof task.currentStage,
          teamLeaderId: task.teamLeaderId,
          teamLeaderName: task.teamLeaderName,
          assignedTo: task.assignedTo,
          checkerId: task.checkerId
        });
        
        const statusInfo = getStatusAfterCheckerApproval(task);
        
        console.log('🔍 Checker approval - Status determination (ALL STAGES):', {
          taskId: task.id,
          title: task.title,
          currentStage: task.currentStage,
          statusInfo: statusInfo,
          userDependencyId: task.userDependencyId
        });
        
        // ===== SCENARIO 0: ERROR STATE - Dependency not found =====
        if (statusInfo.error) {
          console.error('❌ CRITICAL ERROR: Cannot determine workflow status - dependency not found', {
            taskId: task.id,
            title: task.title,
            error: statusInfo.error,
            statusInfo: statusInfo
          });
          
          // Keep task in current state - don't mark as completed
          // Return error to user
          return {
            success: false,
            task: task,
            message: `Error: ${statusInfo.error}. Please ensure the workflow dependency exists.`,
            isWorkflowComplete: false
          };
        }
        
        // ===== SCENARIO 1: TEAM LEADER EXISTS (Applies to ALL stages) =====
        if (statusInfo.shouldAssignToTL && statusInfo.teamLeaderId) {
          console.log('✅ Team leader found - assigning task to team leader for review:', {
            stage: task.currentStage,
            teamLeaderId: statusInfo.teamLeaderId,
            teamLeaderName: statusInfo.teamLeaderName
          });
          
          // Assign to team leader for review - DON'T move to next stage yet
          // This applies to ALL stages (first, intermediate, last) - consistent behavior
          tasks[taskIndex] = {
            ...task,
            status: TASK_STATUS.TEAM_LEADER_REVIEW, // Use consistent status for ALL stages
            updatedAt: now,
            updatedBy: adminId,
            approvedBy: adminId,
            approvedAt: now,
            // Keep current stage assignment (don't move to next stage yet)
            assignedTo: statusInfo.teamLeaderId, // Assign to team leader for review
            assignedToName: statusInfo.teamLeaderName,
            stageHistory: updatedStageHistory,
            teamLeaderId: statusInfo.teamLeaderId,
            teamLeaderName: statusInfo.teamLeaderName,
            isWorkflowComplete: false, // NEVER complete until TL approves
            review: {
              ...task.review,
              reviewedAt: now,
              reviewedBy: adminId,
              approved: true,
              adminFeedback: adminFeedback,
              approvedChecklistItems: approvedChecklistItems
            },
            logs: [
              ...(task.logs || []),
              {
                action: 'checker_approved_awaiting_tl',
                timestamp: now,
                performedBy: adminId,
                details: `Stage ${task.currentStage} approved by checker, task assigned to team leader for review before moving to next stage`
              }
            ]
          };
          
          saveTasks();
          
          // Verify the saved task has correct status
          const savedTask = tasks[taskIndex];
          console.log('✅ Task assigned to team leader for review (consistent for ALL stages)');
          console.log('🔍 VERIFICATION - Task after checker approval:', {
            taskId: savedTask.id,
            title: savedTask.title,
            status: savedTask.status,
            expectedStatus: 'team-leader-review',
            statusMatch: savedTask.status === 'team-leader-review',
            teamLeaderId: savedTask.teamLeaderId,
            teamLeaderName: savedTask.teamLeaderName,
            currentStage: savedTask.currentStage,
            assignedTo: savedTask.assignedTo,
            assignedToName: savedTask.assignedToName,
            isWorkflowComplete: savedTask.isWorkflowComplete
          });
          
          return { 
            success: true, 
            task: tasks[taskIndex],
            message: 'Task approved by checker, assigned to team leader for review',
            isWorkflowComplete: false,
            awaitingTeamLeader: true
          };
        }
        
        // ===== SCENARIO 2: NO TEAM LEADER - LAST STAGE =====
        // Workflow completes without team leader
        if (statusInfo.isWorkflowComplete && statusInfo.status === 'completed') {
          console.log('✅ Last stage without team leader - marking workflow as complete');
          
          tasks[taskIndex] = {
            ...task,
            status: TASK_STATUS.COMPLETED,
            updatedAt: now,
            updatedBy: adminId,
            approvedBy: adminId,
            approvedAt: now,
            completedDate: now,
            isWorkflowComplete: true,
            currentStage: task.currentStage,
            stageHistory: updatedStageHistory,
            review: {
              ...task.review,
              reviewedAt: now,
              reviewedBy: adminId,
              approved: true,
              adminFeedback: adminFeedback,
              approvedChecklistItems: approvedChecklistItems
            },
            logs: [
              ...(task.logs || []),
              {
                action: 'workflow_completed',
                timestamp: now,
                performedBy: adminId,
                details: `Workflow completed at stage ${task.currentStage}`
              }
            ]
          };
          
          saveTasks();
          
          // Calculate payouts for workflow completion
          try {
            console.log('💰 Starting payout calculation for workflow completion');
            
            // Calculate doer earnings for final stage
            const doerEarnings = RateManagerService.calculateDoerEarnings(task.categoryId);
            console.log('📊 Doer earnings calculated:', doerEarnings, 'for category:', task.categoryId);
            
            if (doerEarnings > 0 && task.assignedTo) {
              const result = WalletService.addEarnings({
                userId: task.assignedTo,
                amount: doerEarnings,
                source: 'task_completion',
                taskId: task.id,
                categoryId: task.categoryId,
                description: `Workflow completed: ${task.title}`,
                metadata: { approvedAt: now, approvedBy: adminId, workflowComplete: true }
              });
              console.log('✅ Doer payout result:', result);
            }

            // Calculate checker earnings using cumulative mistakes for this stage
            const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
            console.log('📋 Checklist found:', checklist ? 'Yes' : 'No');
            
            // Get cumulative mistakes for current stage
            const stageKey = `stage_${task.currentStage}`;
            const cumulativeMistakes = task.stageCumulativeMistakes?.[stageKey] || 0;
            
            console.log('🔍 Workflow checklist analysis (final payment):', { 
              stage: task.currentStage,
              stageKey: stageKey,
              cumulativeMistakes: cumulativeMistakes,
              totalItems: checklist?.items?.length || 0,
              approvedCount: approvedChecklistItems.length
            });
            
            // Checker gets credit when stage is completed (base credit + cumulative mistake credit)
            if (adminId) {
              const checkerEarnings = RateManagerService.calculateCheckerEarnings(task.categoryId, cumulativeMistakes, true);
              console.log('📊 Checker earnings calculated (final):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes, stage completed: true');
              
              if (checkerEarnings > 0) {
                const result = WalletService.addEarnings({
                  userId: adminId,
                  amount: checkerEarnings,
                  source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                  taskId: task.id,
                  categoryId: task.categoryId,
                  description: cumulativeMistakes > 0 
                    ? `Stage completed with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                    : `Workflow completed: ${task.title}`,
                  metadata: { 
                    cumulativeMistakes: cumulativeMistakes,
                    stage: task.currentStage,
                    approvedCount: approvedChecklistItems.length, 
                    totalItems: checklist?.items?.length || 0, 
                    workflowComplete: true 
                  }
                });
                console.log('✅ Checker payout result (final):', result);
              }
            }
          } catch (payoutError) {
            console.error('❌ Error calculating payouts for workflow:', payoutError);
            console.error('Stack trace:', payoutError.stack);
          }
          
          return { 
            success: true, 
            task: tasks[taskIndex],
            message: 'Workflow completed successfully',
            isWorkflowComplete: true
          };
        }
        
        // ===== SCENARIO 3: NO TEAM LEADER - INTERMEDIATE STAGE =====
        // Move directly to next stage
        if (statusInfo.shouldMoveToNextStage) {
          console.log('🔄 No team leader - moving to next stage');
          
          const nextStage = UserDependencyService.getNextStage(
            task.userDependencyId,
            task.currentStage
          );
          
          console.log('🔄 Moving to next stage (no team leader):', {
            currentStage: task.currentStage,
            nextStage: nextStage,
            dependencyId: task.userDependencyId,
            taskId: task.id
          });
          
          if (!nextStage) {
            console.error('❌ Next stage not found:', {
              currentStage: task.currentStage,
              dependencyId: task.userDependencyId
            });
            return { 
              success: false, 
              message: 'Next stage assignment not found' 
            };
          }
          
          // Save the old stage number before updating
          const oldStage = task.currentStage;
          const oldAssignedTo = task.assignedTo;
          const oldCheckerId = task.checkerId;
          
          // Update task for next stage
          tasks[taskIndex] = {
            ...task,
            status: TASK_STATUS.PENDING, // Next stage always starts as pending
            updatedAt: now,
            updatedBy: adminId,
            categoryId: nextStage.categoryId,
            categoryPath: nextStage.categoryName,
            assignedTo: nextStage.userId,
            assignedToName: nextStage.userName,
            checkerId: nextStage.checkerId,
            checkerName: nextStage.checkerName,
            currentStage: nextStage.stageOrder,
            stageHistory: updatedStageHistory,
            review: null, // Reset review for next stage
            revisedCount: 0, // Reset revision count for new stage
            teamLeaderId: nextStage.teamLeaderId || null,
            teamLeaderName: nextStage.teamLeaderName || null,
            isWorkflowComplete: false, // Always false for intermediate stages
            logs: [
              ...(task.logs || []),
              {
                action: 'stage_handoff',
                timestamp: now,
                performedBy: adminId,
                details: `Task moved from stage ${oldStage} to stage ${nextStage.stageOrder}. Assigned to ${nextStage.userName}`
              }
            ]
          };
          
          console.log('✅ Stage transition completed:', {
            taskId: task.id,
            fromStage: oldStage,
            toStage: nextStage.stageOrder,
            fromDoer: oldAssignedTo,
            toDoer: nextStage.userId,
            fromChecker: oldCheckerId,
            toChecker: nextStage.checkerId,
            newStatus: TASK_STATUS.PENDING
          });
          
          saveTasks();
          
          // Calculate payouts for intermediate stage completion
          // Use the OLD stage's category and doer for payout calculation
          const completedStageCategoryId = currentStageHistory?.categoryId || task.categoryId;
          const completedStageDoerId = oldAssignedTo;
          
          try {
            console.log('💰 Starting payout calculation for intermediate stage:', {
              stage: oldStage,
              categoryId: completedStageCategoryId,
              doerId: completedStageDoerId
            });
            
            // Calculate doer earnings for the completed stage
            const doerEarnings = RateManagerService.calculateDoerEarnings(completedStageCategoryId);
            console.log('📊 Doer earnings calculated:', doerEarnings, 'for category:', completedStageCategoryId);
            
            if (doerEarnings > 0 && completedStageDoerId) {
              const result = WalletService.addEarnings({
                userId: completedStageDoerId,
                amount: doerEarnings,
                source: 'task_completion',
                taskId: task.id,
                categoryId: completedStageCategoryId,
                description: `Stage ${oldStage} completed: ${task.title}`,
                metadata: { approvedAt: now, approvedBy: adminId, stage: oldStage }
              });
              console.log('✅ Doer payout result:', result);
            }

            // Calculate checker earnings for intermediate stage using cumulative mistakes
            const checklist = ChecklistService.getChecklistByCategory(completedStageCategoryId);
            
            // Get cumulative mistakes for completed stage
            const completedStageKey = `stage_${oldStage}`;
            const cumulativeMistakes = task.stageCumulativeMistakes?.[completedStageKey] || 0;
            
            console.log('🔍 Intermediate stage checklist analysis (final payment):', { 
              stage: oldStage,
              stageKey: completedStageKey,
              cumulativeMistakes: cumulativeMistakes,
              totalItems: checklist?.items?.length || 0,
              approvedCount: approvedChecklistItems.length
            });
            
            // Checker gets credit when stage is completed (base credit + cumulative mistake credit)
            if (adminId) {
              const checkerEarnings = RateManagerService.calculateCheckerEarnings(completedStageCategoryId, cumulativeMistakes, true);
              console.log('📊 Checker earnings calculated (intermediate final):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes');
              
              if (checkerEarnings > 0) {
                const result = WalletService.addEarnings({
                  userId: adminId,
                  amount: checkerEarnings,
                  source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                  taskId: task.id,
                  categoryId: completedStageCategoryId,
                  description: cumulativeMistakes > 0 
                    ? `Stage ${oldStage} completed with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                    : `Stage ${oldStage} completed: ${task.title}`,
                  metadata: { 
                    cumulativeMistakes: cumulativeMistakes,
                    stage: oldStage,
                    approvedCount: approvedChecklistItems.length, 
                    totalItems: checklist?.items?.length || 0
                  }
                });
                console.log('✅ Checker payout result (intermediate final):', result);
              }
            }
          } catch (payoutError) {
            console.error('❌ Error calculating payouts for intermediate stage:', payoutError);
          }
          
          return { 
            success: true, 
            task: tasks[taskIndex],
            message: `Task moved to stage ${nextStage.stageOrder}`,
            isWorkflowComplete: false
          };
        }
        
        // ===== FALLBACK: Should not reach here =====
        console.error('❌ Unexpected state in checker approval:', {
          taskId: task.id,
          statusInfo: statusInfo
        });
        return { 
          success: false, 
          message: 'Unexpected state in checker approval logic' 
        };
      } else {
        // Normal approval (non-workflow task)
        // Check if there's a team leader assigned
        const taskTeamLeader = task.teamLeaderId;
        const hasTeamLeader = !!(taskTeamLeader && String(taskTeamLeader).trim() !== '');
        
        console.log('🔍 Non-workflow approval check:', {
          hasTeamLeader,
          taskTeamLeader,
          taskTeamLeaderId: task.teamLeaderId,
          correctionType: task.correctionType,
          wasRevisionRequired: task.status === TASK_STATUS.REVISION_REQUIRED,
          taskStatus: task.status
        });
        
        tasks[taskIndex] = {
          ...task,
          status: hasTeamLeader ? TASK_STATUS.INITIALLY_APPROVED : TASK_STATUS.APPROVED,
          updatedAt: now,
          updatedBy: adminId,
          approvedBy: adminId,
          approvedAt: now,
          completedDate: hasTeamLeader ? null : now,
          review: {
            ...task.review,
            reviewedAt: now,
            reviewedBy: adminId,
            approved: true,
            adminFeedback: adminFeedback,
            approvedChecklistItems: approvedChecklistItems
          },
          logs: [
            ...(task.logs || []),
            {
              action: hasTeamLeader ? 'initially_approved' : 'approved',
              timestamp: now,
              performedBy: adminId,
              details: hasTeamLeader 
                ? 'Task initially approved by checker, pending team leader review'
                : 'Task approved by admin'
            }
          ]
        };

        saveTasks();
        
        // Calculate and add payouts ONLY if no team leader is involved
        if (!hasTeamLeader) {
          try {
            console.log('💰 Starting payout calculation for normal approval');
            
            // Calculate doer earnings (full amount when task approved)
            const doerEarnings = RateManagerService.calculateDoerEarnings(task.categoryId);
            console.log('📊 Doer earnings calculated:', doerEarnings, 'for category:', task.categoryId);
            
            if (doerEarnings > 0 && task.assignedTo) {
              const result = WalletService.addEarnings({
                userId: task.assignedTo,
                amount: doerEarnings,
                source: 'task_completion',
                taskId: task.id,
                categoryId: task.categoryId,
                description: `Task approved: ${task.title}`,
                metadata: { approvedAt: now, approvedBy: adminId }
              });
              console.log('✅ Doer payout result:', result);
            }

            // Calculate checker earnings using cumulative mistakes for non-workflow tasks
            const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
            console.log('📋 Checklist found:', checklist ? 'Yes' : 'No', 'for category:', task.categoryId);
            
            // Get cumulative mistakes for current stage (stage 0 for non-workflow)
            const currentStage = task.currentStage || 0;
            const stageKey = `stage_${currentStage}`;
            const cumulativeMistakes = task.stageCumulativeMistakes?.[stageKey] || 0;
            
            console.log('🔍 Checklist analysis (final payment - non-workflow):', {
              stage: currentStage,
              stageKey: stageKey,
              cumulativeMistakes: cumulativeMistakes,
              totalItems: checklist?.items?.length || 0,
              approvedCount: approvedChecklistItems.length
            });
            
            // Checker gets credit when task is completed (base credit + cumulative mistake credit)
            if (adminId) {
              const checkerEarnings = RateManagerService.calculateCheckerEarnings(task.categoryId, cumulativeMistakes, true);
              console.log('📊 Checker earnings calculated (final - non-workflow):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes, stage completed: true');
              
              if (checkerEarnings > 0) {
                const result = WalletService.addEarnings({
                  userId: adminId,
                  amount: checkerEarnings,
                  source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                  taskId: task.id,
                  categoryId: task.categoryId,
                  description: cumulativeMistakes > 0 
                    ? `Task completed with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                    : `Task approved: ${task.title}`,
                  metadata: { 
                    cumulativeMistakes: cumulativeMistakes,
                    stage: currentStage,
                    approvedCount: approvedChecklistItems.length, 
                    totalItems: checklist?.items?.length || 0 
                  }
                });
                console.log('✅ Checker payout result (final - non-workflow):', result);
              }
            }
          } catch (payoutError) {
            console.error('❌ Error calculating payouts:', payoutError);
            console.error('Stack trace:', payoutError.stack);
            // Don't fail the approval if payout calculation fails
          }
        } else {
          console.log('⏸️ Payouts deferred - awaiting team leader review');
        }
        
        return { 
          success: true, 
          task: tasks[taskIndex],
          message: 'Task approved successfully',
          isWorkflowComplete: false
        };
      }
    } catch (error) {
      console.error('Error approving task:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  /**
   * Admin requires task revision
   */
  requireRevision: (taskId, adminId, feedback, approvedChecklistItems = []) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      
      // Check if this is a workflow task with a team leader
      // If yes, send to team leader for checklist review instead of marking as revision-required
      const isWorkflowTask = !!(task.workflowId && task.userDependencyId);
      
      // Get team leader from task or from stage assignment
      let teamLeaderId = task.teamLeaderId;
      let teamLeaderName = task.teamLeaderName;
      
      if (isWorkflowTask && task.currentStage) {
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        if (currentStageAssignment && currentStageAssignment.teamLeaderId) {
          teamLeaderId = currentStageAssignment.teamLeaderId;
          teamLeaderName = currentStageAssignment.teamLeaderName;
        }
      }
      
      const hasTeamLeader = !!(teamLeaderId && String(teamLeaderId).trim() !== '');
      
      // For workflow tasks with team leader, send to team leader for review
      if (isWorkflowTask && hasTeamLeader) {
        console.log('📋 Checker submitted task to team leader for checklist review (not all items approved)');
        
        tasks[taskIndex] = {
          ...task,
          status: TASK_STATUS.TEAM_LEADER_REVIEW, // Send to team leader for review
          updatedAt: now,
          updatedBy: adminId,
          assignedTo: teamLeaderId, // Assign to team leader
          assignedToName: teamLeaderName,
          teamLeaderId: teamLeaderId, // Update team leader ID
          teamLeaderName: teamLeaderName,
          review: {
            ...task.review,
            reviewedAt: now,
            reviewedBy: adminId,
            approved: false,
            adminFeedback: feedback,
            requiresRevision: true,
            approvedChecklistItems: approvedChecklistItems // Store what checker approved
          },
          logs: [
            ...(task.logs || []),
            {
              action: 'checker_submitted_to_tl_for_review',
              timestamp: now,
              performedBy: adminId,
              details: `Checker submitted task to team leader for checklist review: ${feedback}`
            }
          ]
        };
      } else {
        // No team leader - mark as revision required (normal flow)
      tasks[taskIndex] = {
        ...task,
        status: TASK_STATUS.REVISION_REQUIRED,
        updatedAt: now,
        updatedBy: adminId,
        revisedCount: (task.revisedCount || 0) + 1,
        review: {
          ...task.review,
          reviewedAt: now,
          reviewedBy: adminId,
          approved: false,
          adminFeedback: feedback,
          requiresRevision: true,
          approvedChecklistItems: approvedChecklistItems
        },
        logs: [
          ...(task.logs || []),
          {
            action: 'revision_required',
            timestamp: now,
            performedBy: adminId,
            details: `Revision required: ${feedback}`
          }
        ]
      };
      }

      // Calculate mistakes found in this review cycle
      const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
      let currentMistakesCount = 0;
      if (checklist && checklist.items && checklist.items.length > 0) {
        const totalItems = checklist.items.length;
        const approvedCount = approvedChecklistItems.length;
        currentMistakesCount = totalItems - approvedCount;
      }
      
      // Initialize cumulative mistakes tracking per stage if not exists
      if (!task.stageCumulativeMistakes) {
        task.stageCumulativeMistakes = {};
      }
      
      // Get current stage (for workflow tasks) or use stage 0 for non-workflow
      const currentStage = task.currentStage || 0;
      const stageKey = `stage_${currentStage}`;
      
      // Accumulate mistakes for current stage
      const previousMistakes = task.stageCumulativeMistakes[stageKey] || 0;
      task.stageCumulativeMistakes[stageKey] = previousMistakes + currentMistakesCount;
      
      console.log('📊 Cumulative mistakes tracking (revision):', {
        stage: currentStage,
        stageKey: stageKey,
        currentMistakesFound: currentMistakesCount,
        previousCumulative: previousMistakes,
        newCumulative: task.stageCumulativeMistakes[stageKey]
      });
      
      // Update task with cumulative mistakes
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        stageCumulativeMistakes: task.stageCumulativeMistakes
      };
      
      saveTasks();
      
      // Note: Checker earnings will be calculated at stage completion using cumulative mistakes
      // We accumulate mistakes here, but payment happens when stage is completed (via TL approval or final approval)
      console.log('📊 Mistakes accumulated for stage:', {
        stage: currentStage,
        stageKey: stageKey,
        currentMistakesFound: currentMistakesCount,
        cumulativeTotal: task.stageCumulativeMistakes[stageKey],
        note: 'Payment will be made at stage completion based on cumulative mistakes'
      });
      
      return { 
        success: true, 
        task: tasks[taskIndex],
        message: 'Task marked as requiring revision' 
      };
    } catch (error) {
      console.error('Error requiring revision:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  /**
   * Get tasks requiring revision for a user
   */
  getTasksRequiringRevision: (userId) => {
    return tasks.filter(t => 
      t.assignedTo === userId && 
      t.status === TASK_STATUS.REVISION_REQUIRED
    );
  },

  /**
   * Team Leader approves initially approved task
   */
  teamLeaderApprove: (taskId, teamLeaderId, adminFeedback = null, approvedChecklistItems = []) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      
      // Verify this task is awaiting team leader review
      if (task.status !== TASK_STATUS.INITIALLY_APPROVED && task.status !== TASK_STATUS.TEAM_LEADER_REVIEW) {
        return { 
          success: false, 
          message: 'Task is not in a state that requires team leader approval' 
        };
      }
      
      // Verify this user is the assigned team leader
      if (task.teamLeaderId && String(task.teamLeaderId) !== String(teamLeaderId)) {
        return { 
          success: false, 
          message: 'Only the assigned team leader can approve this task' 
        };
      }

      console.log('🎯 Team Leader Approve called:', {
        taskId: task.id,
        title: task.title,
        isWorkflow: !!(task.workflowId && task.userDependencyId),
        workflowId: task.workflowId,
        userDependencyId: task.userDependencyId,
        currentStage: task.currentStage,
        status: task.status
      });

      // Check if this is a workflow task with more stages
      if (task.workflowId && task.userDependencyId) {
        // If status is TEAM_LEADER_REVIEW, this means the checker approved the current stage
        // and the task is waiting for team leader approval before moving to next stage
        const isWaitingForTeamLeaderApproval = task.status === TASK_STATUS.TEAM_LEADER_REVIEW;
        
        console.log('🔍 Workflow team leader approval:', {
          currentStage: task.currentStage,
          status: task.status,
          isWaitingForTeamLeaderApproval: isWaitingForTeamLeaderApproval,
          taskId: task.id
        });

        // If waiting for team leader approval, move task to next stage
        if (isWaitingForTeamLeaderApproval) {
          console.log('✅ Team leader approved current stage - moving task to next stage');
          
          // CRITICAL: Get full dependency to verify all stages exist
          const fullDependency = UserDependencyService.getUserDependencyById(task.userDependencyId);
          console.log('🔍 COMPREHENSIVE DEBUG - Full Dependency Structure:', {
            taskId: task.id,
            taskTitle: task.title,
            currentStage: task.currentStage,
            dependencyId: task.userDependencyId,
            dependencyExists: !!fullDependency,
            totalStages: fullDependency?.stageAssignments?.length || 0,
            allStageOrders: fullDependency?.stageAssignments?.map(s => s.stageOrder) || [],
            nextExpectedStage: task.currentStage + 1,
            note: 'This shows ALL stages in the dependency'
          });
          
          // Get the next stage assignment
          const nextStage = UserDependencyService.getNextStage(
            task.userDependencyId,
            task.currentStage
          );
          
          console.log('🔍 getNextStage result:', {
            taskId: task.id,
            taskTitle: task.title,
            currentStage: task.currentStage,
            currentStageType: typeof task.currentStage,
            dependencyId: task.userDependencyId,
            nextStage: nextStage,
            nextStageExists: !!nextStage,
            nextStageOrder: nextStage?.stageOrder,
            nextStageUserId: nextStage?.userId
          });
          
          // FALLBACK: If getNextStage returns null but we have stages > currentStage, manually find it
          if (!nextStage && fullDependency && fullDependency.stageAssignments) {
            const nextStageOrder = Number(task.currentStage) + 1;
            const manualNextStage = fullDependency.stageAssignments.find(
              s => Number(s.stageOrder) === nextStageOrder
            );
            
            if (manualNextStage) {
              console.log('⚠️ FALLBACK: getNextStage returned null but manual search found next stage:', {
                taskId: task.id,
                currentStage: task.currentStage,
                nextStageOrder: nextStageOrder,
                foundStage: manualNextStage
              });
              // Use the manually found stage
              const nextStageToUse = manualNextStage;
              
              // Continue with nextStageToUse instead of nextStage
              // (We'll need to handle this in the code below)
              
              // Move to next stage and assign to next stage doer/checker
              // BEFORE updating task, calculate payouts for the completed stage
              // (We need to do this before updating task because task.currentStage will change)
              
              // Get current stage assignment for payout calculation (stage that was just completed)
              const currentStageAssignment = UserDependencyService.getStageAssignment(
                task.userDependencyId,
                task.currentStage
              );
              
              const completedStage = task.currentStage;
              // Get the completed stage history entry (the stage that was just completed)
              const completedStageHistory = task.stageHistory?.find(h => h.stageOrder === completedStage);
              const completedStageDoerId = completedStageHistory?.userId || 
                (task.stageHistory && task.stageHistory.length > 0 ? task.stageHistory[task.stageHistory.length - 1].userId : null);
              const completedStageCheckerId = completedStageHistory?.checkerId || 
                completedStageHistory?.reviewedBy || 
                currentStageAssignment?.checkerId;
              const completedStageCategoryId = currentStageAssignment?.categoryId || task.categoryId;
              
              // Calculate payouts for the completed stage FIRST (before moving to next stage)
              try {
                console.log('💰 Starting payout calculation for completed stage after TL approval (before stage move):', {
                  completedStage: completedStage,
                  categoryId: completedStageCategoryId,
                  doerId: completedStageDoerId,
                  checkerId: completedStageCheckerId
                });
                
                // Calculate and add doer earnings
                const doerEarnings = RateManagerService.calculateDoerEarnings(completedStageCategoryId);
                console.log('📊 Doer earnings calculated:', doerEarnings);
                
                if (doerEarnings > 0 && completedStageDoerId) {
                  const doerResult = WalletService.addEarnings({
                    userId: completedStageDoerId,
                    amount: doerEarnings,
                    source: 'task_completion',
                    taskId: task.id,
                    categoryId: completedStageCategoryId,
                    description: `Stage ${completedStage} completed after team leader approval: ${task.title}`,
                    metadata: { approvedAt: now, approvedBy: teamLeaderId, stage: completedStage }
                  });
                  console.log('✅ Doer payout result:', doerResult);
                } else {
                  console.warn('⚠️ Doer payout not added:', { doerEarnings, completedStageDoerId });
                }

                // Calculate and add checker earnings using cumulative mistakes for completed stage
                const checklist = ChecklistService.getChecklistByCategory(completedStageCategoryId);
                if (completedStageCheckerId) {
                  // Get cumulative mistakes for completed stage
                  const completedStageKey = `stage_${completedStage}`;
                  const cumulativeMistakes = task.stageCumulativeMistakes?.[completedStageKey] || 0;
                  
                  console.log('📋 Stage completion checklist analysis (TL approval - final payment):', { 
                    stage: completedStage,
                    stageKey: completedStageKey,
                    cumulativeMistakes: cumulativeMistakes,
                    totalItems: checklist?.items?.length || 0
                  });
                  
                  // Checker gets credit when stage is completed (base credit + cumulative mistake credit)
                  const checkerEarnings = RateManagerService.calculateCheckerEarnings(completedStageCategoryId, cumulativeMistakes, true);
                  console.log('📊 Checker earnings calculated (TL approval - final):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes, stage completed: true');
                  
                  if (checkerEarnings > 0) {
                    const checkerResult = WalletService.addEarnings({
                      userId: completedStageCheckerId,
                      amount: checkerEarnings,
                      source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                      taskId: task.id,
                      categoryId: completedStageCategoryId,
                      description: cumulativeMistakes > 0 
                        ? `Stage ${completedStage} completed with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                        : `Stage ${completedStage} completed: ${task.title}`,
                      metadata: { 
                        cumulativeMistakes: cumulativeMistakes,
                        stage: completedStage,
                        totalItems: checklist?.items?.length || 0
                      }
                    });
                    console.log('✅ Checker payout result (TL approval - final):', checkerResult);
                  }
                } else {
                  console.warn('⚠️ Cannot calculate checker earnings: checkerId not found');
                }
              } catch (payoutError) {
                console.error('❌ Error calculating payouts:', payoutError);
                console.error('Stack trace:', payoutError.stack);
              }
              
              // NOW move to next stage and assign to next stage doer/checker
              tasks[taskIndex] = {
                ...task,
                status: TASK_STATUS.PENDING, // Set to PENDING for next stage doer
                updatedAt: now,
                updatedBy: teamLeaderId,
                approvedBy: teamLeaderId,
                approvedAt: now,
                isWorkflowComplete: false, // Explicitly set to false for intermediate stages
                categoryId: nextStageToUse.categoryId, // Assign to next stage category
                categoryPath: nextStageToUse.categoryName,
                assignedTo: nextStageToUse.userId, // Assign to next stage doer
                assignedToName: nextStageToUse.userName,
                checkerId: nextStageToUse.checkerId, // Assign to next stage checker
                checkerName: nextStageToUse.checkerName,
                currentStage: nextStageToUse.stageOrder, // Move to next stage
                teamLeaderId: nextStageToUse.teamLeaderId || null, // Get team leader for next stage (if any)
                teamLeaderName: nextStageToUse.teamLeaderName || null,
                revisedCount: 0, // Reset revision count for next stage
                review: {
                  ...task.review,
                  teamLeaderReviewedAt: now,
                  teamLeaderReviewedBy: teamLeaderId,
                  teamLeaderFeedback: adminFeedback,
                  finallyApproved: false,
                  teamLeaderApprovedChecklistItems: approvedChecklistItems
                },
                logs: [
                  ...(task.logs || []),
                  {
                    action: 'stage_activated_after_tl_approval',
                    timestamp: now,
                    performedBy: teamLeaderId,
                    details: `Team leader approved stage ${completedStage}, task moved to stage ${nextStageToUse.stageOrder} and assigned to ${nextStageToUse.userName} - Status set to PENDING (FALLBACK METHOD)`
                  }
                ]
              };
              
              // CRITICAL LOGGING: Verify team leader assignment for next stage
              console.log('🔍 VERIFICATION - Team Leader Assignment for Next Stage (FALLBACK):', {
                taskId: task.id,
                taskTitle: task.title,
                previousStage: completedStage,
                nextStage: nextStageToUse.stageOrder,
                nextStageTeamLeaderId: nextStageToUse.teamLeaderId,
                nextStageTeamLeaderName: nextStageToUse.teamLeaderName,
                taskTeamLeaderIdAfterUpdate: tasks[taskIndex].teamLeaderId,
                taskTeamLeaderNameAfterUpdate: tasks[taskIndex].teamLeaderName,
                note: 'This team leader ID should be used when checker approves at next stage'
              });
              
              saveTasks();
              
              // Verify the saved status
              const savedTask = tasks[taskIndex];
              console.log('🔍 VERIFICATION - Task status after save (FALLBACK):', {
                taskId: savedTask.id,
                savedStatus: savedTask.status,
                expectedStatus: 'pending',
                matches: savedTask.status === 'pending',
                isWorkflowComplete: savedTask.isWorkflowComplete,
                currentStage: savedTask.currentStage,
                assignedTo: savedTask.assignedTo,
                assignedToName: savedTask.assignedToName
              });
              
              // Dispatch event for notifications
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('taskStageHandoff', {
                  detail: {
                    taskId: task.id,
                    previousStage: completedStage,
                    nextStage: nextStageToUse.stageOrder,
                    assignedTo: nextStageToUse.userId
                  }
                }));
              }
              
              return { 
                success: true, 
                task: tasks[taskIndex],
                message: `Team leader approved, task moved to stage ${nextStageToUse.stageOrder} and assigned to ${nextStageToUse.userName} (FALLBACK METHOD)`,
                isWorkflowComplete: false
              };
            }
          }
          
          if (!nextStage) {
            // No next stage - this is the last stage, mark as finally approved
            console.log('✅ No next stage - marking as FINALLY_APPROVED');
            
            // Get current stage assignment for payout calculation
            const currentStageAssignment = UserDependencyService.getStageAssignment(
              task.userDependencyId,
              task.currentStage
            );
            
            // Get the completed stage history entry for the current stage
            const currentStageHistory = task.stageHistory?.find(h => h.stageOrder === task.currentStage);
            const completedStageDoerId = currentStageHistory?.userId || 
              (task.stageHistory && task.stageHistory.length > 0 ? task.stageHistory[task.stageHistory.length - 1].userId : null);
            const completedStageCategoryId = currentStageAssignment?.categoryId || task.categoryId;
            
            // Mark as finally approved
            tasks[taskIndex] = {
              ...task,
              status: TASK_STATUS.FINALLY_APPROVED,
              updatedAt: now,
              updatedBy: teamLeaderId,
              approvedBy: teamLeaderId,
              approvedAt: now,
              completedDate: now, // Last stage - workflow is complete
              isWorkflowComplete: true,
              review: {
                ...task.review,
                teamLeaderReviewedAt: now,
                teamLeaderReviewedBy: teamLeaderId,
                teamLeaderFeedback: adminFeedback,
                finallyApproved: true,
                teamLeaderApprovedChecklistItems: approvedChecklistItems
              },
              logs: [
                ...(task.logs || []),
                {
                  action: 'finally_approved',
                  timestamp: now,
                  performedBy: teamLeaderId,
                  details: `Task finally approved by team leader - last stage completed`
                }
              ]
            };
            
            saveTasks();
            
            // Calculate payouts for the final stage
            try {
              console.log('💰 Starting payout calculation for final stage approval');
              
              // Get the completed stage doer from stage history (use the one we already found)
              const completedStageHistory = currentStageHistory || task.stageHistory?.find(h => h.stageOrder === task.currentStage);
              const finalStageDoerId = completedStageHistory?.userId || completedStageDoerId || currentStageAssignment?.userId || task.assignedTo;
              const finalStageCheckerId = completedStageHistory?.checkerId || 
                completedStageHistory?.reviewedBy || 
                currentStageAssignment?.checkerId || 
                task.checkerId;
              
              console.log('📊 Payout calculation details:', {
                stage: task.currentStage,
                categoryId: completedStageCategoryId,
                doerId: finalStageDoerId,
                checkerId: finalStageCheckerId,
                stageHistory: completedStageHistory
              });
              
              // Calculate and add doer earnings
              const doerEarnings = RateManagerService.calculateDoerEarnings(completedStageCategoryId);
              console.log('📊 Doer earnings calculated:', doerEarnings);
              
              if (doerEarnings > 0 && finalStageDoerId) {
                const doerResult = WalletService.addEarnings({
                  userId: finalStageDoerId,
                  amount: doerEarnings,
                  source: 'task_completion',
                  taskId: task.id,
                  categoryId: completedStageCategoryId,
                  description: `Task finally approved by team leader: ${task.title}`,
                  metadata: { approvedAt: now, approvedBy: teamLeaderId, finalApproval: true, stage: task.currentStage }
                });
                console.log('✅ Doer payout result:', doerResult);
              } else {
                console.warn('⚠️ Doer payout not added:', { doerEarnings, finalStageDoerId });
              }

              // Calculate and add checker earnings using cumulative mistakes for final stage
              const checklist = ChecklistService.getChecklistByCategory(completedStageCategoryId);
              if (finalStageCheckerId) {
                // Get cumulative mistakes for final stage
                const finalStageKey = `stage_${task.currentStage}`;
                const cumulativeMistakes = task.stageCumulativeMistakes?.[finalStageKey] || 0;
                
                console.log('📋 Final approval checklist analysis (TL approval - final stage):', { 
                  stage: task.currentStage,
                  stageKey: finalStageKey,
                  cumulativeMistakes: cumulativeMistakes,
                  totalItems: checklist?.items?.length || 0
                });
                
                // Checker gets credit when final stage is completed (base credit + cumulative mistake credit)
                const checkerEarnings = RateManagerService.calculateCheckerEarnings(completedStageCategoryId, cumulativeMistakes, true);
                console.log('📊 Checker earnings calculated (TL approval - final stage):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes, stage completed: true');
                
                if (checkerEarnings > 0) {
                  const checkerResult = WalletService.addEarnings({
                    userId: finalStageCheckerId,
                    amount: checkerEarnings,
                    source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                    taskId: task.id,
                    categoryId: completedStageCategoryId,
                    description: cumulativeMistakes > 0 
                      ? `Task finally approved with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                      : `Task finally approved: ${task.title}`,
                    metadata: { 
                      cumulativeMistakes: cumulativeMistakes,
                      totalItems: checklist?.items?.length || 0, 
                      finalApproval: true, 
                      stage: task.currentStage 
                    }
                  });
                  console.log('✅ Checker payout result (TL approval - final stage):', checkerResult);
                }
              }
            } catch (payoutError) {
              console.error('❌ Error calculating payouts:', payoutError);
              console.error('Stack trace:', payoutError.stack);
            }
            
            return {
              success: true,
              task: tasks[taskIndex],
              message: 'Task finally approved by team leader',
              isWorkflowComplete: true
            };
          }
          
          // There is a next stage - move task to next stage with PENDING status
          console.log('✅ Moving task to next stage:', nextStage.stageOrder);
          
          // Get current stage assignment for payout calculation (stage that was just completed)
          const currentStageAssignment = UserDependencyService.getStageAssignment(
            task.userDependencyId,
            task.currentStage
          );
          
          const completedStage = task.currentStage;
          // Get the completed stage history entry (the stage that was just completed)
          const completedStageHistory = task.stageHistory?.find(h => h.stageOrder === completedStage);
          const completedStageDoerId = completedStageHistory?.userId || 
            (task.stageHistory && task.stageHistory.length > 0 ? task.stageHistory[task.stageHistory.length - 1].userId : null);
          const completedStageCheckerId = completedStageHistory?.checkerId || 
            completedStageHistory?.reviewedBy || 
            currentStageAssignment?.checkerId;
          const completedStageCategoryId = currentStageAssignment?.categoryId || task.categoryId;
          
          // Move to next stage and assign to next stage doer/checker
          // BEFORE updating task, calculate payouts for the completed stage
          // (We need to do this before updating task because task.currentStage will change)
          
          // Calculate payouts for the completed stage FIRST (before moving to next stage)
          try {
            console.log('💰 Starting payout calculation for completed stage after TL approval (before stage move):', {
              completedStage: completedStage,
              categoryId: completedStageCategoryId,
              doerId: completedStageDoerId,
              checkerId: completedStageCheckerId
            });
            
            // Calculate and add doer earnings
            const doerEarnings = RateManagerService.calculateDoerEarnings(completedStageCategoryId);
            console.log('📊 Doer earnings calculated:', doerEarnings);
            
            if (doerEarnings > 0 && completedStageDoerId) {
              const doerResult = WalletService.addEarnings({
                userId: completedStageDoerId,
                amount: doerEarnings,
                source: 'task_completion',
                taskId: task.id,
                categoryId: completedStageCategoryId,
                description: `Stage ${completedStage} completed after team leader approval: ${task.title}`,
                metadata: { approvedAt: now, approvedBy: teamLeaderId, stage: completedStage }
              });
              console.log('✅ Doer payout result:', doerResult);
            } else {
              console.warn('⚠️ Doer payout not added:', { doerEarnings, completedStageDoerId });
            }

            // Calculate and add checker earnings using cumulative mistakes for completed stage
            const checklist = ChecklistService.getChecklistByCategory(completedStageCategoryId);
            if (completedStageCheckerId) {
              // Get cumulative mistakes for completed stage
              const completedStageKey = `stage_${completedStage}`;
              const cumulativeMistakes = task.stageCumulativeMistakes?.[completedStageKey] || 0;
              
              console.log('📋 Stage completion checklist analysis (TL approval - intermediate final):', { 
                stage: completedStage,
                stageKey: completedStageKey,
                cumulativeMistakes: cumulativeMistakes,
                totalItems: checklist?.items?.length || 0
              });
              
              // Checker gets credit when stage is completed (base credit + cumulative mistake credit)
              const checkerEarnings = RateManagerService.calculateCheckerEarnings(completedStageCategoryId, cumulativeMistakes, true);
              console.log('📊 Checker earnings calculated (TL approval - intermediate final):', checkerEarnings, 'for', cumulativeMistakes, 'cumulative mistakes, stage completed: true');
              
              if (checkerEarnings > 0) {
                const checkerResult = WalletService.addEarnings({
                  userId: completedStageCheckerId,
                  amount: checkerEarnings,
                  source: cumulativeMistakes > 0 ? 'mistake_found' : 'task_completion',
                  taskId: task.id,
                  categoryId: completedStageCategoryId,
                  description: cumulativeMistakes > 0 
                    ? `Stage ${completedStage} completed with ${cumulativeMistakes} total mistake(s) found across all reviews: ${task.title}` 
                    : `Stage ${completedStage} completed: ${task.title}`,
                  metadata: { 
                    cumulativeMistakes: cumulativeMistakes,
                    stage: completedStage,
                    totalItems: checklist?.items?.length || 0
                  }
                });
                console.log('✅ Checker payout result (TL approval - intermediate final):', checkerResult);
              }
            } else {
              console.warn('⚠️ Cannot calculate checker earnings: checkerId not found');
            }
          } catch (payoutError) {
            console.error('❌ Error calculating payouts:', payoutError);
            console.error('Stack trace:', payoutError.stack);
          }
          
          // NOW move to next stage and assign to next stage doer/checker
          tasks[taskIndex] = {
            ...task,
            status: TASK_STATUS.PENDING, // Set to PENDING for next stage doer
            updatedAt: now,
            updatedBy: teamLeaderId,
            approvedBy: teamLeaderId,
            approvedAt: now,
            isWorkflowComplete: false, // Explicitly set to false for intermediate stages
            categoryId: nextStage.categoryId, // Assign to next stage category
            categoryPath: nextStage.categoryName,
            assignedTo: nextStage.userId, // Assign to next stage doer
            assignedToName: nextStage.userName,
            checkerId: nextStage.checkerId, // Assign to next stage checker
            checkerName: nextStage.checkerName,
            currentStage: nextStage.stageOrder, // Move to next stage
            teamLeaderId: nextStage.teamLeaderId || null, // Get team leader for next stage (if any)
            teamLeaderName: nextStage.teamLeaderName || null,
            revisedCount: 0, // Reset revision count for next stage
            review: {
              ...task.review,
              teamLeaderReviewedAt: now,
              teamLeaderReviewedBy: teamLeaderId,
              teamLeaderFeedback: adminFeedback,
              finallyApproved: false,
              teamLeaderApprovedChecklistItems: approvedChecklistItems
            },
            logs: [
              ...(task.logs || []),
              {
                action: 'stage_activated_after_tl_approval',
                timestamp: now,
                performedBy: teamLeaderId,
                details: `Team leader approved stage ${completedStage}, task moved to stage ${nextStage.stageOrder} and assigned to ${nextStage.userName} - Status set to PENDING`
              }
            ]
          };
          
          // CRITICAL LOGGING: Verify team leader assignment for next stage
          console.log('🔍 VERIFICATION - Team Leader Assignment for Next Stage:', {
            taskId: task.id,
            taskTitle: task.title,
            previousStage: completedStage,
            nextStage: nextStage.stageOrder,
            nextStageTeamLeaderId: nextStage.teamLeaderId,
            nextStageTeamLeaderName: nextStage.teamLeaderName,
            nextStageTeamLeaderIdType: typeof nextStage.teamLeaderId,
            taskTeamLeaderIdAfterUpdate: tasks[taskIndex].teamLeaderId,
            taskTeamLeaderNameAfterUpdate: tasks[taskIndex].teamLeaderName,
            note: 'This team leader ID should be used when checker approves at next stage'
          });
          
          saveTasks();
          
          // Verify the saved status
          const savedTask = tasks[taskIndex];
          console.log('🔍 VERIFICATION - Task status after save:', {
            taskId: savedTask.id,
            savedStatus: savedTask.status,
            expectedStatus: 'pending',
            matches: savedTask.status === 'pending',
            isWorkflowComplete: savedTask.isWorkflowComplete,
            currentStage: savedTask.currentStage,
            assignedTo: savedTask.assignedTo,
            assignedToName: savedTask.assignedToName
          });

          // Payouts already calculated above before moving to next stage

          // Dispatch event for notifications
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('taskStageHandoff', {
              detail: {
                taskId: task.id,
                previousStage: completedStage,
                nextStage: nextStage.stageOrder,
                assignedTo: nextStage.userId
              }
            }));
          }

          return { 
            success: true, 
            task: tasks[taskIndex],
            message: `Team leader approved, task moved to stage ${nextStage.stageOrder} and assigned to ${nextStage.userName}`,
            isWorkflowComplete: false
          };
        }
      } else {
        // Not a workflow task - mark as finally approved
        console.log('✅ Non-workflow task - marking as FINALLY_APPROVED');
      }

      // Last stage or non-workflow task - mark as finally approved and complete
      console.log('⚠️ Setting task to FINALLY_APPROVED (last stage or non-workflow)');
      tasks[taskIndex] = {
        ...task,
        status: TASK_STATUS.FINALLY_APPROVED,
        updatedAt: now,
        updatedBy: teamLeaderId,
        approvedBy: teamLeaderId,
        approvedAt: now,
        completedDate: now,
        isWorkflowComplete: true,
        review: {
          ...task.review,
          teamLeaderReviewedAt: now,
          teamLeaderReviewedBy: teamLeaderId,
          teamLeaderFeedback: adminFeedback,
          finallyApproved: true,
          teamLeaderApprovedChecklistItems: approvedChecklistItems
        },
        logs: [
          ...(task.logs || []),
          {
            action: 'finally_approved',
            timestamp: now,
            performedBy: teamLeaderId,
            details: 'Task finally approved by team leader'
          }
        ]
      };

      saveTasks();
      
      // Calculate and add payouts for final approval
      try {
        console.log('💰 Starting payout calculation for team leader final approval');
        
        // Calculate doer earnings (full amount when finally approved)
        const doerEarnings = RateManagerService.calculateDoerEarnings(task.categoryId);
        console.log('📊 Doer earnings calculated:', doerEarnings);
        
        if (doerEarnings > 0 && task.assignedTo) {
          const result = WalletService.addEarnings({
            userId: task.assignedTo,
            amount: doerEarnings,
            source: 'task_completion',
            taskId: task.id,
            categoryId: task.categoryId,
            description: `Task finally approved by team leader: ${task.title}`,
            metadata: { approvedAt: now, approvedBy: teamLeaderId, finalApproval: true }
          });
          console.log('✅ Doer payout result:', result);
        }

        // Note: Checker earnings already processed at initial approval stage
      } catch (payoutError) {
        console.error('❌ Error calculating payouts:', payoutError);
        console.error('Stack trace:', payoutError.stack);
      }
      
      return { 
        success: true, 
        task: tasks[taskIndex],
        message: 'Task finally approved successfully'
      };
    } catch (error) {
      console.error('Error in team leader approval:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  /**
   * Team Leader requires corrections
   */
  teamLeaderRequireCorrection: (taskId, teamLeaderId, feedback, corrections = {}) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, message: 'Task not found' };
      }

      const now = new Date().toISOString();
      const task = tasks[taskIndex];
      
      // Verify this task is awaiting team leader review
      if (task.status !== TASK_STATUS.INITIALLY_APPROVED && task.status !== TASK_STATUS.TEAM_LEADER_REVIEW) {
        return { 
          success: false, 
          message: 'Task is not in a state that requires team leader review' 
        };
      }
      
      // Verify this user is the assigned team leader
      if (task.teamLeaderId && String(task.teamLeaderId) !== String(teamLeaderId)) {
        return { 
          success: false, 
          message: 'Only the assigned team leader can require corrections' 
        };
      }

      // Determine who needs to correct based on correctionType
      // Note: correctionType is in the corrections object
      const correctionType = corrections.correctionType || corrections.correctedBy || 'both';
      
      // Get current stage assignment to determine who to assign corrections to
      let assignedTo = task.assignedTo;
      let assignedToName = task.assignedToName;
      
      if (task.workflowId && task.userDependencyId && task.currentStage) {
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        
        if (correctionType === 'doer' || correctionType === 'both') {
          // Push corrections to doer
          if (currentStageAssignment) {
            assignedTo = currentStageAssignment.userId;
            assignedToName = currentStageAssignment.userName;
          }
        } else if (correctionType === 'checker') {
          // Send corrections back to checker
          if (currentStageAssignment) {
            assignedTo = currentStageAssignment.checkerId;
            assignedToName = currentStageAssignment.checkerName;
          }
        }
      }
      
      // Mark task as requiring correction
      tasks[taskIndex] = {
        ...task,
        status: TASK_STATUS.REVISION_REQUIRED,
        updatedAt: now,
        updatedBy: teamLeaderId,
        assignedTo: assignedTo, // Assign to doer or checker based on correctionType
        assignedToName: assignedToName,
        correctionType: correctionType, // Store who needs to make corrections
        review: {
          ...task.review,
          teamLeaderFeedback: feedback,
          teamLeaderCorrections: corrections,
          teamLeaderReviewedAt: now,
          teamLeaderReviewedBy: teamLeaderId,
          requiresCorrection: true
        },
        logs: [
          ...(task.logs || []),
          {
            action: 'team_leader_correction',
            timestamp: now,
            performedBy: teamLeaderId,
            details: `Team leader requested corrections from: ${correctionType}`,
            feedback: feedback
          }
        ]
      };

      saveTasks();
      
      return { 
        success: true, 
        task: tasks[taskIndex],
        message: 'Corrections requested successfully'
      };
    } catch (error) {
      console.error('Error requesting corrections:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
};

export default TaskService;