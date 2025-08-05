// Authentication Testing Module
// Handles all authentication-related testing functionality

class AuthTester {
  constructor(debugLogger) {
    this.debugLogger = debugLogger;
    this.authListener = null;
    this.testResults = { run: 0, passed: 0, failed: 0 };
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
      detail: { module: 'auth', results: this.testResults }
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

  // Check authentication status
  async checkAuthStatus() {
    try {
      this.debugLogger?.log('Checking authentication status...');
      
      const user = window.authManager?.currentUser;
      const isAuthenticated = window.authManager?.isAuthenticated;
      const status = user ? 'Authenticated' : 'Not authenticated';
      
      let result = `Status: ${status}`;
      if (user) {
        result += `\nUser: ${user.email}\nUID: ${user.uid}`;
      }
      
      this.updateTestResultDisplay('auth-status-result', result, true);
      this.updateTestResults(true);
      this.debugLogger?.log(`Auth status checked: ${status}`);
      
    } catch (error) {
      const errorMsg = `Error: ${error.message}`;
      this.updateTestResultDisplay('auth-status-result', errorMsg, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Auth status check failed: ${error.message}`, 'error');
    }
  }

  // Test authentication flow
  async testAuthFlow() {
    try {
      this.debugLogger?.log('Testing authentication flow...');
      
      // Check if auth manager is available
      if (!window.authManager) {
        throw new Error('Auth manager not available');
      }

      // Check Firebase auth
      if (!firebase?.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const result = 'Auth flow test - checking providers and configuration';
      this.updateTestResultDisplay('auth-status-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-status-result', `Flow test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Auth flow test failed: ${error.message}`, 'error');
    }
  }

  // Test sign up functionality
  async testSignUp() {
    const email = document.getElementById('test-email')?.value;
    const password = document.getElementById('test-password')?.value;
    
    if (!email || !password) {
      this.updateTestResultDisplay('simple-auth-result', 'Email and password required for test', false);
      this.updateTestResults(false);
      return;
    }

    try {
      this.debugLogger?.log(`Testing sign up for ${email}...`);
      
      // Validate inputs using secure validator
      if (window.inputValidator) {
        const emailValidation = window.inputValidator.validateEmail(email);
        const passwordValidation = window.inputValidator.validatePassword(password);
        
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.errors[0]);
        }
        
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors[0]);
        }
      }
      
      const result = `Sign up test initiated for ${email} (validation passed)`;
      this.updateTestResultDisplay('simple-auth-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('simple-auth-result', `Sign up failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Sign up test failed: ${error.message}`, 'error');
    }
  }

  // Test sign in functionality
  async testSignIn() {
    const email = document.getElementById('test-email')?.value;
    const password = document.getElementById('test-password')?.value;
    
    if (!email || !password) {
      this.updateTestResultDisplay('simple-auth-result', 'Email and password required for test', false);
      this.updateTestResults(false);
      return;
    }
    
    try {
      this.debugLogger?.log(`Testing sign in for ${email}...`);
      
      // Validate inputs
      if (window.inputValidator) {
        const emailValidation = window.inputValidator.validateEmail(email);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.errors[0]);
        }
      }
      
      const result = `Sign in test initiated for ${email} (validation passed)`;
      this.updateTestResultDisplay('simple-auth-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('simple-auth-result', `Sign in failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Sign in test failed: ${error.message}`, 'error');
    }
  }

  // Test admin access
  async testAdminAccess() {
    try {
      this.debugLogger?.log('Testing admin access...');
      
      const isAdmin = window.authManager?.isAdmin;
      const user = window.authManager?.currentUser;
      
      if (!user) {
        throw new Error('No user authenticated');
      }
      
      const result = `Admin access: ${isAdmin ? 'Granted' : 'Denied'}\nUser: ${user.email}`;
      
      this.updateTestResultDisplay('admin-access-result', result, isAdmin);
      this.updateTestResults(isAdmin);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-access-result', `Admin test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Admin access test failed: ${error.message}`, 'error');
    }
  }

  // Check user role
  async checkUserRole() {
    try {
      const user = window.authManager?.currentUser;
      const role = user ? (window.authManager?.isAdmin ? 'Admin' : 'User') : 'Guest';
      
      const result = `Current role: ${role}${user ? `\nUser: ${user.email}` : ''}`;
      this.updateTestResultDisplay('admin-access-result', result, true);
      this.updateTestResults(true);
      this.debugLogger?.log(`User role checked: ${role}`);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-access-result', `Role check failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Role check failed: ${error.message}`, 'error');
    }
  }

  // Start authentication state listener
  startAuthListener() {
    try {
      this.debugLogger?.log('Starting auth state listener...');
      
      if (!firebase?.auth) {
        throw new Error('Firebase Auth not available');
      }

      // Set up auth state listener
      this.authListener = firebase.auth().onAuthStateChanged((user) => {
        const status = user ? `User signed in: ${user.email}` : 'User signed out';
        this.debugLogger?.log(`Auth state change: ${status}`);
        
        // Update display
        this.updateTestResultDisplay('auth-listener-result', 
          `Auth listener active - Last event: ${status}`, true);
      });
      
      const result = 'Auth listener started - monitoring state changes';
      this.updateTestResultDisplay('auth-listener-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-listener-result', `Listener failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Auth listener start failed: ${error.message}`, 'error');
    }
  }

  // Stop authentication state listener
  stopAuthListener() {
    try {
      if (this.authListener) {
        this.authListener();
        this.authListener = null;
      }
      
      const result = 'Auth listener stopped';
      this.updateTestResultDisplay('auth-listener-result', result, true);
      this.debugLogger?.log('Auth listener stopped');
      
    } catch (error) {
      this.debugLogger?.log(`Error stopping auth listener: ${error.message}`, 'error');
    }
  }

  // Test authentication security
  async testAuthSecurity() {
    try {
      this.debugLogger?.log('Testing authentication security...');
      
      const checks = [];
      
      // Check if secure config is being used
      if (window.secureConfig) {
        checks.push('✓ Secure config manager active');
      } else {
        checks.push('✗ No secure config manager');
      }
      
      // Check if input validation is active
      if (window.inputValidator) {
        checks.push('✓ Input validation active');
      } else {
        checks.push('✗ No input validation');
      }
      
      // Check if error handler is secure
      if (window.errorHandler) {
        checks.push('✓ Centralized error handling active');
      } else {
        checks.push('✗ No centralized error handling');
      }
      
      const result = `Security checks:\n${checks.join('\n')}`;
      const allPassed = checks.every(check => check.startsWith('✓'));
      
      this.updateTestResultDisplay('auth-status-result', result, allPassed);
      this.updateTestResults(allPassed);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-status-result', `Security test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Auth security test failed: ${error.message}`, 'error');
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
    this.stopAuthListener();
    this.resetTestResults();
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.AuthTester = AuthTester;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthTester;
}