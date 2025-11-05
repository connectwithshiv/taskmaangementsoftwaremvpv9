/**
 * Workflow Status Helper
 * Determines the appropriate status text for each role based on task state
 * Follows the workflow status table exactly
 */

// Import UserDependencyService to check original stage assignments
let UserDependencyService = null;
if (typeof window !== 'undefined' && window.UserDependencyService) {
  UserDependencyService = window.UserDependencyService;
} else {
  try {
    UserDependencyService = require('../services/userDependencyService').default;
  } catch (e) {
    // Service not available
  }
}

export const getWorkflowStatusForRole = (task, role, userId) => {
  const userIds = [userId, task.assignedTo, task.checkerId, task.teamLeaderId].filter(Boolean);
  const userIdString = String(userId);
  
  const status = task.status;
  const isWorkflow = !!(task.workflowId && task.userDependencyId);
  
  // Debug logging for doer2 specifically
  const isDoer2Debug = userIdString.includes('doer2') || task.title?.includes('doer2') || false;
  
  if (isDoer2Debug && role === 'doer') {
    console.log('🔍 getWorkflowStatusForRole called for doer2:', {
      taskTitle: task.title,
      taskStatus: status,
      currentStage: task.currentStage,
      userId: userIdString,
      assignedTo: task.assignedTo,
      checkerId: task.checkerId,
      teamLeaderId: task.teamLeaderId,
      isWorkflow: isWorkflow,
      userIds: userIds,
      stageHistory: task.stageHistory
    });
  }
  
  // Only apply workflow status for workflow tasks
  if (!isWorkflow) {
    if (isDoer2Debug) {
      console.log('⚠️ Not a workflow task, returning null');
    }
    return null; // Use default status badge
  }
  
  // ===== ABSOLUTE PRIORITY CHECK: CURRENT STAGE DOER WITH TL =====
  // This MUST be checked FIRST, before ANY other logic
  // When checker approves and task goes to TL, CURRENT stage doer should ALWAYS see "Under TL Review"
  // This applies to ALL stages (stage 1, stage 2, stage 3, etc.)
  // IMPORTANT: Stages are ISOLATED - next stage doer should NOT see the task until TL approves
  if (role === 'doer' && task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    try {
      // Check if task is with team leader - handle ALL possible status formats
      const statusStr = String(status || '').toLowerCase().trim();
      const normalizedStatus = statusStr.replace(/_/g, '-');
      
      // Check for ALL possible TL review statuses - be exhaustive
      const isTaskWithTeamLeader = 
        normalizedStatus === 'team-leader-review' || 
        normalizedStatus === 'team_leader_review' ||
        normalizedStatus === 'initially-approved' || 
        normalizedStatus === 'initially_approved' ||
        statusStr.includes('team-leader') ||
        statusStr.includes('team_leader') ||
        statusStr.includes('tl-review') ||
        statusStr.includes('tl_review');
      
      // Check if task is assigned to TL - check all possible ways
      const isTaskAssignedToTL = task.teamLeaderId && (
        String(task.assignedTo) === String(task.teamLeaderId) ||
        String(task.assignedToName) === String(task.teamLeaderName) ||
        userIds.some(id => String(id) === String(task.teamLeaderId))
      );
      
      // If task is with TL (either by status or assignment), check if user is CURRENT stage doer
      if (isTaskWithTeamLeader || isTaskAssignedToTL) {
        // Check if user is the doer for CURRENT stage (not next stage)
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        
        if (currentStageAssignment && currentStageAssignment.userId) {
          const currentStageDoerId = String(currentStageAssignment.userId);
          
          // Check all possible user ID formats - this is critical for matching
          // Try direct match first
          let userMatches = userIdString === currentStageDoerId;
          
          // Also check all userIds array (which includes userId, task.assignedTo, task.checkerId, task.teamLeaderId)
          if (!userMatches) {
            userMatches = userIds.some(id => {
              const idStr = String(id || '');
              return idStr === currentStageDoerId || idStr === userIdString || 
                     String(id) === currentStageDoerId || String(id) === userIdString;
            });
          }
          
          // Also check if assignedTo matches (for cases where task might be pre-assigned)
          if (!userMatches && task.assignedTo) {
            userMatches = String(task.assignedTo) === currentStageDoerId || 
                         String(task.assignedTo) === userIdString;
          }
          
          // Also check stage history for current stage
          if (!userMatches && task.stageHistory && task.stageHistory.length > 0) {
            userMatches = task.stageHistory.some(stage => {
              const stageDoerId = stage.userId || stage.assignedTo;
              return String(stageDoerId) === userIdString && stage.stageOrder === task.currentStage;
            });
          }
          
          if (userMatches) {
            console.log('🎯 ABSOLUTE PRIORITY: Current Stage Doer detected - Returning "Under TL Review"', {
              taskTitle: task.title,
              userId: userIdString,
              currentStageDoerId: currentStageDoerId,
              status: status,
              statusStr: statusStr,
              normalizedStatus: normalizedStatus,
              isTaskWithTeamLeader,
              isTaskAssignedToTL,
              assignedTo: task.assignedTo,
              teamLeaderId: task.teamLeaderId,
              currentStage: task.currentStage,
              userIds: userIds
            });
            // CRITICAL: Return immediately - this overrides ANY other status logic
            // When checker submits, CURRENT stage doer MUST see "Under TL Review"
            return 'Under TL Review';
          }
        }
      }
    } catch (e) {
      console.error('❌ Error in absolute priority check:', e);
      console.error('Task details:', { 
        taskTitle: task.title, 
        currentStage: task.currentStage, 
        status: task.status,
        userId: userIdString,
        role: role
      });
    }
  }
  
  // Check if user is assigned to this task
  const isAssigned = userIds.some(id => String(id) === userIdString) && String(task.assignedTo) === userIdString;
  
  // Debug logging for next stage doer issues
  if (role === 'doer' && task.workflowId && task.userDependencyId) {
    const nextStageAssignment = UserDependencyService?.getNextStage?.(
      task.userDependencyId,
      task.currentStage
    );
    const mightBeNextStageDoer = nextStageAssignment && String(nextStageAssignment.userId) === userIdString;
    if (mightBeNextStageDoer) {
      console.log('🔍 Next Stage Doer Status Check:', {
        taskTitle: task.title,
        userId: userIdString,
        taskStatus: task.status,
        isAssigned,
        currentStage: task.currentStage,
        assignedTo: task.assignedTo,
        teamLeaderId: task.teamLeaderId,
        nextStageDoerId: nextStageAssignment.userId
      });
    }
  }
  
  // Check if user worked on a previous stage (for doer)
  const workedOnPreviousStage = task.stageHistory?.some(stage => 
    String(stage.userId) === userIdString || String(stage.assignedTo) === userIdString
  );
  
  // Check if user is the checker
  const isChecker = String(task.checkerId) === userIdString;
  
  // Check if user is the team leader
  const isTeamLeader = String(task.teamLeaderId) === userIdString;
  
  // Check if user is the original doer for current stage (even if task is now assigned to team leader)
  let isOriginalDoerForCurrentStage = false;
  let isNextStageDoer = false;
  if (task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    try {
      const currentStageAssignment = UserDependencyService.getStageAssignment(
        task.userDependencyId,
        task.currentStage
      );
      if (currentStageAssignment && String(currentStageAssignment.userId) === userIdString) {
        isOriginalDoerForCurrentStage = true;
      }
      
      // Check if user is the doer for NEXT stage (stage after current stage)
      const nextStageAssignment = UserDependencyService.getNextStage(
        task.userDependencyId,
        task.currentStage
      );
      if (nextStageAssignment) {
        const nextStageDoerId = String(nextStageAssignment.userId);
        // Check all possible user ID formats
        if (userIdString === nextStageDoerId || userIds.some(id => String(id) === nextStageDoerId)) {
          isNextStageDoer = true;
        }
      }
      
      // Also check if user is assigned as next stage doer (in case task was pre-assigned)
      // This handles cases where task might be assigned to next stage doer but still with TL
      if (!isNextStageDoer && isAssigned && nextStageAssignment) {
        // Double-check: if user is assigned and matches next stage doer, they are next stage doer
        const nextStageDoerId = String(nextStageAssignment.userId);
        if (userIdString === nextStageDoerId || userIds.some(id => String(id) === nextStageDoerId)) {
          isNextStageDoer = true;
        }
      }
    } catch (e) {
      // Error getting stage assignment
    }
  }
  
  // ===== CRITICAL: CURRENT STAGE DOER WITH TL CHECK - MUST RUN IMMEDIATELY =====
  // This MUST run RIGHT AFTER isNextStageDoer is determined, BEFORE any other logic
  // When checker approves (first time or after corrections), task goes to TL
  // CURRENT stage doer should ALWAYS see "Under TL Review" until TL approves
  // This applies to ALL stages (stage 1, stage 2, stage 3, etc.)
  // IMPORTANT: NEXT stage doer should NOT see the task until TL approves and task moves to next stage
  // Each stage is ISOLATED - doers from next stage should not see current stage details
  if (role === 'doer' && task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    // Handle ALL possible status formats - be comprehensive
    const statusStr = String(status || '').toLowerCase().trim();
    const normalizedStatus = statusStr.replace(/_/g, '-');
    
    // Check for ALL possible TL review statuses - be exhaustive
    const isTaskWithTeamLeader = 
      normalizedStatus === 'team-leader-review' || 
      normalizedStatus === 'team_leader_review' ||
      normalizedStatus === 'initially-approved' || 
      normalizedStatus === 'initially_approved' ||
      statusStr.includes('team-leader') ||
      statusStr.includes('team_leader') ||
      statusStr.includes('tl-review') ||
      statusStr.includes('tl_review');
    
    // Check if task is assigned to TL - check all possible ways
    const isTaskAssignedToTL = task.teamLeaderId && (
      String(task.assignedTo) === String(task.teamLeaderId) ||
      String(task.assignedToName) === String(task.teamLeaderName) ||
      userIds.some(id => String(id) === String(task.teamLeaderId))
    );
    
    // CRITICAL: If task is with TL, check if user is CURRENT stage doer (not next stage doer)
    // CURRENT stage doer should see "Under TL Review" when checker submits
    // NEXT stage doer should NOT see the task until TL approves - stages are ISOLATED
    if (isTaskWithTeamLeader || isTaskAssignedToTL) {
      try {
        // METHOD 1: Check if user is the doer for CURRENT stage from UserDependencyService
        const currentStageAssignment = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        
        let isCurrentStageDoer = false;
        if (currentStageAssignment && currentStageAssignment.userId) {
          const currentStageDoerId = String(currentStageAssignment.userId);
          
          // Try multiple ways to match user ID - CRITICAL for stage 2, 3, etc.
          isCurrentStageDoer = 
            userIdString === currentStageDoerId ||
            userIds.some(id => {
              const idStr = String(id || '');
              return idStr === currentStageDoerId || 
                     idStr === userIdString ||
                     String(id) === currentStageDoerId ||
                     String(id) === userIdString;
            });
        }
        
        // METHOD 2: Check stage history for current stage doer
        let workedOnCurrentStage = false;
        if (!isCurrentStageDoer && task.stageHistory && task.stageHistory.length > 0) {
          workedOnCurrentStage = task.stageHistory.some(stage => {
            if (stage.stageOrder !== task.currentStage) return false;
            
            const stageDoerId = stage.userId || stage.assignedTo;
            const stageDoerIdStr = String(stageDoerId || '');
            
            return stageDoerIdStr === userIdString ||
                   userIds.some(id => {
                     const idStr = String(id || '');
                     return idStr === stageDoerIdStr || idStr === userIdString;
                   });
          });
        }
        
        // METHOD 3: Check if user is currently assigned to this stage (for edge cases)
        let isAssignedToCurrentStage = false;
        if (!isCurrentStageDoer && !workedOnCurrentStage && task.assignedTo) {
          // If assignedTo matches current stage doer ID, and we're checking current stage
          if (currentStageAssignment && currentStageAssignment.userId) {
            const currentStageDoerId = String(currentStageAssignment.userId);
            isAssignedToCurrentStage = 
              String(task.assignedTo) === currentStageDoerId &&
              (userIdString === String(task.assignedTo) || userIds.includes(task.assignedTo));
          }
        }
        
        // If user is CURRENT stage doer (by any method), show "Under TL Review"
        // This MUST work for ALL stages (stage 1, stage 2, stage 3, etc.)
        if (isCurrentStageDoer || workedOnCurrentStage || isAssignedToCurrentStage) {
          console.log('🛡️ CURRENT STAGE DOER with TL - Returning "Under TL Review"', {
            taskTitle: task.title,
            userId: userIdString,
            status: status,
            statusStr: statusStr,
            normalizedStatus: normalizedStatus,
            isTaskWithTeamLeader,
            isTaskAssignedToTL,
            isAssigned: isAssigned,
            assignedTo: task.assignedTo,
            teamLeaderId: task.teamLeaderId,
            currentStage: task.currentStage,
            isCurrentStageDoer,
            workedOnCurrentStage,
            isAssignedToCurrentStage,
            currentStageAssignment: currentStageAssignment
          });
          // CURRENT stage doer sees "Under TL Review" when task is with TL
          // This works for ALL stages (stage 1, stage 2, stage 3, etc.)
          return 'Under TL Review';
        }
        
        // IMPORTANT: If user is NEXT stage doer and task is with TL, they should NOT see the task
        // Stages are ISOLATED - next stage doer should not see current stage details
        const nextStageAssignment = UserDependencyService.getNextStage(
          task.userDependencyId,
          task.currentStage
        );
        
        if (nextStageAssignment && nextStageAssignment.userId) {
          const nextStageDoerId = String(nextStageAssignment.userId);
          const isNextStageDoer = 
            userIdString === nextStageDoerId ||
            userIds.some(id => {
              const idStr = String(id || '');
              return idStr === nextStageDoerId || idStr === userIdString;
            });
          
          if (isNextStageDoer) {
            // Next stage doer - task should NOT be visible until TL approves
            // Return null to let the filter in UserTaskListWithWorksheet handle hiding it
            console.log('🚫 NEXT STAGE DOER - Task is with TL, should not be visible yet', {
              taskTitle: task.title,
              userId: userIdString,
              currentStage: task.currentStage,
              nextStageDoerId: nextStageDoerId
            });
            // Return null so task is filtered out - next stage doer shouldn't see task until TL approves
            return null;
          }
        }
      } catch (e) {
        console.error('Error in current stage doer TL check:', e);
        console.error('Task details:', {
          taskTitle: task.title,
          currentStage: task.currentStage,
          status: task.status,
          userId: userIdString
        });
      }
    }
  }
  
  // ===== DOER STATUS =====
  // Use centralized helper to check if doer worked on completed stage
  let doerWorkedOnCompletedStage = false;
  try {
    // Dynamic import to avoid circular dependency
    const { userWorkedOnCompletedStage: checkCompletedStage } = require('./workflowStageHelper');
    doerWorkedOnCompletedStage = checkCompletedStage(task, userIdString, 'doer');
  } catch (e) {
    // Fallback to manual check if helper not available
    if (task.workflowId && task.userDependencyId && task.stageHistory && task.stageHistory.length > 0) {
      doerWorkedOnCompletedStage = task.stageHistory.some(stage => {
        const stageDoerId = stage.userId || stage.assignedTo;
        const isDoerMatch = String(stageDoerId) === userIdString;
        // Only count if this stage is completed (less than current stage)
        const isCompletedStage = stage.stageOrder < task.currentStage;
        return isDoerMatch && isCompletedStage;
      });
    }
  }
  
  // Check if user is the doer for CURRENT stage (currently assigned or original doer of current stage)
  // BUT exclude cases where task is with TL and user is next stage doer
  const isCurrentStageDoer = ((isAssigned && !isChecker && !isTeamLeader) || isOriginalDoerForCurrentStage) && !isNextStageDoer;
  
  // If doer worked on a completed stage, ONLY show "Stage Completed" - don't mix with current stage
  // Use centralized helper to get consistent status message
  if (doerWorkedOnCompletedStage && !isCurrentStageDoer && !isNextStageDoer) {
    try {
      const { getCompletedStageStatus: getCompletedStatus } = require('./workflowStageHelper');
      const completedStatus = getCompletedStatus(task, 'doer');
      if (completedStatus) {
        return completedStatus; // Returns "Stage Completed" for workflow tasks
      }
    } catch (e) {
      // Fallback if helper not available
    }
    return 'Stage Completed'; // Default fallback
  }
  

  
  // IMPORTANT: If user is current stage doer and we haven't returned yet, they should still see "Under TL Review"
  // if task is with TL, even if other conditions don't match. This is a fallback check.
  // This is CRITICAL for ensuring stage 2, 3, etc. doers see "Under TL Review"
  if (role === 'doer' && task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    // Double-check if user might be current stage doer (fallback check)
    try {
      const currentStageAssignment = UserDependencyService.getStageAssignment(
        task.userDependencyId,
        task.currentStage
      );
      
      if (currentStageAssignment && currentStageAssignment.userId) {
        const currentStageDoerId = String(currentStageAssignment.userId);
        
        // Enhanced user ID matching - check multiple formats
        const isCurrentStageDoer = 
          userIdString === currentStageDoerId ||
          userIds.some(id => {
            const idStr = String(id || '');
            return idStr === currentStageDoerId || 
                   idStr === userIdString ||
                   String(id) === currentStageDoerId ||
                   String(id) === userIdString;
          });
        
        // Also check stage history for current stage
        let workedOnCurrentStage = false;
        if (!isCurrentStageDoer && task.stageHistory && task.stageHistory.length > 0) {
          workedOnCurrentStage = task.stageHistory.some(stage => {
            if (stage.stageOrder !== task.currentStage) return false;
            const stageDoerId = stage.userId || stage.assignedTo;
            const stageDoerIdStr = String(stageDoerId || '');
            return stageDoerIdStr === userIdString ||
                   userIds.some(id => String(id || '') === stageDoerIdStr || String(id || '') === userIdString);
          });
        }
        
        if (isCurrentStageDoer || workedOnCurrentStage) {
          const normalizedStatus = String(status).toLowerCase().replace(/_/g, '-');
          const isTaskWithTeamLeader = normalizedStatus === 'team-leader-review' || normalizedStatus === 'initially-approved';
          const isTaskAssignedToTL = task.teamLeaderId && String(task.assignedTo) === String(task.teamLeaderId);
          
          if (isTaskWithTeamLeader || isTaskAssignedToTL) {
            console.log('✅ Current Stage Doer - FALLBACK CHECK - Returning "Under TL Review"', {
              taskTitle: task.title,
              userId: userIdString,
              status: status,
              normalizedStatus: normalizedStatus,
              currentStage: task.currentStage,
              currentStageDoerId: currentStageDoerId,
              isCurrentStageDoer,
              workedOnCurrentStage
            });
            return 'Under TL Review';
          }
        }
      }
    } catch (e) {
      console.error('Error in fallback check:', e);
    }
  }
  
  // FINAL SAFEGUARD: Check if user is current stage doer and task is with TL
  // This prevents current stage doers from falling through to assignment-based logic
  if (role === 'doer' && task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    try {
      const currentStageAssignment = UserDependencyService.getStageAssignment(
        task.userDependencyId,
        task.currentStage
      );
      if (currentStageAssignment && String(currentStageAssignment.userId) === userIdString) {
        const statusStr = String(status || '').toLowerCase().trim();
        const normalizedStatus = statusStr.replace(/_/g, '-');
        const isTaskWithTL = 
          normalizedStatus === 'team-leader-review' || 
          normalizedStatus === 'initially-approved' ||
          statusStr.includes('team-leader') ||
          statusStr.includes('team_leader');
        const isAssignedToTL = task.teamLeaderId && String(task.assignedTo) === String(task.teamLeaderId);
        
        if (isTaskWithTL || isAssignedToTL) {
          console.log('🛡️ FINAL SAFEGUARD: Current Stage Doer caught - Returning "Under TL Review"', {
            taskTitle: task.title,
            userId: userIdString,
            status: status
          });
          return 'Under TL Review';
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Check for finally-approved status FIRST (applies to all doers regardless of assignment)
  if (status === 'finally-approved') {
    // Stage 7: Team Leader gives final approval
    // This should be uniform across all stages - always show "Stage Completed"
    return 'Stage Completed';
  }
  
  // Currently assigned to doer (CURRENT stage doer, not next stage)
  // CRITICAL: This should NEVER run if task is with TL - that case should be handled above
  if (isAssigned && !isTeamLeader && !isChecker && isCurrentStageDoer && !isNextStageDoer) {
    // CRITICAL CHECK FIRST: If task is with TL, do NOT return "Task Assigned – Pending Submission"
    // Instead, this should have been caught by the earlier checks and returned "Under TL Review"
    const normalizedStatusCheck = String(status).toLowerCase().replace(/_/g, '-');
    const isTaskWithTL = normalizedStatusCheck === 'team-leader-review' || normalizedStatusCheck === 'initially-approved';
    const isTaskAssignedToTL = task.teamLeaderId && String(task.assignedTo) === String(task.teamLeaderId);
    
    // If task is with TL, do NOT show "Task Assigned – Pending Submission"
    // This means the earlier checks didn't catch it - try one more time
    if (isTaskWithTL || isTaskAssignedToTL) {
      if (isDoer2Debug) {
        console.log('⚠️ Task is with TL but assignment logic reached - Should have been caught earlier', {
          taskTitle: task.title,
          status: status,
          normalizedStatusCheck: normalizedStatusCheck,
          isTaskWithTL,
          isTaskAssignedToTL,
          assignedTo: task.assignedTo,
          teamLeaderId: task.teamLeaderId
        });
      }
      // Even if isAssigned is true, if task is WITH TL, doer should see "Under TL Review"
      // This can happen if task.assignedTo still points to doer but task is actually with TL
      return 'Under TL Review';
    }
    
    // Task is NOT with TL - proceed with normal assignment logic
    if (status === 'pending' || status === 'in-progress') {
      if (isDoer2Debug) {
        console.log('✅ Assignment logic - Task Assigned – Pending Submission (pending/in-progress)');
      }
      return 'Task Assigned – Pending Submission';
    }
    
    // Handle legacy statuses that might appear when task is assigned to doer
    // BUT only if task is NOT with TL (if it's with TL, it means TL hasn't approved yet)
    if ((status === 'initially-approved' || status === 'team-leader-review') && !isNextStageDoer) {
      // This shouldn't happen (should be caught above), but if it does, still check if with TL
      const statusStr2 = String(status).toLowerCase().trim();
      const normalized2 = statusStr2.replace(/_/g, '-');
      const isWithTL2 = normalized2 === 'team-leader-review' || normalized2 === 'initially-approved';
      const isAssignedToTL2 = task.teamLeaderId && String(task.assignedTo) === String(task.teamLeaderId);
      
      if (isWithTL2 || isAssignedToTL2) {
        if (isDoer2Debug) {
          console.log('⚠️ Status is initially-approved/team-leader-review but task is with TL - Returning "Under TL Review"');
        }
        return 'Under TL Review';
      }
      
      // Task was just assigned to this doer after TL approval - show as pending submission
      // This should only apply to current stage doer, not next stage doer
      if (isDoer2Debug) {
        console.log('✅ Assignment logic - Task Assigned – Pending Submission (after TL approval)');
      }
      return 'Task Assigned – Pending Submission';
    }
    
    if (status === 'submitted' || status === 'under-review') {
      if (isDoer2Debug) {
        console.log('✅ Assignment logic - Submitted – Pending Checker\'s Review');
      }
      return 'Submitted – Pending Checker\'s Review';
    }
    
    if (status === 'revision-required') {
      // Check if corrections are for this doer
      if (task.correctionType === 'doer' || task.correctionType === 'both') {
        // Stage 4: Team Leader Approves Checker's Checklist and Sends Corrections to Doer
        if (isDoer2Debug) {
          console.log('✅ Assignment logic - Corrections Required (for doer)');
        }
        return 'Corrections Required';
      }
      // Stage 5: Team Leader Does Not Approve Checker's Checklist - corrections are for checker
      if (task.correctionType === 'checker') {
        if (isDoer2Debug) {
          console.log('✅ Assignment logic - Submitted – Pending Checker\'s Review (corrections for checker)');
        }
        return 'Submitted – Pending Checker\'s Review';
      }
      if (isDoer2Debug) {
        console.log('✅ Assignment logic - Corrections Required (default)');
      }
      return 'Corrections Required';
    }
  }
  
  // Not currently assigned but worked on CURRENT stage (task is with team leader or checker)
  if (isOriginalDoerForCurrentStage && !isAssigned) {
    // STANDARDIZE STATUS - When checker submits, doer should see "Under TL Review" consistently
    // This applies to ALL stages (stage 1, stage 2, stage 3, etc.) - uniform status
    if (status === 'team-leader-review' || status === 'initially-approved') {
      // When checker submits checklist (whether approved or with corrections), task goes to TL
      // Doer should ALWAYS see "Under TL Review" - this is standard across ALL stages
      // Stage 1, Stage 2, Stage 3, etc. - all should show the same status when checker submits
      console.log('✅ STANDARDIZED STATUS: Current stage doer - Returning "Under TL Review" (checker submitted)', {
        taskTitle: task.title,
        userId: userIdString,
        status: status,
        currentStage: task.currentStage
      });
      return 'Under TL Review';
    }
    if (status === 'revision-required') {
      // Team leader sent corrections back to checker - Stage 5
      if (task.correctionType === 'checker' || task.correctionType === 'both') {
        // According to table: Doer should see "Submitted – Pending Checker's Review"
        return 'Submitted – Pending Checker\'s Review';
      }
      // Team leader sent corrections to doer - Stage 4
      // According to table: Doer should see "Corrections Required"
      return 'Corrections Required';
    }
    // finally-approved is handled above at the beginning of the doer status block
  }
  
  // Task moved to next stage - doer from previous stage should see "Stage Completed"
  if (status === 'pending' && !isAssigned && doerWorkedOnCompletedStage) {
    return 'Stage Completed';
  }
  
  // ===== CHECKER STATUS =====
  // Use centralized helper to check if checker worked on completed stage
  let checkerWorkedOnCompletedStage = false;
  try {
    const { userWorkedOnCompletedStage: checkCompletedStage } = require('./workflowStageHelper');
    checkerWorkedOnCompletedStage = checkCompletedStage(task, userIdString, 'checker');
  } catch (e) {
    // Fallback to manual check if helper not available
    if (task.workflowId && task.userDependencyId && task.stageHistory && task.stageHistory.length > 0) {
      checkerWorkedOnCompletedStage = task.stageHistory.some(stage => {
        const stageCheckerId = stage.checkerId || stage.reviewedBy;
        const isCheckerMatch = String(stageCheckerId) === userIdString;
        // Only count if this stage is completed (less than current stage)
        const isCompletedStage = stage.stageOrder < task.currentStage;
        return isCheckerMatch && isCompletedStage;
      });
    }
  }
  
  // Check if user is the checker for CURRENT stage
  const isCurrentStageChecker = isChecker;
  
  // If checker worked on a completed stage, ONLY show "Stage Completed" - don't mix with current stage
  // Use centralized helper to get consistent status message
  if (checkerWorkedOnCompletedStage && !isCurrentStageChecker) {
    try {
      const { getCompletedStageStatus: getCompletedStatus } = require('./workflowStageHelper');
      const completedStatus = getCompletedStatus(task, 'checker');
      if (completedStatus) {
        return completedStatus; // Returns "Stage Completed" for workflow tasks
      }
    } catch (e) {
      // Fallback if helper not available
    }
    return 'Stage Completed'; // Default fallback
  }
  
  // Only process status for current stage checker
  if (isCurrentStageChecker || (role === 'checker' && !checkerWorkedOnCompletedStage)) {
    if (status === 'pending' || status === 'in-progress') {
      return 'Awaiting Doer to Submit Tasks';
    }
    if (status === 'submitted' || status === 'under-review') {
      return 'Task Assigned – Pending Submission';
    }
    if (status === 'revision-required') {
      // Check correction type
      if (task.correctionType === 'checker' || task.correctionType === 'both') {
        // Stage 5: Team Leader Does Not Approve Checker's Checklist and Gives Corrections
        return 'Corrections Required';
      }
      // Stage 4: Team Leader Approves Checker's Checklist and Sends Corrections to Doer
      return 'Awaiting Doer to Submit Tasks';
    }
    if (status === 'team-leader-review') {
      // Checker submitted to team leader
      // Stage 6: Checker Approves Doer's Task - Checker should see "Submitted – Pending Team Leader's Review"
      // This should be uniform across all stages
      return 'Submitted – Pending Team Leader\'s Review';
    }
    if (status === 'initially-approved') {
      // Legacy status - map to correct status
      // Stage 6: Checker Approves Doer's Task
      return 'Submitted – Pending Team Leader\'s Review';
    }
    if (status === 'finally-approved') {
      return 'Stage Completed';
    }
    
    // Task moved to next stage - checker from previous stage should see "Stage Completed"
    if (status === 'pending' && checkerWorkedOnCompletedStage) {
      return 'Stage Completed';
    }
  }
  
  // ===== TEAM LEADER STATUS =====
  // Check if team leader worked on a COMPLETED stage (not current stage)
  let tlWorkedOnCompletedStage = false;
  let isCurrentStageTL = false;
  
  if (task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    try {
      const currentStageAssignment = UserDependencyService.getStageAssignment(
        task.userDependencyId,
        task.currentStage
      );
      if (currentStageAssignment && String(currentStageAssignment.teamLeaderId) === userIdString) {
        isCurrentStageTL = true;
      }
      
      // Check if TL worked on any completed stage
      if (task.stageHistory && task.stageHistory.length > 0) {
        tlWorkedOnCompletedStage = task.stageHistory.some(stage => {
          // Check if TL was assigned to this stage
          try {
            const stageAssignment = UserDependencyService.getStageAssignment(
              task.userDependencyId,
              stage.stageOrder
            );
            const wasTLForStage = stageAssignment && String(stageAssignment.teamLeaderId) === userIdString;
            // Only count if this stage is completed (less than current stage)
            const isCompletedStage = stage.stageOrder < task.currentStage;
            return wasTLForStage && isCompletedStage;
          } catch (e) {
            return false;
          }
        });
      }
    } catch (e) {
      // Error checking stage assignment
    }
  }
  
  // Also check if task.teamLeaderId matches (for tasks assigned to TL)
  const isAssignedTL = isTeamLeader;
  
  // If TL worked on a completed stage but is NOT current stage TL, show "Stage Completed"
  if (tlWorkedOnCompletedStage && !isCurrentStageTL && !isAssignedTL) {
    return 'Stage Completed';
  }
  
  // Only process status for current stage TL
  // Check for 'team-leader-review' and 'initially-approved' status FIRST - these are the most important statuses for TL
  if (role === 'team-leader' && (status === 'team-leader-review' || status === 'initially-approved')) {
    // Stage 3 & 6: Task assigned to team leader for review (across ALL stages)
    // When checker submits (either with corrections or approved), TL sees this
    // This should be uniform across all stages - always "Task Assigned – Pending Submission"
    // Check if TL is assigned to current stage or task is assigned to this TL
    if (isCurrentStageTL || isAssignedTL || String(task.teamLeaderId) === userIdString) {
      return 'Task Assigned – Pending Submission';
    }
  }
  
  if (isCurrentStageTL || isAssignedTL || (role === 'team-leader' && !tlWorkedOnCompletedStage)) {
    if (status === 'pending' || status === 'in-progress') {
      return 'Awaiting Doer to Submit Tasks';
    }
    if (status === 'submitted' || status === 'under-review') {
      return 'Awaiting Checker to Review Tasks';
    }
    if (status === 'revision-required') {
      // Check who needs corrections
      if (task.correctionType === 'checker' || task.correctionType === 'both') {
        // Corrections sent back to checker
        return 'Awaiting Checker to Submit Tasks';
      }
      // Corrections sent to doer
      return 'Awaiting Doer to Submit Tasks';
    }
    if (status === 'team-leader-review' || status === 'initially-approved') {
      // Stage 3 & 6: Task assigned to team leader for review
      // When checker submits (either with corrections or approved), TL sees this
      // This should be uniform across all stages - always "Task Assigned – Pending Submission"
      // Handle both 'team-leader-review' and 'initially-approved' statuses
      return 'Task Assigned – Pending Submission';
    }
    if (status === 'finally-approved') {
      // Team leader gave final approval
      return 'Stage Completed – Task Sent to Next Stage';
    }
  }
  
  // ===== FINAL CATCH-ALL FOR DOER: STANDARDIZE "Under TL Review" =====
  // This is a final safeguard to ensure consistency across ALL stages
  // If we haven't returned yet and task is with TL, doer should see "Under TL Review"
  if (role === 'doer' && task.workflowId && task.userDependencyId && task.currentStage && UserDependencyService) {
    const statusStrFinal = String(status || '').toLowerCase().trim();
    const normalizedStatusFinal = statusStrFinal.replace(/_/g, '-');
    const isTaskWithTLFinal = 
      normalizedStatusFinal === 'team-leader-review' || 
      normalizedStatusFinal === 'initially-approved' ||
      statusStrFinal.includes('team-leader') ||
      statusStrFinal.includes('tl-review');
    const isAssignedToTLFinal = task.teamLeaderId && String(task.assignedTo) === String(task.teamLeaderId);
    
    // If task is with TL and we haven't returned a status yet, check if user is current stage doer
    if (isTaskWithTLFinal || isAssignedToTLFinal) {
      try {
        const currentStageAssignmentFinal = UserDependencyService.getStageAssignment(
          task.userDependencyId,
          task.currentStage
        );
        if (currentStageAssignmentFinal && currentStageAssignmentFinal.userId) {
          const currentStageDoerIdFinal = String(currentStageAssignmentFinal.userId);
          const isCurrentStageDoerFinal = 
            userIdString === currentStageDoerIdFinal ||
            userIds.some(id => String(id) === currentStageDoerIdFinal || String(id) === userIdString);
          
          // Also check stage history
          let workedOnCurrentStageFinal = false;
          if (!isCurrentStageDoerFinal && task.stageHistory && task.stageHistory.length > 0) {
            workedOnCurrentStageFinal = task.stageHistory.some(stage => {
              if (stage.stageOrder !== task.currentStage) return false;
              const stageDoerId = stage.userId || stage.assignedTo;
              return String(stageDoerId) === userIdString;
            });
          }
          
          if (isCurrentStageDoerFinal || workedOnCurrentStageFinal) {
            console.log('🛡️ FINAL CATCH-ALL: Current stage doer with TL - Standardizing to "Under TL Review"', {
              taskTitle: task.title,
              userId: userIdString,
              status: status,
              currentStage: task.currentStage
            });
            // STANDARDIZE: Always return "Under TL Review" for current stage doer when task is with TL
            // This applies to ALL stages (stage 1, stage 2, stage 3, etc.) - uniform status
            return 'Under TL Review';
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  return null; // Use default status badge
};

export default getWorkflowStatusForRole;
