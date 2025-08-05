// Vendor Display Manager for PacksList
// Handles vendor card creation, modal display, and vendor interactions

class VendorDisplayManager {
  constructor() {
    this.isInitialized = false;
    this.modalAnimationStyles = null;
  }

  // Initialize vendor display manager
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing vendor display manager');
    }

    try {
      this.setupModalStyles();
      this.setupEventListeners();
      this.makeGloballyAccessible();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Vendor display manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Display Manager Initialization');
      }
    }
  }

  // Setup modal animation styles
  setupModalStyles() {
    if (this.modalAnimationStyles) return;

    const style = document.createElement('style');
    style.id = 'vendor-modal-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .vendor-display-modal {
        animation: fadeIn 0.3s ease;
      }
      .vendor-display-modal-content {
        animation: slideIn 0.3s ease;
      }
    `;
    
    if (!document.querySelector('#vendor-modal-styles')) {
      document.head.appendChild(style);
      this.modalAnimationStyles = style;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Modal close event listeners
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.closeVendorModal();
      });
    }

    // Close modal on background click
    const vendorModal = document.getElementById('vendor-modal');
    if (vendorModal) {
      vendorModal.addEventListener('click', (e) => {
        if (e.target === vendorModal) {
          this.closeVendorModal();
        }
      });
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Vendor display event listeners setup');
    }
  }

  // Make methods globally accessible
  makeGloballyAccessible() {
    window.showVendorModal = (vendor) => this.showVendorModal(vendor);
    window.contactVendor = (vendorId) => this.contactVendor(vendorId);
  }

  // Create individual vendor card
  createVendorCard(vendor) {
    const card = document.createElement('div');
    card.className = 'vendor-card';
    card.onclick = () => this.showVendorModal(vendor);
    
    const vendorStyles = this.getVendorStyles();
    const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other;
    const stockStatus = vendor.inStock ? 'in-stock' : 'low-stock';
    const stockText = vendor.inStock ? '✓ In Stock' : '⚠ Low Stock';
    
    // Add image section if images exist
    const imageSection = vendor.images && vendor.images.length > 0 ? 
      `<div class="vendor-card-images">
        <img src="${vendor.images[0]}" alt="${window.domUtils ? window.domUtils.escapeHTML(vendor.title) : vendor.title}" class="vendor-main-image">
        ${vendor.images.length > 1 ? `<div class="image-count">+${vendor.images.length - 1}</div>` : ''}
      </div>` : '';

    const safeTitle = window.domUtils ? window.domUtils.escapeHTML(vendor.title) : vendor.title;
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(vendor.description || 'Premium quality product') : (vendor.description || 'Premium quality product');
    const safeVendorDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : (vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const safeCityDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const cardContent = `
      ${imageSection}
      <div class="vendor-card-header">
        <div class="vendor-avatar ${vendor.vendor}" style="background: ${vendorStyle.color}">
          ${vendorStyle.icon}
        </div>
        <div class="vendor-info">
          <h3>${safeVendorDisplay}</h3>
          <div class="vendor-location">📍 ${safeCityDisplay}</div>
        </div>
      </div>
      <div class="vendor-card-body">
        <div class="vendor-title">${safeTitle}</div>
        <div class="vendor-description">${safeDescription}</div>
      </div>
      <div class="vendor-card-footer">
        <div class="vendor-price">$${vendor.price}</div>
        <div class="vendor-meta">
          <div class="vendor-rating">⭐ ${vendor.rating.toFixed(1)}</div>
          <div class="vendor-status ${stockStatus}">${stockText}</div>
          ${vendor.verified ? '<div class="vendor-status verified">✓ Verified</div>' : ''}
        </div>
      </div>
    `;
    
    if (window.domUtils) {
      window.domUtils.setHTML(card, cardContent);
    } else {
      card.innerHTML = cardContent;
    }
    
    return card;
  }

  // Show vendor details modal
  showVendorModal(vendor) {
    if (window.errorHandler) {
      window.errorHandler.debug('Showing vendor modal', vendor);
    }
    
    const modal = document.getElementById('vendor-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) {
      if (window.errorHandler) {
        window.errorHandler.warn('Modal elements not found, creating fallback');
      }
      
      // Create fallback modal if none exists
      this.createFallbackModal(vendor);
      return;
    }
    
    // Get vendor styles dynamically
    const vendorStyles = this.getVendorStyles();
    const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other || { color: '#95a5a6', icon: 'O' };
    const stockStatus = vendor.inStock ? 'in-stock' : 'low-stock';
    const stockText = vendor.inStock ? '✓ In Stock' : '⚠ Low Stock';
    
    const safeTitle = window.domUtils ? window.domUtils.escapeHTML(vendor.title) : vendor.title;
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(vendor.description || 'Premium quality product available for delivery.') : (vendor.description || 'Premium quality product available for delivery.');
    const safeVendorDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : (vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const safeCityDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

    const modalContent = `
      <div class="vendor-card-header">
        <div class="vendor-avatar ${vendor.vendor}" style="background: ${vendorStyle.color}">
          ${vendorStyle.icon}
        </div>
        <div class="vendor-info">
          <h3>${safeVendorDisplay}</h3>
          <div class="vendor-location">📍 ${safeCityDisplay}</div>
        </div>
      </div>
      <div style="margin: 20px 0;">
        <h4>${safeTitle}</h4>
        <p style="margin: 10px 0; color: #6c757d;">${safeDescription}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
          <div class="vendor-price" style="font-size: 20px;">$${vendor.price}</div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <div class="vendor-rating">⭐ ${vendor.rating.toFixed(1)}</div>
            <div class="vendor-status ${stockStatus}">${stockText}</div>
            ${vendor.verified ? '<div class="vendor-status verified">✓ Verified</div>' : ''}
          </div>
        </div>
        <button class="message-btn" style="width: 100%; margin-top: 20px;" onclick="vendorDisplayManager.contactVendor('${vendor.id}')">
          💬 Message Vendor
        </button>
      </div>
    `;
    
    if (window.domUtils) {
      window.domUtils.setHTML(modalBody, modalContent);
    } else {
      modalBody.innerHTML = modalContent;
    }
    
    modal.classList.add('active');
    
    // Track modal view
    this.trackVendorInteraction(vendor, 'modal_viewed');
    
    if (window.errorHandler) {
      window.errorHandler.debug('Vendor modal displayed successfully');
    }
  }

  // Create fallback modal if main modal not found
  createFallbackModal(vendor) {
    if (window.errorHandler) {
      window.errorHandler.debug('Creating fallback modal for vendor', vendor);
    }
    
    // Remove existing fallback modal
    const existingModal = document.getElementById('fallback-vendor-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Get vendor styles
    const vendorStyles = this.getVendorStyles();
    const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other || { color: '#95a5a6', icon: 'O' };
    const stockStatus = vendor.inStock ? 'in-stock' : 'low-stock';
    const stockText = vendor.inStock ? '✓ In Stock' : '⚠ Low Stock';
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'fallback-vendor-modal';
    modal.className = 'vendor-display-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const safeTitle = window.domUtils ? window.domUtils.escapeHTML(vendor.title) : vendor.title;
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(vendor.description || 'Premium quality product available for delivery.') : (vendor.description || 'Premium quality product available for delivery.');
    const safeVendorDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : (vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const safeCityDisplay = window.domUtils ? window.domUtils.escapeHTML(vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const modalContent = `
      <div class="vendor-display-modal-content" style="
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      ">
        <div style="
          padding: 20px 20px 10px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="margin: 0; color: #333;">${safeTitle}</h2>
          <button onclick="this.closest('#fallback-vendor-modal').remove()" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            color: #666;
          ">✕</button>
        </div>
        <div style="padding: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: ${vendorStyle.color};
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
              margin-right: 15px;
            ">${vendorStyle.icon}</div>
            <div>
              <h3 style="margin: 0; color: #333;">${safeVendorDisplay}</h3>
              <div style="color: #666; font-size: 14px;">📍 ${safeCityDisplay}</div>
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <div style="font-size: 24px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px;">$${vendor.price}</div>
            <p style="color: #666; margin: 10px 0;">${safeDescription}</p>
            
            <div style="display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap;">
              <span style="background: #f8f9fa; padding: 5px 10px; border-radius: 20px; font-size: 14px;">⭐ ${vendor.rating ? vendor.rating.toFixed(1) : '4.5'}</span>
              <span style="background: ${vendor.inStock ? '#d4edda' : '#f8d7da'}; color: ${vendor.inStock ? '#155724' : '#721c24'}; padding: 5px 10px; border-radius: 20px; font-size: 14px;">${stockText}</span>
              ${vendor.verified ? '<span style="background: #d1ecf1; color: #0c5460; padding: 5px 10px; border-radius: 20px; font-size: 14px;">✓ Verified</span>' : ''}
            </div>
          </div>
          
          <button onclick="vendorDisplayManager.contactVendor('${vendor.id}')" style="
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 15px;
            transition: background 0.3s ease;
          " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
            💬 Message Vendor
          </button>
        </div>
      </div>
    `;
    
    if (window.domUtils) {
      window.domUtils.setHTML(modal, modalContent);
    } else {
      modal.innerHTML = modalContent;
    }
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
    
    // Track modal view
    this.trackVendorInteraction(vendor, 'fallback_modal_viewed');
    
    if (window.errorHandler) {
      window.errorHandler.debug('Fallback modal created and displayed');
    }
  }

  // Close vendor modal
  closeVendorModal() {
    const modal = document.getElementById('vendor-modal');
    if (modal) {
      modal.classList.remove('active');
    }

    // Also close fallback modal if exists
    const fallbackModal = document.getElementById('fallback-vendor-modal');
    if (fallbackModal) {
      fallbackModal.remove();
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Vendor modal closed');
    }
  }

  // Contact vendor function
  contactVendor(vendorId) {
    if (window.errorHandler && window.errorHandler.showModal) {
      window.errorHandler.showModal(
        'Contact Vendor',
        'Messaging feature coming soon! We are working on enabling direct communication with vendors.',
        { confirmText: 'Got it' }
      );
    } else {
      if (window.errorHandler) {
        window.errorHandler.info(`Contact request for vendor: ${vendorId}`);
      }
    }
  }

  // Display filtered vendors (for search results)
  displayFilteredVendors(vendors) {
    const vendorCards = document.getElementById('vendor-cards');
    if (!vendorCards) return;
    
    if (window.domUtils) {
      window.domUtils.setHTML(vendorCards, '');
    } else {
      vendorCards.innerHTML = '';
    }
    
    if (vendors.length === 0) {
      const noResultsMessage = '<div class="loading">No vendors found</div>';
      if (window.domUtils) {
        window.domUtils.setHTML(vendorCards, noResultsMessage);
      } else {
        vendorCards.innerHTML = noResultsMessage;
      }
      return;
    }
    
    vendors.forEach(vendor => {
      const card = this.createVendorCard(vendor);
      vendorCards.appendChild(card);
    });

    if (window.errorHandler) {
      window.errorHandler.debug(`Displayed ${vendors.length} filtered vendors`);
    }
  }

  // Display vendors (legacy support)
  displayVendors() {
    // This function is no longer used since vendors are shown on the listings page
    if (window.errorHandler) {
      window.errorHandler.debug('displayVendors called (legacy function)');
    }
  }

  // Get vendor styles from config or fallback
  getVendorStyles() {
    if (window.configManager && window.configManager.isInitialized) {
      const vendorConfig = window.configManager.getConfig('vendor-categories');
      if (vendorConfig && vendorConfig.items) {
        const styles = {};
        vendorConfig.items.forEach(vendor => {
          if (vendor.isActive) {
            styles[vendor.key] = {
              color: vendor.color,
              icon: vendor.icon
            };
          }
        });
        return styles;
      }
    }
    
    // Fallback vendor styles
    return {
      'bozo-headstash': { color: '#8e44ad', icon: 'B' },
      'gumbo': { color: '#e74c3c', icon: 'G' },
      'deep-fried': { color: '#f39c12', icon: 'D' },
      'high-tolerance': { color: '#3498db', icon: 'H' },
      'other': { color: '#95a5a6', icon: 'O' }
    };
  }

  // Track vendor interactions for analytics
  trackVendorInteraction(vendor, action) {
    try {
      // Use behavior analytics if available
      if (window.behaviorAnalytics) {
        window.behaviorAnalytics.trackInteraction({
          action,
          vendor: vendor.vendor,
          packId: vendor.id,
          location: vendor.city,
          timestamp: Date.now()
        });
      }

      // Fire custom event for other components
      window.dispatchEvent(new CustomEvent('vendorInteraction', {
        detail: { vendor, action, timestamp: Date.now() }
      }));

      if (window.errorHandler) {
        window.errorHandler.debug(`Vendor interaction tracked: ${action}`, vendor);
      }
      
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Interaction Tracking');
      }
    }
  }

  // Show error message
  showError(message) {
    const vendorCards = document.getElementById('vendor-cards');
    if (vendorCards) {
      const errorMessage = `<div class="loading" style="color: #dc3545;">${window.domUtils ? window.domUtils.escapeHTML(message) : message}</div>`;
      if (window.domUtils) {
        window.domUtils.setHTML(vendorCards, errorMessage);
      } else {
        vendorCards.innerHTML = errorMessage;
      }
    }

    if (window.errorHandler) {
      window.errorHandler.handleError(new Error(message), 'Vendor Display Error');
    }
  }

  // Get vendor display state
  getDisplayState() {
    const modal = document.getElementById('vendor-modal');
    const fallbackModal = document.getElementById('fallback-vendor-modal');
    
    return {
      modalOpen: modal?.classList.contains('active') || !!fallbackModal,
      hasVendorCards: !!document.getElementById('vendor-cards')
    };
  }

  // Cleanup
  destroy() {
    // Close any open modals
    this.closeVendorModal();

    // Remove styles
    if (this.modalAnimationStyles) {
      this.modalAnimationStyles.remove();
      this.modalAnimationStyles = null;
    }

    // Remove global references
    if (window.showVendorModal) {
      delete window.showVendorModal;
    }
    if (window.contactVendor) {
      delete window.contactVendor;
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Vendor display manager destroyed');
    }
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.VendorDisplayManager = VendorDisplayManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VendorDisplayManager;
}