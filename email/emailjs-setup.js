// EmailJS Setup for PacksList
// Simple email service for notifications and contact forms

class EmailService {
  constructor() {
    // Your EmailJS credentials
    this.publicKey = '9Ze5FrVKMuju64tuY'; // From EmailJS Dashboard -> Account
    this.serviceId = 'service_tjfhroa'; // From EmailJS Dashboard -> Email Services  
    this.templates = {
      packNotification: 'PASTE_YOUR_PACK_NOTIFICATION_TEMPLATE_ID_HERE',
      welcome: 'PASTE_YOUR_WELCOME_TEMPLATE_ID_HERE', 
      adminAlert: 'PASTE_YOUR_ADMIN_ALERT_TEMPLATE_ID_HERE'
    };
    this.isInitialized = false;
    
    this.initializeEmailJS();
  }

  // Initialize EmailJS
  async initializeEmailJS() {
    try {
      // Load EmailJS script
      if (!window.emailjs) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => {
          emailjs.init(this.publicKey);
          this.isInitialized = true;
          console.log('EmailJS initialized successfully');
        };
        document.head.appendChild(script);
      } else {
        emailjs.init(this.publicKey);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Error initializing EmailJS:', error);
    }
  }

  // Send pack notification email
  async sendPackNotification(userEmail, packData, notificationType) {
    if (!this.isInitialized) {
      console.warn('EmailJS not initialized');
      return { success: false, error: 'Email service not ready' };
    }

    try {
      const templateParams = {
        to_email: userEmail,
        pack_title: packData.title,
        pack_location: packData.location,
        pack_type: packData.type,
        notification_type: notificationType,
        app_name: 'PacksList',
        app_url: window.location.origin
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templates.packNotification,
        templateParams
      );

      console.log('Email sent successfully:', result);
      return { success: true, result };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, userName) {
    const templateParams = {
      to_email: userEmail,
      user_name: userName,
      app_name: 'PacksList',
      app_url: window.location.origin
    };

    try {
      const result = await emailjs.send(
        this.serviceId,
        this.templates.welcome,
        templateParams
      );
      
      return { success: true, result };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }
  }

  // Send admin notification
  async sendAdminAlert(alertData) {
    const templateParams = {
      to_email: 'sxpxru@gmail.com', // Admin email
      alert_type: alertData.type,
      alert_message: alertData.message,
      user_email: alertData.userEmail || 'Unknown',
      timestamp: new Date().toLocaleString()
    };

    try {
      const result = await emailjs.send(
        this.serviceId,
        this.templates.adminAlert,
        templateParams
      );
      
      return { success: true, result };
    } catch (error) {
      console.error('Error sending admin alert:', error);
      return { success: false, error };
    }
  }
}

// Initialize email service
window.emailService = new EmailService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailService;
}