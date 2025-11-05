// // components/worksheet/WorksheetSubmission.jsx - User Worksheet Submission Form

// import React, { useState, useEffect } from 'react';
// import { Send, AlertCircle, X, Save } from 'lucide-react';
// import WorksheetService from '../../services/worksheetService';

// /**
//  * FieldRenderer - Renders form fields based on type
//  */
// const FieldRenderer = ({ field, value, error, onChange }) => {
//   const commonProps = {
//     className: `w-full px-3 py-2 border rounded text-sm ${error ? 'border-red-500' : 'border-gray-300'}`
//   };

//   switch (field.type) {
//     case 'text':
//       return (
//         <input
//           type="text"
//           {...commonProps}
//           placeholder={field.placeholder}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//         />
//       );

//     case 'textarea':
//       return (
//         <textarea
//           {...commonProps}
//           placeholder={field.placeholder}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//           rows="4"
//         />
//       );

//     case 'number':
//       return (
//         <input
//           type="number"
//           {...commonProps}
//           placeholder={field.placeholder}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//         />
//       );

//     case 'date':
//       return (
//         <input
//           type="date"
//           {...commonProps}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//         />
//       );

//     case 'file':
//       return (
//         <input
//           type="file"
//           className="w-full text-sm"
//           onChange={(e) => onChange(e.target.files[0]?.name || '')}
//         />
//       );

//     case 'dropdown':
//       return (
//         <select
//           {...commonProps}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//         >
//           <option value="">-- Select --</option>
//           {field.options.map((opt, i) => (
//             <option key={i} value={opt}>{opt}</option>
//           ))}
//         </select>
//       );

//     case 'radio':
//       return (
//         <div className="space-y-2">
//           {field.options.map((opt, i) => (
//             <label key={i} className="flex items-center gap-2">
//               <input
//                 type="radio"
//                 name={field.id}
//                 value={opt}
//                 checked={value === opt}
//                 onChange={(e) => onChange(e.target.value)}
//               />
//               <span className="text-sm">{opt}</span>
//             </label>
//           ))}
//         </div>
//       );

//     case 'checkbox':
//       return (
//         <div className="space-y-2">
//           {field.options.map((opt, i) => {
//             const isChecked = Array.isArray(value) ? value.includes(opt) : false;
//             return (
//               <label key={i} className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={isChecked}
//                   onChange={(e) => {
//                     const checked = e.target.checked;
//                     const newValue = Array.isArray(value) ? [...value] : [];
//                     if (checked) {
//                       if (!newValue.includes(opt)) newValue.push(opt);
//                     } else {
//                       newValue = newValue.filter(v => v !== opt);
//                     }
//                     onChange(newValue);
//                   }}
//                 />
//                 <span className="text-sm">{opt}</span>
//               </label>
//             );
//           })}
//         </div>
//       );

//     default:
//       return (
//         <input
//           type="text"
//           {...commonProps}
//           placeholder={field.placeholder}
//           value={value || ''}
//           onChange={(e) => onChange(e.target.value)}
//         />
//       );
//   }
// };

// /**
//  * WorksheetSubmission - Main component for users to submit worksheets
//  */
// const WorksheetSubmission = ({ 
//   taskId, 
//   categoryId, 
//   userId, 
//   onSubmit, 
//   onClose,
//   showDraftOption = true 
// }) => {
//   const [template, setTemplate] = useState(null);
//   const [formData, setFormData] = useState({});
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [hasDraft, setHasDraft] = useState(false);

//   // Load template and draft on mount
//   useEffect(() => {
//     loadTemplate();
//   }, [categoryId]);

//   const loadTemplate = () => {
//     setLoading(true);
//     try {
//       const worksheetTemplate = WorksheetService.getTemplateByCategory(categoryId);
      
//       if (worksheetTemplate) {
//         setTemplate(worksheetTemplate);
        
//         // Check for existing draft
//         const draft = WorksheetService.getDraft(taskId, userId);
//         if (draft) {
//           setFormData(draft.data);
//           setHasDraft(true);
//         } else {
//           // Initialize with default values
//           const initialData = {};
//           worksheetTemplate.fields.forEach(field => {
//             initialData[field.id] = field.defaultValue || '';
//           });
//           setFormData(initialData);
//         }
//       }
//     } catch (error) {
//       console.error('Error loading template:', error);
//     }
//     setLoading(false);
//   };

