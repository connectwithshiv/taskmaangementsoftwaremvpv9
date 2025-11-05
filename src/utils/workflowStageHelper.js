/**
 * WorkflowStageHelper - Centralized logic for multi-stage workflow management
 * Ensures consistency across ALL stages (1, 2, 3, ... N stages)
 */

import UserDependencyService from '../services/userDependencyService';
import { validateCurrentStageTeamLeader } from './workflowStageValidator';

/**
 * Check if a stage has a team leader assigned
 * @param {string} userDependencyId - User dependency ID
 * @param {number} stageOrder - Stage order number
 * @returns {boolean}
 */
export const stageHasTeamLeader = (userDependencyId, stageOrder) => {
  if (!userDependencyId || !stageOrder || !UserDependencyService) {
    return false;
  }
  
  try {
    const stageAssignment = UserDependencyService.getStageAssignment(userDependencyId, stageOrder);
    const teamLeaderId = stageAssignment?.teamLeaderId;
    return !!(teamLeaderId && String(teamLeaderId).trim() !== '');
  } catch (e) {
    console.error('Error checking stage team leader:', e);
    return false;
  }
};

/**
 * Check if current stage is the last stage in the workflow
 * @param {string} userDependencyId - User dependency ID
 * @param {number} currentStage - Current stage order
 * @returns {boolean}
 */
export const isLastStageInWorkflow = (userDependencyId, currentStage) => {
  if (!userDependencyId || !currentStage || !UserDependencyService) {
    return false;
  }
  
  try {
    return UserDependencyService.isLastStage(userDependencyId, currentStage);
  } catch (e) {
    console.error('Error checking last stage:', e);
    return false;
  }
};

/**
 * Check if current stage is an intermediate stage (not first, not last)
 * @param {string} userDependencyId - User dependency ID
 * @param {number} currentStage - Current stage order
 * @returns {boolean}
 */
export const isIntermediateStage = (userDependencyId, currentStage) => {
  if (!userDependencyId || !currentStage || !UserDependencyService) {
    return false;
  }
  
  try {
    const dependency = UserDependencyService.getUserDependencyById(userDependencyId);
    if (!dependency || !dependency.stageAssignments || dependency.stageAssignments.length === 0) {
      return false;
    }
    
    const sortedStages = [...dependency.stageAssignments].sort((a, b) => a.stageOrder - b.stageOrder);
    const firstStage = sortedStages[0]?.stageOrder;
    const lastStage = sortedStages[sortedStages.length - 1]?.stageOrder;
    
    return currentStage > firstStage && currentStage < lastStage;
  } catch (e) {
    console.error('Error checking intermediate stage:', e);
    return false;
  }
};

/**
 * Get team leader ID for a specific stage
 * @param {string} userDependencyId - User dependency ID
 * @param {number} stageOrder - Stage order number
 * @returns {string|null}
 */
export const getStageTeamLeaderId = (userDependencyId, stageOrder) => {
  if (!userDependencyId || !stageOrder || !UserDependencyService) {
    return null;
  }
  
  try {
    const stageAssignment = UserDependencyService.getStageAssignment(userDependencyId, stageOrder);
    const teamLeaderId = stageAssignment?.teamLeaderId;
    return (teamLeaderId && String(teamLeaderId).trim() !== '') ? String(teamLeaderId).trim() : null;
  } catch (e) {
    console.error('Error getting stage team leader ID:', e);
    return null;
  }
};

/**
 * Get team leader name for a specific stage
 * @param {string} userDependencyId - User dependency ID
 * @param {number} stageOrder - Stage order number
 * @returns {string|null}
 */
export const getStageTeamLeaderName = (userDependencyId, stageOrder) => {
  if (!userDependencyId || !stageOrder || !UserDependencyService) {
    return null;
  }
  
  try {
    const stageAssignment = UserDependencyService.getStageAssignment(userDependencyId, stageOrder);
    return stageAssignment?.teamLeaderName || null;
  } catch (e) {
    console.error('Error getting stage team leader name:', e);
    return null;
  }
};

