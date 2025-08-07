// Centralized Error Handling System for PacksList
// Replaces console.log, alert, and provides consistent error management

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
    this.isProduction = window.location.hostname === 'your-production-domain.com';
    this.debugMode = !this.isProduction;
    
    // Error levels
    this.levels = {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
      CRITICAL: 'critical'
    };
    
    // Initialize error handling
    this.init();
  }

  init() {
    // Override console methods in production
    if (this.isProduction) {
      this.overrideConsole();
    }
    
    // Global error handlers
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'Global Error', this.levels.ERROR);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'Unhandled Promise Rejection', this.levels.ERROR);
    });
  }

  // Override console methods in production
  overrideConsole() {
    const originalConsole = { ...console };
    
    console.log = (...args) => {
      this.log(args.join(' '), this.levels.DEBUG);
      if (this.debugMode) originalConsole.log(...args);
    };
    
    console.info = (...args) => {
      this.log(args.join(' '), this.levels.INFO);
      if (this.debugMode) originalConsole.info(...args);
    };
    
    console.warn = (...args) => {
      this.log(args.join(' '), this.levels.WARN);
      if (this.debugMode) originalConsole.warn(...args);
    };
    
    console.error = (...args) => {
      this.log(args.join(' '), this.levels.ERROR);
      if (this.debugMode) originalConsole.error(...args);
    };
  }

  // Main logging method
  log(message, level = this.levels.INFO, context = null, data = null) {
    const timestamp = new Date().toISOString();
    const errorEntry = {
      id: this.generateId(),
      timestamp,
      level,
      message: this.sanitizeMessage(message),
      context,
      data: this.sanitizeData(data),
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100)
    };
    
    // Add to error collection
    this.errors.unshift(errorEntry);
    
    // Limit error collection size
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    // Handle based on level
    this.processError(errorEntry);
    
    return errorEntry.id;
  }

  // Process error based on level
  processError(errorEntry) {
    const { level, message, context } = errorEntry;
    
    switch (level) {
      case this.levels.DEBUG:
        // Only log in debug mode
        break;
        
      case this.levels.INFO:
        // Log for debugging
        break;
        
      case this.levels.WARN:
        // Show user-friendly warning if needed
        if (this.shouldShowToUser(message)) {
          this.showToast(message, 'warning');
        }
        break;
        
      case this.levels.ERROR:
        // Show error to user and log
        if (this.shouldShowToUser(message)) {
          this.showToast(this.getUserFriendlyMessage(message), 'error');
        }
        this.reportError(errorEntry);
        break;
        
      case this.levels.CRITICAL:
        // Critical errors - always show and report
        this.showModal('System Error', this.getUserFriendlyMessage(message));
        this.reportError(errorEntry);
        break;
    }
  }

  // Handle JavaScript errors
  handleError(error, context = 'Unknown', level = this.levels.ERROR) {
    let message = 'An error occurred';
    let data = null;
    
    if (error instanceof Error) {
      message = `${error.name}: ${error.message}`;
      data = {
        stack: error.stack,
        fileName: error.fileName,
        lineNumber: error.lineNumber
      };
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = JSON.stringify(error);
    }
    
    return this.log(message, level, context, data);
  }

  // API error handling
  handleApiError(response, context = 'API Call') {
    const message = `API Error: ${response.status} ${response.statusText}`;
    const data = {
      url: response.url,
      status: response.status,
      statusText: response.statusText
    };
    
    return this.log(message, this.levels.ERROR, context, data);
  }

  // Firebase error handling
  handleFirebaseError(error, context = 'Firebase') {
    const message = `Firebase Error: ${error.code} - ${error.message}`;
    const data = {
      code: error.code,
      message: error.message,
      details: error.details
    };
    
    return this.log(message, this.levels.ERROR, context, data);
  }

  // Authentication error handling
  handleAuthError(error, context = 'Authentication') {
    let userMessage = 'Authentication failed';
    let level = this.levels.ERROR;
    
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          userMessage = 'User not found. Please check your email address.';
          break;
        case 'auth/wrong-password':
          userMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          userMessage = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/weak-password':
          userMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          userMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          userMessage = 'Authentication error. Please try again.';
      }
    }
    
    const errorId = this.log(error.message || userMessage, level, context, { code: error.code });
    this.showToast(userMessage, 'error');
    
    return errorId;
  }

  // Form validation error handling
  handleValidationError(fieldName, errors, context = 'Validation') {
    const message = `Validation failed for ${fieldName}: ${errors.join(', ')}`;
    return this.log(message, this.levels.WARN, context, { field: fieldName, errors });
  }

  // Network error handling
  handleNetworkError(error, context = 'Network') {
    const message = 'Network connection failed. Please check your internet connection.';
    const errorId = this.log(error.message || message, this.levels.ERROR, context);
    this.showToast(message, 'error');
    return errorId;
  }

  // Debug logging (replaces console.log)
  debug(message, data = null) {
    return this.log(message, this.levels.DEBUG, 'Debug', data);
  }

  // Info logging
  info(message, data = null) {
    return this.log(message, this.levels.INFO, 'Info', data);
  }

  // Warning logging
  warn(message, data = null) {
    return this.log(message, this.levels.WARN, 'Warning', data);
  }

  // Error logging
  error(message, data = null) {
    return this.log(message, this.levels.ERROR, 'Error', data);
  }

  // Critical error logging
  critical(message, data = null) {
    return this.log(message, this.levels.CRITICAL, 'Critical', data);
  }

  // Show toast notification (replaces some alerts)
  showToast(message, type = 'info', duration = 4000) {
    if (window.domUtils) {
      return window.domUtils.createToast(message, type, duration);
    }
    
    // Fallback toast creation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-message">${this.escapeHtml(message)}</div>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `;
    
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, duration);
    
    return toast;
  }

  // Show modal dialog (replaces alerts/confirms)
  showModal(title, message, options = {}) {
    return new Promise((resolve) => {
      if (window.domUtils) {
        const modal = window.domUtils.createModal(title, message, {
          ...options,
          onConfirm: () => resolve(true)
        });
        
        // Handle cancel/close
        const overlay = modal;
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        
        [overlay, cancelBtn, closeBtn].forEach(el => {
          if (el) {
            el.addEventListener('click', (e) => {
              if (e.target === el) {
                resolve(false);
              }
            });
          }
        });
        
        return modal;
      }
      
      // Fallback to browser modal
      const result = options.confirmText ? confirm(`${title}\n\n${message}`) : alert(`${title}\n\n${message}`);
      resolve(result);
    });
  }

  // Show confirmation dialog (replaces confirm())
  async confirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return this.showModal(title, message, {
      confirmText,
      showCancel: true
    });
  }

  // Show input dialog (replaces prompt())
  async prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const content = `
        <p>${this.escapeHtml(message)}</p>
        <input type="text" id="prompt-input" value="${this.escapeHtml(defaultValue)}" 
               style="width: 100%; padding: 8px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;">
      `;
      
      if (window.domUtils) {
        const modal = window.domUtils.createModal(title, content, {
          confirmText: 'OK',
          onConfirm: () => {
            const input = modal.querySelector('#prompt-input');
            resolve(input ? input.value : null);
          }
        });
        
        // Focus input
        setTimeout(() => {
          const input = modal.querySelector('#prompt-input');
          if (input) input.focus();
        }, 100);
        
        // Handle cancel
        const cancelBtn = modal.querySelector('.modal-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => resolve(null));
        }
        
        return modal;
      }
      
      // Fallback
      resolve(prompt(message, defaultValue));
    });
  }

  // Sanitize message for logging
  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      message = String(message);
    }
    
    return message.substring(0, 1000); // Limit message length
  }

  // Sanitize data for logging
  sanitizeData(data) {
    if (!data) return null;
    
    try {
      // Remove sensitive information
      const sanitized = JSON.parse(JSON.stringify(data));
      this.removeSensitiveData(sanitized);
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize data' };
    }
  }

  // Remove sensitive information from data
  removeSensitiveData(obj) {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          this.removeSensitiveData(obj[key]);
        }
      });
    }
  }

  // Check if error should be shown to user
  shouldShowToUser(message) {
    const internalErrors = [
      'console.log',
      'debug',
      'firebase internal',
      'network timeout'
    ];
    
    return !internalErrors.some(internal => 
      message.toLowerCase().includes(internal.toLowerCase())
    );
  }

  // Get user-friendly error message
  getUserFriendlyMessage(message) {
    const friendlyMessages = {
      'network error': 'Please check your internet connection and try again.',
      'firebase error': 'Server connection failed. Please try again later.',
      'validation error': 'Please check your input and try again.',
      'auth error': 'Authentication failed. Please sign in again.',
      'permission denied': 'You don\'t have permission to perform this action.',
      'not found': 'The requested item could not be found.',
      'server error': 'Server error occurred. Please try again later.'
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [key, friendly] of Object.entries(friendlyMessages)) {
      if (lowerMessage.includes(key)) {
        return friendly;
      }
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // Report error to external service (in production)
  reportError(errorEntry) {
    if (!this.isProduction) return;
    
    // Here you would send to your error reporting service
    // e.g., Sentry, LogRocket, etc.
    
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorEntry)
      }).catch(() => {
        // Silently fail - don't create more errors
      });
    } catch (error) {
      // Silently fail
    }
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get error statistics
  getStats() {
    const stats = {
      total: this.errors.length,
      byLevel: {},
      recent: this.errors.slice(0, 10),
      oldestError: this.errors[this.errors.length - 1]?.timestamp,
      newestError: this.errors[0]?.timestamp
    };
    
    // Count by level
    this.errors.forEach(error => {
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
    });
    
    return stats;
  }

  // Export errors for debugging
  exportErrors() {
    const data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errors: this.errors,
      stats: this.getStats()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `packslist-errors-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return data;
  }

  // Clear error log
  clearErrors() {
    this.errors = [];
    this.info('Error log cleared', { action: 'clear_errors' });
  }

  // Search errors
  searchErrors(query, level = null) {
    return this.errors.filter(error => {
      const matchesQuery = !query || error.message.toLowerCase().includes(query.toLowerCase());
      const matchesLevel = !level || error.level === level;
      return matchesQuery && matchesLevel;
    });
  }
}

// CSS for error handling UI
const errorHandlerCSS = `
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
  }
  
  .toast {
    background: white;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-left: 4px solid #4CAF50;
    animation: slideInRight 0.3s ease-out;
    max-width: 100%;
    word-wrap: break-word;
  }
  
  .toast.toast-error {
    border-left-color: #e74c3c;
  }
  
  .toast.toast-warning {
    border-left-color: #f39c12;
  }
  
  .toast.toast-info {
    border-left-color: #3498db;
  }
  
  .toast-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    gap: 12px;
  }
  
  .toast-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
  }
  
  .toast-close {
    background: none;
    border: none;
    font-size: 16px;
    color: #6c757d;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .toast-close:hover {
    background: rgba(0,0,0,0.1);
    color: #333;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  }
  
  .modal-dialog {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    animation: scaleIn 0.3s ease-out;
  }
  
  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 20px;
    color: #6c757d;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .modal-close:hover {
    background: rgba(0,0,0,0.1);
    color: #333;
  }
  
  .modal-body {
    padding: 20px;
    color: #555;
    line-height: 1.6;
  }
  
  .modal-footer {
    padding: 20px;
    border-top: 1px solid #e9ecef;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-outline {
    background: transparent;
    border: 1px solid #6c757d;
    color: #6c757d;
  }
  
  .btn-outline:hover {
    background: #6c757d;
    color: white;
  }
  
  .btn-primary {
    background: #4CAF50;
    color: white;
  }
  
  .btn-primary:hover {
    background: #45a049;
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @media (max-width: 480px) {
    .toast-container {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
    
    .modal-dialog {
      margin: 20px;
      width: auto;
    }
    
    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 16px;
    }
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = errorHandlerCSS;
  document.head.appendChild(style);
}

// Create global instance
window.errorHandler = new ErrorHandler();

// Create convenience methods globally
window.showToast = (message, type, duration) => window.errorHandler.showToast(message, type, duration);
window.showModal = (title, message, options) => window.errorHandler.showModal(title, message, options);
window.showConfirm = (title, message, confirmText, cancelText) => window.errorHandler.confirm(title, message, confirmText, cancelText);
window.showPrompt = (title, message, defaultValue) => window.errorHandler.prompt(title, message, defaultValue);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}