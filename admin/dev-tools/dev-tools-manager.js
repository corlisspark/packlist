// Developer Tools Manager
// Coordinates all testing modules and provides unified interface

class DevToolsManager {
  constructor() {
    this.isInitialized = false;
    this.testModules = {};
    this.debugConsole = null;
    this.overallTestResults = {
      run: 0,
      passed: 0,
      failed: 0
    };
  }

  // Initialize developer tools manager
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (window.errorHandler) {
        window.errorHandler.debug('Initializing developer tools manager');
      }

      // Initialize debug console first
      await this.initializeDebugConsole();

      // Initialize testing modules
      await this.initializeTestModules();

      // Setup UI
      this.setupTabSwitching();
      this.setupEventListeners();

      this.isInitialized = true;
      this.debugConsole?.log('Developer Tools Manager initialized successfully', 'info');

      // Log system info on startup
      this.debugConsole?.logSystemInfo();

    } catch (error) {
      console.error('Failed to initialize developer tools manager:', error);
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Developer Tools Initialization');
      }
    }
  }

  // Initialize debug console
  async initializeDebugConsole() {
    if (window.DebugConsole) {
      this.debugConsole = new window.DebugConsole();
      await this.debugConsole.initialize();
      this.debugConsole.startPerformanceMonitoring();
    } else {
      console.warn('DebugConsole class not available');
    }
  }

  // Initialize all testing modules
  async initializeTestModules() {
    const moduleConfigs = [
      { name: 'auth', class: window.AuthTester, displayName: 'Authentication' },
      { name: 'firebase', class: window.FirebaseTester, displayName: 'Firebase' },
      { name: 'system', class: window.SystemTester, displayName: 'System' }
    ];

    for (const config of moduleConfigs) {
      try {
        if (config.class) {
          this.testModules[config.name] = new config.class(this.debugConsole);
          this.debugConsole?.log(`${config.displayName} tester initialized`, 'info');
        } else {
          this.debugConsole?.log(`${config.displayName} tester class not available`, 'warn');
        }
      } catch (error) {
        this.debugConsole?.log(`Failed to initialize ${config.displayName} tester: ${error.message}`, 'error');
      }
    }
  }

  // Setup tab switching functionality
  setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.dev-tools-tabs .tab-btn');
    const tabPanes = document.querySelectorAll('.dev-tool-tab');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update tab panes
        tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(`${tabId}-tab`);
        if (targetPane) {
          targetPane.classList.add('active');
        }

        this.debugConsole?.log(`Switched to ${tabId} tab`, 'debug');
      });
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for test result updates from modules
    window.addEventListener('testResultsUpdate', (event) => {
      this.handleTestResultUpdate(event.detail);
    });

    // Run all tests button
    const runAllBtn = document.getElementById('run-all-tests-btn');
    if (runAllBtn) {
      runAllBtn.addEventListener('click', () => {
        this.runAllTests();
      });
    }

    // Reset results button
    const resetBtn = document.getElementById('reset-results-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetAllResults();
      });
    }

    // Export report button
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportFullReport();
      });
    }
  }

  // Handle test result updates from modules
  handleTestResultUpdate(detail) {
    const { module, results } = detail;
    
    // Update overall results
    this.recalculateOverallResults();
    
    // Update UI
    this.updateOverallResultsDisplay();
    
    this.debugConsole?.log(`Test results updated for ${module} module: ${results.passed}/${results.run} passed`, 'debug');
  }

  // Recalculate overall test results
  recalculateOverallResults() {
    this.overallTestResults = { run: 0, passed: 0, failed: 0 };
    
    Object.values(this.testModules).forEach(module => {
      if (module.getTestResults) {
        const results = module.getTestResults();
        this.overallTestResults.run += results.run;
        this.overallTestResults.passed += results.passed;
        this.overallTestResults.failed += results.failed;
      }
    });
  }

  // Update overall results display
  updateOverallResultsDisplay() {
    const coverage = this.overallTestResults.run > 0 
      ? Math.round((this.overallTestResults.passed / this.overallTestResults.run) * 100)
      : 0;
    
    // Update counter elements
    const elements = {
      'tests-run-count': this.overallTestResults.run,
      'tests-passed-count': this.overallTestResults.passed,
      'tests-failed-count': this.overallTestResults.failed,
      'test-coverage': `${coverage}%`
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element && window.domUtils) {
        window.domUtils.setText(element, value);
      } else if (element) {
        element.textContent = value;
      }
    });
  }

  // Run all tests across all modules
  async runAllTests() {
    try {
      this.debugConsole?.log('Running comprehensive test suite...', 'info');
      
      const testPromises = [];
      
      // Authentication tests
      if (this.testModules.auth) {
        testPromises.push(
          this.testModules.auth.checkAuthStatus(),
          this.testModules.auth.testAuthFlow(),
          this.testModules.auth.testAdminAccess(),
          this.testModules.auth.checkUserRole(),
          this.testModules.auth.testAuthSecurity()
        );
      }

      // Firebase tests
      if (this.testModules.firebase) {
        testPromises.push(
          this.testModules.firebase.testFirebaseConnection(),
          this.testModules.firebase.checkFirebaseConfig(),
          this.testModules.firebase.testFirestoreRead(),
          this.testModules.firebase.testPermissions()
        );
      }

      // System tests
      if (this.testModules.system) {
        testPromises.push(
          this.testModules.system.testCoreManagers(),
          this.testModules.system.testSecuritySystems(),
          this.testModules.system.testPerformance(),
          this.testModules.system.testErrorHandling()
        );
      }

      // Run all tests concurrently
      await Promise.allSettled(testPromises);
      
      this.debugConsole?.log('Comprehensive test suite completed', 'info');
      
      // Show summary
      this.showTestSummary();
      
    } catch (error) {
      this.debugConsole?.log(`Test suite failed: ${error.message}`, 'error');
      
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Test Suite Execution');
      }
    }
  }

  // Show test summary
  showTestSummary() {
    const { run, passed, failed } = this.overallTestResults;
    const coverage = run > 0 ? Math.round((passed / run) * 100) : 0;
    
    const summary = `
Test Suite Summary:
• Total Tests: ${run}
• Passed: ${passed}
• Failed: ${failed}
• Coverage: ${coverage}%
• Status: ${failed === 0 ? 'ALL PASSED ✓' : 'SOME FAILED ✗'}
    `;

    this.debugConsole?.log(summary, 'info');

    // Show modal with results if available
    if (window.errorHandler && window.errorHandler.showModal) {
      const status = failed === 0 ? 'success' : 'warning';
      window.errorHandler.showModal(
        'Test Suite Results',
        summary.trim(),
        { confirmText: 'OK', type: status }
      );
    }
  }

  // Reset all test results
  resetAllResults() {
    try {
      Object.values(this.testModules).forEach(module => {
        if (module.resetTestResults) {
          module.resetTestResults();
        }
      });

      this.overallTestResults = { run: 0, passed: 0, failed: 0 };
      this.updateOverallResultsDisplay();

      // Clear all result displays
      const resultElements = [
        'auth-status-result', 'simple-auth-result', 'admin-access-result',
        'auth-listener-result', 'firebase-connection-result', 'firestore-ops-result',
        'system-health-result', 'security-test-result', 'performance-test-result',
        'error-handling-result', 'monitoring-result'
      ];

      resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && window.domUtils) {
          window.domUtils.setHTML(element, '<div class="test-result-placeholder">No tests run yet</div>');
        }
      });

      this.debugConsole?.log('All test results reset', 'info');

    } catch (error) {
      this.debugConsole?.log(`Failed to reset results: ${error.message}`, 'error');
    }
  }

  // Export comprehensive report
  exportFullReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        environment: 'development',
        overallResults: this.overallTestResults,
        moduleResults: {},
        systemInfo: this.debugConsole?.getSystemInfo() || {},
        debugLogs: this.debugConsole?.getRecentLogs(100) || [],
        logStats: this.debugConsole?.getLogStats() || {}
      };

      // Get results from each module
      Object.entries(this.testModules).forEach(([name, module]) => {
        if (module.getTestResults) {
          report.moduleResults[name] = module.getTestResults();
        }
      });

      // Add system report if available
      if (this.testModules.system && this.testModules.system.generateSystemReport) {
        report.systemReport = this.testModules.system.generateSystemReport();
      }

      const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dev-tools-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.debugConsole?.log('Full developer tools report exported', 'info');

      if (window.errorHandler) {
        window.errorHandler.info('Developer tools report exported successfully');
      }

    } catch (error) {
      this.debugConsole?.log(`Failed to export report: ${error.message}`, 'error');
      
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Report Export');
      }
    }
  }

  // Get specific test module
  getTestModule(name) {
    return this.testModules[name];
  }

  // Get debug console
  getDebugConsole() {
    return this.debugConsole;
  }

  // Get overall test results
  getOverallResults() {
    return { ...this.overallTestResults };
  }

  // Start monitoring (health checks, performance, etc.)
  startMonitoring() {
    if (this.testModules.system && this.testModules.system.startHealthMonitoring) {
      this.testModules.system.startHealthMonitoring();
    }
    
    this.debugConsole?.log('System monitoring started', 'info');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.testModules.system && this.testModules.system.stopHealthMonitoring) {
      this.testModules.system.stopHealthMonitoring();
    }
    
    this.debugConsole?.log('System monitoring stopped', 'info');
  }

  // Cleanup and destroy
  destroy() {
    try {
      // Stop monitoring
      this.stopMonitoring();

      // Destroy all test modules
      Object.values(this.testModules).forEach(module => {
        if (module.destroy) {
          module.destroy();
        }
      });

      // Destroy debug console
      if (this.debugConsole && this.debugConsole.destroy) {
        this.debugConsole.destroy();
      }

      // Reset state
      this.testModules = {};
      this.overallTestResults = { run: 0, passed: 0, failed: 0 };
      this.isInitialized = false;

      console.log('Developer tools manager destroyed');

    } catch (error) {
      console.error('Error destroying developer tools manager:', error);
    }
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.DevToolsManager = DevToolsManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DevToolsManager;
}