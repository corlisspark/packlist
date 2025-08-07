// Email Integration with PacksList Auth and Events
// Automatically sends emails for various app events

class EmailIntegration {
  constructor() {
    this.emailService = window.emailService;
    this.authManager = window.authManager;
    this.setupEventListeners();
  }

  // Setup listeners for auth and app events
  setupEventListeners() {
    // Listen for auth events
    if (this.authManager) {
      this.authManager.addAuthListener((event, data) => {
        this.handleAuthEvent(event, data);
      });
    }

    // Listen for pack events (if pack management exists)
    document.addEventListener('packStatusChanged', (e) => {
      this.handlePackEvent(e.detail);
    });

    // Listen for admin events
    document.addEventListener('adminAction', (e) => {
      this.handleAdminEvent(e.detail);
    });
  }

  // Handle authentication events
  async handleAuthEvent(event, data) {
    if (!this.emailService || !this.emailService.isInitialized) {
      console.log('Email service not ready, skipping email for:', event);
      return;
    }

    switch (event) {
      case 'authenticated':
        // Send welcome email for new users
        if (data.user && this.isNewUser(data.user)) {
          await this.sendWelcomeEmail(data.user, data.profile);
        }
        break;

      case 'emailVerified':
        await this.sendEmailVerifiedConfirmation(data.user);
        break;

      case 'profileUpdated':
        // Could send email about profile changes
        console.log('Profile updated, email notification could be sent');
        break;
    }
  }

  // Handle pack-related events
  async handlePackEvent(eventData) {
    if (!this.emailService || !this.emailService.isInitialized) return;

    const { packData, oldStatus, newStatus, userId } = eventData;

    // Get user email
    const userDoc = await window.db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    
    // Check if user wants email notifications
    if (!userData.preferences?.emailNotifications) return;

    // Send appropriate notification
    switch (newStatus) {
      case 'approved':
        await this.sendPackApprovedEmail(userData.email, packData);
        break;
      case 'rejected':
        await this.sendPackRejectedEmail(userData.email, packData);
        break;
      case 'flagged':
        await this.sendPackFlaggedEmail(userData.email, packData);
        break;
    }
  }

  // Handle admin events
  async handleAdminEvent(eventData) {
    if (!this.emailService || !this.emailService.isInitialized) return;

    await this.emailService.sendAdminAlert({
      type: eventData.action,
      message: eventData.description,
      userEmail: eventData.targetUser || 'System'
    });
  }

  // Check if user is new (created within last hour)
  isNewUser(user) {
    if (!user.metadata?.creationTime) return false;
    
    const createdAt = new Date(user.metadata.creationTime);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return createdAt > oneHourAgo;
  }

  // Send welcome email to new users
  async sendWelcomeEmail(user, profile) {
    try {
      const result = await this.emailService.sendWelcomeEmail(
        user.email,
        profile?.displayName || user.displayName || 'New User'
      );

      if (result.success) {
        console.log('Welcome email sent successfully to:', user.email);
        
        // Log the email send event
        await this.logEmailEvent('welcome', user.email, 'sent');
      } else {
        console.error('Failed to send welcome email:', result.error);
        await this.logEmailEvent('welcome', user.email, 'failed', result.error);
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      await this.logEmailEvent('welcome', user.email, 'error', error.message);
    }
  }

  // Send pack approved notification
  async sendPackApprovedEmail(userEmail, packData) {
    try {
      const result = await this.emailService.sendPackNotification(
        userEmail,
        packData,
        'approved'
      );

      if (result.success) {
        console.log('Pack approved email sent to:', userEmail);
        await this.logEmailEvent('pack_approved', userEmail, 'sent');
      }
    } catch (error) {
      console.error('Error sending pack approved email:', error);
      await this.logEmailEvent('pack_approved', userEmail, 'error', error.message);
    }
  }

  // Send pack rejected notification  
  async sendPackRejectedEmail(userEmail, packData) {
    try {
      const result = await this.emailService.sendPackNotification(
        userEmail,
        packData,
        'rejected'
      );

      if (result.success) {
        console.log('Pack rejected email sent to:', userEmail);
        await this.logEmailEvent('pack_rejected', userEmail, 'sent');
      }
    } catch (error) {
      console.error('Error sending pack rejected email:', error);
      await this.logEmailEvent('pack_rejected', userEmail, 'error', error.message);
    }
  }

  // Send pack flagged notification
  async sendPackFlaggedEmail(userEmail, packData) {
    try {
      const result = await this.emailService.sendPackNotification(
        userEmail,
        packData,
        'flagged'
      );

      if (result.success) {
        console.log('Pack flagged email sent to:', userEmail);
        await this.logEmailEvent('pack_flagged', userEmail, 'sent');
      }
    } catch (error) {
      console.error('Error sending pack flagged email:', error);
      await this.logEmailEvent('pack_flagged', userEmail, 'error', error.message);
    }
  }

  // Send email verification confirmation
  async sendEmailVerifiedConfirmation(user) {
    // This could send a "Thanks for verifying your email" message
    console.log('Email verified for:', user.email);
    // Optional: implement confirmation email
  }

  // Log email events for tracking
  async logEmailEvent(type, recipient, status, error = null) {
    try {
      await window.db.collection('email_logs').add({
        type,
        recipient,
        status,
        error,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        sentBy: 'emailjs'
      });
    } catch (logError) {
      console.error('Error logging email event:', logError);
    }
  }

  // Manual email sending methods for admin use
  async sendCustomEmail(recipientEmail, templateType, customData) {
    if (!this.emailService || !this.emailService.isInitialized) {
      throw new Error('Email service not initialized');
    }

    switch (templateType) {
      case 'welcome':
        return await this.emailService.sendWelcomeEmail(recipientEmail, customData.userName);
      
      case 'pack_notification':
        return await this.emailService.sendPackNotification(
          recipientEmail, 
          customData.packData, 
          customData.notificationType
        );
      
      case 'admin_alert':
        return await this.emailService.sendAdminAlert(customData);
      
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }
  }

  // Test email functionality
  async testEmailIntegration() {
    console.log('🧪 Testing email integration...');
    
    if (!this.emailService) {
      console.error('❌ Email service not available');
      return false;
    }

    if (!this.emailService.isInitialized) {
      console.error('❌ Email service not initialized');
      return false;
    }

    try {
      // Test with current user's email or admin email
      const testEmail = this.authManager?.currentUser?.email || 'sxpxru@gmail.com';
      
      const result = await this.sendCustomEmail(testEmail, 'welcome', {
        userName: 'Test User'
      });

      if (result.success) {
        console.log('✅ Email integration test successful');
        return true;
      } else {
        console.error('❌ Email integration test failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Email integration test error:', error);
      return false;
    }
  }
}

// Initialize email integration when both auth manager and email service are ready
function initializeEmailIntegration() {
  if (window.authManager && window.emailService) {
    window.emailIntegration = new EmailIntegration();
    console.log('📧 Email integration initialized');
  } else {
    setTimeout(initializeEmailIntegration, 1000);
  }
}

// Start initialization
setTimeout(initializeEmailIntegration, 2000);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailIntegration;
}