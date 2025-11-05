import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, BookOpen, ListTodo, FileText, MessageSquare, Check } from 'lucide-react';
import GuidelineService from '../../services/GuidelineService';
import ChecklistService from '../../services/ChecklistService';
import WorksheetService from '../../services/WorksheetService';
import { SectionCard } from '../shared/SectionCard';
import { ChecklistItem } from '../shared/ChecklistItem';
import { AlertBox } from '../shared/AlertBox';

/**
 * Team Leader Review Modal - Team Leader reviews initially approved tasks
 * Shows checker's approval, submission data, and guidelines
 * Can approve or request corrections from doer/checker
 */
const TeamLeaderReviewModal = ({ 
  task, 
  onApprove, 
  onRequireCorrection, 
  onCancel,
  isDarkMode = false 
}) => {
  const [guideline, setGuideline] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [correctionType] = useState('checker'); // Always send to checker
  const [tlChecklist, setTlChecklist] = useState({}); // TL's approval/correction decisions

  useEffect(() => {
    if (task?.categoryId) {
      // Load guideline
      const guideline = GuidelineService.getGuidelineByCategory(task.categoryId);
      setGuideline(guideline);

      // Load checklist
      const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
      setChecklist(checklist);

      // Initialize TL checklist with checker's approval decisions
      if (checklist?.items) {
        const initialTlChecklist = {};
        checklist.items.forEach(item => {
          // Start with checker's approval state
          const wasApprovedByChecker = task.review?.approvedChecklistItems?.includes(item.id);
          initialTlChecklist[item.id] = wasApprovedByChecker === true;
        });
        setTlChecklist(initialTlChecklist);
      }

      // Load submission if it exists
      if (task.review?.submissionData) {
        setSubmission(task.review.submissionData);
      }
    }
  }, [task]);

  // Check if TL made any changes to checker's checklist
  const hasChanges = (() => {
    const checkerApprovedItems = task?.review?.approvedChecklistItems || [];
    let hasDifference = false;
    
    checklist?.items?.forEach(item => {
      const wasApprovedByChecker = checkerApprovedItems.includes(item.id);
      const isApprovedByTL = tlChecklist[item.id];
      if (wasApprovedByChecker !== isApprovedByTL) {
        hasDifference = true;
      }
    });
    
    return hasDifference;
  })();

  // Check if all checklist items are approved
  const allItemsApproved = checklist?.items 
    ? checklist.items.every(item => tlChecklist[item.id])
    : true;

  // Handle approve
  const handleApprove = async () => {
    setIsProcessing(true);
    
    // Get approved items from TL's checklist
    const approvedChecklistItems = checklist?.items
      ? checklist.items.filter(item => tlChecklist[item.id]).map(item => item.id)
      : [];
    
    await onApprove(feedback, approvedChecklistItems);
    setIsProcessing(false);
  };

  // Handle require correction
  const handleRequireCorrection = async () => {
    setIsProcessing(true);

    // Use feedback or default message
    const finalFeedback = feedback.trim() || 'Please review and correct the issues noted.';

    // Get items that changed from checker's approval state
    const checkerApprovedItems = task?.review?.approvedChecklistItems || [];
    const corrections = [];
    
    checklist?.items?.forEach(item => {
      const wasApprovedByChecker = checkerApprovedItems.includes(item.id);
      const isApprovedByTL = tlChecklist[item.id];
      
      // If TL changed from checker's decision, add to corrections
      if (wasApprovedByChecker !== isApprovedByTL) {
        corrections.push(item.id);
      }
    });

    // Only call onRequireCorrection if there are actual changes
    if (corrections.length > 0) {
      await onRequireCorrection(finalFeedback, {
        correctionType: correctionType,
        correctedBy: correctionType, // Who needs to make corrections
        corrections: {
          checklistItems: corrections, // Items changed by TL
          tlDecision: tlChecklist // TL's full decision
        }
      });
    }
    
    setIsProcessing(false);
  };

  // Handle sending corrections to user when checklist is incomplete
  const handleSendCorrectionsToUser = async () => {
    setIsProcessing(true);

    // Use feedback or default message
    const finalFeedback = feedback.trim() || 'Please complete the remaining checklist items.';

    // Get all unchecked items
    const uncheckedItems = checklist?.items
      ? checklist.items.filter(item => !tlChecklist[item.id]).map(item => item.id)
      : [];

    await onRequireCorrection(finalFeedback, {
      correctionType: 'doer',
      correctedBy: 'doer',
      corrections: {
        checklistItems: uncheckedItems,
        tlDecision: tlChecklist
      }
    });
    
    setIsProcessing(false);
  };
  
  // Toggle checklist item approval
  const handleToggleChecklistItem = (itemId) => {
    setTlChecklist(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Format submission data
  const formatSubmissionData = (data) => {
    if (!data) return [];
    
    // If it's already a formatted string
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Object.entries(parsed).map(([key, value]) => ({ key, value }));
      } catch {
        return [{ key: 'Data', value: data }];
      }
    }
    
    // If it's an object
    if (typeof data === 'object') {
      return Object.entries(data).map(([key, value]) => ({ 
        key, 
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : value 
      }));
    }
    
    return [{ key: 'Value', value: data }];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`max-w-4xl w-full max-h-[90vh] rounded-xl shadow-2xl ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} z-10 flex justify-between items-center`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Team Leader Review
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Task: {task?.title}
            </p>
          </div>
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Task Info */}
          <SectionCard
            icon={FileText}
            title="Task Information"
            isDarkMode={isDarkMode}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Assigned To
                  </p>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-900'}>
                    {task?.assignedToName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Checker
                  </p>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-900'}>
                    {task?.checkerName || 'N/A'}
                  </p>
                </div>
              </div>
              {task?.review?.reviewedBy && (
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border-yellow-700 border' : 'bg-yellow-50 border-yellow-200 border'}`}>
                  <div className="flex items-start gap-2">
                    <CheckCircle className={`mt-0.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} size={18} />
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                        Initially Approved by Checker
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Reviewed at: {task.review.reviewedAt ? new Date(task.review.reviewedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Guidelines */}
          {guideline && (
            <SectionCard
              icon={BookOpen}
              title="Guidelines"
              isDarkMode={isDarkMode}
            >
              <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                  {guideline.content}
                </p>
              </div>
            </SectionCard>
          )}

          {/* Checklist */}
          {checklist && checklist.items && Array.isArray(checklist.items) && checklist.items.length > 0 && (
            <SectionCard
              icon={ListTodo}
              title="Quality Checklist"
              isDarkMode={isDarkMode}
            >
              <div className="space-y-2">
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Review checklist items: Toggle to mark corrections needed
                </p>
                {checklist.items.map((item, idx) => {
                  const wasApprovedByChecker = task?.review?.approvedChecklistItems?.includes(item.id);
                  const isApprovedByTL = tlChecklist[item.id];
                  const hasChanged = wasApprovedByChecker !== isApprovedByTL;
                  return (
                    <div 
                      key={item.id || idx} 
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        hasChanged
                          ? isDarkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-300'
                          : isApprovedByTL
                          ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                          : isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-gray-50 border-gray-300'
                      }`}
                      onClick={() => handleToggleChecklistItem(item.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isApprovedByTL}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className={`mt-1 w-5 h-5 cursor-pointer ${hasChanged ? 'accent-red-600' : 'accent-green-600'}`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {item.text || item.name || 'Checklist Item'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {wasApprovedByChecker && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                              Checker approved
                            </span>
                          )}
                          {hasChanged && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
                              Needs correction
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Submission */}
          {submission && (
            <SectionCard
              icon={FileText}
              title="Doer Submission"
              isDarkMode={isDarkMode}
            >
              <div className="space-y-4">
                {formatSubmissionData(submission).map((field, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4">
                    <p className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {field.key}
                    </p>
                    <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-900'}`}>
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Team Leader Feedback */}
          <SectionCard
            icon={MessageSquare}
            title="Your Feedback"
            isDarkMode={isDarkMode}
          >
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Add your feedback or corrections..."
            />
          </SectionCard>

        </div>

        {/* Footer Actions */}
        <div className={`sticky bottom-0 px-6 py-4 border-t ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} flex justify-end gap-3`}>
          <button
            onClick={onCancel}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${
              isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          {hasChanges && (
            <button
              onClick={handleRequireCorrection}
              disabled={isProcessing}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <AlertCircle size={20} />
              Request Corrections (Checker)
            </button>
          )}
          {!hasChanges && !allItemsApproved && (
            <button
              onClick={handleSendCorrectionsToUser}
              disabled={isProcessing}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <AlertCircle size={20} />
              Send Corrections to User
            </button>
          )}
          {allItemsApproved && (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <CheckCircle size={20} />
              {isProcessing ? 'Processing...' : 'Finally Approve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderReviewModal;

