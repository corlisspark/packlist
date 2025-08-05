// System Testing Module
// Handles system-wide tests, performance monitoring, and health checks

class SystemTester {
  constructor(debugLogger) {
    this.debugLogger = debugLogger;
    this.testResults = { run: 0, passed: 0, failed: 0 };
    this.performanceMonitor = null;
    this.healthCheckInterval = null;
  }

  // Update test results
  updateTestResults(passed = false) {
    this.testResults.run++;
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }
    
    // Notify parent about test results update
    window.dispatchEvent(new CustomEvent('testResultsUpdate', {
      detail: { module: 'system', results: this.testResults }
    }));
  }

  // Update test result display
  updateTestResultDisplay(elementId, result, success = true) {
    const element = document.getElementById(elementId);
    if (element && window.domUtils) {
      window.domUtils.setHTML(element, `
        <div class="test-result-item ${success ? 'success' : 'error'}">
          <div class="test-timestamp">${new Date().toLocaleTimeString()}</div>
          <div class="test-message">${window.domUtils.escapeHTML(result)}</div>
        </div>
      `);
    }
  }

  // Test all core managers
  async testCoreManagers() {
    try {
      this.debugLogger?.log('Testing core system managers...');
      
      const managers = [
        { name: 'Auth Manager', instance: window.authManager, required: true },
        { name: 'Error Handler', instance: window.errorHandler, required: true },
        { name: 'Secure Config', instance: window.secureConfig, required: true },
        { name: 'Input Validator', instance: window.inputValidator, required: true },
        { name: 'DOM Utils', instance: window.domUtils, required: true },
        { name: 'Map Manager', instance: window.mapManager, required: false },
        { name: 'Search Manager', instance: window.searchManager, required: false },
        { name: 'Vendor Display Manager', instance: window.vendorDisplayManager, required: false }
      ];

      const results = [];
      let allRequired = true;

      for (const manager of managers) {
        const exists = !!manager.instance;
        const initialized = manager.instance?.isInitialized !== false;
        
        if (exists && initialized) {
          results.push(`✓ ${manager.name}: Active`);
        } else if (exists) {
          results.push(`⚠ ${manager.name}: Not initialized`);
          if (manager.required) allRequired = false;
        } else {
          results.push(`✗ ${manager.name}: Missing`);
          if (manager.required) allRequired = false;
        }
      }

      const result = `Core Managers Status:\n${results.join('\n')}`;
      this.updateTestResultDisplay('system-health-result', result, allRequired);
      this.updateTestResults(allRequired);
      
    } catch (error) {
      this.updateTestResultDisplay('system-health-result', `Manager test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Core managers test failed: ${error.message}`, 'error');
    }
  }

  // Test security implementations
  async testSecuritySystems() {
    try {
      this.debugLogger?.log('Testing security systems...');
      
      const securityChecks = [];
      
      // Check XSS protection
      if (window.domUtils) {
        const testString = '<script>alert("xss")</script>';
        const sanitized = window.domUtils.escapeHTML(testString);
        const isProtected = !sanitized.includes('<script>');
        securityChecks.push(`XSS Protection: ${isProtected ? '✓ Active' : '✗ Failed'}`);
      } else {
        securityChecks.push('XSS Protection: ✗ Not available');
      }

      // Check input validation
      if (window.inputValidator) {
        const testEmail = 'test@example.com';
        const validation = window.inputValidator.validateEmail(testEmail);
        const isWorking = validation && validation.isValid === true;
        securityChecks.push(`Input Validation: ${isWorking ? '✓ Working' : '✗ Failed'}`);
      } else {
        securityChecks.push('Input Validation: ✗ Not available');
      }

      // Check secure config
      if (window.secureConfig) {
        const hasConfig = !!window.secureConfig.getFirebaseConfig;
        securityChecks.push(`Secure Config: ${hasConfig ? '✓ Active' : '✗ Failed'}`);
      } else {
        securityChecks.push('Secure Config: ✗ Not available');
      }

      // Check error handling
      if (window.errorHandler) {
        const hasSecureHandling = typeof window.errorHandler.handleError === 'function';
        securityChecks.push(`Error Handling: ${hasSecureHandling ? '✓ Secure' : '✗ Insecure'}`);
      } else {
        securityChecks.push('Error Handling: ✗ Not available');
      }

      const result = `Security Systems:\n${securityChecks.join('\n')}`;
      const allSecure = securityChecks.every(check => check.includes('✓'));
      
      this.updateTestResultDisplay('security-test-result', result, allSecure);
      this.updateTestResults(allSecure);
      
    } catch (error) {
      this.updateTestResultDisplay('security-test-result', `Security test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Security test failed: ${error.message}`, 'error');
    }
  }

  // Test performance metrics
  async testPerformance() {
    try {
      this.debugLogger?.log('Testing system performance...');
      
      const performanceChecks = [];
      
      // Memory usage
      if (performance.memory) {
        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        const isHealthy = memoryMB < 150; // Under 150MB is good
        performanceChecks.push(`Memory Usage: ${memoryMB}MB ${isHealthy ? '✓' : '⚠'}`);
      } else {
        performanceChecks.push('Memory Usage: Not available');
      }

      // DOM elements count
      const elementCount = document.getElementsByTagName('*').length;
      const domHealthy = elementCount < 2000; // Under 2000 elements is good
      performanceChecks.push(`DOM Elements: ${elementCount} ${domHealthy ? '✓' : '⚠'}`);

      // Event listeners (approximate)
      const bodyEvents = Object.keys(document.body).filter(key => key.startsWith('on')).length;
      performanceChecks.push(`Event Listeners: ~${bodyEvents} registered`);

      // Local Storage usage
      let storageSize = 0;
      try {
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            storageSize += localStorage[key].length;
          }
        }
        const storageMB = (storageSize / 1024 / 1024).toFixed(2);
        performanceChecks.push(`LocalStorage: ${storageMB}MB used`);
      } catch (e) {
        performanceChecks.push('LocalStorage: Access denied');
      }

      // Network status
      const networkStatus = navigator.onLine ? '✓ Online' : '✗ Offline';
      performanceChecks.push(`Network: ${networkStatus}`);

      const result = `Performance Metrics:\n${performanceChecks.join('\n')}`;
      this.updateTestResultDisplay('performance-test-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('performance-test-result', `Performance test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Performance test failed: ${error.message}`, 'error');
    }
  }

  // Test error handling system
  async testErrorHandling() {
    try {
      this.debugLogger?.log('Testing error handling system...');
      
      const errorTests = [];
      
      // Test centralized error handler
      if (window.errorHandler) {
        try {
          const testError = new Error('Test error for validation');
          window.errorHandler.handleError(testError, 'Error Handler Test');
          errorTests.push('✓ Centralized error handling works');
        } catch (e) {
          errorTests.push('✗ Centralized error handling failed');
        }
      } else {
        errorTests.push('✗ No centralized error handler');
      }

      // Test modal system
      if (window.errorHandler && window.errorHandler.showModal) {
        errorTests.push('✓ Modal system available');
      } else {
        errorTests.push('✗ No modal system');
      }

      // Test toast notifications
      if (window.errorHandler && window.errorHandler.showToast) {
        errorTests.push('✓ Toast notifications available');
      } else {
        errorTests.push('✗ No toast notifications');
      }

      // Test Firebase error handling
      if (window.errorHandler && window.errorHandler.handleFirebaseError) {
        errorTests.push('✓ Firebase error handling available');
      } else {
        errorTests.push('✗ No Firebase error handling');
      }

      const result = `Error Handling Tests:\n${errorTests.join('\n')}`;
      const allPassed = errorTests.every(test => test.startsWith('✓'));
      
      this.updateTestResultDisplay('error-handling-result', result, allPassed);
      this.updateTestResults(allPassed);
      
    } catch (error) {
      this.updateTestResultDisplay('error-handling-result', `Error handling test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Error handling test failed: ${error.message}`, 'error');
    }
  }

  // Start continuous health monitoring
  startHealthMonitoring() {
    try {
      this.debugLogger?.log('Starting continuous health monitoring...');
      
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, 60000); // Check every minute

      const result = 'Health monitoring started - checking every 60 seconds';
      this.updateTestResultDisplay('monitoring-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('monitoring-result', `Health monitoring failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Health monitoring start failed: ${error.message}`, 'error');
    }
  }

  // Stop health monitoring
  stopHealthMonitoring() {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      const result = 'Health monitoring stopped';
      this.updateTestResultDisplay('monitoring-result', result, true);
      this.debugLogger?.log('Health monitoring stopped');
      
    } catch (error) {
      this.debugLogger?.log(`Error stopping health monitoring: ${error.message}`, 'error');
    }
  }

  // Perform health check
  performHealthCheck() {
    const issues = [];
    
    // Check memory usage
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      if (memoryMB > 200) {
        issues.push(`High memory usage: ${memoryMB}MB`);
      }
    }

    // Check for JavaScript errors
    if (window.errorHandler && window.errorHandler.getErrorCount) {
      const errorCount = window.errorHandler.getErrorCount();
      if (errorCount > 10) {
        issues.push(`High error count: ${errorCount}`);
      }
    }

    // Check network status
    if (!navigator.onLine) {
      issues.push('Network offline');
    }

    // Log issues if found
    if (issues.length > 0) {
      this.debugLogger?.log(`Health check issues: ${issues.join(', ')}`, 'warn');
    } else {
      this.debugLogger?.log('Health check: All systems normal', 'debug');
    }
  }

  // Test all system components
  async runFullSystemTest() {
    try {
      this.debugLogger?.log('Running full system test suite...');
      
      const testSuite = [
        { name: 'Core Managers', test: () => this.testCoreManagers() },
        { name: 'Security Systems', test: () => this.testSecuritySystems() },
        { name: 'Performance', test: () => this.testPerformance() },
        { name: 'Error Handling', test: () => this.testErrorHandling() }
      ];

      const results = [];
      
      for (const { name, test } of testSuite) {
        try {
          await test();
          results.push(`✓ ${name}: Passed`);
        } catch (error) {
          results.push(`✗ ${name}: Failed (${error.message})`);
        }
      }

      const result = `Full System Test Results:\n${results.join('\n')}`;
      const allPassed = results.every(r => r.startsWith('✓'));
      
      this.updateTestResultDisplay('system-health-result', result, allPassed);
      this.debugLogger?.log(`Full system test completed: ${allPassed ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      this.updateTestResultDisplay('system-health-result', `Full system test failed: ${error.message}`, false);
      this.debugLogger?.log(`Full system test failed: ${error.message}`, 'error');
    }
  }

  // Get detailed system report
  generateSystemReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.getTestResults(),
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      },
      performance: performance.memory ? {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      } : 'Not available',
      managers: {
        authManager: !!window.authManager,
        errorHandler: !!window.errorHandler,
        secureConfig: !!window.secureConfig,
        inputValidator: !!window.inputValidator,
        domUtils: !!window.domUtils
      }
    };

    return report;
  }

  // Export system report
  exportSystemReport() {
    try {
      const report = this.generateSystemReport();
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.debugLogger?.log('System report exported successfully');
      
      if (window.errorHandler) {
        window.errorHandler.info('System report exported');
      }
    } catch (error) {
      this.debugLogger?.log(`Failed to export system report: ${error.message}`, 'error');
      
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'System Report Export');
      }
    }
  }

  // Get test results summary
  getTestResults() {
    return { ...this.testResults };
  }

  // Reset test results
  resetTestResults() {
    this.testResults = { run: 0, passed: 0, failed: 0 };
  }

  // Cleanup
  destroy() {
    this.stopHealthMonitoring();
    this.resetTestResults();
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.SystemTester = SystemTester;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemTester;
}