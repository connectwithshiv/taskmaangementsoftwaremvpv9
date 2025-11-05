/**
 * WorkflowStageValidator - Diagnostic and validation utility for multi-stage workflows
 * Specifically handles edge cases where same users appear in multiple stages
 * and ensures team leader detection works correctly
 */

import UserDependencyService from '../services/userDependencyService';

/**
 * Comprehensive check: Does current stage have a team leader?
 * This is more robust than the basic check - handles all edge cases
 * @param {Object} task - Task object
 * @returns {Object} { hasTeamLeader: boolean, teamLeaderId: string|null, teamLeaderName: string|null, debug: Object }
 */
export const validateCurrentStageTeamLeader = (task) => {
  const debug = {
    taskId: task?.id,
    title: task?.title,
    currentStage: task?.currentStage,
    userDependencyId: task?.userDependencyId,
    workflowId: task?.workflowId
  };

  if (!task || !task.workflowId || !task.userDependencyId || !task.currentStage) {
    debug.error = 'Missing required task properties';
    console.error('❌ validateCurrentStageTeamLeader - Missing properties:', debug);
    return { hasTeamLeader: false, teamLeaderId: null, teamLeaderName: null, debug };
  }

  try {
    // METHOD 1: Get from current stage assignment (MOST RELIABLE)
    const currentStageAssignment = UserDependencyService.getStageAssignment(
      task.userDependencyId,
      task.currentStage
    );

    // COMPREHENSIVE DEBUG: Get entire dependency structure
    try {
      const fullDependency = UserDependencyService.getUserDependencyById(task.userDependencyId);
      debug.fullDependency = fullDependency ? {
        id: fullDependency.id,
        name: fullDependency.name,
        totalStages: fullDependency.stageAssignments?.length || 0,
        allStageAssignments: fullDependency.stageAssignments?.map(s => ({
          stageOrder: s.stageOrder,
          userId: s.userId,
          checkerId: s.checkerId,
          teamLeaderId: s.teamLeaderId,
          teamLeaderName: s.teamLeaderName,
          hasTeamLeader: !!(s.teamLeaderId && String(s.teamLeaderId).trim() !== ''),
          teamLeaderIdType: typeof s.teamLeaderId,
          teamLeaderIdString: String(s.teamLeaderId || '')
        })) || []
      } : null;
      
      console.log('🔍 COMPREHENSIVE DEBUG - Full Dependency Structure:', {
        taskTitle: task.title,
        currentStage: task.currentStage,
        dependency: debug.fullDependency,
        note: 'This shows ALL stages and their team leader assignments'
      });
      
      // CRITICAL: Check if dependency was found
      if (!fullDependency) {
        console.error('❌ CRITICAL ERROR - Dependency not found:', {
          taskTitle: task.title,
          userDependencyId: task.userDependencyId,
          currentStage: task.currentStage
        });
        debug.error = 'Dependency not found';
      }
    } catch (e) {
      console.error('❌ Error getting full dependency:', e);
      debug.error = `Error getting dependency: ${e.message}`;
    }

    debug.currentStageAssignment = currentStageAssignment ? {
      stageOrder: currentStageAssignment.stageOrder,
      userId: currentStageAssignment.userId,
      checkerId: currentStageAssignment.checkerId,
      teamLeaderId: currentStageAssignment.teamLeaderId,
      teamLeaderName: currentStageAssignment.teamLeaderName,
      teamLeaderIdType: typeof currentStageAssignment.teamLeaderId,
      teamLeaderIdString: String(currentStageAssignment.teamLeaderId)
    } : null;

    console.log('🔍 validateCurrentStageTeamLeader - Current Stage Assignment:', {
      taskTitle: task.title,
      currentStage: task.currentStage,
      hasAssignment: !!currentStageAssignment,
      assignment: debug.currentStageAssignment,
      taskTeamLeaderId: task.teamLeaderId,
      taskTeamLeaderName: task.teamLeaderName
    });

    if (currentStageAssignment && currentStageAssignment.teamLeaderId) {
      const teamLeaderId = String(currentStageAssignment.teamLeaderId).trim();
      const teamLeaderName = currentStageAssignment.teamLeaderName || null;

      // Enhanced validation - check for all possible "empty" values
      const isEmpty = !teamLeaderId || 
        teamLeaderId === '' || 
        teamLeaderId === 'null' || 
        teamLeaderId === 'undefined' ||
        teamLeaderId === 'None' ||
        teamLeaderId === 'none' ||
        teamLeaderId === 'NULL' ||
        teamLeaderId === 'UNDEFINED';

      if (!isEmpty) {
        debug.method = 'currentStageAssignment';
        debug.teamLeaderId = teamLeaderId;
        debug.teamLeaderName = teamLeaderName;
        console.log('✅ validateCurrentStageTeamLeader - Team Leader FOUND:', {
          taskTitle: task.title,
          currentStage: task.currentStage,
          teamLeaderId: teamLeaderId,
          teamLeaderName: teamLeaderName,
          method: 'currentStageAssignment'
        });
        return {
          hasTeamLeader: true,
          teamLeaderId: teamLeaderId,
          teamLeaderName: teamLeaderName,
          debug
        };
      } else {
        debug.warning = 'Team leader ID is empty/invalid';
        debug.teamLeaderIdRaw = currentStageAssignment.teamLeaderId;
        console.warn('⚠️ validateCurrentStageTeamLeader - Empty team leader ID:', {
          taskTitle: task.title,
          currentStage: task.currentStage,
          teamLeaderIdRaw: currentStageAssignment.teamLeaderId,
          teamLeaderIdString: teamLeaderId
        });
      }
    } else {
      debug.warning = 'No team leader in current stage assignment';
      console.warn('⚠️ validateCurrentStageTeamLeader - No team leader in assignment:', {
        taskTitle: task.title,
        currentStage: task.currentStage,
        hasAssignment: !!currentStageAssignment,
        teamLeaderId: currentStageAssignment?.teamLeaderId
      });
    }

    // METHOD 2: Fallback - check task.teamLeaderId (less reliable, might be from previous stage)
    if (task.teamLeaderId) {
      const taskTLId = String(task.teamLeaderId).trim();
      if (taskTLId && taskTLId !== '' && taskTLId !== 'null' && taskTLId !== 'undefined') {
        // Verify this TL is actually assigned to current stage
        const verifyAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        
        if (verifyAssignment && verifyAssignment.teamLeaderId) {
          const verifyTLId = String(verifyAssignment.teamLeaderId).trim();
          if (verifyTLId === taskTLId) {
            debug.method = 'taskTeamLeaderId (verified)';
            debug.teamLeaderId = taskTLId;
            debug.teamLeaderName = task.teamLeaderName || null;
            console.log('✅ validateCurrentStageTeamLeader - Team Leader FOUND (fallback):', {
              taskTitle: task.title,
              currentStage: task.currentStage,
              teamLeaderId: taskTLId,
              method: 'taskTeamLeaderId (verified)'
            });
            return {
              hasTeamLeader: true,
              teamLeaderId: taskTLId,
              teamLeaderName: task.teamLeaderName || null,
              debug
            };
          } else {
            debug.warning = 'task.teamLeaderId does not match current stage TL';
            debug.taskTeamLeaderId = taskTLId;
            debug.currentStageTLId = verifyTLId;
            console.warn('⚠️ validateCurrentStageTeamLeader - TL ID mismatch:', {
              taskTitle: task.title,
              currentStage: task.currentStage,
              taskTeamLeaderId: taskTLId,
              currentStageTLId: verifyTLId
            });
          }
        } else {
          debug.warning = 'task.teamLeaderId exists but current stage has no TL';
          console.warn('⚠️ validateCurrentStageTeamLeader - task.teamLeaderId exists but no TL in current stage:', {
            taskTitle: task.title,
            currentStage: task.currentStage,
            taskTeamLeaderId: taskTLId
          });
        }
      }
    }

    // FINAL FALLBACK: Check if there's ANY team leader ID in the task object that matches the current stage assignment
    if (task.teamLeaderId) {
      const taskTLId = String(task.teamLeaderId).trim();
      if (taskTLId && taskTLId !== '' && taskTLId !== 'null' && taskTLId !== 'undefined') {
        if (currentStageAssignment && String(currentStageAssignment.teamLeaderId).trim() === taskTLId) {
          debug.method = 'taskTeamLeaderId (final fallback)';
          debug.teamLeaderId = taskTLId;
          debug.teamLeaderName = task.teamLeaderName || null;
          console.log('✅ validateCurrentStageTeamLeader - Team Leader FOUND (final fallback):', {
            taskTitle: task.title,
            currentStage: task.currentStage,
            teamLeaderId: taskTLId,
            method: 'taskTeamLeaderId (final fallback)'
          });
          return {
            hasTeamLeader: true,
            teamLeaderId: taskTLId,
            teamLeaderName: task.teamLeaderName || null,
            debug
          };
        }
      }
    }

    // FINAL FALLBACK: Check if task has a team leader ID that might be valid
    // This handles cases where the same team leader is used across multiple stages
    // but the ID might not be properly stored in the stage assignment
    if (task.teamLeaderId) {
      const taskTLId = String(task.teamLeaderId).trim();
      if (taskTLId && taskTLId !== '' && taskTLId !== 'null' && taskTLId !== 'undefined') {
        // Check if this team leader ID exists in ANY stage of the dependency
        // If it does, it's likely the same team leader for all stages
        try {
          const fullDependency = UserDependencyService.getUserDependencyById(task.userDependencyId);
          if (fullDependency && fullDependency.stageAssignments) {
            const tlExistsInOtherStages = fullDependency.stageAssignments.some(stage => {
              const stageTLId = String(stage.teamLeaderId || '').trim();
              return stageTLId === taskTLId && stageTLId !== '';
            });
            
            if (tlExistsInOtherStages) {
              console.log('⚠️ FALLBACK: Team leader ID found in task and exists in other stages - using it', {
                taskTitle: task.title,
                currentStage: task.currentStage,
                taskTeamLeaderId: taskTLId,
                taskTeamLeaderName: task.teamLeaderName,
                note: 'This is a fallback - team leader should be in stage assignment!'
              });
              
              debug.method = 'fallback_taskTeamLeaderId';
              debug.teamLeaderId = taskTLId;
              debug.teamLeaderName = task.teamLeaderName || null;
              debug.fallbackUsed = true;
              
              return {
                hasTeamLeader: true,
                teamLeaderId: taskTLId,
                teamLeaderName: task.teamLeaderName || null,
                debug
              };
            }
          }
        } catch (e) {
          console.error('❌ Error in fallback check:', e);
        }
      }
    }

    debug.result = 'No team leader found';
    console.error('❌ validateCurrentStageTeamLeader - NO TEAM LEADER FOUND:', debug);
    return { hasTeamLeader: false, teamLeaderId: null, teamLeaderName: null, debug };
  } catch (error) {
    debug.error = error.message;
    debug.stack = error.stack;
    console.error('❌ validateCurrentStageTeamLeader - ERROR:', error, debug);
    return { hasTeamLeader: false, teamLeaderId: null, teamLeaderName: null, debug };
  }
};

