// Pack Moderation Manager for PacksList Admin Panel
// Handles pack review, approval, rejection, and moderation workflows

class PackModerationManager {
  constructor() {
    this.pendingPacks = [];
    this.allPacks = [];
    this.currentFilter = 'pending';
    this.realtimeListener = null;
    this.isInitialized = false;
  }

  // Initialize pack moderation
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing pack moderation manager');
    }

    try {
      await this.loadPacks();
      this.setupRealtimeListener();
      this.setupEventListeners();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Pack moderation manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Pack Moderation Initialization');
      }
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Filter change handler
    const filterSelect = document.getElementById('pack-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.updatePackDisplay();
      });
    }
  }

  // Load packs based on current filter
  async loadPacks() {
    if (!firebase?.firestore) {
      if (window.errorHandler) {
        window.errorHandler.warn('Firebase not available for pack loading');
      }
      return;
    }

    try {
      const db = firebase.firestore();
      let query = db.collection('posts');

      // Apply filter
      switch (this.currentFilter) {
        case 'pending':
          query = query.where('status', '==', 'pending');
          break;
        case 'approved':
          query = query.where('status', '==', 'approved');
          break;
        case 'rejected':
          query = query.where('status', '==', 'rejected');
          break;
        case 'flagged':
          query = query.where('status', '==', 'flagged');
          break;
        case 'all':
        default:
          // No filter for all packs
          break;
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const packs = [];
      snapshot.forEach(doc => {
        const pack = { id: doc.id, ...doc.data() };
        if (pack.createdAt) {
          pack.createdAt = pack.createdAt.toDate();
        }
        packs.push(pack);
      });

      if (this.currentFilter === 'pending') {
        this.pendingPacks = packs;
      }
      this.allPacks = packs;

      this.updatePackDisplay();

      if (window.errorHandler) {
        window.errorHandler.debug(`Loaded ${packs.length} packs with filter: ${this.currentFilter}`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Pack Loading');
      }
    }
  }

  // Update pack display in UI
  updatePackDisplay() {
    const queueElement = document.getElementById('pack-review-queue');
    if (!queueElement || !window.domUtils) return;

    if (this.allPacks.length === 0) {
      const message = this.currentFilter === 'pending' ? 
        'No packs pending review' : 
        `No ${this.currentFilter} packs found`;
      
      window.domUtils.setText(queueElement, message);
      return;
    }

    const packsHTML = this.allPacks.map(pack => this.createPackCard(pack)).join('');
    window.domUtils.setHTML(queueElement, packsHTML);
  }

  // Create pack card HTML
  createPackCard(pack) {
    const timeAgo = this.getTimeAgo(pack.createdAt);
    const statusClass = this.getStatusClass(pack.status);
    const statusIcon = this.getStatusIcon(pack.status);
    
    const safeTitle = window.domUtils ? window.domUtils.escapeHTML(pack.title || 'Untitled') : (pack.title || 'Untitled');
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(pack.description || 'No description') : (pack.description || 'No description');
    const safeVendor = window.domUtils ? window.domUtils.escapeHTML(pack.vendor || 'Unknown') : (pack.vendor || 'Unknown');
    const safeUser = window.domUtils ? window.domUtils.escapeHTML(pack.userEmail || 'Unknown') : (pack.userEmail || 'Unknown');

    return `
      <div class="pack-review-card ${statusClass}" data-pack-id="${pack.id}">
        <div class="pack-review-header">
          <div class="pack-status">
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${pack.status}</span>
          </div>
          <div class="pack-time">${timeAgo}</div>
        </div>
        
        <div class="pack-review-body">
          <h4 class="pack-title">${safeTitle}</h4>
          <p class="pack-description">${safeDescription}</p>
          
          <div class="pack-details">
            <div class="pack-detail">
              <strong>Vendor:</strong> ${safeVendor}
            </div>
            <div class="pack-detail">
              <strong>Price:</strong> $${pack.price || '0.00'}
            </div>
            <div class="pack-detail">
              <strong>Location:</strong> ${pack.location || 'Not specified'}
            </div>
            <div class="pack-detail">
              <strong>User:</strong> ${safeUser}
            </div>
          </div>
          
          ${pack.images && pack.images.length > 0 ? `
            <div class="pack-images">
              ${pack.images.map(img => `
                <img src="${img}" alt="Pack image" class="pack-thumbnail" onclick="packModerationManager.viewImage('${img}')">
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="pack-review-actions">
          ${pack.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="packModerationManager.approvePack('${pack.id}')">
              ✅ Approve
            </button>
            <button class="btn btn-warning btn-sm" onclick="packModerationManager.flagPack('${pack.id}')">
              🚩 Flag
            </button>
            <button class="btn btn-danger btn-sm" onclick="packModerationManager.rejectPack('${pack.id}')">
              ❌ Reject
            </button>
          ` : ''}
          
          <button class="btn btn-outline btn-sm" onclick="packModerationManager.viewPackDetails('${pack.id}')">
            👁️ View Details
          </button>
          
          ${pack.status !== 'pending' ? `
            <button class="btn btn-outline btn-sm" onclick="packModerationManager.resetPackStatus('${pack.id}')">
              🔄 Reset to Pending
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Get status CSS class
  getStatusClass(status) {
    const classes = {
      pending: 'pack-pending',
      approved: 'pack-approved',
      rejected: 'pack-rejected',
      flagged: 'pack-flagged'
    };
    return classes[status] || 'pack-unknown';
  }

  // Get status icon
  getStatusIcon(status) {
    const icons = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      flagged: '🚩'
    };
    return icons[status] || '❓';
  }

  // Get time ago string
  getTimeAgo(date) {
    if (!date) return 'Unknown time';

    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  // Approve pack
  async approvePack(packId) {
    try {
      const confirmed = await this.showConfirmation(
        'Approve Pack',
        'Are you sure you want to approve this pack? It will become visible to all users.'
      );

      if (!confirmed) return;

      await this.updatePackStatus(packId, 'approved');
      
      if (window.errorHandler) {
        window.errorHandler.info('Pack approved successfully');
      }
      
      this.showToast('Pack approved successfully', 'success');
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Pack Approval');
      }
      this.showToast('Failed to approve pack', 'error');
    }
  }

  // Reject pack
  async rejectPack(packId) {
    try {
      const reason = await this.showRejectDialog();
      if (!reason) return;

      await this.updatePackStatus(packId, 'rejected', { rejectionReason: reason });
      
      if (window.errorHandler) {
        window.errorHandler.info('Pack rejected successfully');
      }
      
      this.showToast('Pack rejected', 'warning');
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Pack Rejection');
      }
      this.showToast('Failed to reject pack', 'error');
    }
  }

  // Flag pack
  async flagPack(packId) {
    try {
      const reason = await this.showFlagDialog();
      if (!reason) return;

      await this.updatePackStatus(packId, 'flagged', { flagReason: reason });
      
      if (window.errorHandler) {
        window.errorHandler.info('Pack flagged successfully');
      }
      
      this.showToast('Pack flagged for review', 'warning');
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Pack Flagging');
      }
      this.showToast('Failed to flag pack', 'error');
    }
  }

  // Reset pack status
  async resetPackStatus(packId) {
    try {
      const confirmed = await this.showConfirmation(
        'Reset Pack Status',
        'Are you sure you want to reset this pack to pending status?'
      );

      if (!confirmed) return;

      await this.updatePackStatus(packId, 'pending', { 
        rejectionReason: null, 
        flagReason: null 
      });
      
      if (window.errorHandler) {
        window.errorHandler.info('Pack status reset to pending');
      }
      
      this.showToast('Pack status reset to pending', 'info');
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Pack Status Reset');
      }
      this.showToast('Failed to reset pack status', 'error');
    }
  }

  // Update pack status in database
  async updatePackStatus(packId, status, additionalData = {}) {
    if (!firebase?.firestore) {
      throw new Error('Firebase not available');
    }

    const db = firebase.firestore();
    
    const updateData = {
      status,
      moderatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      moderatedBy: window.authManager?.currentUser?.email || 'Unknown',
      ...additionalData
    };

    await db.collection('posts').doc(packId).update(updateData);

    // Log the action
    this.logModerationAction(packId, status, additionalData);

    // Refresh display
    await this.loadPacks();
  }

  // Log moderation action
  async logModerationAction(packId, action, data = {}) {
    try {
      if (!firebase?.firestore) return;

      const db = firebase.firestore();
      
      await db.collection('audit_logs').add({
        action: `pack_${action}`,
        userId: window.authManager?.currentUser?.uid,
        userEmail: window.authManager?.currentUser?.email,
        targetId: packId,
        targetType: 'pack',
        data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Moderation Logging');
      }
    }
  }

  // Bulk approve safe packs
  async bulkApprove() {
    try {
      const safePacks = this.pendingPacks.filter(pack => this.isSafePack(pack));
      
      if (safePacks.length === 0) {
        this.showToast('No safe packs found for bulk approval', 'info');
        return;
      }

      const confirmed = await this.showConfirmation(
        'Bulk Approve',
        `Are you sure you want to approve ${safePacks.length} safe packs?`
      );

      if (!confirmed) return;

      const promises = safePacks.map(pack => 
        this.updatePackStatus(pack.id, 'approved')
      );

      await Promise.all(promises);
      
      if (window.errorHandler) {
        window.errorHandler.info(`Bulk approved ${safePacks.length} packs`);
      }
      
      this.showToast(`Approved ${safePacks.length} packs`, 'success');
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Bulk Approval');
      }
      this.showToast('Bulk approval failed', 'error');
    }
  }

  // Check if pack is safe for auto-approval
  isSafePack(pack) {
    // Simple heuristics for safe packs
    if (!pack.title || !pack.description) return false;
    if (pack.title.length < 3 || pack.description.length < 10) return false;
    if (!pack.vendor || !pack.price) return false;
    if (pack.price < 0 || pack.price > 1000) return false;
    
    // Check for inappropriate content (basic)
    const inappropriate = /\b(fake|scam|illegal|stolen)\b/i;
    if (inappropriate.test(pack.title) || inappropriate.test(pack.description)) {
      return false;
    }

    return true;
  }

  // Show rejection dialog
  async showRejectDialog() {
    if (window.errorHandler && window.errorHandler.prompt) {
      return await window.errorHandler.prompt(
        'Reject Pack',
        'Please provide a reason for rejecting this pack:',
        'Violation of terms of service'
      );
    }
    
    return prompt('Please provide a reason for rejecting this pack:', 'Violation of terms of service');
  }

  // Show flag dialog
  async showFlagDialog() {
    if (window.errorHandler && window.errorHandler.prompt) {
      return await window.errorHandler.prompt(
        'Flag Pack',
        'Please provide a reason for flagging this pack:',
        'Needs further review'
      );
    }
    
    return prompt('Please provide a reason for flagging this pack:', 'Needs further review');
  }

  // Show confirmation dialog
  async showConfirmation(title, message) {
    if (window.errorHandler && window.errorHandler.confirm) {
      return await window.errorHandler.confirm(title, message);
    }
    
    return confirm(`${title}\n\n${message}`);
  }

  // Show toast notification
  showToast(message, type = 'info') {
    if (window.errorHandler && window.errorHandler.showToast) {
      window.errorHandler.showToast(message, type);
    }
  }

  // View pack details
  viewPackDetails(packId) {
    const pack = this.allPacks.find(p => p.id === packId);
    if (!pack) return;

    const details = `
      <div class="pack-details-modal">
        <h4>${window.domUtils ? window.domUtils.escapeHTML(pack.title) : pack.title}</h4>
        <p><strong>Description:</strong> ${window.domUtils ? window.domUtils.escapeHTML(pack.description) : pack.description}</p>
        <p><strong>Vendor:</strong> ${pack.vendor}</p>
        <p><strong>Price:</strong> $${pack.price}</p>
        <p><strong>Location:</strong> ${pack.location}</p>
        <p><strong>User:</strong> ${pack.userEmail}</p>
        <p><strong>Created:</strong> ${pack.createdAt ? pack.createdAt.toLocaleString() : 'Unknown'}</p>
        <p><strong>Status:</strong> ${pack.status}</p>
        ${pack.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${pack.rejectionReason}</p>` : ''}
        ${pack.flagReason ? `<p><strong>Flag Reason:</strong> ${pack.flagReason}</p>` : ''}
      </div>
    `;

    if (window.errorHandler && window.errorHandler.showModal) {
      window.errorHandler.showModal('Pack Details', details);
    }
  }

  // View image
  viewImage(imageUrl) {
    const imageHTML = `<img src="${imageUrl}" alt="Pack image" style="max-width: 100%; height: auto;">`;
    
    if (window.errorHandler && window.errorHandler.showModal) {
      window.errorHandler.showModal('Pack Image', imageHTML);
    }
  }

  // Setup realtime listener
  setupRealtimeListener() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();
      
      this.realtimeListener = db.collection('posts')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              this.handlePackChange(change.doc.data(), change.type);
            }
          });
        });

      if (window.errorHandler) {
        window.errorHandler.debug('Pack moderation realtime listener setup');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Realtime Listener Setup');
      }
    }
  }

  // Handle pack changes from realtime updates
  handlePackChange(pack, changeType) {
    // Refresh packs if the change affects current filter
    if (this.shouldRefreshForPack(pack)) {
      this.loadPacks();
    }
  }

  // Check if we should refresh for this pack change
  shouldRefreshForPack(pack) {
    switch (this.currentFilter) {
      case 'pending':
        return pack.status === 'pending';
      case 'approved':
        return pack.status === 'approved';
      case 'rejected':
        return pack.status === 'rejected';
      case 'flagged':
        return pack.status === 'flagged';
      case 'all':
      default:
        return true;
    }
  }

  // Show section
  showSection() {
    const section = document.getElementById('packs-section');
    if (section) {
      section.classList.add('active');
    }

    // Refresh packs when showing
    this.loadPacks();
  }

  // Hide section
  hideSection() {
    const section = document.getElementById('packs-section');
    if (section) {
      section.classList.remove('active');
    }
  }

  // Cleanup
  destroy() {
    if (this.realtimeListener) {
      this.realtimeListener();
      this.realtimeListener = null;
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Pack moderation manager destroyed');
    }
  }

  // Get pending packs count
  getPendingCount() {
    return this.pendingPacks.length;
  }
}

// Export for use by AdminManager
if (typeof window !== 'undefined') {
  window.PackModerationManager = PackModerationManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PackModerationManager;
}