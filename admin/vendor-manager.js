// Vendor Manager for PacksList Admin Panel
// Handles vendor management, vendor profiles, and vendor-related operations

class VendorManager {
  constructor() {
    this.vendors = [];
    this.currentVendor = null;
    this.realtimeListener = null;
    this.isInitialized = false;
  }

  // Initialize vendor manager
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing vendor manager');
    }

    try {
      await this.loadVendors();
      this.setupRealtimeListener();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Vendor manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Manager Initialization');
      }
    }
  }

  // Load all vendors
  async loadVendors() {
    if (!firebase?.firestore) {
      if (window.errorHandler) {
        window.errorHandler.warn('Firebase not available for vendor loading');
      }
      return;
    }

    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('vendors')
        .orderBy('priority', 'asc')
        .get();

      this.vendors = [];
      snapshot.forEach(doc => {
        const vendor = { id: doc.id, ...doc.data() };
        this.vendors.push(vendor);
      });

      this.updateVendorDisplay();

      if (window.errorHandler) {
        window.errorHandler.debug(`Loaded ${this.vendors.length} vendors`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Vendor Loading');
      }
    }
  }

  // Update vendor display in UI
  updateVendorDisplay() {
    const gridElement = document.getElementById('vendors-grid');
    if (!gridElement || !window.domUtils) return;

    if (this.vendors.length === 0) {
      window.domUtils.setText(gridElement, 'No vendors found');
      return;
    }

    const vendorsHTML = this.vendors.map(vendor => this.createVendorCard(vendor)).join('');
    window.domUtils.setHTML(gridElement, vendorsHTML);
  }

  // Create vendor card HTML
  createVendorCard(vendor) {
    const safeName = window.domUtils ? window.domUtils.escapeHTML(vendor.name || 'Unnamed Vendor') : (vendor.name || 'Unnamed Vendor');
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(vendor.description || 'No description') : (vendor.description || 'No description');
    
    const activeClass = vendor.active ? 'vendor-active' : 'vendor-inactive';
    const statusText = vendor.active ? 'Active' : 'Inactive';
    const statusIcon = vendor.active ? '✅' : '❌';

    return `
      <div class="vendor-card ${activeClass}" data-vendor-id="${vendor.id}">
        <div class="vendor-card-header">
          <div class="vendor-icon" style="background-color: ${vendor.color || '#95a5a6'}">
            ${vendor.icon || '?'}
          </div>
          <div class="vendor-info">
            <h4 class="vendor-name">${safeName}</h4>
            <div class="vendor-status">
              <span class="status-icon">${statusIcon}</span>
              <span class="status-text">${statusText}</span>
            </div>
          </div>
        </div>
        
        <div class="vendor-card-body">
          <p class="vendor-description">${safeDescription}</p>
          
          <div class="vendor-details">
            <div class="vendor-detail">
              <strong>Priority:</strong> ${vendor.priority || 1}
            </div>
            <div class="vendor-detail">
              <strong>Posts:</strong> ${vendor.postCount || 0}
            </div>
            <div class="vendor-detail">
              <strong>Created:</strong> ${vendor.createdAt ? new Date(vendor.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
        
        <div class="vendor-card-actions">
          <button class="btn btn-sm btn-outline" onclick="vendorManager.editVendor('${vendor.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-primary" onclick="vendorManager.viewVendorPosts('${vendor.id}')">
            📦 Posts
          </button>
          ${vendor.active ? `
            <button class="btn btn-sm btn-warning" onclick="vendorManager.deactivateVendor('${vendor.id}')">
              ❌ Deactivate
            </button>
          ` : `
            <button class="btn btn-sm btn-success" onclick="vendorManager.activateVendor('${vendor.id}')">
              ✅ Activate
            </button>
          `}
          <button class="btn btn-sm btn-danger" onclick="vendorManager.deleteVendor('${vendor.id}')">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  // Show add vendor modal
  showAddVendorModal() {
    this.currentVendor = null;
    this.showVendorModal();
  }

  // Show vendor modal for add/edit
  showVendorModal(vendor = null) {
    const isEdit = !!vendor;
    const title = isEdit ? 'Edit Vendor' : 'Add Vendor';
    
    // Populate form if editing
    if (vendor) {
      this.populateVendorForm(vendor);
    } else {
      this.clearVendorForm();
    }

    const modal = document.getElementById('vendor-modal');
    const modalTitle = document.getElementById('vendor-modal-title');
    
    if (modal && modalTitle && window.domUtils) {
      window.domUtils.setText(modalTitle, title);
      modal.classList.add('active');
    }
  }

  // Close vendor modal
  closeVendorModal() {
    const modal = document.getElementById('vendor-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.currentVendor = null;
  }

  // Populate vendor form
  populateVendorForm(vendor) {
    const fields = [
      { id: 'vendor-name', value: vendor.name || '' },
      { id: 'vendor-color', value: vendor.color || '#8e44ad' },
      { id: 'vendor-icon', value: vendor.icon || '' },
      { id: 'vendor-description', value: vendor.description || '' },
      { id: 'vendor-priority', value: vendor.priority || 1 },
      { id: 'vendor-active', checked: vendor.active !== false }
    ];

    fields.forEach(field => {
      const element = document.getElementById(field.id);
      if (element) {
        if (field.id === 'vendor-active') {
          element.checked = field.checked;
        } else {
          element.value = field.value;
        }
      }
    });
  }

  // Clear vendor form
  clearVendorForm() {
    const fields = [
      'vendor-name', 'vendor-color', 'vendor-icon', 
      'vendor-description', 'vendor-priority'
    ];

    fields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = fieldId === 'vendor-priority' ? '1' : '';
      }
    });

    const activeCheckbox = document.getElementById('vendor-active');
    if (activeCheckbox) {
      activeCheckbox.checked = true;
    }
  }

  // Save vendor (add or update)
  async saveVendor() {
    try {
      const formData = this.getVendorFormData();
      
      // Validate form data
      const validation = this.validateVendorData(formData);
      if (!validation.isValid) {
        this.showToast(validation.errors[0], 'error');
        return;
      }

      if (this.currentVendor) {
        await this.updateVendor(this.currentVendor.id, formData);
      } else {
        await this.createVendor(formData);
      }

      this.closeVendorModal();
      this.showToast('Vendor saved successfully', 'success');

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Save');
      }
      this.showToast('Failed to save vendor', 'error');
    }
  }

  // Get vendor form data
  getVendorFormData() {
    return {
      name: document.getElementById('vendor-name')?.value?.trim() || '',
      color: document.getElementById('vendor-color')?.value || '#8e44ad',
      icon: document.getElementById('vendor-icon')?.value?.trim() || '',
      description: document.getElementById('vendor-description')?.value?.trim() || '',
      priority: parseInt(document.getElementById('vendor-priority')?.value) || 1,
      active: document.getElementById('vendor-active')?.checked !== false
    };
  }

  // Validate vendor data
  validateVendorData(data) {
    const errors = [];

    if (!data.name) {
      errors.push('Vendor name is required');
    }

    if (!data.icon) {
      errors.push('Vendor icon is required');
    } else if (data.icon.length !== 1) {
      errors.push('Vendor icon must be exactly one character');
    }

    if (!data.color || !/^#[0-9A-F]{6}$/i.test(data.color)) {
      errors.push('Valid color code is required');
    }

    if (data.priority < 1) {
      errors.push('Priority must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create new vendor
  async createVendor(vendorData) {
    if (!firebase?.firestore) {
      throw new Error('Firebase not available');
    }

    const db = firebase.firestore();
    
    const newVendor = {
      ...vendorData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: window.authManager?.currentUser?.email || 'Unknown',
      postCount: 0
    };

    const docRef = await db.collection('vendors').add(newVendor);
    
    // Log the action
    await this.logVendorAction(docRef.id, 'vendor_created', vendorData);

    // Reload vendors
    await this.loadVendors();

    if (window.errorHandler) {
      window.errorHandler.info(`Vendor ${vendorData.name} created`);
    }
  }

  // Update existing vendor
  async updateVendor(vendorId, vendorData) {
    if (!firebase?.firestore) {
      throw new Error('Firebase not available');
    }

    const db = firebase.firestore();
    
    const updateData = {
      ...vendorData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: window.authManager?.currentUser?.email || 'Unknown'
    };

    await db.collection('vendors').doc(vendorId).update(updateData);
    
    // Log the action
    await this.logVendorAction(vendorId, 'vendor_updated', vendorData);

    // Reload vendors
    await this.loadVendors();

    if (window.errorHandler) {
      window.errorHandler.info(`Vendor ${vendorData.name} updated`);
    }
  }

  // Edit vendor
  editVendor(vendorId) {
    const vendor = this.vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    this.currentVendor = vendor;
    this.showVendorModal(vendor);
  }

  // Activate vendor
  async activateVendor(vendorId) {
    try {
      await this.updateVendorStatus(vendorId, true);
      this.showToast('Vendor activated', 'success');
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Activation');
      }
      this.showToast('Failed to activate vendor', 'error');
    }
  }

  // Deactivate vendor
  async deactivateVendor(vendorId) {
    try {
      const confirmed = await this.showConfirmation(
        'Deactivate Vendor',
        'Are you sure you want to deactivate this vendor? It will not be visible to users.'
      );

      if (!confirmed) return;

      await this.updateVendorStatus(vendorId, false);
      this.showToast('Vendor deactivated', 'warning');
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Deactivation');
      }
      this.showToast('Failed to deactivate vendor', 'error');
    }
  }

  // Update vendor status
  async updateVendorStatus(vendorId, active) {
    if (!firebase?.firestore) {
      throw new Error('Firebase not available');
    }

    const db = firebase.firestore();
    
    await db.collection('vendors').doc(vendorId).update({
      active,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: window.authManager?.currentUser?.email || 'Unknown'
    });

    // Log the action
    await this.logVendorAction(vendorId, active ? 'vendor_activated' : 'vendor_deactivated');

    // Update local data
    const vendor = this.vendors.find(v => v.id === vendorId);
    if (vendor) {
      vendor.active = active;
    }

    this.updateVendorDisplay();
  }

  // Delete vendor
  async deleteVendor(vendorId) {
    try {
      const vendor = this.vendors.find(v => v.id === vendorId);
      if (!vendor) return;

      const confirmed = await this.showConfirmation(
        'Delete Vendor',
        `Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`
      );

      if (!confirmed) return;

      if (!firebase?.firestore) {
        throw new Error('Firebase not available');
      }

      const db = firebase.firestore();
      
      // Check if vendor has posts
      const postsSnapshot = await db.collection('posts')
        .where('vendor', '==', vendor.name)
        .limit(1)
        .get();

      if (!postsSnapshot.empty) {
        const moveToDefault = await this.showConfirmation(
          'Vendor Has Posts',
          'This vendor has existing posts. Do you want to move them to the default vendor before deleting?'
        );

        if (moveToDefault) {
          // Move posts to default vendor
          const batch = db.batch();
          const allPostsSnapshot = await db.collection('posts')
            .where('vendor', '==', vendor.name)
            .get();

          allPostsSnapshot.forEach(doc => {
            batch.update(doc.ref, { vendor: 'Other' });
          });

          await batch.commit();
        }
      }

      // Delete vendor
      await db.collection('vendors').doc(vendorId).delete();
      
      // Log the action
      await this.logVendorAction(vendorId, 'vendor_deleted', { vendorName: vendor.name });

      // Remove from local array
      this.vendors = this.vendors.filter(v => v.id !== vendorId);
      this.updateVendorDisplay();

      this.showToast('Vendor deleted', 'warning');

      if (window.errorHandler) {
        window.errorHandler.info(`Vendor ${vendor.name} deleted`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Deletion');
      }
      this.showToast('Failed to delete vendor', 'error');
    }
  }

  // View vendor posts
  async viewVendorPosts(vendorId) {
    const vendor = this.vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    try {
      if (!firebase?.firestore) {
        throw new Error('Firebase not available');
      }

      const db = firebase.firestore();
      const postsSnapshot = await db.collection('posts')
        .where('vendor', '==', vendor.name)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const posts = [];
      postsSnapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() });
      });

      const postsHTML = posts.length > 0 ? posts.map(post => `
        <div class="vendor-post-item">
          <strong>${window.domUtils ? window.domUtils.escapeHTML(post.title) : post.title}</strong>
          <div>Status: ${post.status}</div>
          <div>Price: $${post.price}</div>
          <div>Created: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</div>
        </div>
      `).join('') : '<p>No posts found for this vendor.</p>';

      const content = `
        <div class="vendor-posts-modal">
          <h4>Posts by ${window.domUtils ? window.domUtils.escapeHTML(vendor.name) : vendor.name}</h4>
          <div class="vendor-posts-list">
            ${postsHTML}
          </div>
        </div>
      `;

      if (window.errorHandler && window.errorHandler.showModal) {
        window.errorHandler.showModal('Vendor Posts', content);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Posts Loading');
      }
      this.showToast('Failed to load vendor posts', 'error');
    }
  }

  // Log vendor management action
  async logVendorAction(vendorId, action, data = {}) {
    try {
      if (!firebase?.firestore) return;

      const db = firebase.firestore();
      
      await db.collection('audit_logs').add({
        action,
        userId: window.authManager?.currentUser?.uid,
        userEmail: window.authManager?.currentUser?.email,
        targetId: vendorId,
        targetType: 'vendor',
        data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Action Logging');
      }
    }
  }

  // Setup realtime listener
  setupRealtimeListener() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();
      
      this.realtimeListener = db.collection('vendors')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            this.handleVendorChange(change.doc.data(), change.type, change.doc.id);
          });
        });

      if (window.errorHandler) {
        window.errorHandler.debug('Vendor manager realtime listener setup');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Vendor Realtime Listener Setup');
      }
    }
  }

  // Handle vendor changes from realtime updates
  handleVendorChange(vendorData, changeType, vendorId) {
    const vendor = { id: vendorId, ...vendorData };

    if (changeType === 'added') {
      if (!this.vendors.find(v => v.id === vendorId)) {
        this.vendors.push(vendor);
      }
    } else if (changeType === 'modified') {
      const index = this.vendors.findIndex(v => v.id === vendorId);
      if (index !== -1) {
        this.vendors[index] = vendor;
      }
    } else if (changeType === 'removed') {
      this.vendors = this.vendors.filter(v => v.id !== vendorId);
    }

    // Re-sort by priority
    this.vendors.sort((a, b) => (a.priority || 1) - (b.priority || 1));
    this.updateVendorDisplay();
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

  // Show section
  showSection() {
    const section = document.getElementById('vendors-section');
    if (section) {
      section.classList.add('active');
    }

    // Refresh vendors when showing
    this.loadVendors();
  }

  // Hide section
  hideSection() {
    const section = document.getElementById('vendors-section');
    if (section) {
      section.classList.remove('active');
    }
  }

  // Get vendor statistics
  getVendorStats() {
    return {
      total: this.vendors.length,
      active: this.vendors.filter(v => v.active !== false).length,
      inactive: this.vendors.filter(v => v.active === false).length
    };
  }

  // Get vendor by ID
  getVendor(vendorId) {
    return this.vendors.find(v => v.id === vendorId);
  }

  // Get all vendors
  getAllVendors() {
    return [...this.vendors];
  }

  // Cleanup
  destroy() {
    if (this.realtimeListener) {
      this.realtimeListener();
      this.realtimeListener = null;
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Vendor manager destroyed');
    }
  }
}

// Export for use by AdminManager
if (typeof window !== 'undefined') {
  window.VendorManager = VendorManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VendorManager;
}