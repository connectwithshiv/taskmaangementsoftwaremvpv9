/**
 * UserDependencyService - Manages user and checker assignments per workflow stage
 * Storage: localStorage key 'taskManagement_user_dependencies'
 */

const STORAGE_KEY = 'taskManagement_user_dependencies';

// Initialize user dependencies from localStorage
let userDependencies = [];

const loadUserDependencies = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      userDependencies = JSON.parse(data);
    } else {
      userDependencies = [];
    }
  } catch (error) {
    console.error('Error loading user dependencies:', error);
    userDependencies = [];
  }
};

const saveUserDependencies = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userDependencies));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userDependenciesUpdated'));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving user dependencies:', error);
    return { success: false, error: error.message };
  }
};

loadUserDependencies();

export const UserDependencyService = {
  /**
   * Get all user dependencies
   */
  getAllUserDependencies: () => {
    loadUserDependencies();
    return userDependencies;
  },

  /**
   * Get user dependency by ID
   * CRITICAL: Reload data before searching to ensure we have the latest data
   */
  getUserDependencyById: (dependencyId) => {
    loadUserDependencies(); // Reload to ensure we have latest data
    return userDependencies.find(d => d.id === dependencyId);
  },

  /**
   * Get user dependencies by workflow ID
   */
  getUserDependenciesByWorkflow: (workflowId) => {
    return userDependencies.filter(d => d.workflowId === workflowId);
  },

  /**
   * Create a new user dependency chain
   * @param {Object} dependencyData - {
   *   workflowId, workflowName, name, description,
   *   stageAssignments: [{ stageOrder, categoryId, categoryName, userId, userName, checkerId, checkerName, teamLeaderId, teamLeaderName }]
   * }
   */
  createUserDependency: (dependencyData) => {
    try {
      // Validation
      if (!dependencyData.name || !dependencyData.name.trim()) {
        return { success: false, message: 'Dependency name is required' };
      }

      if (!dependencyData.workflowId) {
        return { success: false, message: 'Workflow ID is required' };
      }

      if (!dependencyData.stageAssignments || dependencyData.stageAssignments.length === 0) {
        return { success: false, message: 'At least one stage assignment is required' };
      }

      // Validate all stages have user and checker
      for (const stage of dependencyData.stageAssignments) {
        if (!stage.userId || !stage.checkerId) {
          return {
            success: false,
            message: `Stage ${stage.stageOrder} (${stage.categoryName}) must have both user and checker assigned`
          };
        }
      }

      // Check for duplicate dependency names for same workflow
      const existing = userDependencies.find(
        d => d.workflowId === dependencyData.workflowId &&
        d.name.toLowerCase() === dependencyData.name.toLowerCase().trim()
      );
      if (existing) {
        return {
          success: false,
          message: 'A dependency with this name already exists for this workflow'
        };
      }

      const now = new Date().toISOString();
      const newDependency = {
        id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: dependencyData.workflowId,
        workflowName: dependencyData.workflowName || '',
        name: dependencyData.name.trim(),
        description: dependencyData.description || '',
        stageAssignments: dependencyData.stageAssignments.map(stage => ({
          stageOrder: stage.stageOrder,
          categoryId: stage.categoryId,
          categoryName: stage.categoryName,
          userId: stage.userId,
          userName: stage.userName,
          checkerId: stage.checkerId,
          checkerName: stage.checkerName,
          teamLeaderId: stage.teamLeaderId || null,
          teamLeaderName: stage.teamLeaderName || null
        })),
        createdAt: now,
        updatedAt: now,
        createdBy: dependencyData.createdBy || 'system',
        isActive: true,
        taskCount: 0 // Track usage
      };

      userDependencies.push(newDependency);
      const saveResult = saveUserDependencies();

      if (!saveResult.success) {
        userDependencies.pop(); // Rollback
        return { success: false, message: saveResult.error };
      }

      console.log('✅ User dependency created:', newDependency.id);
      return {
        success: true,
        dependency: newDependency,
        message: 'User dependency created successfully'
      };
    } catch (error) {
      console.error('Error creating user dependency:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Update an existing user dependency
   */
  updateUserDependency: (dependencyId, dependencyData) => {
    try {
      const index = userDependencies.findIndex(d => d.id === dependencyId);
      if (index === -1) {
        return { success: false, message: 'User dependency not found' };
      }

      const dependency = userDependencies[index];

      // Check if dependency is in use
      if (dependency.taskCount > 0) {
        return {
          success: false,
          message: `Cannot update dependency. It is currently used by ${dependency.taskCount} task(s)`
        };
      }

      // Validate stage assignments if provided
      if (dependencyData.stageAssignments) {
        for (const stage of dependencyData.stageAssignments) {
          if (!stage.userId || !stage.checkerId) {
            return {
              success: false,
              message: `Stage ${stage.stageOrder} must have both user and checker assigned`
            };
          }
        }
      }

      // Update dependency
      const updatedDependency = {
        ...dependency,
        ...dependencyData,
        id: dependencyId, // Prevent ID change
        updatedAt: new Date().toISOString()
      };

      userDependencies[index] = updatedDependency;
      const saveResult = saveUserDependencies();

      if (!saveResult.success) {
        userDependencies[index] = dependency; // Rollback
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        dependency: updatedDependency,
        message: 'User dependency updated successfully'
      };
    } catch (error) {
      console.error('Error updating user dependency:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Delete a user dependency
   */
  deleteUserDependency: (dependencyId) => {
    try {
      const index = userDependencies.findIndex(d => d.id === dependencyId);
      if (index === -1) {
        return { success: false, message: 'User dependency not found' };
      }

      const dependency = userDependencies[index];

      // Check if dependency is in use
      if (dependency.taskCount > 0) {
        return {
          success: false,
          message: `Cannot delete dependency. It is currently used by ${dependency.taskCount} task(s)`
        };
      }

      userDependencies.splice(index, 1);
      const saveResult = saveUserDependencies();

      if (!saveResult.success) {
        userDependencies.splice(index, 0, dependency); // Rollback
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        message: 'User dependency deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting user dependency:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get stage assignment for a specific stage
   * CRITICAL: Reload data before searching to ensure we have the latest data
   */
  getStageAssignment: (dependencyId, stageOrder) => {
    loadUserDependencies(); // Reload to ensure we have latest data
    const dependency = userDependencies.find(d => d.id === dependencyId);
    if (!dependency) return null;

    return dependency.stageAssignments.find(s => s.stageOrder === stageOrder);
  },

  /**
   * Get next stage assignment in the chain
   * CRITICAL: Reload data before searching to ensure we have the latest data
   */
  getNextStage: (dependencyId, currentStageOrder) => {
    loadUserDependencies(); // Reload to ensure we have latest data
    const dependency = userDependencies.find(d => d.id === dependencyId);
    if (!dependency) {
      console.warn('⚠️ getNextStage - Dependency not found:', dependencyId);
      return null;
    }

    // CRITICAL: Ensure proper type conversion for stage order comparison
    const currentStageNum = Number(currentStageOrder);
    const nextStageOrder = currentStageNum + 1;
    
    console.log('🔍 getNextStage - Searching for next stage:', {
      dependencyId: dependencyId,
      currentStageOrder: currentStageOrder,
      currentStageOrderType: typeof currentStageOrder,
      currentStageNum: currentStageNum,
      nextStageOrder: nextStageOrder,
      totalStages: dependency.stageAssignments?.length || 0,
      allStageOrders: dependency.stageAssignments?.map(s => ({
        stageOrder: s.stageOrder,
        stageOrderType: typeof s.stageOrder,
        stageOrderNum: Number(s.stageOrder)
      })) || []
    });

    const nextStage = dependency.stageAssignments.find(
      s => Number(s.stageOrder) === nextStageOrder
    );
    
    if (!nextStage) {
      console.warn('⚠️ getNextStage - Next stage not found:', {
        dependencyId: dependencyId,
        currentStageOrder: currentStageOrder,
        nextStageOrder: nextStageOrder,
        availableStages: dependency.stageAssignments?.map(s => Number(s.stageOrder)) || []
      });
    } else {
      console.log('✅ getNextStage - Found next stage:', {
        dependencyId: dependencyId,
        currentStageOrder: currentStageOrder,
        nextStageOrder: nextStageOrder,
        nextStage: nextStage
      });
    }
    
    return nextStage || null;
  },

  /**
   * Check if current stage is the last stage
   * CRITICAL: Reload data before searching to ensure we have the latest data
   */
  isLastStage: (dependencyId, currentStageOrder) => {
    loadUserDependencies(); // Reload to ensure we have latest data
    const dependency = userDependencies.find(d => d.id === dependencyId);
    if (!dependency) return true;

    const maxOrder = Math.max(...dependency.stageAssignments.map(s => s.stageOrder));
    return currentStageOrder >= maxOrder;
  },

  /**
   * Increment task count for a dependency
   */
  incrementTaskCount: (dependencyId) => {
    const dependency = userDependencies.find(d => d.id === dependencyId);
    if (dependency) {
      dependency.taskCount = (dependency.taskCount || 0) + 1;
      saveUserDependencies();
    }
  },

  /**
   * Decrement task count for a dependency
   */
  decrementTaskCount: (dependencyId) => {
    const dependency = userDependencies.find(d => d.id === dependencyId);
    if (dependency && dependency.taskCount > 0) {
      dependency.taskCount = dependency.taskCount - 1;
      saveUserDependencies();
    }
  }
};

export default UserDependencyService;

