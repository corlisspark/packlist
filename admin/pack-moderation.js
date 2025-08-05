// Pack Moderation System for PacksList Admin
// Handles all pack approval/rejection workflows and content filtering

class PackModeration {
  constructor() {
    this.moderationQueue = [];
    this.filterCriteria = {
      keywords: ['safe', 'quality', 'verified'],
      blockedWords: ['fake', 'scam', 'illegal'],
      minDescriptionLength: 10,
      maxPriceThreshold: 1000
    };
    this.autoModerationEnabled = false;
  }

  // Initialize pack moderation system
  initialize() {
    this.loadModerationSettings();
    this.setupAutoModeration();
    console.log('Pack moderation system initialized');
  }

  // Load moderation settings from Firebase config
  async loadModerationSettings() {
    try {
      // Use window.db instead of window.db directly
      const configDoc = await window.db
        .collection('config')
        .doc('moderation-settings')
        .get();
      
      if (configDoc.exists) {
        const settings = configDoc.data();
        this.autoModerationEnabled = settings.autoModerationEnabled || false;
        this.filterCriteria = { ...this.filterCriteria, ...settings.filterCriteria };
      }
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    }
  }

  // Set up auto-moderation listeners
  setupAutoModeration() {
    if (!this.autoModerationEnabled) return;
    
    // Listen for new posts
    window.db
      .collection('posts')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            this.processNewSubmission(change.doc.id, change.doc.data());
          }
        });
      });
  }

  // Process new pack submission for auto-moderation
  async processNewSubmission(packId, packData) {
    try {
      const moderationResult = await this.analyzePack(packData);
      
      if (moderationResult.autoApprove) {
        await this.autoApprovePack(packId, moderationResult.confidence);
      } else if (moderationResult.autoReject) {
        await this.autoRejectPack(packId, moderationResult.reasons);
      } else {
        // Flag for manual review
        await this.flagForManualReview(packId, moderationResult.flags);
      }
      
    } catch (error) {
      console.error('Error in auto-moderation:', error);
      // Fall back to manual review on error
      await this.flagForManualReview(packId, ['auto-moderation-error']);
    }
  }

  // Analyze pack content for moderation decision
  async analyzePack(packData) {
    const analysis = {
      autoApprove: false,
      autoReject: false,
      confidence: 0,
      flags: [],
      reasons: []
    };

    // Content analysis
    const contentScore = this.analyzeContent(packData);
    analysis.confidence = contentScore.score;
    analysis.flags.push(...contentScore.flags);

    // Price analysis
    const priceAnalysis = this.analyzePrice(packData.price);
    if (priceAnalysis.suspicious) {
      analysis.flags.push('suspicious-pricing');
    }

    // User history analysis
    const userAnalysis = await this.analyzeUserHistory(packData.userId);
    if (userAnalysis.trusted) {
      analysis.confidence += 0.2;
    } else if (userAnalysis.suspicious) {
      analysis.flags.push('suspicious-user');
    }

    // Decision logic
    if (analysis.confidence >= 0.8 && analysis.flags.length === 0) {
      analysis.autoApprove = true;
    } else if (analysis.confidence <= 0.2 || analysis.flags.includes('blocked-content')) {
      analysis.autoReject = true;
      analysis.reasons = analysis.flags;
    }

    return analysis;
  }

  // Analyze pack content
  analyzeContent(packData) {
    const analysis = { score: 0.5, flags: [] };
    
    const title = (packData.title || '').toLowerCase();
    const description = (packData.description || '').toLowerCase();
    const fullText = `${title} ${description}`;

    // Check for blocked words
    const hasBlockedWords = this.filterCriteria.blockedWords.some(word => 
      fullText.includes(word.toLowerCase())
    );
    
    if (hasBlockedWords) {
      analysis.flags.push('blocked-content');
      analysis.score = 0.1;
      return analysis;
    }

    // Check for quality indicators
    const hasQualityKeywords = this.filterCriteria.keywords.some(word => 
      fullText.includes(word.toLowerCase())
    );
    
    if (hasQualityKeywords) {
      analysis.score += 0.2;
    }

    // Check description length
    if (description.length >= this.filterCriteria.minDescriptionLength) {
      analysis.score += 0.1;
    } else {
      analysis.flags.push('short-description');
    }

    // Check for complete information
    if (packData.title && packData.price && packData.city && packData.vendor) {
      analysis.score += 0.2;
    } else {
      analysis.flags.push('incomplete-info');
    }

    return analysis;
  }

  // Analyze price for suspicious patterns
  analyzePrice(price) {
    const analysis = { suspicious: false };
    
    const numericPrice = parseFloat(price);
    
    if (isNaN(numericPrice) || numericPrice <= 0) {
      analysis.suspicious = true;
    } else if (numericPrice > this.filterCriteria.maxPriceThreshold) {
      analysis.suspicious = true;
    }

    return analysis;
  }

  // Analyze user history and reputation
  async analyzeUserHistory(userId) {
    try {
      if (!userId) return { trusted: false, suspicious: false };

      // Get user's previous posts
      const userPostsSnapshot = await window.db
        .collection('posts')
        .where('userId', '==', userId)
        .get();

      const userPosts = userPostsSnapshot.docs.map(doc => doc.data());
      const totalPosts = userPosts.length;

      if (totalPosts === 0) {
        return { trusted: false, suspicious: false };
      }

      // Calculate approval rate
      const approvedPosts = userPosts.filter(post => post.status === 'approved').length;
      const rejectedPosts = userPosts.filter(post => post.status === 'rejected').length;
      
      const approvalRate = totalPosts > 0 ? approvedPosts / totalPosts : 0;

      // User is trusted if they have good history
      const trusted = totalPosts >= 3 && approvalRate >= 0.8;
      
      // User is suspicious if they have many rejections
      const suspicious = rejectedPosts >= 3 || (totalPosts >= 5 && approvalRate <= 0.3);

      return { trusted, suspicious, approvalRate, totalPosts };

    } catch (error) {
      console.error('Error analyzing user history:', error);
      return { trusted: false, suspicious: false };
    }
  }

  // Auto-approve pack
  async autoApprovePack(packId, confidence) {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'approved',
        autoApproved: true,
        autoModerationConfidence: confidence,
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedBy: 'auto-moderation-system'
      });

      // Log the auto-approval
      await this.logModerationAction('auto_approved', {
        packId,
        confidence,
        reason: 'high-confidence-auto-approval'
      });

      console.log(`Pack ${packId} auto-approved with confidence ${confidence}`);

    } catch (error) {
      console.error('Error auto-approving pack:', error);
    }
  }

  // Auto-reject pack
  async autoRejectPack(packId, reasons) {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'rejected',
        autoRejected: true,
        rejectionReasons: reasons,
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        rejectedBy: 'auto-moderation-system'
      });

      // Log the auto-rejection
      await this.logModerationAction('auto_rejected', {
        packId,
        reasons,
        reason: 'failed-auto-moderation'
      });

      console.log(`Pack ${packId} auto-rejected for reasons:`, reasons);

    } catch (error) {
      console.error('Error auto-rejecting pack:', error);
    }
  }

  // Flag pack for manual review
  async flagForManualReview(packId, flags) {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'pending',
        moderationFlags: flags,
        flaggedForReview: true,
        flaggedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Log the flagging
      await this.logModerationAction('flagged_for_review', {
        packId,
        flags,
        reason: 'requires-manual-review'
      });

      console.log(`Pack ${packId} flagged for manual review:`, flags);

    } catch (error) {
      console.error('Error flagging pack for review:', error);
    }
  }

  // Manual pack approval with admin user
  async manualApprovePack(packId, adminUserId, notes = '') {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        adminNotes: notes,
        manuallyReviewed: true
      });

      // Log manual approval
      await this.logModerationAction('manual_approved', {
        packId,
        adminUserId,
        notes,
        reason: 'manual-admin-approval'
      });

      // Trigger map update
      await this.triggerMapUpdate(packId);

      return { success: true };

    } catch (error) {
      console.error('Error manually approving pack:', error);
      return { success: false, error };
    }
  }

  // Manual pack rejection with admin user
  async manualRejectPack(packId, adminUserId, reason = '', notes = '') {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'rejected',
        rejectedBy: adminUserId,
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason,
        adminNotes: notes,
        manuallyReviewed: true
      });

      // Log manual rejection
      await this.logModerationAction('manual_rejected', {
        packId,
        adminUserId,
        reason,
        notes
      });

      // Notify user about rejection
      await this.notifyUserOfRejection(packId, reason);

      return { success: true };

    } catch (error) {
      console.error('Error manually rejecting pack:', error);
      return { success: false, error };
    }
  }

  // Bulk approve packs that meet safety criteria
  async bulkApproveSafePacks() {
    try {
      const pendingPacksSnapshot = await window.db
        .collection('posts')
        .where('status', '==', 'pending')
        .where('moderationFlags', '==', [])
        .limit(20)
        .get();

      const approvalPromises = [];
      const safePackIds = [];

      pendingPacksSnapshot.forEach(doc => {
        const packData = doc.data();
        const analysis = this.analyzeContent(packData);
        
        // Only approve packs with high confidence and no flags
        if (analysis.score >= 0.7 && analysis.flags.length === 0) {
          safePackIds.push(doc.id);
          approvalPromises.push(
            this.manualApprovePack(doc.id, 'bulk-approval-system', 'Bulk approved - safe content')
          );
        }
      });

      await Promise.all(approvalPromises);

      await this.logModerationAction('bulk_approved', {
        packIds: safePackIds,
        count: safePackIds.length,
        reason: 'bulk-approval-safe-content'
      });

      return { success: true, approvedCount: safePackIds.length };

    } catch (error) {
      console.error('Error in bulk approval:', error);
      return { success: false, error };
    }
  }

  // Trigger map update after approval
  async triggerMapUpdate(packId) {
    try {
      // This would trigger a map refresh/update
      // For now, we'll just emit an event
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('packApproved', { 
          detail: { packId } 
        }));
      }

    } catch (error) {
      console.error('Error triggering map update:', error);
    }
  }

  // Notify user of pack rejection
  async notifyUserOfRejection(packId, reason) {
    try {
      // Get pack data to find user
      const packDoc = await window.db.collection('posts').doc(packId).get();
      
      if (!packDoc.exists) return;
      
      const packData = packDoc.data();
      
      // Create notification
      await window.db.collection('notifications').add({
        userId: packData.userId,
        type: 'pack_rejected',
        title: 'Pack Rejected',
        message: `Your pack "${packData.title}" was rejected. Reason: ${reason}`,
        packId: packId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });

    } catch (error) {
      console.error('Error notifying user of rejection:', error);
    }
  }

  // Log moderation action for audit trail
  async logModerationAction(action, details) {
    try {
      await window.db.collection('moderation_logs').add({
        action,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      });

    } catch (error) {
      console.error('Error logging moderation action:', error);
    }
  }

  // Get moderation statistics
  async getModerationStats() {
    try {
      const [totalSnapshot, pendingSnapshot, approvedSnapshot, rejectedSnapshot] = await Promise.all([
        window.db.collection('posts').get(),
        window.db.collection('posts').where('status', '==', 'pending').get(),
        window.db.collection('posts').where('status', '==', 'approved').get(),
        window.db.collection('posts').where('status', '==', 'rejected').get()
      ]);

      return {
        total: totalSnapshot.size,
        pending: pendingSnapshot.size,
        approved: approvedSnapshot.size,
        rejected: rejectedSnapshot.size,
        approvalRate: totalSnapshot.size > 0 ? (approvedSnapshot.size / totalSnapshot.size) * 100 : 0
      };

    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, approvalRate: 0 };
    }
  }

  // Update moderation settings
  async updateModerationSettings(newSettings) {
    try {
      await window.db
        .collection('config')
        .doc('moderation-settings')
        .set(newSettings, { merge: true });

      // Update local settings
      this.autoModerationEnabled = newSettings.autoModerationEnabled || this.autoModerationEnabled;
      this.filterCriteria = { ...this.filterCriteria, ...newSettings.filterCriteria };

      // Re-setup auto-moderation if needed
      if (newSettings.autoModerationEnabled !== undefined) {
        this.setupAutoModeration();
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating moderation settings:', error);
      return { success: false, error };
    }
  }
}

// Initialize pack moderation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be initialized
  function initializeWhenReady() {
    if (window.db && window.authManager) {
      window.packModeration = new PackModeration();
      window.packModeration.initialize();
    } else {
      setTimeout(initializeWhenReady, 100);
    }
  }
  initializeWhenReady();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PackModeration;
}