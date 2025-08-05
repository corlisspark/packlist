// User Onboarding Manager for PacksList
// Handles new user welcome flow, location detection, and preference setup

class OnboardingManager {
  constructor() {
    this.isOnboardingActive = false;
    this.currentStep = 0;
    this.onboardingData = {};
    this.totalSteps = 3;
    
    this.steps = [
      'welcome',
      'location',
      'preferences'
    ];
    
    this.initializeWhenReady();
  }

  // Wait for auth manager and initialize
  async initializeWhenReady() {
    if (window.authManager) {
      this.initialize();
    } else {
      setTimeout(() => this.initializeWhenReady(), 100);
    }
  }

  // Initialize onboarding manager
  initialize() {
    console.log('Initializing onboarding manager...');
    
    // Listen for new user events
    window.authManager.addAuthListener((event, data) => {
      this.handleAuthEvent(event, data);
    });
  }

  // Handle authentication events
  handleAuthEvent(event, data) {
    switch (event) {
      case 'authenticated':
        // Check if user needs onboarding
        if (data.profile && !data.profile.onboardingCompleted) {
          this.startOnboarding();
        }
        break;
      case 'emailVerified':
        // Start onboarding after email verification
        if (window.authManager.currentUserProfile && 
            !window.authManager.currentUserProfile.onboardingCompleted) {
          this.startOnboarding();
        }
        break;
    }
  }

  // Start onboarding flow
  async startOnboarding() {
    if (this.isOnboardingActive) return;
    
    console.log('Starting user onboarding...');
    this.isOnboardingActive = true;
    this.currentStep = 0;
    this.onboardingData = {};
    
    // Create onboarding UI
    this.createOnboardingModal();
    
    // Show first step
    this.showStep('welcome');
  }

  // Create onboarding modal
  createOnboardingModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('onboarding-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'onboarding-modal';
    modal.className = 'onboarding-modal';
    modal.innerHTML = `
      <div class="onboarding-overlay"></div>
      <div class="onboarding-content">
        <div class="onboarding-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="onboarding-progress-fill"></div>
          </div>
          <div class="progress-text">
            <span id="current-step">1</span> of ${this.totalSteps}
          </div>
        </div>
        <div class="onboarding-body" id="onboarding-body">
          <!-- Step content will be inserted here -->
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.addOnboardingCSS();
  }

  // Add onboarding CSS
  addOnboardingCSS() {
    if (document.getElementById('onboarding-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'onboarding-styles';
    style.textContent = `
      .onboarding-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10001;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(5px);
      }
      
      .onboarding-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      
      .onboarding-content {
        position: relative;
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: onboardingSlideIn 0.4s ease-out;
      }
      
      @keyframes onboardingSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .onboarding-progress {
        padding: 24px 24px 0 24px;
        text-align: center;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        border-radius: 3px;
        transition: width 0.3s ease;
        width: 33.33%;
      }
      
      .progress-text {
        font-size: 14px;
        color: #6c757d;
        font-weight: 500;
      }
      
      .onboarding-body {
        padding: 32px;
        text-align: center;
        min-height: 300px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      
      .onboarding-step {
        animation: stepFadeIn 0.3s ease-out;
      }
      
      @keyframes stepFadeIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .step-icon {
        font-size: 64px;
        margin-bottom: 24px;
        opacity: 0.8;
      }
      
      .step-title {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 16px;
      }
      
      .step-description {
        font-size: 16px;
        color: #6c757d;
        line-height: 1.5;
        margin-bottom: 32px;
      }
      
      .step-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .onboarding-btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      
      .onboarding-btn-primary {
        background: #4CAF50;
        color: white;
        border-color: #4CAF50;
      }
      
      .onboarding-btn-primary:hover {
        background: #45a049;
        border-color: #45a049;
        transform: translateY(-1px);
      }
      
      .onboarding-btn-outline {
        background: transparent;
        color: #4CAF50;
        border-color: #4CAF50;
      }
      
      .onboarding-btn-outline:hover {
        background: #4CAF50;
        color: white;
      }
      
      .onboarding-btn-link {
        background: none;
        color: #6c757d;
        border: none;
        text-decoration: underline;
        padding: 8px 0;
      }
      
      .location-permission {
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
      }
      
      .location-permission h4 {
        margin: 0 0 8px 0;
        color: #2c3e50;
        font-size: 16px;
      }
      
      .location-permission p {
        margin: 0;
        color: #6c757d;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .preference-group {
        text-align: left;
        margin-bottom: 20px;
      }
      
      .preference-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .preference-item:last-child {
        border-bottom: none;
      }
      
      .preference-info {
        flex: 1;
        margin-right: 16px;
      }
      
      .preference-title {
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 4px;
      }
      
      .preference-description {
        font-size: 13px;
        color: #6c757d;
        line-height: 1.4;
      }
      
      .preference-toggle {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 24px;
      }
      
      .preference-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .preference-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.3s;
        border-radius: 24px;
      }
      
