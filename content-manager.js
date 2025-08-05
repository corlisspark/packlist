// Dynamic Content Management System
// Handles contextual placeholders, personalized content, and UI strings

class ContentManager {
  constructor() {
    this.userContext = {};
    this.currentContent = {};
    this.contentCallbacks = [];
    this.isInitialized = false;
  }

  // Initialize content manager
  async initialize() {
    try {
      // Wait for config manager to be ready
      if (!window.configManager.isInitialized) {
        await new Promise(resolve => {
          window.configManager.onConfigUpdate((event) => {
            if (event === 'initialized' || event === 'fallbackLoaded') {
              resolve();
            }
          });
        });
      }

      // Load user context
      await this.loadUserContext();
      
      // Load initial content
      await this.loadContextualContent();
      
      this.isInitialized = true;
      this.notifyCallbacks('initialized');
      
      return true;
    } catch (error) {
      console.error('ContentManager initialization failed:', error);
      this.loadFallbackContent();
      return false;
    }
  }

  // Load and analyze user context
  async loadUserContext() {
    try {
      // Check for returning user
      const lastVisit = localStorage.getItem('packslist_last_visit');
      const visitCount = parseInt(localStorage.getItem('packslist_visit_count') || '0');
      
      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Get time context
      const hour = new Date().getHours();
      const timeOfDay = this.getTimeOfDay(hour);
      
      // Get location context from location manager
      let locationContext = null;
      if (window.locationManager && window.locationManager.userLocation) {
        locationContext = {
          hasLocation: true,
          metro: window.locationManager.userMetro,
          metroInfo: window.locationManager.getUserMetroInfo()
        };
      }

      this.userContext = {
        isReturning: visitCount > 0,
        visitCount: visitCount + 1,
        isMobile: isMobile,
        timeOfDay: timeOfDay,
        hour: hour,
        location: locationContext,
        language: navigator.language || 'en-US',
        lastVisit: lastVisit,
        currentVisit: Date.now()
      };

      // Update stored visit info
      localStorage.setItem('packslist_visit_count', this.userContext.visitCount.toString());
      localStorage.setItem('packslist_last_visit', this.userContext.currentVisit.toString());

      console.log('User context loaded:', this.userContext);
      
    } catch (error) {
      console.error('Failed to load user context:', error);
      this.userContext = { isReturning: false, isMobile: false, timeOfDay: 'day' };
    }
  }

