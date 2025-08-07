// Firebase Testing Module
// Handles all Firebase-related testing functionality

class FirebaseTester {
  constructor(debugLogger) {
    this.debugLogger = debugLogger;
    this.realtimeListener = null;
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
      detail: { module: 'firebase', results: this.testResults }
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

  // Test Firebase connection
  async testFirebaseConnection() {
    try {
      this.debugLogger?.log('Testing Firebase connection...');
      
      // Check if Firebase is loaded
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      // Check if Firebase app is initialized
      const apps = firebase.apps;
      if (!apps || apps.length === 0) {
        throw new Error('No Firebase apps initialized');
      }

      const app = apps[0];
      const result = `Firebase connection successful\nApp name: ${app.name}\nProject ID: ${app.options.projectId || 'Not specified'}`;
      
      this.updateTestResultDisplay('firebase-connection-result', result, true);
      this.updateTestResults(true);
      this.debugLogger?.log('Firebase connection test passed');
      
    } catch (error) {
      this.updateTestResultDisplay('firebase-connection-result', `Connection failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Firebase connection test failed: ${error.message}`, 'error');
    }
  }

  // Check Firebase configuration
  async checkFirebaseConfig() {
    try {
      this.debugLogger?.log('Checking Firebase configuration...');
      
      const hasFirebase = typeof firebase !== 'undefined';
      const hasFirestore = hasFirebase && firebase.firestore;
      const hasAuth = hasFirebase && firebase.auth;
      const hasStorage = hasFirebase && firebase.storage;
      
      const checks = [
        `Firebase SDK: ${hasFirebase ? '✓ Loaded' : '✗ Missing'}`,
        `Firestore: ${hasFirestore ? '✓ Available' : '✗ Missing'}`,
        `Auth: ${hasAuth ? '✓ Available' : '✗ Missing'}`,
        `Storage: ${hasStorage ? '✓ Available' : '✗ Missing'}`
      ];

      // Check secure config
      if (window.secureConfig) {
        const config = window.secureConfig.getFirebaseConfig();
        if (config) {
          checks.push('✓ Secure configuration loaded');
        } else {
          checks.push('✗ Secure configuration missing');
        }
      } else {
        checks.push('✗ No secure config manager');
      }
      
      const result = checks.join('\n');
      const allPassed = hasFirebase && hasFirestore && hasAuth;
      
      this.updateTestResultDisplay('firebase-connection-result', result, allPassed);
      this.updateTestResults(allPassed);
      
    } catch (error) {
      this.updateTestResultDisplay('firebase-connection-result', `Config check failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Firebase config check failed: ${error.message}`, 'error');
    }
  }

  // Test Firestore write operation
  async testFirestoreWrite() {
    const collection = document.getElementById('test-collection')?.value || 'dev_tests';
    
    try {
      this.debugLogger?.log(`Testing Firestore write to ${collection}...`);
      
      if (!firebase?.firestore) {
        throw new Error('Firestore not available');
      }

      const db = firebase.firestore();
      const testData = {
        test: 'write_operation',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        testId: Date.now(),
        environment: 'development'
      };

      // Perform write test
      const docRef = await db.collection(collection).add(testData);
      
      const result = `Write successful to collection: ${collection}\nDocument ID: ${docRef.id}`;
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      this.debugLogger?.log(`Firestore write test passed: ${docRef.id}`);
      
      // Clean up test document
      setTimeout(async () => {
        try {
          await docRef.delete();
          this.debugLogger?.log(`Test document ${docRef.id} cleaned up`);
        } catch (cleanupError) {
          this.debugLogger?.log(`Cleanup failed: ${cleanupError.message}`, 'warn');
        }
      }, 5000);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Write failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Firestore write test failed: ${error.message}`, 'error');
    }
  }

  // Test Firestore read operation
  async testFirestoreRead() {
    const collection = document.getElementById('test-collection')?.value || 'posts';
    
    try {
      this.debugLogger?.log(`Testing Firestore read from ${collection}...`);
      
      if (!firebase?.firestore) {
        throw new Error('Firestore not available');
      }

      const db = firebase.firestore();
      const snapshot = await db.collection(collection).limit(1).get();
      
      const docCount = snapshot.size;
      const result = `Read successful from collection: ${collection}\nDocuments found: ${docCount}`;
      
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      this.debugLogger?.log(`Firestore read test passed: ${docCount} documents`);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Read failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Firestore read test failed: ${error.message}`, 'error');
    }
  }