/**
 * Validate if next stage doer should see task after team leader approval
 * @param {Object} task - Task object
 * @param {string} userId - User ID to check
 * @returns {Object} { shouldSee: boolean, reason: string, debug: Object }
 */
export const validateNextStageDoerVisibility = (task, userId) => {
  const debug = {
    taskId: task?.id,
    title: task?.title,
    userId: userId,
    status: task?.status,
    currentStage: task?.currentStage,
    assignedTo: task?.assignedTo,
    userDependencyId: task?.userDependencyId
  };

  if (!task || !task.workflowId || !task.userDependencyId || !task.currentStage) {
    return { shouldSee: false, reason: 'Not a workflow task', debug };
  }

  const userIdString = String(userId);

  // Check 1: Is user currently assigned?
  if (task.assignedTo && String(task.assignedTo) === userIdString) {
    // Check 2: Is status pending (which happens after TL approval)?
    if (task.status === 'pending') {
      // Check 3: Verify user is actually the doer for current stage
      try {
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );

        if (currentStageAssignment && String(currentStageAssignment.userId) === userIdString) {
          debug.reason = 'User is assignedTo with pending status and matches current stage doer';
          debug.currentStageDoerId = currentStageAssignment.userId;
          return { shouldSee: true, reason: 'Next stage doer after TL approval', debug };
        } else {
          debug.warning = 'User is assignedTo but does not match current stage doer';
          debug.currentStageDoerId = currentStageAssignment?.userId || null;
        }
      } catch (error) {
        debug.error = error.message;
      }
    } else {
      debug.reason = 'User is assignedTo but status is not pending';
      debug.actualStatus = task.status;
    }
  } else {
    debug.reason = 'User is not assignedTo';
    debug.assignedTo = task.assignedTo;
  }

  return { shouldSee: false, reason: 'Conditions not met', debug };
};

