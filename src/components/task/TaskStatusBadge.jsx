// components/TaskStatusBadge.jsx - Task Status Badge Component

import React from 'react';
import { CheckCircle, Clock, PlayCircle, XCircle, Eye, AlertCircle } from 'lucide-react';

const TaskStatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const statusConfig = {
    'pending': {
      label: 'Pending',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      icon: Clock
    },
    'in-progress': {
      label: 'In Progress',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      icon: PlayCircle
    },
    'completed': {
      label: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      icon: CheckCircle
    },
    'cancelled': {
      label: 'Cancelled',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      icon: XCircle
    },
    'submitted': {
      label: 'Submitted',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      icon: Clock
    },
    'under-review': {
      label: 'Under Review',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      icon: Eye
    },
    'approved': {
      label: 'Approved',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      icon: CheckCircle
    },
    'revision-required': {
      label: 'Revision Required',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      icon: AlertCircle
    },
    'initially-approved': {
      label: 'Initially Approved - Pending TL Review',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      icon: Clock
    },
    'team-leader-review': {
      label: 'Under Team Leader Review',
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-300',
      icon: Eye
    },
    'finally-approved': {
      label: 'Finally Approved / Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      icon: CheckCircle
    }
  };

  const sizeConfig = {
    'sm': {
      padding: 'px-2 py-0.5',
      fontSize: 'text-xs',
      iconSize: 12
    },
    'md': {
      padding: 'px-3 py-1',
      fontSize: 'text-xs',
      iconSize: 14
    },
    'lg': {
      padding: 'px-4 py-1.5',
      fontSize: 'text-sm',
      iconSize: 16
    }
  };

  const config = statusConfig[status] || statusConfig['pending'];
  const sizeStyle = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 
      ${config.bgColor} 
      ${config.textColor} 
      ${sizeStyle.padding} 
      ${sizeStyle.fontSize}
      rounded-full 
      font-medium 
      border 
      ${config.borderColor}
    `}>
      {showIcon && <Icon size={sizeStyle.iconSize} />}
      {config.label}
    </span>
  );
};

export default TaskStatusBadge;