  // Test Firestore query operations
  async testFirestoreQuery() {
    const collection = document.getElementById('test-collection')?.value || 'posts';
    
    try {
      this.debugLogger?.log(`Testing Firestore query on ${collection}...`);
      
      if (!firebase?.firestore) {
        throw new Error('Firestore not available');
      }

      const db = firebase.firestore();
      
      // Test different query types
      const queries = [
        { name: 'Limit query', query: db.collection(collection).limit(5) },
        { name: 'Ordered query', query: db.collection(collection).orderBy('created', 'desc').limit(3) }
      ];

      const results = [];
      
      for (const { name, query } of queries) {
        try {
          const snapshot = await query.get();
          results.push(`${name}: ${snapshot.size} docs`);
        } catch (queryError) {
          results.push(`${name}: Failed (${queryError.message})`);
        }
      }
      
      const result = `Query tests:\n${results.join('\n')}`;
      const success = results.every(r => !r.includes('Failed'));
      
      this.updateTestResultDisplay('firestore-ops-result', result, success);
      this.updateTestResults(success);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Query test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Firestore query test failed: ${error.message}`, 'error');
    }
  }

  // Test Firestore realtime listeners
  async testRealtimeListener() {
    const collection = document.getElementById('test-collection')?.value || 'posts';
    
    try {
      this.debugLogger?.log(`Testing realtime listener on ${collection}...`);
      
      if (!firebase?.firestore) {
        throw new Error('Firestore not available');
      }

      const db = firebase.firestore();
      
      // Set up listener
      this.realtimeListener = db.collection(collection)
        .limit(1)
        .onSnapshot((snapshot) => {
          const changeCount = snapshot.docChanges().length;
          this.debugLogger?.log(`Realtime update: ${changeCount} changes detected`);
        }, (error) => {
          this.debugLogger?.log(`Realtime listener error: ${error.message}`, 'error');
        });
      
      const result = `Realtime listener started on collection: ${collection}`;
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.updateTestResults(true);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Listener test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Realtime listener test failed: ${error.message}`, 'error');
    }
  }

  // Stop realtime listener
  stopRealtimeListener() {
    try {
      if (this.realtimeListener) {
        this.realtimeListener();
        this.realtimeListener = null;
      }
      
      const result = 'Realtime listener stopped';
      this.updateTestResultDisplay('firestore-ops-result', result, true);
      this.debugLogger?.log('Realtime listener stopped');
      
    } catch (error) {
      this.debugLogger?.log(`Error stopping realtime listener: ${error.message}`, 'error');
    }
  }

  // Test Firebase security rules
  async testSecurityRules() {
    try {
      this.debugLogger?.log('Testing Firebase security rules...');
      
      if (!firebase?.firestore) {
        throw new Error('Firestore not available');
      }

      const db = firebase.firestore();
      const testCollection = 'security_test';
      
      // Test unauthorized access
      try {
        await db.collection(testCollection).add({ unauthorized: 'test' });
        throw new Error('Security rules may be too permissive');
      } catch (securityError) {
        // This is expected for proper security
        if (securityError.code === 'permission-denied') {
          const result = 'Security rules test passed - unauthorized access properly blocked';
          this.updateTestResultDisplay('firestore-ops-result', result, true);
          this.updateTestResults(true);
        } else {
          throw securityError;
        }
      }
      
    } catch (error) {
      const result = `Security rules test: ${error.message}`;
      this.updateTestResultDisplay('firestore-ops-result', result, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Security rules test failed: ${error.message}`, 'error');
    }
  }

  // Test Firebase permissions
  async testPermissions() {
    try {
      this.debugLogger?.log('Testing Firebase permissions...');
      
      const user = window.authManager?.currentUser;
      if (!user) {
        throw new Error('No authenticated user for permission test');
      }

      const permissions = [];
      
      // Test read permissions
      try {
        const db = firebase.firestore();
        await db.collection('posts').limit(1).get();
        permissions.push('✓ Read access granted');
      } catch (readError) {
        permissions.push(`✗ Read access denied: ${readError.message}`);
      }

      // Test write permissions (for admin users)
      if (window.authManager?.isAdmin) {
        try {
          const db = firebase.firestore();
          const testDoc = await db.collection('dev_tests').add({
            permissionTest: true,
            userId: user.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          permissions.push('✓ Admin write access granted');
          
          // Clean up
          setTimeout(() => testDoc.delete(), 2000);
        } catch (writeError) {
          permissions.push(`✗ Admin write access denied: ${writeError.message}`);
        }
      } else {
        permissions.push('ℹ Not admin - write test skipped');
      }
      
      const result = `Permission tests:\n${permissions.join('\n')}`;
      const success = !permissions.some(p => p.startsWith('✗'));
      
      this.updateTestResultDisplay('firestore-ops-result', result, success);
      this.updateTestResults(success);
      
    } catch (error) {
      this.updateTestResultDisplay('firestore-ops-result', `Permission test failed: ${error.message}`, false);
      this.updateTestResults(false);
      this.debugLogger?.log(`Permission test failed: ${error.message}`, 'error');
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
    this.stopRealtimeListener();
    this.resetTestResults();
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.FirebaseTester = FirebaseTester;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseTester;
}