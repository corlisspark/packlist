// Dynamic Vendor Management System for PacksList
// Admin-controlled vendor configuration with no hardcoded vendor names

class VendorManager {
  constructor() {
    this.vendors = [];
    this.vendorCategories = [];
    this.isInitialized = false;
    this.db = null;
    
    // Default fallback configuration (only used if database is empty)
    this.defaultConfig = {
      vendors: [
        {
          id: 'vendor-1',
          name: 'Premium Delivery',
          slug: 'premium-delivery',
          color: '#8e44ad',
          icon: 'P',
          isActive: true,
          priority: 1,
          description: 'High-quality products with fast delivery'
        },
        {
          id: 'vendor-2',
          name: 'Local Express',
          slug: 'local-express',
          color: '#e74c3c',
          icon: 'L',
          isActive: true,
          priority: 2,
          description: 'Your neighborhood delivery service'
        },
        {
          id: 'vendor-3',
          name: 'Quick Supply',
          slug: 'quick-supply',
          color: '#f39c12',
          icon: 'Q',
          isActive: true,
          priority: 3,
          description: 'Fast and reliable supply chain'
        }
      ],
      categories: [
        { id: 'all', name: 'All Products', icon: '📦', isActive: true },
        { id: 'premium', name: 'Premium', icon: '⭐', isActive: true },
        { id: 'express', name: 'Express', icon: '🚀', isActive: true },
        { id: 'local', name: 'Local', icon: '🏠', isActive: true }
      ]
    };
  }

  // Initialize vendor manager
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Wait for database to be ready
      await this.waitForDatabase();
      
      // Load vendor configuration from Firebase
      await this.loadVendorConfig();
      
      // Load categories
      await this.loadCategories();
      
      // Generate filter UI
      this.generateFilterUI();
      
      this.isInitialized = true;
      console.log('VendorManager: Initialized successfully');
      