/**
 * Determine the correct status after checker approval for ANY stage
 * This ensures consistency across all stages
 * Uses robust validation to handle edge cases (Case 1: same doer/checker in multiple stages)
 * @param {Object} task - Task object
 * @returns {Object} { status: string, shouldAssignToTL: boolean, teamLeaderId: string|null, teamLeaderName: string|null }
 */
export const getStatusAfterCheckerApproval = (task) => {
  // CRITICAL: Log entry point to verify function is being called
  console.log('🚀 getStatusAfterCheckerApproval - FUNCTION CALLED:', {
    taskId: task?.id,
    taskTitle: task?.title,
    hasTask: !!task,
    hasWorkflowId: !!task?.workflowId,
    hasUserDependencyId: !!task?.userDependencyId,
    hasCurrentStage: !!task?.currentStage,
    currentStage: task?.currentStage,
    userDependencyId: task?.userDependencyId
  });
  
  if (!task || !task.workflowId || !task.userDependencyId || !task.currentStage) {
    console.error('❌ getStatusAfterCheckerApproval - Invalid task:', {
      hasTask: !!task,
      hasWorkflowId: !!task?.workflowId,
      hasUserDependencyId: !!task?.userDependencyId,
      hasCurrentStage: !!task?.currentStage
    });
    return {
      status: 'completed', // Fallback for non-workflow tasks
      shouldAssignToTL: false,
      teamLeaderId: null,
      teamLeaderName: null,
      isWorkflowComplete: true
    };
  }
  
  const currentStage = task.currentStage;
  const userDependencyId = task.userDependencyId;
  
  // CRITICAL FIX FOR CASE 1 & CASE 2: Use robust validator instead of basic check
  // This handles edge cases where same doer/checker appears in multiple stages
  // AND ensures team leader is detected for ALL stages (including intermediate stages)
  const validation = validateCurrentStageTeamLeader(task);
  
  console.log('🔍 getStatusAfterCheckerApproval - Team Leader Validation (ALL STAGES):', {
    taskId: task.id,
    taskTitle: task.title,
    currentStage: currentStage,
    userDependencyId: userDependencyId,
    validation: validation
  });
  
  // If validation found a team leader, use it - THIS IS THE CORRECT PATH
  if (validation.hasTeamLeader && validation.teamLeaderId) {
    console.log('✅ Team Leader FOUND for CURRENT stage - assigning to TL for review', {
      taskId: task.id,
      taskTitle: task.title,
      currentStage: currentStage,
      teamLeaderId: validation.teamLeaderId,
      teamLeaderName: validation.teamLeaderName,
      validationMethod: validation.debug.method
    });
    
    return {
      status: 'team-leader-review', // Use consistent status for all stages
      shouldAssignToTL: true,
      teamLeaderId: validation.teamLeaderId,
      teamLeaderName: validation.teamLeaderName,
      isWorkflowComplete: false // Never complete until TL approves
    };
  }
  
  // FALLBACK: If validator didn't find team leader but task has one, use it
  // This handles cases where team leader ID might not be in stage assignment
  // but exists in the task object (from previous stage - same TL across stages)
  if (!validation.hasTeamLeader && task.teamLeaderId) {
    const taskTLId = String(task.teamLeaderId).trim();
    if (taskTLId && taskTLId !== '' && taskTLId !== 'null' && taskTLId !== 'undefined') {
      console.log('⚠️ FALLBACK: Using task.teamLeaderId as team leader (not found in stage assignment)', {
        taskId: task.id,
        taskTitle: task.title,
        currentStage: currentStage,
        taskTeamLeaderId: taskTLId,
        taskTeamLeaderName: task.teamLeaderName,
        validationDebug: validation.debug,
        warning: 'Team leader should be in stage assignment - this is a fallback!'
      });
      
      return {
        status: 'team-leader-review',
        shouldAssignToTL: true,
        teamLeaderId: taskTLId,
        teamLeaderName: task.teamLeaderName || null,
        isWorkflowComplete: false
      };
    }
  }
  
  // No team leader found - check if this is the last stage
  // CRITICAL: Only mark as completed if it's truly the last stage
  // SAFEGUARD: Check for next stage FIRST before checking if it's last stage
  let hasNextStage = false;
  let nextStageInfo = null;
  
  // COMPREHENSIVE CHECK: Get full dependency structure to verify all stages
  let fullDependency = null;
  let manualNextStageCheck = false;
  try {
    fullDependency = UserDependencyService.getUserDependencyById(userDependencyId);
    
    // CRITICAL SAFEGUARD: If dependency is not found, we CANNOT determine if it's the last stage
    // Therefore, we should NOT mark as completed - return error state instead
    if (!fullDependency) {
      console.error('❌ CRITICAL: Dependency not found - CANNOT determine workflow completion status', {
        taskId: task.id,
        taskTitle: task.title,
        userDependencyId: userDependencyId,
        currentStage: currentStage,
        warning: 'Dependency not found in storage - cannot verify if this is the last stage. Preventing completion to avoid data loss.'
      });
      
      // Return error state - do NOT mark as completed
      return {
        status: 'pending', // Keep as pending until dependency is found
        shouldAssignToTL: false,
        teamLeaderId: null,
        teamLeaderName: null,
        shouldMoveToNextStage: false,
        isWorkflowComplete: false,
        error: 'Dependency not found - cannot determine workflow status'
      };
    }
    
    // MANUAL FALLBACK: If getNextStage fails, manually check if there are more stages
    if (fullDependency && fullDependency.stageAssignments) {
      const currentStageNum = Number(currentStage);
      const allStageOrders = fullDependency.stageAssignments
        .map(s => Number(s.stageOrder))
        .sort((a, b) => a - b);
      const maxStage = Math.max(...allStageOrders);
      const hasMoreStages = currentStageNum < maxStage;
      
      console.log('🔍 COMPREHENSIVE STAGE CHECK - Full Dependency Analysis:', {
        taskId: task.id,
        taskTitle: task.title,
        currentStage: currentStage,
        currentStageType: typeof currentStage,
        currentStageNum: currentStageNum,
        totalStages: fullDependency.stageAssignments.length,
        allStageOrders: allStageOrders,
        maxStage: maxStage,
        hasMoreStages: hasMoreStages,
        nextExpectedStage: currentStageNum + 1,
        nextStageExists: allStageOrders.includes(currentStageNum + 1),
        note: 'This shows ALL stages in the dependency to verify next stage exists'
      });
      
      // Manual check: if there are more stages, we should NEVER mark as completed
      if (hasMoreStages && allStageOrders.includes(currentStageNum + 1)) {
        manualNextStageCheck = true;
        // Try to get the next stage manually
        const manualNextStage = fullDependency.stageAssignments.find(
          s => Number(s.stageOrder) === currentStageNum + 1
        );
        if (manualNextStage) {
          nextStageInfo = manualNextStage;
          hasNextStage = true;
          console.log('✅ MANUAL FALLBACK: Found next stage manually:', {
            taskId: task.id,
            currentStage: currentStage,
            nextStage: manualNextStage.stageOrder,
            nextStageUserId: manualNextStage.userId
          });
        }
      }
    }
    
    // Try the standard getNextStage method
    if (!hasNextStage) {
      nextStageInfo = UserDependencyService.getNextStage(userDependencyId, currentStage);
      hasNextStage = !!nextStageInfo;
    }
    
    console.log('🔍 getStatusAfterCheckerApproval - Next Stage Check (BEFORE last stage check):', {
      taskId: task.id,
      taskTitle: task.title,
      currentStage: currentStage,
      hasNextStage: hasNextStage,
      manualNextStageCheck: manualNextStageCheck,
      nextStage: nextStageInfo ? { 
        stageOrder: nextStageInfo.stageOrder, 
        userId: nextStageInfo.userId,
        teamLeaderId: nextStageInfo.teamLeaderId,
        teamLeaderName: nextStageInfo.teamLeaderName
      } : null,
      fullDependencyInfo: fullDependency ? {
        totalStages: fullDependency.stageAssignments?.length || 0,
        allStageOrders: fullDependency.stageAssignments?.map(s => Number(s.stageOrder)).sort((a, b) => a - b) || []
      } : null,
      note: 'If hasNextStage is true, we should NEVER mark as completed'
    });
  } catch (error) {
    console.error('❌ Error checking next stage:', error);
    console.error('Stack trace:', error.stack);
  }
  
  // CRITICAL SAFEGUARD: If there IS a next stage, NEVER mark as completed
  // This prevents premature completion when there are more stages to process
  if (hasNextStage && nextStageInfo) {
    console.log('⚠️ CRITICAL: Next stage exists but no team leader found for current stage - moving to next stage instead of completing', {
      taskId: task.id,
      taskTitle: task.title,
      currentStage: currentStage,
      nextStage: nextStageInfo.stageOrder,
      validationDebug: validation.debug,
      warning: 'Team leader should be assigned - check dependency configuration!'
    });
    
    return {
      status: 'pending', // Will be set when moving to next stage
      shouldAssignToTL: false,
      teamLeaderId: null,
      teamLeaderName: null,
      shouldMoveToNextStage: true,
      isWorkflowComplete: false
    };
  }
  
  // ADDITIONAL SAFEGUARD: Even if getNextStage returned null, check manually
  // This handles edge cases where getNextStage might fail but stages exist
  if (!hasNextStage && fullDependency && fullDependency.stageAssignments) {
    const currentStageNum = Number(currentStage);
    const allStageOrders = fullDependency.stageAssignments
      .map(s => Number(s.stageOrder))
      .sort((a, b) => a - b);
    const maxStage = Math.max(...allStageOrders);
    const hasMoreStages = currentStageNum < maxStage;
    
    if (hasMoreStages) {
      console.log('⚠️ ADDITIONAL SAFEGUARD: getNextStage returned null but manual check shows more stages exist - preventing completion', {
        taskId: task.id,
        taskTitle: task.title,
        currentStage: currentStage,
        maxStage: maxStage,
        allStageOrders: allStageOrders,
        warning: 'getNextStage may have failed - using manual check to prevent premature completion'
      });
      
      return {
        status: 'pending', // Will be set when moving to next stage
        shouldAssignToTL: false,
        teamLeaderId: null,
        teamLeaderName: null,
        shouldMoveToNextStage: true,
        isWorkflowComplete: false
      };
    }
  }
  
  // Only check if it's last stage if there's NO next stage
  const isLastStage = isLastStageInWorkflow(userDependencyId, currentStage);
  
  console.log('🔍 getStatusAfterCheckerApproval - Last Stage Check:', {
    taskId: task.id,
    taskTitle: task.title,
    currentStage: currentStage,
    isLastStage: isLastStage,
    hasNextStage: hasNextStage,
    fullDependencyInfo: fullDependency ? {
      totalStages: fullDependency.stageAssignments?.length || 0,
      allStageOrders: fullDependency.stageAssignments?.map(s => Number(s.stageOrder)).sort((a, b) => a - b) || []
    } : null,
    note: 'This check only matters if there is NO next stage'
  });
  
  if (isLastStage && !hasNextStage) {
    console.log('⚠️ RETURNING: No team leader found for CURRENT stage (last stage) - marking as completed', {
      taskId: task.id,
      taskTitle: task.title,
      currentStage: currentStage,
      isLastStage: isLastStage,
      hasNextStage: hasNextStage,
      validationDebug: validation.debug,
      returnValue: {
        status: 'completed',
        isWorkflowComplete: true
      }
    });
    return {
      status: 'completed',
      shouldAssignToTL: false,
      teamLeaderId: null,
      teamLeaderName: null,
      isWorkflowComplete: true
    };
  }
  
  // This should never be reached if there's a next stage (handled by safeguard above)
  // But keeping as fallback for safety
  console.log('⚠️ RETURNING: Fallback - No team leader found, moving to next stage', {
    taskId: task.id,
    taskTitle: task.title,
    currentStage: currentStage,
    isLastStage: isLastStage,
    hasNextStage: hasNextStage,
    validationDebug: validation.debug,
    fullDependencyInfo: fullDependency ? {
      totalStages: fullDependency.stageAssignments?.length || 0,
      allStageOrders: fullDependency.stageAssignments?.map(s => Number(s.stageOrder)).sort((a, b) => a - b) || []
    } : null,
    note: 'This should have been handled by safeguard above',
    returnValue: {
      status: 'pending',
      shouldMoveToNextStage: true,
      isWorkflowComplete: false
    }
  });
  
  return {
    status: 'pending', // Will be set when moving to next stage
    shouldAssignToTL: false,
    teamLeaderId: null,
    teamLeaderName: null,
    shouldMoveToNextStage: true,
    isWorkflowComplete: false
  };
};

