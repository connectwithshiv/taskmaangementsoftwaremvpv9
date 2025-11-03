import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import UserDependencyService from '../../services/userDependencyService';
import WorkflowService from '../../services/workflowService';

const UserDependencyBuilder = ({ 
  dependency = null, 
  workflows = [], 
  users = [], 
  onSave, 
  onCancel, 
  isDarkMode = false,
  viewMode = false 
}) => {
  const [formData, setFormData] = useState({
    workflowId: '',
    name: '',
    description: '',
    stageAssignments: []
  });
  const [errors, setErrors] = useState({});
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  useEffect(() => {
    if (dependency) {
      setFormData({
        workflowId: dependency.workflowId || '',
        name: dependency.name || '',
        description: dependency.description || '',
        stageAssignments: dependency.stageAssignments || []
      });
      // Load workflow details
      if (dependency.workflowId) {
        const workflow = WorkflowService.getWorkflowById(dependency.workflowId);
        setSelectedWorkflow(workflow);
      }
    }
  }, [dependency]);

  // When workflow is selected, initialize stage assignments
  useEffect(() => {
    if (formData.workflowId && !dependency) {
      const workflow = WorkflowService.getWorkflowById(formData.workflowId);
      setSelectedWorkflow(workflow);
      
      if (workflow && (!formData.stageAssignments || formData.stageAssignments.length === 0)) {
        // Initialize stage assignments from workflow
        const initialAssignments = workflow.categoryFlow.map(stage => ({
          stageOrder: stage.order,
          categoryId: stage.categoryId,
          categoryName: stage.categoryName,
          userId: '',
          userName: '',
          checkerId: '',
          checkerName: '',
          teamLeaderId: '',
          teamLeaderName: ''
        }));
        setFormData({
          ...formData,
          stageAssignments: initialAssignments
        });
      }
    }
  }, [formData.workflowId]);

  // Filter users by role and category
  const getEligibleUsers = (categoryId, roleId) => {
    return users.filter(user => {
      if (Number(user.role_id) !== roleId) return false;
      if (user.status !== 'active') return false;
      if (!user.assigned_category_ids || user.assigned_category_ids.length === 0) return false;
      if (user.assigned_category_ids.includes('all')) return true;
      return user.assigned_category_ids.includes(categoryId);
    });
  };

  const handleWorkflowChange = (workflowId) => {
    setFormData({
      ...formData,
      workflowId,
      stageAssignments: [] // Clear assignments
    });
    setErrors({ ...errors, workflowId: '' });
  };

  const handleStageAssignmentChange = (index, field, value) => {
    const newAssignments = [...formData.stageAssignments];
    const stage = newAssignments[index];
    
    if (field === 'userId') {
      const user = users.find(u => (u.id || u.user_id) === value);
      stage.userId = value;
      stage.userName = user ? (user.name || user.username || '') : '';
    } else if (field === 'checkerId') {
      const checker = users.find(u => (u.id || u.user_id) === value);
      stage.checkerId = value;
      stage.checkerName = checker ? (checker.name || checker.username || '') : '';
    } else if (field === 'teamLeaderId') {
      const teamLeader = users.find(u => (u.id || u.user_id) === value);
      stage.teamLeaderId = value;
      stage.teamLeaderName = teamLeader ? (teamLeader.name || teamLeader.username || '') : '';
    }
    
    newAssignments[index] = stage;
    setFormData({
      ...formData,
      stageAssignments: newAssignments
    });
    
    // Clear errors for this stage
    const errorKey = `stage_${index}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validation
    if (!formData.workflowId) {
      newErrors.workflowId = 'Please select a workflow';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Dependency name is required';
    }

    // Validate all stages have user and checker
    formData.stageAssignments.forEach((stage, index) => {
      if (!stage.userId) {
        newErrors[`stage_${index}`] = 'User is required';
      }
      if (!stage.checkerId) {
        newErrors[`stage_${index}`] = 'Checker is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save
    if (dependency) {
      const result = UserDependencyService.updateUserDependency(dependency.id, formData);
      if (result.success) {
        onSave(result.dependency);
      } else {
        alert(result.message || 'Failed to update user dependency');
      }
    } else {
      const workflow = WorkflowService.getWorkflowById(formData.workflowId);
      const result = UserDependencyService.createUserDependency({
        ...formData,
        workflowName: workflow ? workflow.name : '',
        createdBy: 'admin' // TODO: Get from auth context
      });
      if (result.success) {
        onSave(result.dependency);
      } else {
        alert(result.message || 'Failed to create user dependency');
      }
    }
  };

  if (!selectedWorkflow && formData.workflowId) {
    // Workflow might not be loaded yet
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading workflow...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {viewMode ? 'View User Dependency' : dependency ? 'Edit User Dependency' : 'Create User Dependency'}
        </h2>
        <button
          onClick={onCancel}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Workflow Selection */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Select Workflow <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.workflowId}
            onChange={(e) => handleWorkflowChange(e.target.value)}
            disabled={!!dependency || viewMode} // Can't change workflow when editing or viewing
            className={`w-full px-4 py-2 rounded-lg border-2 ${
              errors.workflowId
                ? 'border-red-500'
                : isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select a workflow...</option>
            {workflows.map(workflow => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
          {errors.workflowId && (
            <p className="text-red-500 text-sm mt-1">{errors.workflowId}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Dependency Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setErrors({ ...errors, name: '' });
            }}
            disabled={viewMode}
            className={`w-full px-4 py-2 rounded-lg border-2 ${
              errors.name
                ? 'border-red-500'
                : isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="e.g., Team A Production Chain"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={viewMode}
            rows={3}
            className={`w-full px-4 py-2 rounded-lg border-2 ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="Describe this user dependency chain..."
          />
        </div>

        {/* Stage Assignments */}
        {selectedWorkflow && formData.stageAssignments.length > 0 && (
          <div>
            <label className={`block text-sm font-semibold mb-3 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Stage Assignments
            </label>
            <div className="space-y-4">
              {formData.stageAssignments.map((stage, index) => {
                const eligibleUsers = getEligibleUsers(stage.categoryId, 2); // Role 2 = Doer
                const eligibleCheckers = getEligibleUsers(stage.categoryId, 3); // Role 3 = Checker
                const stageError = errors[`stage_${index}`];

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      stageError
                        ? 'border-red-500'
                        : isDarkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {stage.stageOrder}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {stage.categoryName}
                        </h4>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Stage {stage.stageOrder} of {formData.stageAssignments.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* User Assignment */}
                      <div>
                        <label className={`block text-xs font-semibold mb-2 flex items-center gap-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <User size={14} />
                          User (Doer) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={stage.userId}
                          onChange={(e) => handleStageAssignmentChange(index, 'userId', e.target.value)}
                          disabled={viewMode}
                          className={`w-full px-3 py-2 rounded-lg border-2 text-sm ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select user...</option>
                          {eligibleUsers.map(user => (
                            <option key={user.id || user.user_id} value={user.id || user.user_id}>
                              {user.name || user.username || user.email}
                            </option>
                          ))}
                        </select>
                        {eligibleUsers.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No eligible users for this category
                          </p>
                        )}
                      </div>

                      {/* Checker Assignment */}
                      <div>
                        <label className={`block text-xs font-semibold mb-2 flex items-center gap-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <CheckCircle2 size={14} />
                          Checker <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={stage.checkerId}
                          onChange={(e) => handleStageAssignmentChange(index, 'checkerId', e.target.value)}
                          disabled={viewMode}
                          className={`w-full px-3 py-2 rounded-lg border-2 text-sm ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select checker...</option>
                          {eligibleCheckers.map(checker => (
                            <option key={checker.id || checker.user_id} value={checker.id || checker.user_id}>
                              {checker.name || checker.username || checker.email}
                            </option>
                          ))}
                        </select>
                        {eligibleCheckers.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No eligible checkers for this category
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Team Leader Assignment */}
                    <div>
                      {(() => {
                        const eligibleTeamLeaders = getEligibleUsers(stage.categoryId, 5); // Role 5 = Team Leader
                        return (
                          <>
                            <label className={`block text-xs font-semibold mb-2 flex items-center gap-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <User size={14} />
                              Team Leader (Optional)
                            </label>
                            <select
                              value={stage.teamLeaderId || ''}
                              onChange={(e) => handleStageAssignmentChange(index, 'teamLeaderId', e.target.value)}
                              disabled={viewMode}
                              className={`w-full px-3 py-2 rounded-lg border-2 text-sm ${
                                isDarkMode
                                  ? 'bg-slate-700 border-slate-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <option value="">No team leader</option>
                              {eligibleTeamLeaders.map(teamLeader => (
                                <option key={teamLeader.id || teamLeader.user_id} value={teamLeader.id || teamLeader.user_id}>
                                  {teamLeader.name || teamLeader.username || teamLeader.email}
                                </option>
                              ))}
                            </select>
                            {eligibleTeamLeaders.length === 0 && (
                              <p className="text-xs text-amber-600 mt-1">
                                No team leaders assigned to this category
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {stageError && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {stageError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {!viewMode && (
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedWorkflow || formData.stageAssignments.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                !selectedWorkflow || formData.stageAssignments.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Save size={20} />
              {dependency ? 'Update Dependency' : 'Create Dependency'}
            </button>
          </div>
        )}
        {viewMode && (
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Close
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserDependencyBuilder;

