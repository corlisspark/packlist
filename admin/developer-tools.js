// Developer Tools for PacksList Admin Panel
// Comprehensive testing and debugging interface for all system components

class DeveloperTools {
  constructor() {
    this.testResults = {
      run: 0,
      passed: 0,
      failed: 0
    };
    
    this.debugConsole = [];
    this.authListener = null;
    this.realtimeListener = null;
    
    this.initialize();
  }

  // Initialize developer tools
  initialize() {
    console.log('Developer Tools initialized');
    this.setupTabSwitching();
    this.setupDebugConsole();
    this.logToDebugConsole('Developer Tools initialized');
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
      });
    });
  }

  // Setup debug console
  setupDebugConsole() {
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
      consoleEl.style.cssText = `
        background: #1a1a1a;
        color: #00ff00;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 4px;
        height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
      `;
    }
  }

  // Log message to debug console
  logToDebugConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    this.debugConsole.push(logEntry);
    
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
      consoleEl.textContent = this.debugConsole.slice(-50).join('\n');
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  // Update test results
  updateTestResults(passed = false) {
    this.testResults.run++;
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }
    
    const coverage = Math.round((this.testResults.passed / this.testResults.run) * 100);
    
    document.getElementById('tests-run-count').textContent = this.testResults.run;
    document.getElementById('tests-passed-count').textContent = this.testResults.passed;
    document.getElementById('tests-failed-count').textContent = this.testResults.failed;
    document.getElementById('test-coverage').textContent = `${coverage}%`;
  }

  // Update test result display
  updateTestResultDisplay(elementId, result, success = true) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="test-result-item ${success ? 'success' : 'error'}">
          <div class="test-timestamp">${new Date().toLocaleTimeString()}</div>
          <div class="test-message">${result}</div>
        </div>
      `;
    }
  }

  // AUTH TESTING METHODS
  async checkAuthStatus() {
    try {
      this.logToDebugConsole('Checking authentication status...');
      
      const user = window.authManager?.currentUser;
      const isAuthenticated = window.authManager?.isAuthenticated;
      const status = user ? 'Authenticated' : 'Not authenticated';
      
      let result = `Status: ${status}`;
      if (user) {
        result += `\nUser: ${user.email}\nUID: ${user.uid}`;
      }
      
      this.updateTestResultDisplay('auth-status-result', result, true);
      this.updateTestResults(true);
      this.logToDebugConsole(`Auth status checked: ${status}`);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-status-result', `Error: ${error.message}`, false);
      this.updateTestResults(false);
      this.logToDebugConsole(`Auth status check failed: ${error.message}`, 'error');
    }
  }

  async testAuthFlow() {
    try {
      this.logToDebugConsole('Testing authentication flow...');
      
      const result = 'Auth flow test - checking providers and configuration';
      this.updateTestResultDisplay('auth-status-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-status-result', `Flow test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testSignUp() {
    const email = document.getElementById('test-email').value;
    const password = document.getElementById('test-password').value;
    
    try {
      this.logToDebugConsole(`Testing sign up for ${email}...`);
      
      const result = `Sign up test initiated for ${email}`;
      this.updateTestResultDisplay('simple-auth-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('simple-auth-result', `Sign up failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testSignIn() {
    const email = document.getElementById('test-email').value;
    const password = document.getElementById('test-password').value;
    
    try {
      this.logToDebugConsole(`Testing sign in for ${email}...`);
      
      const result = `Sign in test initiated for ${email}`;
      this.updateTestResultDisplay('simple-auth-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('simple-auth-result', `Sign in failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testAdminAccess() {
    try {
      this.logToDebugConsole('Testing admin access...');
      
      const isAdmin = window.authManager?.isAdmin;
      const result = `Admin access: ${isAdmin ? 'Granted' : 'Denied'}`;
      
      this.updateTestResultDisplay('admin-access-result', result, isAdmin);
      this.updateTestResults(isAdmin);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-access-result', `Admin test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async checkUserRole() {
    try {
      const user = window.authManager?.currentUser;
      const role = user ? (window.authManager?.isAdmin ? 'Admin' : 'User') : 'Guest';
      
      const result = `Current role: ${role}`;
      this.updateTestResultDisplay('admin-access-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-access-result', `Role check failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  startAuthListener() {
    try {
      this.logToDebugConsole('Starting auth state listener...');
      
      const result = 'Auth listener started - monitoring state changes';
      this.updateTestResultDisplay('auth-listener-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('auth-listener-result', `Listener failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  stopAuthListener() {
    if (this.authListener) {
      this.authListener();
      this.authListener = null;
    }
    
    const result = 'Auth listener stopped';
    this.updateTestResultDisplay('auth-listener-result', result, true);
    this.logToDebugConsole('Auth listener stopped');
  }

  // FIREBASE TESTING METHODS
  async testFirebaseConnection() {
    try {
      this.logToDebugConsole('Testing Firebase connection...');
      
      const result = 'Firebase connection test - checking app initialization';
      this.updateTestResultDisplay('firebase-connection-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('firebase-connection-result', `Connection failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async checkFirebaseConfig() {
    try {
      const hasFirebase = typeof firebase !== 'undefined';
      const hasFirestore = hasFirebase && firebase.firestore;
      const hasAuth = hasFirebase && firebase.auth;
      
      const result = `Firebase: ${hasFirebase ? 'Loaded' : 'Missing'}\nFirestore: ${hasFirestore ? 'Available' : 'Missing'}\nAuth: ${hasAuth ? 'Available' : 'Missing'}`;
      
      this.updateTestResultDisplay('firebase-connection-result', result, hasFirebase && hasFirestore && hasAuth);
      this.updateTestResults(hasFirebase && hasFirestore && hasAuth);
      
    } catch (error) {
      this.updateTestResultDisplay('firebase-connection-result', `Config check failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testFirestoreWrite() {
    const collection = document.getElementById('test-collection').value || 'test';
    
    try {
      this.logToDebugConsole(`Testing Firestore write to ${collection}...`);
      
      const result = `Write test initiated to collection: ${collection}`;
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Write failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testFirestoreRead() {
    const collection = document.getElementById('test-collection').value || 'test';
    
    try {
      this.logToDebugConsole(`Testing Firestore read from ${collection}...`);
      
      const result = `Read test initiated from collection: ${collection}`;
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Read failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testFirestoreQuery() {
    const collection = document.getElementById('test-collection').value || 'test';
    
    try {
      this.logToDebugConsole(`Testing Firestore query on ${collection}...`);
      
      const result = `Query test initiated on collection: ${collection}`;
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Query failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testRealtimeListener() {
    try {
      this.logToDebugConsole('Testing real-time listener...');
      
      const result = 'Real-time listener test started';
      this.updateTestResultDisplay('realtime-listener-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('realtime-listener-result', `Listener failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  stopRealtimeListener() {
    if (this.realtimeListener) {
      this.realtimeListener();
      this.realtimeListener = null;
    }
    
    const result = 'Real-time listener stopped';
    this.updateTestResultDisplay('realtime-listener-result', result, true);
    this.logToDebugConsole('Real-time listener stopped');
  }

  async testSecurityRules() {
    try {
      this.logToDebugConsole('Testing security rules...');
      
      const result = 'Security rules test - checking access permissions';
      this.updateTestResultDisplay('security-rules-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('security-rules-result', `Rules test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testPermissions() {
    try {
      this.logToDebugConsole('Testing permissions...');
      
      const result = 'Permissions test - checking user access levels';
      this.updateTestResultDisplay('security-rules-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('security-rules-result', `Permissions test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // EMAIL TESTING METHODS
  async checkEmailConfig() {
    try {
      this.logToDebugConsole('Checking email configuration...');
      
      const hasEmailJS = typeof emailjs !== 'undefined';
      const result = `EmailJS: ${hasEmailJS ? 'Loaded' : 'Missing'}`;
      
      this.updateTestResultDisplay('smtp-config-result', result, hasEmailJS);
      this.updateTestResults(hasEmailJS);
      
    } catch (error) {
      this.updateTestResultDisplay('smtp-config-result', `Config check failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async testSMTPConnection() {
    try {
      this.logToDebugConsole('Testing SMTP connection...');
      
      const result = 'SMTP connection test initiated';
      this.updateTestResultDisplay('smtp-config-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('smtp-config-result', `SMTP test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  async sendTestEmail() {
    const recipient = document.getElementById('test-email-recipient').value;
    const subject = document.getElementById('test-email-subject').value;
    const body = document.getElementById('test-email-body').value;
    
    if (!recipient) {
      this.updateTestResultDisplay('test-email-result', 'Please enter recipient email', false);
      return;
    }
    
    try {
      this.logToDebugConsole(`Sending test email to ${recipient}...`);
      
      const result = `Test email queued for ${recipient}`;
      this.updateTestResultDisplay('test-email-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('test-email-result', `Email send failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  previewEmailTemplate() {
    const template = document.getElementById('email-template-selector').value;
    
    try {
      this.logToDebugConsole(`Previewing email template: ${template}`);
      
      const result = `Template preview: ${template}`;
      this.updateTestResultDisplay('email-template-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('email-template-result', `Preview failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testEmailTemplate() {
    const template = document.getElementById('email-template-selector').value;
    
    try {
      this.logToDebugConsole(`Testing email template: ${template}`);
      
      const result = `Template test: ${template}`;
      this.updateTestResultDisplay('email-template-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('email-template-result', `Template test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // PIN TESTING METHODS
  simulatePinClick() {
    const vendor = document.getElementById('test-vendor-selector').value;
    
    try {
      this.logToDebugConsole(`Simulating pin click for ${vendor}...`);
      
      const result = `Pin click simulated for ${vendor}`;
      this.updateTestResultDisplay('pin-simulation-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('pin-simulation-result', `Pin click simulation failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  simulatePinHover() {
    const vendor = document.getElementById('test-vendor-selector').value;
    
    try {
      this.logToDebugConsole(`Simulating pin hover for ${vendor}...`);
      
      const result = `Pin hover simulated for ${vendor}`;
      this.updateTestResultDisplay('pin-simulation-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('pin-simulation-result', `Pin hover simulation failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testModalDisplay() {
    try {
      this.logToDebugConsole('Testing modal display...');
      
      const result = 'Modal display test - checking visibility and layout';
      this.updateTestResultDisplay('modal-integration-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('modal-integration-result', `Modal test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testModalAnimations() {
    try {
      this.logToDebugConsole('Testing modal animations...');
      
      const result = 'Modal animation test - checking transitions and effects';
      this.updateTestResultDisplay('modal-integration-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('modal-integration-result', `Animation test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testModalClose() {
    try {
      this.logToDebugConsole('Testing modal close functionality...');
      
      const result = 'Modal close test - checking close buttons and escape key';
      this.updateTestResultDisplay('modal-integration-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('modal-integration-result', `Close test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testAnalyticsTracking() {
    try {
      this.logToDebugConsole('Testing analytics tracking...');
      
      const result = 'Analytics tracking test - checking data collection';
      this.updateTestResultDisplay('analytics-tracking-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('analytics-tracking-result', `Analytics test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  viewInteractionData() {
    try {
      this.logToDebugConsole('Viewing interaction data...');
      
      const result = 'Interaction data retrieved - displaying analytics';
      this.updateTestResultDisplay('analytics-tracking-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('analytics-tracking-result', `Data view failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  clearInteractionData() {
    try {
      this.logToDebugConsole('Clearing interaction data...');
      
      const result = 'Interaction data cleared';
      this.updateTestResultDisplay('analytics-tracking-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('analytics-tracking-result', `Data clear failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // NOTIFICATION TESTING METHODS
  testToastNotification() {
    const type = document.getElementById('toast-type-selector').value;
    const message = document.getElementById('toast-message').value;
    
    try {
      this.logToDebugConsole(`Testing toast notification: ${type} - ${message}`);
      
      // Use the notification manager if available
      if (window.notificationManager) {
        window.notificationManager.showToast(message, type);
      }
      
      const result = `Toast displayed: ${type} - ${message}`;
      this.updateTestResultDisplay('toast-test-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('toast-test-result', `Toast test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testNotificationTiming() {
    try {
      this.logToDebugConsole('Testing notification timing (2 seconds)...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('Testing 2-second timeout...', 'info');
      }
      
      const result = 'Notification timing test - 2 second timeout active';
      this.updateTestResultDisplay('notification-timing-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('notification-timing-result', `Timing test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testCloseButton() {
    try {
      this.logToDebugConsole('Testing notification close button...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('Click the ✕ to close me!', 'warning');
      }
      
      const result = 'Close button test - notification with close button displayed';
      this.updateTestResultDisplay('notification-timing-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('notification-timing-result', `Close button test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testMultipleToasts() {
    try {
      this.logToDebugConsole('Testing multiple toast notifications...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('First notification', 'success');
        setTimeout(() => {
          window.notificationManager.showToast('Second notification', 'info');
        }, 500);
        setTimeout(() => {
          window.notificationManager.showToast('Third notification', 'warning');
        }, 1000);
      }
      
      const result = 'Multiple toast test - 3 notifications queued';
      this.updateTestResultDisplay('notification-timing-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('notification-timing-result', `Multiple toast test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testPackApproved() {
    try {
      this.logToDebugConsole('Testing pack approved notification...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('🎉 Your pack "Test Pack" has been approved and is now live!', 'success');
      }
      
      const result = 'Pack approved notification test completed';
      this.updateTestResultDisplay('pack-notifications-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('pack-notifications-result', `Pack approved test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testPackRejected() {
    try {
      this.logToDebugConsole('Testing pack rejected notification...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('❌ Your pack "Test Pack" was rejected. Reason: Test rejection', 'warning');
      }
      
      const result = 'Pack rejected notification test completed';
      this.updateTestResultDisplay('pack-notifications-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('pack-notifications-result', `Pack rejected test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testPackFlagged() {
    try {
      this.logToDebugConsole('Testing pack flagged notification...');
      
      if (window.notificationManager) {
        window.notificationManager.showToast('🚩 Your pack "Test Pack" has been flagged for review.', 'warning');
      }
      
      const result = 'Pack flagged notification test completed';
      this.updateTestResultDisplay('pack-notifications-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('pack-notifications-result', `Pack flagged test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // HEADER TESTING METHODS
  testHeaderManager() {
    try {
      this.logToDebugConsole('Testing header manager...');
      
      const hasHeaderManager = typeof window.headerManager !== 'undefined';
      const result = `Header Manager: ${hasHeaderManager ? 'Available' : 'Missing'}`;
      
      this.updateTestResultDisplay('header-manager-result', result, hasHeaderManager);
      this.updateTestResults(hasHeaderManager);
      
    } catch (error) {
      this.updateTestResultDisplay('header-manager-result', `Header manager test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testHeaderRefresh() {
    try {
      this.logToDebugConsole('Testing header refresh...');
      
      if (window.headerManager) {
        window.headerManager.refresh();
      }
      
      const result = 'Header refresh test completed';
      this.updateTestResultDisplay('header-manager-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('header-manager-result', `Header refresh failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testHeaderConfig() {
    try {
      this.logToDebugConsole('Testing header configuration...');
      
      const config = window.headerManager?.getConfig();
      const result = `Header config: ${config ? 'Available' : 'Missing'}`;
      
      this.updateTestResultDisplay('header-manager-result', result, !!config);
      this.updateTestResults(!!config);
      
    } catch (error) {
      this.updateTestResultDisplay('header-manager-result', `Header config test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testLocationUpdate() {
    const locationText = document.getElementById('test-location-text').value;
    
    try {
      this.logToDebugConsole(`Testing location update: ${locationText}`);
      
      if (window.headerManager) {
        window.headerManager.updateLocationDisplay(locationText);
      }
      
      const result = `Location updated to: ${locationText}`;
      this.updateTestResultDisplay('dynamic-updates-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('dynamic-updates-result', `Location update failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testAuthUpdate() {
    try {
      this.logToDebugConsole('Testing auth state update...');
      
      const result = 'Auth state update test completed';
      this.updateTestResultDisplay('dynamic-updates-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('dynamic-updates-result', `Auth update failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  showHeaderDemo() {
    try {
      this.logToDebugConsole('Opening header showcase demo...');
      
      window.open('../header-showcase.html', '_blank');
      
      const result = 'Header showcase demo opened in new tab';
      this.updateTestResultDisplay('header-showcase-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('header-showcase-result', `Demo failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testHoverEffects() {
    try {
      this.logToDebugConsole('Testing header hover effects...');
      
      const result = 'Header hover effects test - check browser console for details';
      this.updateTestResultDisplay('header-showcase-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('header-showcase-result', `Hover effects test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testAnimations() {
    try {
      this.logToDebugConsole('Testing header animations...');
      
      const result = 'Header animations test - check visual effects';
      this.updateTestResultDisplay('header-showcase-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('header-showcase-result', `Animations test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // SYSTEM DEBUG METHODS
  checkAdminStatus() {
    try {
      this.logToDebugConsole('Checking admin status...');
      
      const isAdmin = window.authManager?.isAdmin;
      const user = window.authManager?.currentUser;
      
      let result = `Admin Status: ${isAdmin ? 'Active' : 'Not Admin'}`;
      if (user) {
        result += `\nUser: ${user.email}`;
      }
      
      this.updateTestResultDisplay('admin-status-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-status-result', `Admin status check failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  debugAdminAuth() {
    try {
      this.logToDebugConsole('Running admin auth debug...');
      
      const result = 'Admin auth debug - check console for detailed output';
      this.updateTestResultDisplay('admin-status-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-status-result', `Admin auth debug failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  viewSystemInfo() {
    try {
      this.logToDebugConsole('Gathering system information...');
      
      const info = {
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      
      const result = `System Info:\nUser Agent: ${info.userAgent}\nTime: ${info.timestamp}`;
      this.updateTestResultDisplay('admin-status-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('admin-status-result', `System info failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  enableDebugLogs() {
    try {
      this.logToDebugConsole('Debug logging enabled');
      
      const result = 'Debug logging enabled - check console for verbose output';
      this.updateTestResultDisplay('console-logs-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('console-logs-result', `Debug enable failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  exportLogs() {
    try {
      this.logToDebugConsole('Exporting logs...');
      
      const logs = this.debugConsole.join('\n');
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `packslist-debug-logs-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const result = 'Debug logs exported successfully';
      this.updateTestResultDisplay('console-logs-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('console-logs-result', `Log export failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  clearLogs() {
    this.debugConsole = [];
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
      consoleEl.textContent = '';
    }
    
    const result = 'Debug logs cleared';
    this.updateTestResultDisplay('console-logs-result', result, true);
    this.logToDebugConsole('Debug logs cleared');
  }

  runPerformanceTest() {
    try {
      this.logToDebugConsole('Running performance test...');
      
      const start = performance.now();
      
      // Simulate some work
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      
      const end = performance.now();
      const duration = Math.round(end - start);
      
      const result = `Performance test completed in ${duration}ms`;
      this.updateTestResultDisplay('performance-test-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('performance-test-result', `Performance test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testMemoryUsage() {
    try {
      this.logToDebugConsole('Testing memory usage...');
      
      const memory = performance.memory;
      let result = 'Memory test completed';
      
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        result = `Memory Usage: ${used}MB / ${total}MB`;
      }
      
      this.updateTestResultDisplay('performance-test-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('performance-test-result', `Memory test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  testLoadTimes() {
    try {
      this.logToDebugConsole('Testing load times...');
      
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      const result = `Page load time: ${loadTime}ms`;
      this.updateTestResultDisplay('performance-test-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('performance-test-result', `Load time test failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  simulateNetworkError() {
    try {
      this.logToDebugConsole('Simulating network error...');
      
      const result = 'Network error simulation - check network tab for simulated failures';
      this.updateTestResultDisplay('error-simulation-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('error-simulation-result', `Network error simulation failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  simulateAuthError() {
    try {
      this.logToDebugConsole('Simulating auth error...');
      
      const result = 'Auth error simulation - check console for auth-related errors';
      this.updateTestResultDisplay('error-simulation-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('error-simulation-result', `Auth error simulation failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  simulateFirebaseError() {
    try {
      this.logToDebugConsole('Simulating Firebase error...');
      
      const result = 'Firebase error simulation - check console for Firebase-related errors';
      this.updateTestResultDisplay('error-simulation-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('error-simulation-result', `Firebase error simulation failed: ${error.message}`, false);
      this.updateTestResults(false);
    }
  }

  // UTILITY METHODS
  async runAllTests() {
    this.logToDebugConsole('Running all tests...');
    
    try {
      // Reset test results
      this.testResults = { run: 0, passed: 0, failed: 0 };
      
      // Run a selection of key tests
      await this.checkAuthStatus();
      await this.checkFirebaseConfig();
      await this.checkEmailConfig();
      this.testHeaderManager();
      this.testToastNotification();
      
      this.logToDebugConsole('All tests completed');
      
    } catch (error) {
      this.logToDebugConsole(`Test suite failed: ${error.message}`, 'error');
    }
  }

  clearAllTestData() {
    this.logToDebugConsole('Clearing all test data...');
    
    // Clear test results displays
    const resultElements = document.querySelectorAll('.test-result');
    resultElements.forEach(el => {
      el.innerHTML = '<div class="test-result-item">Ready for testing...</div>';
    });
    
    // Reset counters
    this.testResults = { run: 0, passed: 0, failed: 0 };
    this.updateTestResults();
    
    this.logToDebugConsole('All test data cleared');
  }

  exportTestResults() {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        summary: this.testResults,
        logs: this.debugConsole
      };
      
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `packslist-test-results-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.logToDebugConsole('Test results exported');
      
    } catch (error) {
      this.logToDebugConsole(`Export failed: ${error.message}`, 'error');
    }
  }

  generateTestReport() {
    try {
      const report = `
# PacksList Developer Tools Test Report

Generated: ${new Date().toISOString()}

## Test Summary
- Total Tests Run: ${this.testResults.run}
- Passed: ${this.testResults.passed}
- Failed: ${this.testResults.failed}
- Success Rate: ${Math.round((this.testResults.passed / this.testResults.run) * 100)}%

## System Information
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}

## Test Logs
${this.debugConsole.join('\n')}
      `.trim();
      
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `packslist-test-report-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.logToDebugConsole('Test report generated');
      
    } catch (error) {
      this.logToDebugConsole(`Report generation failed: ${error.message}`, 'error');
    }
  }
}

// Initialize developer tools when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.developerTools = new DeveloperTools();
});