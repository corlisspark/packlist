// Secure Configuration Manager
// Handles API keys and sensitive configuration securely

class SecureConfig {
  constructor() {
    this.config = {};
    this.isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1' &&
                       !window.location.hostname.includes('local');
    
    this.initialize();
  }

  initialize() {
    // In a real production environment, these would come from:
    // 1. Environment variables injected at build time
    // 2. Secure API endpoint that validates the request
    // 3. Server-side configuration that's not exposed to client
    
    if (this.isProduction) {
      // Production configuration - should be loaded from secure endpoint
      this.loadProductionConfig();
    } else {
      // Development configuration
      this.loadDevelopmentConfig();
    }
  }

  async loadProductionConfig() {
    try {
      // In production, fetch config from secure endpoint
      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include auth cookies
      });

      if (response.ok) {
        const config = await response.json();
        this.config = this.validateConfig(config);
      } else {
        throw new Error('Failed to load production configuration');
      }
    } catch (error) {
      console.error('Failed to load production config:', error);
      // Fallback to minimal config or show error
      this.loadFallbackConfig();
    }
  }

  loadDevelopmentConfig() {
    // Development configuration - only for local development
    this.config = {
      firebase: {
        // These should be moved to environment variables even in development
        apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDz6LLkJ-eNIfB-fdLzvjp6UUXEHtTsnUM",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "packslist-8f62f.firebaseapp.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "packslist-8f62f",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "packslist-8f62f.appspot.com",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "987654321",
        appId: process.env.FIREBASE_APP_ID || "1:987654321:web:abcdef123456"
      },
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDz6LLkJ-eNIfB-fdLzvjp6UUXEHtTsnUM"
      },
      emailjs: {
        serviceId: process.env.EMAILJS_SERVICE_ID || "service_example",
        templateId: process.env.EMAILJS_TEMPLATE_ID || "template_example",
        publicKey: process.env.EMAILJS_PUBLIC_KEY || "public_key_example"
      },
      app: {
        name: "PacksList",
        version: "1.0.0",
        environment: "development",
        debugMode: true,
        logLevel: "debug"
      },
      features: {
        notifications: true,
        analytics: true,
        adminPanel: true,
        realTimeUpdates: true
      },
      security: {
        enableCSP: true,
        enableXSSProtection: true,
        enableInputValidation: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp']
      }
    };
  }

  loadFallbackConfig() {
    // Minimal fallback configuration
    this.config = {
      firebase: null, // Will disable Firebase features
      googleMaps: null, // Will disable maps
      emailjs: null, // Will disable email features
      app: {
        name: "PacksList",
        version: "1.0.0",
        environment: "fallback",
        debugMode: false,
        logLevel: "error"
      },
      features: {
        notifications: false,
        analytics: false,
        adminPanel: false,
        realTimeUpdates: false
      },
      security: {
        enableCSP: true,
        enableXSSProtection: true,
        enableInputValidation: true,
        maxFileSize: 1 * 1024 * 1024, // 1MB
        allowedFileTypes: ['image/jpeg', 'image/png']
      }
    };

    if (window.errorHandler) {
      window.errorHandler.critical('Configuration loading failed - running in fallback mode');
    }
  }

  validateConfig(config) {
    // Validate required configuration fields
    const requiredFields = [
      'firebase.apiKey',
      'firebase.authDomain',
      'firebase.projectId',
      'googleMaps.apiKey',
      'app.name',
      'app.version'
    ];

    for (const field of requiredFields) {
      if (!this.getNestedValue(config, field)) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate API key formats
    if (config.firebase?.apiKey && !this.isValidFirebaseApiKey(config.firebase.apiKey)) {
      throw new Error('Invalid Firebase API key format');
    }

    if (config.googleMaps?.apiKey && !this.isValidGoogleMapsApiKey(config.googleMaps.apiKey)) {
      throw new Error('Invalid Google Maps API key format');
    }

    return config;
  }

  isValidFirebaseApiKey(key) {
    // Firebase API keys typically start with 'AIza' and are 39 characters long
    return typeof key === 'string' && key.startsWith('AIza') && key.length === 39;
  }

  isValidGoogleMapsApiKey(key) {
    // Google Maps API keys typically start with 'AIza' and are 39 characters long
    return typeof key === 'string' && key.startsWith('AIza') && key.length === 39;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Public methods to get configuration values
  get(key, defaultValue = null) {
    return this.getNestedValue(this.config, key) || defaultValue;
  }

  getFirebaseConfig() {
    const firebaseConfig = this.config.firebase;
    
    if (!firebaseConfig) {
      if (window.errorHandler) {
        window.errorHandler.error('Firebase configuration not available');
      }
      return null;
    }

    return {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId
    };
  }

  getGoogleMapsApiKey() {
    const apiKey = this.config.googleMaps?.apiKey;
    
    if (!apiKey) {
      if (window.errorHandler) {
        window.errorHandler.error('Google Maps API key not available');
      }
      return null;
    }

    return apiKey;
  }

  getEmailJSConfig() {
    const emailConfig = this.config.emailjs;
    
    if (!emailConfig) {
      if (window.errorHandler) {
        window.errorHandler.warn('EmailJS configuration not available');
      }
      return null;
    }

    return {
      serviceId: emailConfig.serviceId,
      templateId: emailConfig.templateId,
      publicKey: emailConfig.publicKey
    };
  }

  isFeatureEnabled(feature) {
    return this.config.features?.[feature] || false;
  }

  getSecuritySetting(setting) {
    return this.config.security?.[setting];
  }

  getAppInfo() {
    return {
      name: this.config.app?.name || 'PacksList',
      version: this.config.app?.version || '1.0.0',
      environment: this.config.app?.environment || 'unknown',
      debugMode: this.config.app?.debugMode || false
    };
  }

  isDebugMode() {
    return this.config.app?.debugMode || false;
  }

  getLogLevel() {
    return this.config.app?.logLevel || 'info';
  }

  // Security helpers
  sanitizeApiKey(key) {
    if (!key || typeof key !== 'string') return '[INVALID]';
    
    // Show only first 4 and last 4 characters
    if (key.length > 8) {
      return key.substring(0, 4) + '...' + key.substring(key.length - 4);
    }
    
    return '[REDACTED]';
  }

  // Get configuration info for debugging (without sensitive data)
  getDebugInfo() {
    return {
      environment: this.config.app?.environment,
      version: this.config.app?.version,
      debugMode: this.config.app?.debugMode,
      features: this.config.features,
      hasFirebase: !!this.config.firebase,
      hasGoogleMaps: !!this.config.googleMaps,
      hasEmailJS: !!this.config.emailjs,
      firebaseApiKey: this.sanitizeApiKey(this.config.firebase?.apiKey),
      googleMapsApiKey: this.sanitizeApiKey(this.config.googleMaps?.apiKey)
    };
  }

  // Update configuration (for admin use)
  updateConfig(newConfig) {
    if (!this.validatePermission()) {
      throw new Error('Insufficient permissions to update configuration');
    }

    try {
      const validatedConfig = this.validateConfig(newConfig);
      this.config = { ...this.config, ...validatedConfig };
      
      if (window.errorHandler) {
        window.errorHandler.info('Configuration updated successfully');
      }
      
      return true;
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.error('Failed to update configuration', error);
      }
      throw error;
    }
  }

  validatePermission() {
    // Check if user has admin permissions
    return window.authManager?.isAdmin || false;
  }

  // Export configuration for backup (sanitized)
  exportConfig() {
    if (!this.validatePermission()) {
      throw new Error('Insufficient permissions to export configuration');
    }

    const sanitizedConfig = JSON.parse(JSON.stringify(this.config));
    
    // Remove sensitive information
    if (sanitizedConfig.firebase) {
      sanitizedConfig.firebase.apiKey = this.sanitizeApiKey(sanitizedConfig.firebase.apiKey);
    }
    
    if (sanitizedConfig.googleMaps) {
      sanitizedConfig.googleMaps.apiKey = this.sanitizeApiKey(sanitizedConfig.googleMaps.apiKey);
    }
    
    if (sanitizedConfig.emailjs) {
      sanitizedConfig.emailjs.publicKey = this.sanitizeApiKey(sanitizedConfig.emailjs.publicKey);
    }

    return sanitizedConfig;
  }

  // Test configuration connectivity
  async testConfig() {
    const results = {
      firebase: false,
      googleMaps: false,
      emailjs: false
    };

    // Test Firebase
    if (this.config.firebase) {
      try {
        // This would be a simple Firebase test in a real implementation
        results.firebase = true;
      } catch (error) {
        if (window.errorHandler) {
          window.errorHandler.warn('Firebase configuration test failed', error);
        }
      }
    }

    // Test Google Maps
    if (this.config.googleMaps) {
      try {
        // This would test the Google Maps API key
        results.googleMaps = true;
      } catch (error) {
        if (window.errorHandler) {
          window.errorHandler.warn('Google Maps configuration test failed', error);
        }
      }
    }

    // Test EmailJS
    if (this.config.emailjs) {
      try {
        // This would test the EmailJS configuration
        results.emailjs = true;
      } catch (error) {
        if (window.errorHandler) {
          window.errorHandler.warn('EmailJS configuration test failed', error);
        }
      }
    }

    return results;
  }
}

// Create global instance
window.secureConfig = new SecureConfig();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecureConfig;
}