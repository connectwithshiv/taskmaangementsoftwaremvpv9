import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, BookOpen, ListTodo, FileText, MessageSquare, Check } from 'lucide-react';
import GuidelineService from '../../services/GuidelineService';
import ChecklistService from '../../services/ChecklistService';
import WorksheetService from '../../services/WorksheetService';
import { SectionCard } from '../shared/SectionCard';
import { ChecklistItem } from '../shared/ChecklistItem';
import { AlertBox } from '../shared/AlertBox';

/**
 * Task Review Modal - Admin reviews submitted tasks
 * Shows guidelines, checklist, and worksheet submission
 */
const TaskReviewModal = ({ 
  task, 
  onApprove, 
  onRequireRevision, 
  onCancel,
  isDarkMode = false 
}) => {
  const [guideline, setGuideline] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [adminChecklist, setAdminChecklist] = useState({});
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (task?.categoryId) {
      // Load guideline
      const guideline = GuidelineService.getGuidelineByCategory(task.categoryId);
      setGuideline(guideline);

      // Load checklist
      const checklist = ChecklistService.getChecklistByCategory(task.categoryId);
      setChecklist(checklist);

      // Initialize admin checklist with all items checked if this is a resubmission
      if (checklist?.items && task?.review?.reviewedBy) {
        // If task was previously reviewed and has checklist in review data
        const initialChecked = {};
        checklist.items.forEach(item => {
          // Check if this item was approved in previous review
          const wasApproved = task.review?.approvedChecklistItems?.includes(item.id);
          
          // If Team Leader gave corrections and it's for checker, use TL's decision
          const isCheckerCorrection = task.correctionType === 'checker' || task.correctionType === 'both';
          const tlDecision = task.review?.teamLeaderCorrections?.tlDecision;
          
          if (isCheckerCorrection && tlDecision && tlDecision.hasOwnProperty(item.id)) {
            // Use Team Leader's decision for checker corrections
            initialChecked[item.id] = tlDecision[item.id] === true;
          } else if (wasApproved) {
            // Keep the previous approval status if it was approved
            initialChecked[item.id] = true;
          } else {
            // Not approved in previous review
            initialChecked[item.id] = false;
          }
        });
        setAdminChecklist(initialChecked);
      } else if (checklist?.items) {
        // First time review - all unchecked by default
        const initialChecked = {};
        checklist.items.forEach(item => {
          initialChecked[item.id] = false;
        });
        setAdminChecklist(initialChecked);
      }

      // Load submission if it exists
      if (task.review?.submissionData) {
        setSubmission(task.review.submissionData);
      }
    }
  }, [task]);

  // Handle checklist item toggle
  const handleChecklistToggle = (itemId) => {
    setAdminChecklist(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Check if all items are approved
  const allItemsApproved = checklist?.items 
    ? checklist.items.every(item => adminChecklist[item.id])
    : true;

  // Handle approve
  const handleApprove = async () => {
    setIsProcessing(true);
    
    // Get checked items (approved checklist items)
    const approvedChecklistItems = checklist?.items
      ? checklist.items.filter(item => adminChecklist[item.id]).map(item => item.id)
      : [];

    await onApprove(approvedChecklistItems, feedback);
    
    setIsProcessing(false);
  };

  // Handle require revision
  const handleRequireRevision = async () => {
    setIsProcessing(true);

    // Get checked items (approved checklist items)
    const approvedChecklistItems = checklist?.items
      ? checklist.items.filter(item => adminChecklist[item.id]).map(item => item.id)
      : [];

    // Use feedback or default message
    const finalFeedback = feedback.trim() || 'Please review and correct the issues noted.';

    await onRequireRevision(approvedChecklistItems, finalFeedback);
    
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Review Task: {task?.title}
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Assigned to: {task?.assignedToName || task?.assignedTo}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            } disabled:opacity-50`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Timing Information */}
          <div className={`p-4 rounded-xl border-2 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Submission Time */}
              {task.review?.submittedAt && (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Submitted</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(task.review.submittedAt).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Revision Count */}
              {task.revisedCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Revisions</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.revisedCount} {task.revisedCount === 1 ? 'revision' : 'revisions'}
                    </p>
                  </div>
                </div>
              )}

              {/* Assignment Date */}
              {task.createdAt && (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Assigned</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(task.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines Section */}
          {guideline && (
            <SectionCard
              icon={BookOpen}
              title={guideline.title}
              variant="success"
              isDarkMode={isDarkMode}
            >
              <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                <pre className={`whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {guideline.content}
                </pre>
              </div>
            </SectionCard>
          )}

          {/* Checklist Section */}
          {checklist && checklist.items && checklist.items.length > 0 && (
            <SectionCard
              icon={ListTodo}
              title={checklist.title}
              variant="default"
              isDarkMode={isDarkMode}
            >
              {/* Team Leader Feedback Alert */}
              {task?.review?.teamLeaderFeedback && task?.status === 'revision-required' && (task.correctionType === 'checker' || task.correctionType === 'both') && (
                <AlertBox
                  type="danger"
                  message={
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                        Team Leader Feedback:
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                        {task.review.teamLeaderFeedback}
                      </p>
                      <p className={`text-xs mt-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Team Leader has marked some items with corrections needed. Review the checklist below and resubmit.
                      </p>
                    </div>
                  }
                  isDarkMode={isDarkMode}
                  className="mb-4"
                />
              )}
              
              <div className="space-y-3">
                {checklist.items.map((item, idx) => (
                  <ChecklistItem
                    key={item.id || idx}
                    item={item}
                    checked={adminChecklist[item.id] || false}
                    onChange={() => handleChecklistToggle(item.id)}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>

              <AlertBox
                type={allItemsApproved ? 'success' : 'warning'}
                message={
                  allItemsApproved ? (
                    '✅ All checklist items approved'
                  ) : (
                    `⚠️ ${checklist.items.filter(item => !adminChecklist[item.id]).length} item(s) not approved`
                  )
                }
                isDarkMode={isDarkMode}
                className="mt-4"
              />
            </SectionCard>
          )}

          {/* Worksheet Submission Section */}
          {submission && submission.data && (
            <SectionCard
              icon={FileText}
              title="Worksheet Submission"
              variant="purple"
              isDarkMode={isDarkMode}
            >
              <div className="space-y-4">
                {Object.entries(submission.data).map(([key, value]) => (
                  <div key={key}>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {key}
                    </label>
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-900 border border-gray-300'
                    }`}>
                      {typeof value === 'object' && Array.isArray(value) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {value.map((item, idx) => (
                            <li key={idx}>{String(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="break-words">{String(value)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Admin Feedback Section */}
          <SectionCard
            icon={MessageSquare}
            title="Admin Feedback"
            variant="warning"
            isDarkMode={isDarkMode}
          >
            {task?.status === 'revision-required' && task?.review?.adminFeedback && (
              <AlertBox
                type="warning"
                message={
                  <>
                    <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
                      Previous Feedback:
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      {task.review.adminFeedback}
                    </p>
                  </>
                }
                isDarkMode={isDarkMode}
                className="mb-4"
              />
            )}
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={allItemsApproved 
                ? "Add optional feedback for the user (optional if approving)..."
                : "Add feedback (optional) or submit to require corrections based on unchecked items..."
              }
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-yellow-500 focus:outline-none`}
            />
          </SectionCard>

        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            } disabled:opacity-50`}
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isProcessing
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <CheckCircle size={20} />
              Submit for TL Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReviewModal;