  // Determine time of day for context
  getTimeOfDay(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Load contextual content based on user context
  async loadContextualContent() {
    const uiStrings = window.configManager.getConfig('ui-strings');
    
    this.currentContent = {
      searchPlaceholder: await this.getContextualPlaceholder(),
      locationMessage: await this.getLocationMessage(),
      welcomeMessage: this.getWelcomeMessage(),
      errorMessages: uiStrings.errorMessages || {},
      ctaTexts: this.getContextualCTAs()
    };

    this.notifyCallbacks('contentLoaded', this.currentContent);
  }

  // Get contextual search placeholder
  async getContextualPlaceholder() {
    // Simple static placeholder
    return 'Plugs?? 🔌🔌';
  }

  // Get location display text (using dynamic location manager)
  getLocationDisplayText() {
    // Use dynamic location manager if available
    if (window.dynamicLocationManager && window.dynamicLocationManager.isInitialized) {
      return window.dynamicLocationManager.getLocationDisplayText();
    }
    
    // Fallback to static text
    return 'Location Detection';
  }

  // Calculate distance between two points (simple haversine)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get contextual location message
  async getLocationMessage() {
    const uiStrings = window.configManager.getConfig('ui-strings');
    const locationMessages = uiStrings.locationMessages || [];

    if (!this.userContext.location || !this.userContext.location.hasLocation) {
      return 'Detecting your location...';
    }

    const regionName = this.userContext.location.metroInfo?.name || 'your area';
    
    // Get pack count for the region (if available)
    let packCount = 0;
    try {
      // This would come from your pack data
      packCount = this.getEstimatedPackCount(regionName);
    } catch (error) {
      console.warn('Could not get pack count');
    }

    // Choose appropriate message template
    let messageTemplate = locationMessages[0] || 'Found content in {regionName}';
    
    if (packCount > 0 && locationMessages.length > 1) {
      messageTemplate = locationMessages[1]; // "Found {packCount} packs near you"
    }

    return this.replacePlaceholders(messageTemplate, {
      regionName,
      packCount: packCount.toString(),
      cityName: regionName
    });
  }

  // Get welcome message based on context
  getWelcomeMessage() {
    if (this.userContext.isReturning) {
      const timeSinceLastVisit = this.userContext.currentVisit - 
        (parseInt(this.userContext.lastVisit) || 0);
      
      // If last visit was more than a week ago
      if (timeSinceLastVisit > 7 * 24 * 60 * 60 * 1000) {
        return "Welcome back! Check out what's new in your area.";
      }
      
      return "Welcome back!";
    }

    // First time visitor
    const timeGreeting = {
      morning: "Good morning!",
      afternoon: "Good afternoon!",
      evening: "Good evening!",
      night: "Welcome!"
    }[this.userContext.timeOfDay] || "Welcome!";

    return `${timeGreeting} Discover packs in your area.`;
  }

  // Get contextual call-to-action texts
  getContextualCTAs() {
    const baseCTAs = {
      search: 'Search',
      viewPack: 'View Pack',
      messageVendor: 'Message',
      getDirections: 'Directions',
      saveForLater: 'Save'
    };

    // Customize based on context
    if (this.userContext.isMobile) {
      baseCTAs.messageVendor = 'Message';
      baseCTAs.getDirections = 'Navigate';
    }

    if (this.userContext.timeOfDay === 'evening' || this.userContext.timeOfDay === 'night') {
      baseCTAs.viewPack = 'Check Availability';
    }

    return baseCTAs;
  }

  // Replace placeholders in text templates
  replacePlaceholders(template, variables) {
    let result = template;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return result;
  }

  // Get estimated pack count for a region (mock implementation)
  getEstimatedPackCount(regionName) {
    // In a real implementation, this would query your pack data
    const estimates = {
      'Greater Boston': 45,
      'Providence Metro': 28,
      'Worcester': 15,
      'Hartford': 22
    };

    return estimates[regionName] || Math.floor(Math.random() * 30) + 10;
  }

  // Get content for specific page
  getPageContent(pageName) {
    const pageContent = {
      map: {
        title: 'PacksList',
        searchPlaceholder: this.currentContent.searchPlaceholder,
        locationIndicator: this.currentContent.locationMessage
      },
      
      listings: {
        title: 'Nearby Listings',
        subtitle: this.currentContent.locationMessage,
        searchPlaceholder: 'Search nearby packs and strains'
      },
      
      newPost: {
        title: 'Post a New Pack',
        locationHelp: "We'll suggest nearby areas based on your location"
      },
      
      account: {
        title: 'Your Account',
        welcomeMessage: this.currentContent.welcomeMessage
      }
    };

    return pageContent[pageName] || {};
  }

  // Update content when context changes
  async updateContent(newContext = {}) {
    // Merge new context
    this.userContext = { ...this.userContext, ...newContext };
    
    // Reload contextual content
    await this.loadContextualContent();
  }

  // Get error message for specific error type
  getErrorMessage(errorType, context = {}) {
    const errorMessages = this.currentContent.errorMessages || {};
    
    let message = errorMessages[errorType] || 'An error occurred';
    
    // Add context if available
    if (context.location && errorType === 'no_results') {
      message = `No packs found in ${context.location}`;
    }

    return message;
  }

  // Load fallback content when initialization fails
  loadFallbackContent() {
    this.currentContent = {
      searchPlaceholder: 'Search packs, cities...',
      locationMessage: 'Loading your area...',
      welcomeMessage: 'Welcome to PacksList',
      errorMessages: {
        location_denied: 'Enable location for better results',
        no_results: 'No results found',
        connection_error: 'Connection issue - try again'
      },
      ctaTexts: {
        search: 'Search',
        viewPack: 'View Pack',
        messageVendor: 'Message'
      }
    };

    this.isInitialized = true;
    this.notifyCallbacks('fallbackLoaded');
  }

  // Add callback for content updates
  onContentUpdate(callback) {
    this.contentCallbacks.push(callback);
  }

  // Notify all callbacks
  notifyCallbacks(event, data = null) {
    this.contentCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Content callback error:', error);
      }
    });
  }

  // Get current content
  getCurrentContent() {
    return this.currentContent;
  }

  // Get user context
  getUserContext() {
    return this.userContext;
  }
}

// Global instance
window.contentManager = new ContentManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentManager;
}