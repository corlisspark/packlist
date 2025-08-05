// Debug Console Module
// Handles debug logging, console display, and system monitoring

class DebugConsole {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
    this.consoleElement = null;
    this.isInitialized = false;
    this.logLevels = {
      error: { priority: 4, color: '#ff4444', prefix: 'ERROR' },
      warn: { priority: 3, color: '#ffaa00', prefix: 'WARN' },
      info: { priority: 2, color: '#00ff00', prefix: 'INFO' },
      debug: { priority: 1, color: '#00aaff', prefix: 'DEBUG' }
    };
    this.currentLogLevel = 'debug'; // Show all logs by default
  }

  // Initialize debug console
  initialize() {
    if (this.isInitialized) return;

    try {
      this.setupConsoleElement();
      this.setupEventListeners();
      this.interceptConsoleLogs();

      this.isInitialized = true;
      this.log('Debug console initialized', 'info');

      if (window.errorHandler) {
        window.errorHandler.debug('Debug console module initialized');
      }
    } catch (error) {
      console.error('Failed to initialize debug console:', error);
    }
  }

  // Setup console element styling and behavior
  setupConsoleElement() {
    this.consoleElement = document.getElementById('debug-console');
    
    if (this.consoleElement) {
      this.consoleElement.style.cssText = `
        background: #1a1a1a;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 4px;
        height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        border: 1px solid #333;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
      `;

      // Add scrollbar styling
      const style = document.createElement('style');
      style.textContent = `
        #debug-console::-webkit-scrollbar {
          width: 8px;
        }
        #debug-console::-webkit-scrollbar-track {
          background: #2a2a2a;
        }
        #debug-console::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }
        #debug-console::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
      `;
      
      if (!document.querySelector('#debug-console-styles')) {
        style.id = 'debug-console-styles';
        document.head.appendChild(style);
      }
    }
  }

  // Setup event listeners for console controls
  setupEventListeners() {
    // Clear console button
    const clearBtn = document.getElementById('clear-console-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearLogs();
      });
    }

    // Export logs button
    const exportBtn = document.getElementById('export-logs-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportLogs();
      });
    }

    // Log level filter
    const levelFilter = document.getElementById('log-level-filter');
    if (levelFilter) {
      levelFilter.addEventListener('change', (e) => {
        this.setLogLevel(e.target.value);
      });
    }

    // Auto-scroll toggle
    const autoScrollToggle = document.getElementById('auto-scroll-toggle');
    if (autoScrollToggle) {
      autoScrollToggle.addEventListener('change', (e) => {
        this.autoScroll = e.target.checked;
      });
    }
  }

  // Intercept console methods to capture all logs
  interceptConsoleLogs() {
    const originalMethods = {};
    
    ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
      originalMethods[method] = console[method];
      
      console[method] = (...args) => {
        // Call original method
        originalMethods[method].apply(console, args);
        
        // Log to our debug console
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const level = method === 'log' ? 'info' : method;
        this.log(message, level, false); // Don't double-log to browser console
      };
    });

    // Store original methods for cleanup
    this.originalConsoleMethods = originalMethods;
  }

  // Log message to debug console
  log(message, level = 'info', logToBrowser = true) {
    const timestamp = new Date().toLocaleTimeString();
    const logLevel = this.logLevels[level] || this.logLevels.info;
    
    const logEntry = {
      timestamp,
      level,
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message),
      priority: logLevel.priority,
      color: logLevel.color,
      prefix: logLevel.prefix
    };

    // Add to logs array
    this.logs.push(logEntry);
    
    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update console display
    this.updateConsoleDisplay();

    // Log to browser console if requested
    if (logToBrowser && console[level]) {
      console[level](`[${timestamp}]`, message);
    }

    // Fire event for other components
    window.dispatchEvent(new CustomEvent('debugLog', {
      detail: logEntry
    }));
  }

  // Update console display
  updateConsoleDisplay() {
    if (!this.consoleElement) return;

    const currentLevelPriority = this.logLevels[this.currentLogLevel]?.priority || 0;
    const filteredLogs = this.logs.filter(log => log.priority >= currentLevelPriority);

    const logText = filteredLogs.map(log => {
      return `[${log.timestamp}] ${log.prefix}: ${log.message}`;
    }).join('\n');

    if (window.domUtils) {
      window.domUtils.setText(this.consoleElement, logText);
    } else {
      this.consoleElement.textContent = logText;
    }

    // Auto-scroll to bottom if enabled
    if (this.autoScroll !== false) { // Default to true
      this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
    }
  }

  // Set log level filter
  setLogLevel(level) {
    if (this.logLevels[level]) {
      this.currentLogLevel = level;
      this.updateConsoleDisplay();
      this.log(`Log level set to: ${level.toUpperCase()}`, 'info');
    }
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    this.updateConsoleDisplay();
    this.log('Console cleared', 'info');
  }

  // Export logs to file
  exportLogs() {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        environment: 'development',
        totalLogs: this.logs.length,
        logs: this.logs
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.log('Logs exported successfully', 'info');

      if (window.errorHandler) {
        window.errorHandler.info('Debug logs exported');
      }
    } catch (error) {
      this.log(`Failed to export logs: ${error.message}`, 'error');
      
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Log Export');
      }
    }
  }

  // Get system information
  getSystemInfo() {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // App-specific info
      firebaseLoaded: typeof firebase !== 'undefined',
      authManagerActive: !!window.authManager,
      errorHandlerActive: !!window.errorHandler,
      secureConfigActive: !!window.secureConfig,
      
      // Performance info
      performanceSupported: 'performance' in window,
      memoryInfo: performance.memory ? {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
      } : 'Not available'
    };

    return info;
  }

  // Log system information
  logSystemInfo() {
    const info = this.getSystemInfo();
    this.log('=== SYSTEM INFORMATION ===', 'info');
    
    Object.entries(info).forEach(([key, value]) => {
      if (typeof value === 'object') {
        this.log(`${key}: ${JSON.stringify(value)}`, 'info');
      } else {
        this.log(`${key}: ${value}`, 'info');
      }
    });
    
    this.log('=== END SYSTEM INFO ===', 'info');
  }

  // Monitor system performance
  startPerformanceMonitoring() {
    if (!('performance' in window)) {
      this.log('Performance monitoring not supported', 'warn');
      return;
    }

    this.performanceMonitor = setInterval(() => {
      const memory = performance.memory;
      if (memory) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        
        if (usedMB > 100) { // Warn if over 100MB
          this.log(`Memory usage: ${usedMB}/${totalMB} MB`, 'warn');
        }
      }
    }, 30000); // Check every 30 seconds

    this.log('Performance monitoring started', 'info');
  }

  // Stop performance monitoring
  stopPerformanceMonitoring() {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
      this.log('Performance monitoring stopped', 'info');
    }
  }

  // Get recent logs
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  // Search logs
  searchLogs(query, level = null) {
    return this.logs.filter(log => {
      const matchesQuery = log.message.toLowerCase().includes(query.toLowerCase());
      const matchesLevel = !level || log.level === level;
      return matchesQuery && matchesLevel;
    });
  }

  // Get log statistics
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {}
    };

    Object.keys(this.logLevels).forEach(level => {
      stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
    });

    return stats;
  }

  // Cleanup and restore
  destroy() {
    // Stop performance monitoring
    this.stopPerformanceMonitoring();

    // Restore original console methods
    if (this.originalConsoleMethods) {
      Object.keys(this.originalConsoleMethods).forEach(method => {
        console[method] = this.originalConsoleMethods[method];
      });
    }

    // Clear logs
    this.clearLogs();

    // Remove styles
    const styles = document.getElementById('debug-console-styles');
    if (styles) {
      styles.remove();
    }

    this.isInitialized = false;
    this.log('Debug console destroyed', 'info');
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.DebugConsole = DebugConsole;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugConsole;
}