      .preference-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
      
      input:checked + .preference-slider {
        background-color: #4CAF50;
      }
      
      input:checked + .preference-slider:before {
        transform: translateX(24px);
      }
      
      @media (max-width: 480px) {
        .onboarding-content {
          width: 95%;
          margin: 20px;
        }
        
        .onboarding-body {
          padding: 24px;
          min-height: 250px;
        }
        
        .step-icon {
          font-size: 48px;
        }
        
        .step-title {
          font-size: 20px;
        }
        
        .step-actions {
          flex-direction: column;
        }
        
        .onboarding-btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Show specific onboarding step
  showStep(stepName) {
    const stepIndex = this.steps.indexOf(stepName);
    this.currentStep = stepIndex;
    
    // Update progress
    this.updateProgress();
    
    // Get step content
    const stepContent = this.getStepContent(stepName);
    
    // Update modal body
    const body = document.getElementById('onboarding-body');
    if (body) {
      body.innerHTML = stepContent;
    }
  }

  // Update progress bar
  updateProgress() {
    const progressFill = document.getElementById('onboarding-progress-fill');
    const currentStepEl = document.getElementById('current-step');
    
    if (progressFill) {
      const percentage = ((this.currentStep + 1) / this.totalSteps) * 100;
      progressFill.style.width = `${percentage}%`;
    }
    
    if (currentStepEl) {
      currentStepEl.textContent = this.currentStep + 1;
    }
  }

  // Get content for specific step
  getStepContent(stepName) {
    switch (stepName) {
      case 'welcome':
        return this.getWelcomeStepContent();
      case 'location':
        return this.getLocationStepContent();
      case 'preferences':
        return this.getPreferencesStepContent();
      default:
        return '<div>Unknown step</div>';
    }
  }

  // Welcome step content
  getWelcomeStepContent() {
    const userName = window.authManager.currentUserProfile?.displayName || 
                     window.authManager.currentUser?.email?.split('@')[0] || 
                     'there';
    
    return `
      <div class="onboarding-step">
        <div class="step-icon">🌿</div>
        <div class="step-title">Welcome to PacksList, ${userName}!</div>
        <div class="step-description">
          We're excited to have you join our community. Let's take a quick moment to set up your account and personalize your experience.
        </div>
        <div class="step-actions">
          <button class="onboarding-btn onboarding-btn-primary" onclick="onboardingManager.nextStep()">
            Let's Get Started
          </button>
          <button class="onboarding-btn onboarding-btn-link" onclick="onboardingManager.skipOnboarding()">
            Skip for now
          </button>
        </div>
      </div>
    `;
  }

  // Location step content
  getLocationStepContent() {
    return `
      <div class="onboarding-step">
        <div class="step-icon">📍</div>
        <div class="step-title">Share Your Location</div>
        <div class="step-description">
          Help us show you packs in your area by sharing your location. This helps you discover nearby vendors and get better recommendations.
        </div>
        
        <div class="location-permission">
          <h4>🔒 Your Privacy Matters</h4>
          <p>We only use your location to show relevant packs nearby. Your exact location is never shared with other users or stored permanently.</p>
        </div>
        
        <div class="step-actions">
          <button class="onboarding-btn onboarding-btn-primary" onclick="onboardingManager.requestLocation()">
            📍 Share Location
          </button>
          <button class="onboarding-btn onboarding-btn-outline" onclick="onboardingManager.nextStep()">
            Skip Location
          </button>
        </div>
      </div>
    `;
  }

  // Preferences step content
  getPreferencesStepContent() {
    return `
      <div class="onboarding-step">
        <div class="step-icon">⚙️</div>
        <div class="step-title">Customize Your Experience</div>
        <div class="step-description">
          Set your preferences to get the most out of PacksList.
        </div>
        
        <div class="preference-group">
          <div class="preference-item">
            <div class="preference-info">
              <div class="preference-title">Email Notifications</div>
              <div class="preference-description">Get notified when your packs are approved or when you receive messages</div>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" id="email-notifications" checked>
              <span class="preference-slider"></span>
            </label>
          </div>
          
          <div class="preference-item">
            <div class="preference-info">
              <div class="preference-title">Location-Based Recommendations</div>
              <div class="preference-description">Show packs from your area first in search results</div>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" id="location-recommendations" checked>
              <span class="preference-slider"></span>
            </label>
          </div>
          
          <div class="preference-item">
            <div class="preference-info">
              <div class="preference-title">Profile Visibility</div>
              <div class="preference-description">Allow other users to see your profile and ratings</div>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" id="profile-visibility" checked>
              <span class="preference-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="step-actions">
          <button class="onboarding-btn onboarding-btn-primary" onclick="onboardingManager.completeOnboarding()">
            🎉 Complete Setup
          </button>
          <button class="onboarding-btn onboarding-btn-outline" onclick="onboardingManager.previousStep()">
            Back
          </button>
        </div>
      </div>
    `;
  }

  // Navigate to next step
  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.showStep(this.steps[this.currentStep + 1]);
    } else {
      this.completeOnboarding();
    }
  }

  // Navigate to previous step
  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.steps[this.currentStep - 1]);
    }
  }

  // Request user location
  async requestLocation() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });
      
      this.onboardingData.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      this.onboardingData.locationSharing = true;
      
      // Show success message
      window.authManager?.showAuthSuccess('Location shared successfully!');
      
      // Move to next step
      this.nextStep();
      
    } catch (error) {
      console.error('Error getting location:', error);
      
      let errorMessage = 'Unable to get your location. ';
      if (error.code === 1) {
        errorMessage += 'Location access was denied.';
      } else if (error.code === 2) {
        errorMessage += 'Location unavailable.';
      } else if (error.code === 3) {
        errorMessage += 'Location request timed out.';
      } else {
        errorMessage += 'Please try again or skip for now.';
      }
      
      window.authManager?.showAuthError(errorMessage);
    }
  }

  // Complete onboarding
  async completeOnboarding() {
    try {
      // Collect preferences from UI
      const emailNotifications = document.getElementById('email-notifications')?.checked || false;
      const locationRecommendations = document.getElementById('location-recommendations')?.checked || false;
      const profileVisibility = document.getElementById('profile-visibility')?.checked || false;
      
      // Prepare onboarding data
      const onboardingData = {
        ...this.onboardingData,
        preferences: {
          emailNotifications,
          locationSharing: this.onboardingData.locationSharing || false,
          locationRecommendations,
          profileVisibility,
          pushNotifications: false
        },
        onboardingCompleted: true,
        onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Update user profile
      await window.authManager.updateProfile(onboardingData);
      
      // Close onboarding modal
      this.closeOnboarding();
      
      // Show success message
      window.authManager?.showAuthSuccess('Welcome to PacksList! Your account is all set up.');
      
      // Trigger location detection if enabled
      if (this.onboardingData.locationSharing && window.locationManager) {
        window.locationManager.detectUserLocation();
      }
      
      console.log('Onboarding completed successfully');
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      window.authManager?.showAuthError('Error completing setup. Please try again.');
    }
  }

  // Skip onboarding
  async skipOnboarding() {
    try {
      // Mark onboarding as completed but with minimal data
      await window.authManager.updateProfile({
        onboardingCompleted: true,
        onboardingSkipped: true,
        onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      this.closeOnboarding();
      
      window.authManager?.showAuthSuccess('Setup skipped. You can update your preferences in your account settings.');
      
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      this.closeOnboarding(); // Close anyway
    }
  }

  // Close onboarding modal
  closeOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.style.animation = 'onboardingSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
    
    this.isOnboardingActive = false;
    this.currentStep = 0;
    this.onboardingData = {};
    
    // Add slide out animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes onboardingSlideOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => style.remove(), 1000);
  }
}

// Global instance
window.onboardingManager = new OnboardingManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingManager;
}