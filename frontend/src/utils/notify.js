import { toast } from 'react-toastify';
import api from './api';

/**
 * Smart notification utility that:
 * - Sends in-app notifications for logged-in users (when Header is visible)
 * - Shows toast notifications for logged-out users or pages without Header
 * 
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.payload - Additional payload data (for in-app notifications)
 * @param {string} options.type - Notification type: 'success', 'error', 'info', 'warning'
 * @param {boolean} options.forceToast - Force toast notification even if logged in
 */
export const notify = async ({ title, message, payload = {}, type = 'info', forceToast = false }) => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  // If forced to use toast, or user is not logged in, use toast
  if (forceToast || !isLoggedIn) {
    switch (type) {
      case 'success':
        toast.success(message || title);
        break;
      case 'error':
        toast.error(message || title);
        break;
      case 'warning':
        toast.warning(message || title);
        break;
      case 'info':
      default:
        toast.info(message || title);
        break;
    }
    return;
  }

  // For logged-in users, send in-app notification
  try {
    await api.post('/api/notifications', {
      title: title || message,
      message: message || title,
      payload: {
        ...payload,
        type: type // Include type in payload for UI styling
      }
    });
  } catch (error) {
    // If notification API fails, fallback to toast
    console.error('Failed to send in-app notification:', error);
    switch (type) {
      case 'success':
        toast.success(message || title);
        break;
      case 'error':
        toast.error(message || title);
        break;
      case 'warning':
        toast.warning(message || title);
        break;
      case 'info':
      default:
        toast.info(message || title);
        break;
    }
  }
};

/**
 * Convenience functions for different notification types
 */
export const notifySuccess = (title, message, payload = {}, forceToast = false) => {
  return notify({ title, message, payload, type: 'success', forceToast });
};

export const notifyError = (title, message, payload = {}, forceToast = false) => {
  return notify({ title, message, payload, type: 'error', forceToast });
};

export const notifyWarning = (title, message, payload = {}, forceToast = false) => {
  return notify({ title, message, payload, type: 'warning', forceToast });
};

export const notifyInfo = (title, message, payload = {}, forceToast = false) => {
  return notify({ title, message, payload, type: 'info', forceToast });
};