/**
 * Check if a user worked on a completed stage (stage < currentStage)
 * @param {Object} task - Task object
 * @param {string} userId - User ID to check
 * @param {string} role - Role to check ('doer', 'checker', 'team-leader')
 * @returns {boolean}
 */
export const userWorkedOnCompletedStage = (task, userId, role = 'doer') => {
  if (!task || !task.stageHistory || !task.stageHistory.length || !task.currentStage || !userId) {
    return false;
  }
  
  const userIdString = String(userId);
  
  return task.stageHistory.some(stage => {
    // Only count stages that are completed (less than current stage)
    if (stage.stageOrder >= task.currentStage) {
      return false;
    }
    
    // Check based on role
    if (role === 'doer') {
      const stageDoerId = stage.userId || stage.assignedTo;
      return String(stageDoerId) === userIdString;
    } else if (role === 'checker') {
      const stageCheckerId = stage.checkerId || stage.reviewedBy;
      return String(stageCheckerId) === userIdString;
    } else if (role === 'team-leader') {
      // Team leaders are tracked differently - would need to check logs or review
      // For now, return false - can be enhanced later
      return false;
    }
    
    return false;
  });
};

/**
 * Check if a user is assigned to the current stage
 * @param {Object} task - Task object
 * @param {string} userId - User ID to check
 * @param {string} role - Role to check ('doer', 'checker', 'team-leader')
 * @returns {boolean}
 */
