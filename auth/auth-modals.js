// Authentication Modals Component for PacksList
// Provides complete authentication UI with modals for all auth flows

class AuthModals {
  constructor() {
    this.isInitialized = false;
    this.activeModal = null;
    this.formValidators = {};
    
    // Bind methods
    this.handleSignInSubmit = this.handleSignInSubmit.bind(this);
    this.handleSignUpSubmit = this.handleSignUpSubmit.bind(this);
    this.handleResetPasswordSubmit = this.handleResetPasswordSubmit.bind(this);
  }

  // Initialize modals on the page
  initialize() {
    if (this.isInitialized) return;
    
    this.createModalHTML();
    this.attachEventListeners();
    this.setupFormValidation();
    this.isInitialized = true;
    
    console.log('Auth modals initialized');
  }

  // Create all modal HTML structures
  createModalHTML() {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'auth-modal-container';
    modalContainer.innerHTML = this.getModalHTML();
    
    document.body.appendChild(modalContainer);
  }

  // Get complete modal HTML
  getModalHTML() {
    return `
      <!-- Sign In Modal -->
      <div id="sign-in-modal" class="auth-modal">
        <div class="modal-overlay" data-close-modal></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Sign In</h2>
            <button class="modal-close" data-close-modal>✕</button>
          </div>
          <div class="modal-body">
            <form id="sign-in-form" class="auth-form">
              <div class="form-group">
                <label for="signin-email">Email</label>
                <input type="email" id="signin-email" name="email" required autocomplete="email">
                <div class="form-error" id="signin-email-error"></div>
              </div>
              <div class="form-group">
                <label for="signin-password">Password</label>
                <input type="password" id="signin-password" name="password" required autocomplete="current-password">
                <div class="form-error" id="signin-password-error"></div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Sign In</button>
                <button type="button" class="btn btn-link" data-show-modal="forgot-password-modal">
                  Forgot Password?
                </button>
              </div>
            </form>
            <div class="auth-divider">
              <span>Don't have an account?</span>
            </div>
            <button class="btn btn-outline" data-show-modal="sign-up-modal">
              Create Account
            </button>
          </div>
        </div>
      </div>

      <!-- Sign Up Modal -->
      <div id="sign-up-modal" class="auth-modal">
        <div class="modal-overlay" data-close-modal></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Create Account</h2>
            <button class="modal-close" data-close-modal>✕</button>
          </div>
          <div class="modal-body">
            <form id="sign-up-form" class="auth-form">
              <div class="form-group">
                <label for="signup-display-name">Display Name</label>
                <input type="text" id="signup-display-name" name="displayName" autocomplete="name">
                <div class="form-error" id="signup-display-name-error"></div>
              </div>
              <div class="form-group">
                <label for="signup-email">Email</label>
                <input type="email" id="signup-email" name="email" required autocomplete="email">
                <div class="form-error" id="signup-email-error"></div>
              </div>
              <div class="form-group">
                <label for="signup-password">Password</label>
                <input type="password" id="signup-password" name="password" required autocomplete="new-password">
                <div class="form-help">At least 6 characters</div>
                <div class="form-error" id="signup-password-error"></div>
              </div>
              <div class="form-group">
                <label for="signup-confirm-password">Confirm Password</label>
                <input type="password" id="signup-confirm-password" name="confirmPassword" required autocomplete="new-password">
                <div class="form-error" id="signup-confirm-password-error"></div>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="signup-location-consent" name="locationConsent">
                  <span class="checkmark"></span>
                  Share my location for better pack recommendations
                </label>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="signup-notifications" name="notifications" checked>
                  <span class="checkmark"></span>
                  Receive email notifications about pack updates
                </label>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Create Account</button>
              </div>
            </form>
            <div class="auth-divider">
              <span>Already have an account?</span>
            </div>
            <button class="btn btn-outline" data-show-modal="sign-in-modal">
              Sign In
            </button>
          </div>
        </div>
      </div>

      <!-- Email Verification Modal -->
      <div id="email-verification-modal" class="auth-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Verify Your Email</h2>
            <button class="modal-close" data-close-modal>✕</button>
          </div>
          <div class="modal-body">
            <div class="verification-content">
              <div class="verification-icon">📧</div>
              <h3>Check Your Email</h3>
              <p id="verification-message">
                We've sent a verification link to your email address. 
                Please click the link to verify your account.
              </p>
              <div class="verification-actions">
                <button id="resend-verification" class="btn btn-outline">
                  Resend Verification Email
                </button>
                <button id="refresh-verification" class="btn btn-primary">
                  I've Verified - Refresh
                </button>
              </div>
              <div class="auth-divider">
                <span>Wrong email address?</span>
              </div>
              <button class="btn btn-link" data-show-modal="sign-up-modal">
                Use Different Email
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Forgot Password Modal -->
      <div id="forgot-password-modal" class="auth-modal">
        <div class="modal-overlay" data-close-modal></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Reset Password</h2>
            <button class="modal-close" data-close-modal>✕</button>
          </div>
          <div class="modal-body">
            <form id="forgot-password-form" class="auth-form">
              <div class="form-group">
                <label for="reset-email">Email Address</label>
                <input type="email" id="reset-email" name="email" required autocomplete="email">
                <div class="form-help">
                  We'll send you a link to reset your password
                </div>
                <div class="form-error" id="reset-email-error"></div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Send Reset Link</button>
              </div>
            </form>
            <div class="auth-divider">
              <span>Remember your password?</span>
            </div>
            <button class="btn btn-outline" data-show-modal="sign-in-modal">
              Back to Sign In
            </button>
          </div>
        </div>
      </div>

      <!-- Auth Loading Overlay -->
      <div id="auth-loader" class="auth-loader">
        <div class="loader-content">
          <div class="spinner"></div>
          <div id="auth-loader-text">Processing...</div>
        </div>
      </div>

      <!-- Auth Messages Container -->
      <div id="auth-messages" class="auth-messages"></div>
    `;
  }