//   const validateForm = () => {
//     const newErrors = {};
    
//     if (!template) return true;

//     template.fields.forEach(field => {
//       const value = formData[field.id];
      
//       // Check required fields
//       if (field.required) {
//         if (!value || (Array.isArray(value) && value.length === 0)) {
//           newErrors[field.id] = 'This field is required';
//         }
//       }

//       // Type-specific validation
//       if (value && field.type === 'number') {
//         if (isNaN(value)) {
//           newErrors[field.id] = 'Must be a number';
//         }
//       }

//       if (value && field.type === 'email') {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(value)) {
//           newErrors[field.id] = 'Invalid email address';
//         }
//       }
//     });

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSaveDraft = () => {
//     if (!template) return;

//     const draft = {
//       taskId,
//       userId,
//       templateId: template.id,
//       data: formData
//     };

//     const result = WorksheetService.saveDraft(draft);
//     if (result.success) {
//       setHasDraft(true);
//       alert('Draft saved successfully');
//     } else {
//       alert('Error saving draft: ' + result.message);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) {
//       alert('Please fill in all required fields');
//       return;
//     }

//     if (!template) return;

//     setSubmitting(true);
//     try {
//       const submission = {
//         taskId,
//         templateId: template.id,
//         templateName: template.name,
//         categoryId,
//         userId,
//         data: formData,
//         status: 'submitted'
//       };

//       const result = WorksheetService.saveSubmission(submission);
      
//       if (result.success) {
//         // Delete draft if exists
//         WorksheetService.deleteDraft(taskId, userId);
        
//         onSubmit?.(result.submission);
//         alert('Worksheet submitted successfully!');
//         onClose?.();
//       } else {
//         alert('Error: ' + result.message);
//       }
//     } catch (error) {
//       console.error('Error submitting:', error);
//       alert('Failed to submit worksheet');
//     }
//     setSubmitting(false);
//   };

//   const updateField = (fieldId, value) => {
//     setFormData({
//       ...formData,
//       [fieldId]: value
//     });
//     // Clear error for this field
//     if (errors[fieldId]) {
//       setErrors({
//         ...errors,
//         [fieldId]: null
//       });
//     }
//   };

//   // Loading state
//   if (loading) {
//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg p-4">
//           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
//           <p className="mt-2 text-gray-600">Loading worksheet...</p>
//         </div>
//       </div>
//     );
//   }

//   // No template state
//   if (!template) {
//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//         <div className="bg-white rounded-lg p-6 text-center max-w-sm">
//           <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
//           <p className="text-gray-600 mb-4">No worksheet template found for this category</p>
//           <button
//             onClick={onClose}
//             className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Form render
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
//         {/* Header */}
//         <div className="bg-green-600 text-white p-4 flex justify-between items-center">
//           <div>
//             <h2 className="text-xl font-bold">{template.name}</h2>
//             {template.description && (
//               <p className="text-sm text-green-100 mt-1">{template.description}</p>
//             )}
//             {hasDraft && (
//               <p className="text-xs text-green-200 mt-1">📝 Draft saved</p>
//             )}
//           </div>
//           <button
//             onClick={onClose}
//             className="p-1 hover:bg-green-700 rounded"
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Form Fields */}
//         <div className="flex-1 overflow-auto p-4">
//           <div className="space-y-4">
//             {template.fields.map((field) => (
//               <div key={field.id}>
//                 <label className="block text-sm font-medium mb-2">
//                   {field.label}
//                   {field.required && <span className="text-red-600 ml-1">*</span>}
//                 </label>

//                 <FieldRenderer
//                   field={field}
//                   value={formData[field.id]}
//                   error={errors[field.id]}
//                   onChange={(value) => updateField(field.id, value)}
//                 />

//                 {errors[field.id] && (
//                   <p className="text-red-600 text-xs mt-1">{errors[field.id]}</p>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="border-t p-4 flex justify-end gap-2">
//           {showDraftOption && (
//             <button
//               onClick={handleSaveDraft}
//               disabled={submitting}
//               className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
//             >
//               <Save size={16} /> Save Draft
//             </button>
//           )}
          