/**
 * Diagnostic: Check if team leader should see task
 * Comprehensive check that handles all edge cases
 * @param {Object} task - Task object
 * @param {string} teamLeaderId - Team leader ID to check
 * @returns {Object} { shouldSee: boolean, reason: string, debug: Object }
 */
export const validateTeamLeaderVisibility = (task, teamLeaderId) => {
  const debug = {
    taskId: task?.id,
    title: task?.title,
    teamLeaderId: teamLeaderId,
    taskStatus: task?.status,
    currentStage: task?.currentStage,
    taskTeamLeaderId: task?.teamLeaderId,
    assignedTo: task?.assignedTo,
    userDependencyId: task?.userDependencyId
  };

  if (!task || !task.workflowId || !task.userDependencyId || !task.currentStage) {
    return { shouldSee: false, reason: 'Not a workflow task', debug };
  }

  const tlIdString = String(teamLeaderId);

  // METHOD 1: Check if TL is assigned to CURRENT stage (MOST IMPORTANT)
  try {
    const currentStageAssignment = UserDependencyService.getStageAssignment(
      task.userDependencyId,
      task.currentStage
    );

    debug.currentStageAssignment = currentStageAssignment ? {
      stageOrder: currentStageAssignment.stageOrder,
      teamLeaderId: currentStageAssignment.teamLeaderId,
      teamLeaderName: currentStageAssignment.teamLeaderName
    } : null;

    if (currentStageAssignment && currentStageAssignment.teamLeaderId) {
      const currentStageTLId = String(currentStageAssignment.teamLeaderId);
      if (currentStageTLId === tlIdString) {
        // TL is assigned to current stage - check if status is actionable
        const actionableStatuses = ['team-leader-review', 'initially-approved'];
        if (actionableStatuses.includes(task.status)) {
          debug.reason = 'TL assigned to current stage with actionable status';
          debug.method = 'currentStageAssignment';
          return { shouldSee: true, reason: 'TL assigned to current stage', debug };
        } else {
          debug.reason = 'TL assigned to current stage but status not actionable';
          debug.actualStatus = task.status;
          return { shouldSee: false, reason: 'Status not actionable', debug };
        }
      } else {
        debug.reason = 'TL ID does not match current stage TL';
        debug.currentStageTLId = currentStageTLId;
      }
    } else {
      debug.reason = 'No TL in current stage assignment';
    }
  } catch (error) {
    debug.error = error.message;
  }

  // METHOD 2: Fallback - check if task is assigned to this TL
  if (task.teamLeaderId && String(task.teamLeaderId) === tlIdString) {
    debug.reason = 'Task assigned to TL (fallback method)';
    debug.method = 'taskTeamLeaderId';
    return { shouldSee: true, reason: 'Task assigned to TL', debug };
  }

  if (task.assignedTo && String(task.assignedTo) === tlIdString) {
    debug.reason = 'Task assignedTo matches TL ID';
    debug.method = 'assignedTo';
    return { shouldSee: true, reason: 'Task assigned to TL', debug };
  }

  debug.result = 'TL should not see this task';
  return { shouldSee: false, reason: 'TL not assigned to current stage', debug };
};