export const isUserAssignedToCurrentStage = (task, userId, role = 'doer') => {
  if (!task || !task.workflowId || !task.userDependencyId || !task.currentStage || !userId || !UserDependencyService) {
    return false;
  }
  
  try {
    const stageAssignment = UserDependencyService.getStageAssignment(task.userDependencyId, task.currentStage);
    if (!stageAssignment) {
      return false;
    }
    
    const userIdString = String(userId);
    
    if (role === 'doer') {
      return String(stageAssignment.userId) === userIdString;
    } else if (role === 'checker') {
      return String(stageAssignment.checkerId) === userIdString;
    } else if (role === 'team-leader') {
      return String(stageAssignment.teamLeaderId) === userIdString;
    }
    
    return false;
  } catch (e) {
    console.error('Error checking current stage assignment:', e);
    return false;
  }
};

/**
 * Get the status message for a user who worked on a completed stage
 * Should always return "Stage Completed" for workflow tasks
 * @param {Object} task - Task object
 * @param {string} role - User role
 * @returns {string|null}
 */
export const getCompletedStageStatus = (task, role) => {
  if (!task || !task.workflowId || !task.userDependencyId) {
    return null; // Not a workflow task
  }
  
  // For workflow tasks, always return "Stage Completed" for completed stages
  return 'Stage Completed';
};