//           <button
//             onClick={onClose}
//             disabled={submitting}
//             className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleSubmit}
//             disabled={submitting}
//             className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
//           >
//             <Send size={16} /> 
//             {submitting ? 'Submitting...' : 'Submit'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WorksheetSubmission;
import React, { useState, useEffect } from 'react';
import { FileText, X, Send, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import TaskSubmissionFlow from './TaskSubmissionFlow';
import CorrectionViewModal from './CorrectionViewModal';
import TaskStatusBadge from '../task/TaskStatusBadge';
import getWorkflowStatusForRole from '../../utils/workflowStatusHelper';
import { validateNextStageDoerVisibility } from '../../utils/workflowStageValidator';

/**
 * ==========================================
 * WORKSHEET SUBMISSION FORM COMPONENT
 * ==========================================
 * Renders dynamic form based on worksheet template
 * Allows users to fill and submit worksheets for tasks
 */
export const WorksheetSubmissionForm = ({ 
  task, 
  template, 
  onSubmit, 
  onCancel,
  isDarkMode = false 
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Initialize form with empty fields
  useEffect(() => {
    if (template && template.fields) {
      const initialData = {};
      template.fields.forEach(field => {
        initialData[field.id] = field.defaultValue || '';
      });
      setFormData(initialData);
    }
  }, [template]);

  // Validate field based on type
  const validateField = (field, value) => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    switch (field.type) {
      case 'number':
        if (value && isNaN(value)) return `${field.label} must be a number`;
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return `${field.label} must be at most ${field.validation.max}`;
        }
        break;

      case 'text':
        if (field.validation?.pattern === 'url' && value) {
          try {
            new URL(value);
          } catch {
            return `${field.label} must be a valid URL`;
          }
        }
        break;

      case 'dropdown':
        if (field.required && (!value || value === '')) {
          return `${field.label} is required`;
        }
        break;

      default:
        break;
    }

    return null;
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    
    template.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle field change
  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const submissionData = {
        taskId: task.id,
        templateId: template.id,
        templateName: template.name,
        categoryId: task.categoryId,
        data: formData
      };

      await onSubmit(submissionData);
      setSubmitStatus('success');
      
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (field) => {
    const baseInputClass = `w-full px-4 py-2 rounded-lg border ${
      errors[field.id]
        ? 'border-red-500 focus:ring-red-500'
        : isDarkMode
          ? 'border-slate-600 focus:ring-blue-500'
          : 'border-gray-300 focus:ring-blue-500'
    } ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'} focus:ring-2 focus:outline-none`;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.decimal ? '0.01' : '1'}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'dropdown':
        return (
          <select
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
            isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-white'
          }`}>
            <input
              type="checkbox"
              checked={formData[field.id] === true}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-5 h-5 accent-blue-500 rounded"
            />
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {field.label}
            </span>
          </label>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                formData[field.id] === option
                  ? isDarkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                  : isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-white'
              }`}>
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 flex justify-between items-center ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <FileText className="text-blue-500" size={24} />
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {template?.name}
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Task: {task?.title}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <X size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {template?.description && (
            <div className={`mb-6 p-4 rounded-lg ${
              isDarkMode ? 'bg-slate-700' : 'bg-blue-50'
            }`}>
              <p className={isDarkMode ? 'text-gray-300' : 'text-blue-900'}>
                {template.description}
              </p>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 rounded-lg bg-green-100 border border-green-300">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={20} />
                <p className="text-green-800 font-medium">
                  ✅ Worksheet submitted successfully!
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-800 font-medium">
                  ❌ Error submitting worksheet. Please try again.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {template?.fields?.map((field) => (
              <div key={field.id}>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {renderField(field)}

                {errors[field.id] && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}

            {/* Submit Actions */}
            <div className={`flex gap-3 pt-6 border-t ${
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                  isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Worksheet
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ==========================================
 * TASK CARD WITH WORKSHEET INDICATOR
 * ==========================================
 * Enhanced task card showing worksheet status
 */
export const TaskCardWithWorksheet = ({ 
  task, 
  onStatusChange, 
  onViewWorksheet,
  onShowCorrection,
  isDarkMode = false,
  isCurrentlyAssigned = true,
  currentUser = null
}) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'approved';
  
  // Get workflow status for doer role
  const workflowStatus = currentUser ? getWorkflowStatusForRole(task, 'doer', currentUser.id || currentUser.user_id) : null;
  
  // Debug logging for doer status
  if (currentUser && (currentUser.username === 'doer2' || currentUser.username?.includes('doer2'))) {
    console.log('🔍 Doer2 Status Check:', {
      taskTitle: task.title,
      taskStatus: task.status,
      currentStage: task.currentStage,
      assignedTo: task.assignedTo,
      teamLeaderId: task.teamLeaderId,
      workflowStatus: workflowStatus,
      userId: currentUser.id || currentUser.user_id,
      isCurrentlyAssigned: isCurrentlyAssigned,
      stageHistory: task.stageHistory?.map(s => ({ stageOrder: s.stageOrder, userId: s.userId }))
    });
  }
  
  // Handle submit button click
  const handleSubmitClick = () => {
    // If task has worksheet and hasn't been completed, open worksheet form
    if (task.hasWorksheet && task.worksheetTemplateId && 
        task.status !== 'completed' && 
        task.status !== 'approved' && 
        task.status !== 'submitted' && 
        task.status !== 'under-review') {
      onViewWorksheet(task);
    } else if (task.status === 'revision-required') {
      // If revision required, open worksheet form again
      onViewWorksheet(task);
    } else if (!task.hasWorksheet || !task.worksheetTemplateId) {
      // Otherwise, just mark as completed if no worksheet
      onStatusChange(task.id, 'completed');
    }
  };

  return (
    <div className={`p-6 rounded-lg ${
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    } shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${
      task.status === 'completed' ? 'border-green-500' :
      task.status === 'in-progress' ? 'border-blue-500' :
      isOverdue ? 'border-red-500' : 'border-gray-300'
    } ${isOverdue && task.status !== 'completed' ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Task Info */}
        <div className="flex-1 space-y-3">
          {/* Title and Status Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {task.title}
            </h3>
            
            {/* Status Badge - Show workflow status if available, otherwise default badge */}
            {workflowStatus ? (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                workflowStatus.includes('Under TL Review')
                  ? isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                  : workflowStatus.includes('Pending') || workflowStatus.includes('Awaiting') 
                  ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                  : workflowStatus.includes('Completed') || workflowStatus.includes('Approved')
                  ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                  : workflowStatus.includes('Corrections Required')
                  ? isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                  : isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>
                {workflowStatus}
              </span>
            ) : (
              <TaskStatusBadge status={task.status} size="sm" />
            )}
            
            {/* Priority Badge */}
            {task.priority && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {task.priority}
              </span>
            )}
            
            {/* Overdue Badge */}
            {isOverdue && task.status !== 'completed' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-red-500 text-white animate-pulse">
                ⚠️ Overdue
              </span>
            )}
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
            
            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                isOverdue ? 'bg-red-100 text-red-700' : 
                isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={isOverdue ? 'font-semibold' : ''}>
                  {new Date(task.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            )}
            
            {/* Estimated Hours */}
            {task.estimatedHours && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{task.estimatedHours}h</span>
              </div>
            )}

            {/* Submission Date */}
            {task.review?.submittedAt && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs">
                  Submitted: {new Date(task.review.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Revision Date */}
            {task.review?.reviewedAt && task.status === 'revision-required' && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-xs">
                  Revision: {new Date(task.review.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Revision Count */}
            {task.revisedCount > 0 && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs font-semibold">
                  {task.revisedCount} {task.revisedCount === 1 ? 'revision' : 'revisions'}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {task.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 min-w-[120px]">
          {/* Show workflow status message if user is not currently assigned and has workflow status */}
          {!isCurrentlyAssigned && workflowStatus && (
            <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
              workflowStatus.includes('Under TL Review')
                ? isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                : workflowStatus.includes('Pending') || workflowStatus.includes('Awaiting')
                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                : workflowStatus.includes('Completed') || workflowStatus.includes('Approved')
                ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                : workflowStatus.includes('Corrections Required')
                ? isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                : isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {workflowStatus.includes('Completed') || workflowStatus.includes('Approved') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : workflowStatus.includes('Pending') || workflowStatus.includes('Awaiting') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
              {workflowStatus}
            </div>
          )}

          {/* Start Button - only show if currently assigned */}
          {isCurrentlyAssigned && (task.status === 'pending' || task.status === 'in-progress') && (
            <button
              onClick={() => onStatusChange(task.id, 'in-progress')}
              disabled={task.status === 'in-progress' || task.status === 'completed'}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                task.status === 'in-progress'
                  ? isDarkMode ? 'bg-blue-900/30 text-blue-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 cursor-not-allowed'
                  : task.status === 'completed'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              } disabled:opacity-50`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start
            </button>
          )}

          {/* Submit Button - only show if currently assigned */}
          {isCurrentlyAssigned && task.status !== 'completed' && 
           task.status !== 'approved' && 
           task.status !== 'submitted' && 
           task.status !== 'under-review' && 
           task.status !== 'initially-approved' && 
           task.status !== 'finally-approved' && 
           task.status !== 'team-leader-review' &&
           !(task.status === 'revision-required' && task.correctionType === 'checker') && (
            <button
              onClick={handleSubmitClick}
              disabled={task.status === 'completed'}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                task.status === 'completed'
                  ? isDarkMode ? 'bg-green-900/30 text-green-400 cursor-not-allowed' : 'bg-green-100 text-green-600 cursor-not-allowed'
                  : task.status === 'revision-required'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              } disabled:opacity-50`}
              title={
                task.status === 'revision-required' 
                  ? 'Click to resubmit with corrections' 
                  : task.hasWorksheet && task.worksheetTemplateId 
                  ? 'Click to fill worksheet and submit' 
                  : 'Mark as complete'
              }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {task.status === 'revision-required' ? 'Resubmit' : 'Submit'}
            </button>
          )}

          {/* Show Correction Button - only show if currently assigned */}
          {isCurrentlyAssigned && task.status === 'revision-required' && onShowCorrection && task.correctionType !== 'checker' && (
            <button
              onClick={() => onShowCorrection(task)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isDarkMode 
                  ? 'bg-orange-900/30 hover:bg-orange-800/30 text-orange-400 border border-orange-600' 
                  : 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300'
              } shadow-sm hover:shadow-md`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Corrections
            </button>
          )}

          {/* Status Info for Submitted/Under Review */}
          {(task.status === 'submitted' || task.status === 'under-review') && (
            <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
              isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Under Review
            </div>
          )}

          {/* Status Info for Team Leader Review - Checker Corrections */}
          {task.status === 'revision-required' && task.correctionType === 'checker' && (
            <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
              isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Awaiting Checker Corrections
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

/**
 * ==========================================
 * USER TASK LIST WITH WORKSHEET SUPPORT
 * ==========================================
 * Main component for user task list with worksheet integration
 */
export const UserTaskListWithWorksheet = ({ 
  currentUser, 
  categories = [],
  isDarkMode = false,
  selectedCategoryId = null
}) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [worksheetTemplate, setWorksheetTemplate] = useState(null);
  const [showWorksheetForm, setShowWorksheetForm] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [taskForCorrection, setTaskForCorrection] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load tasks assigned to current user
  const loadMyTasks = () => {
    setLoading(true);
    try {
      const allTasks = window.TaskService?.getAllTasks?.() || [];
      
      // Get all possible user IDs
      const userIds = [currentUser.id, currentUser.user_id].filter(Boolean);
      
      console.log('🔍 Loading tasks for user:', {
        username: currentUser.username,
        userIds: userIds,
        currentUser: currentUser
      });
      
      const myTasks = allTasks.filter(task => {
        // Check if currently assigned to this user
        const isCurrentlyAssigned = userIds.includes(task.assignedTo);
        
        // CRITICAL FIX FOR CASE 2: Use robust validator to detect next stage doer
        // After team leader approves, task moves to next stage with 'pending' status
        let isNextStageDoerAfterTLApproval = false;
        if (task.workflowId && task.userDependencyId && task.currentStage) {
          const validation = validateNextStageDoerVisibility(task, currentUser.id || currentUser.user_id);
          if (validation.shouldSee) {
            isNextStageDoerAfterTLApproval = true;
            console.log('✅ Next Stage Doer Detected (CASE 2 FIX):', validation.debug);
          }
        }
        
        // For workflow tasks, check if user worked on a COMPLETED stage (not current stage)
        let workedOnCompletedStage = false;
        let workedOnCurrentStage = false;
        let isNextStageDoer = false;
        if (task.workflowId && task.userDependencyId && task.stageHistory && task.currentStage) {
          // Check if user worked on a completed stage (stage < currentStage)
          workedOnCompletedStage = task.stageHistory.some(stage => {
            const stageDoerId = stage.userId || stage.assignedTo;
            const isDoerMatch = userIds.includes(stageDoerId);
            // Only count if this stage is completed (less than current stage)
            const isCompletedStage = stage.stageOrder < task.currentStage;
            return isDoerMatch && isCompletedStage;
          });
          
          // Check if user worked on the current stage (for showing "Under TL Review")
          if (task.currentStage && task.stageHistory) {
            const currentStageHistory = task.stageHistory.find(s => s.stageOrder === task.currentStage);
            workedOnCurrentStage = currentStageHistory && (
              userIds.includes(currentStageHistory.userId) || 
              userIds.includes(currentStageHistory.assignedTo)
            );
          }
          
          // Check if user is the doer for NEXT stage (important for showing "Under TL Review")
          if (window.UserDependencyService) {
            try {
              const nextStageAssignment = window.UserDependencyService.getNextStage(
                task.userDependencyId,
                task.currentStage
              );
              if (nextStageAssignment && userIds.includes(nextStageAssignment.userId)) {
                isNextStageDoer = true;
              }
            } catch (e) {
              // Error getting next stage
            }
          }
        }
        
        // Show task if: 
        // 1. Currently assigned (including next stage doer after TL approval - Case 2 fix)
        // 2. OR user worked on current stage
        // 3. OR task is under team leader review and user worked on that stage or is next stage doer
        // 4. OR user worked on completed stage (will show "Stage Completed" status)
        // 5. OR user is next stage doer (so they can see "Under TL Review" when task is with TL)
        const shouldShow = isCurrentlyAssigned || isNextStageDoerAfterTLApproval || workedOnCurrentStage || 
          (task.status === 'team-leader-review' && (workedOnCurrentStage || isNextStageDoer)) ||
          workedOnCompletedStage || // Show completed stages too (will show "Stage Completed" status)
          isNextStageDoer; // Show to next stage doer so they can see "Under TL Review"
        
        if (shouldShow) {
          console.log('✅ Task matched:', {
            title: task.title,
            assignedTo: task.assignedTo,
            status: task.status,
            isCurrentlyAssigned,
            workedOnCompletedStage,
            workedOnCurrentStage,
            currentStage: task.currentStage,
            stageHistory: task.stageHistory?.map(s => ({ stageOrder: s.stageOrder, userId: s.userId }))
          });
        }
        
        return shouldShow;
      });
      
      setTasks(myTasks);
      console.log(`Loaded ${myTasks.length} tasks for ${currentUser.username}`);
      
      if (myTasks.length === 0 && allTasks.length > 0) {
        console.warn('⚠️ No tasks matched. User IDs:', userIds);
        console.warn('📋 All available tasks:', allTasks.map(t => ({ 
          title: t.title, 
          assignedTo: t.assignedTo,
          assignedToName: t.assignedToName,
          checkerId: t.checkerId,
          checkerName: t.checkerName
        })));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = [...tasks];

    if (selectedCategoryId) {
      result = result.filter(t => t.categoryId === selectedCategoryId);
    }

    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, searchTerm, selectedCategoryId]);

  // Load tasks on mount
  useEffect(() => {
    loadMyTasks();
  }, [currentUser]);

  // Handle view worksheet
  const handleViewWorksheet = (task) => {
    try {
      const template = window.WorksheetService?.getTemplateByCategory?.(task.categoryId);
      
      if (template) {
        setSelectedTask(task);
        setWorksheetTemplate(template);
        setShowWorksheetForm(true);
        console.log('Worksheet template loaded:', template.name);
      } else {
        console.error('No worksheet template found for category:', task.categoryId);
        alert('Worksheet template not found');
      }
    } catch (error) {
      console.error('Error loading worksheet template:', error);
      alert('Error loading worksheet');
    }
  };

  // Handle worksheet submission
  const handleWorksheetSubmit = async (submissionData) => {
    try {
      // Add userId to submission data
      const fullSubmissionData = {
        ...submissionData,
        userId: currentUser.id || currentUser.user_id
      };
      
      const result = window.WorksheetService?.saveSubmission?.(fullSubmissionData);
      
      if (result?.success) {
        console.log('✅ Worksheet submitted successfully');
        
        // Add submission ID to task
        if (result.submission && result.submission.id) {
          window.TaskService?.addWorksheetSubmission?.(
            submissionData.taskId,
            result.submission.id
          );
        }
        
        // Submit task for review instead of marking as completed
        const reviewResult = window.TaskService?.submitTaskForReview?.(
          submissionData.taskId,
          fullSubmissionData,
          currentUser.id || currentUser.user_id
        );
        
        if (reviewResult?.success) {
          setShowWorksheetForm(false);
          loadMyTasks();
          
          // Show success message
          alert('✅ Task submitted for review successfully! Please wait for admin approval.');
        } else {
          throw new Error(reviewResult?.message || 'Failed to submit for review');
        }
      } else {
        throw new Error(result?.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  };

  // Handle show correction
  const handleShowCorrection = (task) => {
    setTaskForCorrection(task);
    setShowCorrectionModal(true);
  };

  // Handle status change
  const handleStatusChange = (taskId, newStatus) => {
    try {
      const result = window.TaskService?.updateTaskStatus?.(
        taskId,
        newStatus,
        currentUser.id || currentUser.user_id
      );

      if (result?.success) {
        loadMyTasks();
        console.log(`✅ Task status updated to ${newStatus}`);
      } else {
        alert(`Error: ${result?.message || 'Failed to update task'}`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className={`rounded-xl ${isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-900' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-blue-100'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📋 My Tasks
              </h2>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage and track your assigned tasks
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className={`text-center px-4 py-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-white'} shadow`}>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {filteredTasks.length}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tasks
                </div>
              </div>
              <div className={`text-center px-4 py-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-white'} shadow`}>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {filteredTasks.filter(t => t.status === 'completed').length}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Done
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search Bar */}
            <div className="flex-1 min-w-[250px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, description..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              />
            </div>

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
              <option value="all">📊 All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="in-progress">🔄 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadMyTasks}
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
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className={`text-center py-16 rounded-xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          } shadow-lg`}>
            <div className="flex flex-col items-center gap-4">
              <Loader className="animate-spin text-blue-500" size={48} />
              <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Loading your tasks...
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Please wait a moment
              </p>
            </div>
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
                  {searchTerm || filterStatus !== 'all' ? 'No tasks match your filters' : 'No tasks assigned yet'}
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'New tasks will appear here when assigned to you'}
                </p>
              </div>
              {(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className={`mt-4 px-6 py-2 rounded-lg font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } shadow hover:shadow-md`}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Showing <span className="font-semibold">{filteredTasks.length}</span> {filteredTasks.length === 1 ? 'task' : 'tasks'}
              {(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="ml-2 text-blue-500 hover:text-blue-600 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            
            {/* Task cards */}
            {filteredTasks.map(task => {
              const userIds = [currentUser.id, currentUser.user_id].filter(Boolean);
              const isCurrentlyAssigned = userIds.includes(task.assignedTo);
              return (
                <TaskCardWithWorksheet
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onViewWorksheet={handleViewWorksheet}
                  onShowCorrection={handleShowCorrection}
                  isDarkMode={isDarkMode}
                  isCurrentlyAssigned={isCurrentlyAssigned}
                  currentUser={currentUser}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Task Submission Flow Modal */}
      {showWorksheetForm && selectedTask && worksheetTemplate && (
        <TaskSubmissionFlow
          task={selectedTask}
          template={worksheetTemplate}
          onSubmit={handleWorksheetSubmit}
          onCancel={() => {
            setShowWorksheetForm(false);
            setSelectedTask(null);
            setWorksheetTemplate(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Correction View Modal */}
      {showCorrectionModal && taskForCorrection && (
        <CorrectionViewModal
          task={taskForCorrection}
          onClose={() => {
            setShowCorrectionModal(false);
            setTaskForCorrection(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default UserTaskListWithWorksheet;