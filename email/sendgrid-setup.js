// SendGrid Email Service for PacksList
// Professional email service with templates and analytics

class SendGridEmailService {
  constructor() {
    this.apiKey = 'your_sendgrid_api_key'; // Store in Firebase Functions environment
    this.fromEmail = 'noreply@packslist.com';
    this.fromName = 'PacksList';
  }

  // Send email via Firebase Function (secure)
  async sendEmail(emailData) {
    try {
      // Call Firebase Function that handles SendGrid
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await window.authManager.currentUser.getIdToken()}`
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  // Send pack approval notification
  async sendPackApproved(userEmail, packData) {
    const emailData = {
      to: userEmail,
      templateId: 'pack_approved_template',
      dynamicData: {
        pack_title: packData.title,
        pack_location: packData.location,
        approval_date: new Date().toLocaleDateString()
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send pack rejection notification  
  async sendPackRejected(userEmail, packData, reason) {
    const emailData = {
      to: userEmail,
      templateId: 'pack_rejected_template',
      dynamicData: {
        pack_title: packData.title,
        rejection_reason: reason,
        resubmit_url: `${window.location.origin}/new.html`
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send weekly digest
  async sendWeeklyDigest(userEmail, digestData) {
    const emailData = {
      to: userEmail,
      templateId: 'weekly_digest_template',
      dynamicData: {
        new_packs_count: digestData.newPacks,
        nearby_packs: digestData.nearbyPacks,
        user_location: digestData.userLocation
      }
    };

    return await this.sendEmail(emailData);
  }
}

// Export for use
window.sendGridService = new SendGridEmailService();