  // Attach event listeners to modals
  attachEventListeners() {
    // Modal controls
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-modal')) {
        this.hideAllModals();
      }
      
      if (e.target.hasAttribute('data-show-modal')) {
        const modalId = e.target.getAttribute('data-show-modal');
        this.showModal(modalId);
      }
    });

    // Form submissions
    document.getElementById('sign-in-form').addEventListener('submit', this.handleSignInSubmit);
    document.getElementById('sign-up-form').addEventListener('submit', this.handleSignUpSubmit);
    document.getElementById('forgot-password-form').addEventListener('submit', this.handleResetPasswordSubmit);

    // Email verification actions
    document.getElementById('resend-verification').addEventListener('click', () => {
      this.resendVerificationEmail();
    });

    document.getElementById('refresh-verification').addEventListener('click', () => {
      this.checkEmailVerification();
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
      }
    });

    // Auth state listeners
    if (window.authManager) {
      window.authManager.addAuthListener((event, data) => {
        this.handleAuthEvent(event, data);
      });
    }
  }

  // Setup form validation
  setupFormValidation() {
    // Real-time validation for sign up form
    const signUpForm = document.getElementById('sign-up-form');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    const emailInput = document.getElementById('signup-email');

    passwordInput.addEventListener('input', () => {
      this.validatePassword(passwordInput.value);
    });

    confirmPasswordInput.addEventListener('input', () => {
      this.validatePasswordConfirmation(passwordInput.value, confirmPasswordInput.value);
    });

    emailInput.addEventListener('blur', () => {
      this.validateEmail(emailInput.value, 'signup-email-error');
    });

    // Sign in form validation
    const signInEmail = document.getElementById('signin-email');
    signInEmail.addEventListener('blur', () => {
      this.validateEmail(signInEmail.value, 'signin-email-error');
    });
  }

  // Form validation methods
  validateEmail(email, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      this.showFieldError(errorElement, 'Email is required');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      this.showFieldError(errorElement, 'Please enter a valid email address');
      return false;
    }
    
    this.clearFieldError(errorElement);
    return true;
  }

  validatePassword(password) {
    const errorElement = document.getElementById('signup-password-error');
    
    if (!password) {
      this.showFieldError(errorElement, 'Password is required');
      return false;
    }
    
    if (password.length < 6) {
      this.showFieldError(errorElement, 'Password must be at least 6 characters');
      return false;
    }
    
    this.clearFieldError(errorElement);
    return true;
  }

  validatePasswordConfirmation(password, confirmPassword) {
    const errorElement = document.getElementById('signup-confirm-password-error');
    
    if (!confirmPassword) {
      this.showFieldError(errorElement, 'Please confirm your password');
      return false;
    }
    
    if (password !== confirmPassword) {
      this.showFieldError(errorElement, 'Passwords do not match');
      return false;
    }
    
    this.clearFieldError(errorElement);
    return true;
  }

  showFieldError(errorElement, message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  clearFieldError(errorElement) {
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  // Form submission handlers
  async handleSignInSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Validate inputs
    if (!this.validateEmail(email, 'signin-email-error')) return;
    if (!password) {
      this.showFieldError(document.getElementById('signin-password-error'), 'Password is required');
      return;
    }
    
    // Attempt sign in
    const result = await window.authManager.signIn(email, password);
    
    if (result.success) {
      this.hideAllModals();
    }
  }

  async handleSignUpSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const displayName = formData.get('displayName');
    const locationConsent = formData.get('locationConsent') === 'on';
    const notifications = formData.get('notifications') === 'on';
    
    // Validate all inputs
    if (!this.validateEmail(email, 'signup-email-error')) return;
    if (!this.validatePassword(password)) return;
    if (!this.validatePasswordConfirmation(password, confirmPassword)) return;
    
    // Prepare user data
    const userData = {
      displayName: displayName || '',
      preferences: {
        locationSharing: locationConsent,
        emailNotifications: notifications,
        pushNotifications: false
      }
    };
    
    // Attempt sign up
    const result = await window.authManager.signUp(email, password, userData);
    
    if (result.success) {
      this.hideAllModals();
      this.showModal('email-verification-modal');
    }
  }

  async handleResetPasswordSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    
    if (!this.validateEmail(email, 'reset-email-error')) return;
    
    const result = await window.authManager.resetPassword(email);
    
    if (result.success) {
      this.hideAllModals();
    }
  }

  // Email verification methods
  async resendVerificationEmail() {
    const result = await window.authManager.sendEmailVerification();
    
    if (result.success) {
      const messageEl = document.getElementById('verification-message');
      messageEl.textContent = 'Verification email sent! Please check your inbox and spam folder.';
    }
  }

  async checkEmailVerification() {
    if (window.authManager.currentUser) {
      await window.authManager.currentUser.reload();
      
      if (window.authManager.currentUser.emailVerified) {
        this.hideAllModals();
        window.authManager.showAuthSuccess('Email verified successfully!');
      } else {
        window.authManager.showAuthError('Email not yet verified. Please check your inbox.');
      }
    }
  }

  // Handle auth events
  handleAuthEvent(event, data) {
    switch (event) {
      case 'authenticated':
        this.hideAllModals();
        break;
      case 'emailVerified':
        this.hideAllModals();
        break;
      case 'unauthenticated':
        // Could show sign in prompt depending on page
        break;
    }
  }

  // Modal management
  showModal(modalId) {
    this.hideAllModals();
    
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      this.activeModal = modalId;
      
      // Focus first input
      const firstInput = modal.querySelector('input[type="email"], input[type="text"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  hideAllModals() {
    const modals = document.querySelectorAll('.auth-modal');
    modals.forEach(modal => modal.classList.remove('active'));
    this.activeModal = null;
    
    // Clear all form errors
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(el => this.clearFieldError(el));
  }

  // Public methods for other components
  showSignIn() {
    this.showModal('sign-in-modal');
  }

  showSignUp() {
    this.showModal('sign-up-modal');
  }

  showEmailVerification() {
    this.showModal('email-verification-modal');
  }

  showForgotPassword() {
    this.showModal('forgot-password-modal');
  }

  isModalActive() {
    return this.activeModal !== null;
  }
}

// Initialize auth modals when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.authModals = new AuthModals();
  window.authModals.initialize();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthModals;
}