      // Notify other systems that vendors are ready
      document.dispatchEvent(new CustomEvent('vendorsLoaded', { 
        detail: { vendors: this.vendors, categories: this.vendorCategories } 
      }));
      
    } catch (error) {
      console.error('VendorManager: Initialization failed:', error);
      this.loadFallbackConfig();
    }
  }

  // Wait for database to be available
  async waitForDatabase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      if (window.db) {
        this.db = window.db;
        console.log('VendorManager: Firebase database connected');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.warn('VendorManager: Firebase not available, using localStorage fallback');
    this.db = null; // Will trigger localStorage fallback
  }

  // Load vendor configuration from Firebase or localStorage
  async loadVendorConfig() {
    try {
      if (this.db) {
        // Load from Firebase
        const vendorConfigDoc = await this.db.collection('admin_config').doc('vendors').get();
        
        if (vendorConfigDoc.exists) {
          const config = vendorConfigDoc.data();
          this.vendors = config.vendors || [];
          console.log('VendorManager: Loaded', this.vendors.length, 'vendors from Firebase');
        } else {
          console.log('VendorManager: No vendor config found in Firebase, creating default');
          await this.createDefaultVendorConfig();
        }
      } else {
        // Load from localStorage
        console.log('VendorManager: Loading vendor configuration from localStorage...');
        const storedConfig = localStorage.getItem('packslist_vendor_config');
        
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          this.vendors = config.vendors || [];
          console.log('VendorManager: Loaded', this.vendors.length, 'vendors from localStorage');
        } else {
          console.log('VendorManager: No vendor config found in localStorage, using default');
          this.vendors = this.defaultConfig.vendors;
          // Save default config to localStorage
          await this.saveVendorConfig();
        }
      }
      
      // Ensure vendors are sorted by priority
      this.vendors.sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
    } catch (error) {
      console.error('VendorManager: Error loading vendor config:', error);
      this.loadFallbackConfig();
    }
  }

  // Load categories from Firebase
  async loadCategories() {
    try {
      const categoriesDoc = await this.db.collection('admin_config').doc('categories').get();
      
      if (categoriesDoc.exists) {
        const config = categoriesDoc.data();
        this.vendorCategories = config.categories || [];
      } else {
        console.log('VendorManager: No categories found, creating default');
        await this.createDefaultCategories();
      }
      
    } catch (error) {
      console.error('VendorManager: Error loading categories:', error);
      this.vendorCategories = this.defaultConfig.categories;
    }
  }

  // Create default vendor configuration in Firebase
  async createDefaultVendorConfig() {
    try {
      await this.db.collection('admin_config').doc('vendors').set({
        vendors: this.defaultConfig.vendors,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
      
      this.vendors = this.defaultConfig.vendors;
      console.log('VendorManager: Created default vendor configuration');
      
    } catch (error) {
      console.error('VendorManager: Error creating default config:', error);
      this.vendors = this.defaultConfig.vendors;
    }
  }

  // Create default categories in Firebase
  async createDefaultCategories() {
    try {
      await this.db.collection('admin_config').doc('categories').set({
        categories: this.defaultConfig.categories,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
      
      this.vendorCategories = this.defaultConfig.categories;
      console.log('VendorManager: Created default categories');
      
    } catch (error) {
      console.error('VendorManager: Error creating default categories:', error);
      this.vendorCategories = this.defaultConfig.categories;
    }
  }

  // Load fallback configuration
  loadFallbackConfig() {
    this.vendors = this.defaultConfig.vendors;
    this.vendorCategories = this.defaultConfig.categories;
    console.log('VendorManager: Using fallback configuration');
  }

  // Generate filter UI for listings page
  generateFilterUI() {
    const filterContainer = document.querySelector('.filter-pills');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = '';
    
    // Add "All" filter first
    const allFilter = document.createElement('button');
    allFilter.className = 'filter-pill active';
    allFilter.dataset.filter = 'all';
    allFilter.innerHTML = '📦 All';
    allFilter.addEventListener('click', () => this.handleFilterClick('all', allFilter));
    filterContainer.appendChild(allFilter);
    
    // Add vendor filters
    this.vendors
      .filter(vendor => vendor.isActive)
      .forEach(vendor => {
        const filterPill = document.createElement('button');
        filterPill.className = 'filter-pill';
        filterPill.dataset.filter = vendor.slug;
        filterPill.innerHTML = `${vendor.icon} ${vendor.name}`;
        filterPill.addEventListener('click', () => this.handleFilterClick(vendor.slug, filterPill));
        filterContainer.appendChild(filterPill);
      });
  }

  // Handle filter click
  handleFilterClick(filterValue, element) {
    // Update active state
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.remove('active');
    });
    element.classList.add('active');
    
    // Dispatch filter change event
    document.dispatchEvent(new CustomEvent('vendorFilterChange', {
      detail: { filter: filterValue, vendor: this.getVendorBySlug(filterValue) }
    }));
  }

  // Get vendor by slug
  getVendorBySlug(slug) {
    return this.vendors.find(vendor => vendor.slug === slug);
  }

  // Get vendor by ID
  getVendorById(id) {
    return this.vendors.find(vendor => vendor.id === id);
  }

  // Get vendor styling
  getVendorStyle(slug) {
    const vendor = this.getVendorBySlug(slug);
    if (!vendor) {
      return { color: '#95a5a6', icon: '?' }; // Default fallback
    }
    
    return {
      color: vendor.color,
      icon: vendor.icon,
      name: vendor.name
    };
  }

  // Normalize vendor name (convert display name to slug)
  normalizeVendorName(displayName) {
    // Check if it's already a slug
    const existingVendor = this.getVendorBySlug(displayName);
    if (existingVendor) return displayName;
    
    // Find by display name
    const vendor = this.vendors.find(v => 
      v.name.toLowerCase() === displayName.toLowerCase()
    );
    
    return vendor ? vendor.slug : this.createDynamicSlug(displayName);
  }

  // Create dynamic slug for unknown vendor names
  createDynamicSlug(displayName) {
    return displayName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Get display name from slug
  getDisplayName(slug) {
    const vendor = this.getVendorBySlug(slug);
    return vendor ? vendor.name : this.humanizeSlug(slug);
  }

  // Convert slug back to human readable name
  humanizeSlug(slug) {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Admin functions for managing vendors
  async addVendor(vendorData) {
    const newVendor = {
      id: 'vendor-' + Date.now(),
      slug: this.createDynamicSlug(vendorData.name),
      isActive: true,
      priority: this.vendors.length + 1,
      ...vendorData
    };
    
    this.vendors.push(newVendor);
    await this.saveVendorConfig();
    this.generateFilterUI();
    
    return newVendor;
  }

  async updateVendor(vendorId, updates) {
    const vendorIndex = this.vendors.findIndex(v => v.id === vendorId);
    if (vendorIndex === -1) return false;
    
    // Update slug if name changed
    if (updates.name && updates.name !== this.vendors[vendorIndex].name) {
      updates.slug = this.createDynamicSlug(updates.name);
    }
    
    this.vendors[vendorIndex] = { ...this.vendors[vendorIndex], ...updates };
    await this.saveVendorConfig();
    this.generateFilterUI();
    
    return this.vendors[vendorIndex];
  }

  async removeVendor(vendorId) {
    this.vendors = this.vendors.filter(v => v.id !== vendorId);
    await this.saveVendorConfig();
    this.generateFilterUI();
    
    return true;
  }

  async reorderVendors(newOrder) {
    // newOrder is array of vendor IDs in desired order
    const reorderedVendors = [];
    
    newOrder.forEach((vendorId, index) => {
      const vendor = this.getVendorById(vendorId);
      if (vendor) {
        vendor.priority = index + 1;
        reorderedVendors.push(vendor);
      }
    });
    
    this.vendors = reorderedVendors;
    await this.saveVendorConfig();
    this.generateFilterUI();
    
    return true;
  }

  // Save vendor configuration to Firebase or localStorage
  async saveVendorConfig() {
    try {
      if (this.db) {
        // Save to Firebase
        console.log('VendorManager: Saving vendor configuration to Firebase...');
        
        await this.db.collection('admin_config').doc('vendors').set({
          vendors: this.vendors,
          lastUpdated: new Date().toISOString(),
          version: '1.0'
        });
        
        console.log('VendorManager: Vendor configuration saved to Firebase successfully');
      } else {
        // Fallback to localStorage
        console.log('VendorManager: Saving vendor configuration to localStorage...');
        
        const config = {
          vendors: this.vendors,
          lastUpdated: new Date().toISOString(),
          version: '1.0'
        };
        
        localStorage.setItem('packslist_vendor_config', JSON.stringify(config));
        console.log('VendorManager: Vendor configuration saved to localStorage successfully');
      }
      
      // Notify systems of vendor update
      document.dispatchEvent(new CustomEvent('vendorsUpdated', {
        detail: { vendors: this.vendors }
      }));
      
    } catch (error) {
      console.error('VendorManager: Error saving vendor config:', error);
      
      // Add more specific error information
      if (error.code) {
        console.error('Firebase error code:', error.code);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
      
      throw new Error(`Failed to save vendor configuration: ${error.message}`);
    }
  }

  // Get all active vendors
  getActiveVendors() {
    return this.vendors.filter(vendor => vendor.isActive);
  }

  // Get all vendors (for admin)
  getAllVendors() {
    return this.vendors;
  }

  // Get vendor categories
  getCategories() {
    return this.vendorCategories;
  }

  // Process post data to use dynamic vendor system
  processPostVendor(postData) {
    if (!postData.vendor) return postData;
    
    // Normalize vendor name to slug
    const vendorSlug = this.normalizeVendorName(postData.vendor);
    const vendorDisplay = this.getDisplayName(vendorSlug);
    
    return {
      ...postData,
      vendor: vendorSlug,
      vendorDisplay: vendorDisplay
    };
  }

  // Search vendors
  searchVendors(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(term) ||
      vendor.slug.toLowerCase().includes(term) ||
      (vendor.description && vendor.description.toLowerCase().includes(term))
    );
  }
}

// Global instance
window.vendorManager = new VendorManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Wait a bit for other managers to load
  setTimeout(async () => {
    if (window.vendorManager && !window.vendorManager.isInitialized) {
      await window.vendorManager.initialize();
    }
  }, 500);
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VendorManager;
}