// Centralized Page Management System for PacksList
// Ensures consistency across all pages and eliminates code duplication

class PageManager {
  constructor() {
    this.pageConfig = {
      // Common elements that appear on all pages
      common: {
        appName: 'PacksList',
        tagline: 'Local Delivery',
        logoIcon: '🌿'
      },
      
      // Page-specific configurations
      pages: {
        index: {
          title: 'PacksList - Local Delivery',
          pageType: 'map',
          hasSearch: true,
          hasMap: true,
          searchPlaceholder: 'Plugs?? 🔌🔌'
        },
        listings: {
          title: 'Listings - PacksList',
          pageType: 'listings',
          hasSearch: true,
          hasFilters: true,
          searchPlaceholder: 'Search packs, vendors, locations...'
        },
        'new': {
          title: 'Post New Pack - PacksList',
          pageType: 'form',
          hasSearch: false,
          requiresAuth: true
        },
        account: {
          title: 'Account - PacksList',
          pageType: 'profile',
          hasSearch: false,
          requiresAuth: true
        }
      }
    };
    
    this.currentPage = this.getCurrentPageId();
    this.isInitialized = false;
  }

  // Initialize page manager
  async initialize() {
    if (this.isInitialized) return;
    
    await this.setupPageStructure();
    await this.initializeCommonElements();
    await this.loadPageSpecificContent();
    
    this.isInitialized = true;
    console.log('PageManager: Initialized for page:', this.currentPage);
  }

  // Get current page ID from URL
  getCurrentPageId() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '') || 'index';
  }

  // Setup consistent page structure
  async setupPageStructure() {
    // Ensure all pages have consistent HTML structure
    this.ensurePageStructure();
    this.setupCommonHeader();
    this.setupCommonFooter();
  }

  // Ensure consistent page structure exists
  ensurePageStructure() {
    const body = document.body;
    
    // Ensure app-container exists
    if (!document.querySelector('.app-container')) {
      const appContainer = document.createElement('div');
      appContainer.className = 'app-container';
      
      // Move all existing body content into app-container
      while (body.firstChild) {
        appContainer.appendChild(body.firstChild);
      }
      
      body.appendChild(appContainer);
    }
    
    // Ensure header exists
    if (!document.querySelector('header.header')) {
      this.createCommonHeader();
    }
    
    // Ensure main content area exists
    if (!document.querySelector('.main-content')) {
      const mainContent = document.createElement('div');
      mainContent.className = 'main-content';
      
      // Move non-header, non-footer content to main-content
      const appContainer = document.querySelector('.app-container');
      const header = appContainer.querySelector('header.header');
      const footer = appContainer.querySelector('.bottom-toolbar');
      
      Array.from(appContainer.children).forEach(child => {
        if (child !== header && child !== footer && !child.classList.contains('main-content')) {
          mainContent.appendChild(child);
        }
      });
      
      if (header && footer) {
        appContainer.insertBefore(mainContent, footer);
      } else if (header) {
        appContainer.appendChild(mainContent);
      }
    }
  }

  // Create common header structure
  createCommonHeader() {
    const appContainer = document.querySelector('.app-container');
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">${this.pageConfig.common.logoIcon}</div>
          <span class="logo-text">${this.pageConfig.common.appName}</span>
          <span class="location-indicator" id="location-indicator">• Detecting...</span>
        </div>
        <div class="header-actions">
          <div class="user-info">
            <span id="user-indicator">Guest</span>
          </div>
          <div class="auth-buttons guest-only">
            <button class="auth-button" onclick="window.authModals?.showSignIn()">Sign In</button>
            <button class="auth-button auth-button-primary" onclick="window.authModals?.showSignUp()">Sign Up</button>
          </div>
          <nav class="header-nav">
            <!-- Dynamic navigation will be rendered here by navigation-manager.js -->
          </nav>
        </div>
      </div>
    `;
    
    appContainer.insertBefore(header, appContainer.firstChild);
  }

  setupCommonHeader() {
    // Update page title
    const pageConfig = this.pageConfig.pages[this.currentPage];
    if (pageConfig) {
      document.title = pageConfig.title;
    }
    
    // Update logo and app name
    const logoText = document.querySelector('.logo-text');
    const logoIcon = document.querySelector('.logo-icon');
    
    if (logoText) {
      logoText.textContent = this.pageConfig.common.appName;
    }
    if (logoIcon) {
      logoIcon.textContent = this.pageConfig.common.logoIcon;
    }
  }

  setupCommonFooter() {
    // Ensure bottom toolbar exists
    if (!document.querySelector('.bottom-toolbar')) {
      const appContainer = document.querySelector('.app-container');
      const bottomToolbar = document.createElement('div');
      bottomToolbar.className = 'bottom-toolbar';
      bottomToolbar.innerHTML = `
        <nav class="toolbar-nav">
          <!-- Dynamic navigation will be rendered here by navigation-manager.js -->
        </nav>
      `;
      appContainer.appendChild(bottomToolbar);
    }
  }

  // Initialize common elements based on page type
  async initializeCommonElements() {
    const pageConfig = this.pageConfig.pages[this.currentPage];
    if (!pageConfig) return;
    
    // Initialize search if page has search
    if (pageConfig.hasSearch) {
      this.initializeSearch(pageConfig.searchPlaceholder);
    }
    
    // Initialize filters if page has filters
    if (pageConfig.hasFilters) {
      this.initializeFilters();
    }
    
    // Initialize map if page has map
    if (pageConfig.hasMap) {
      this.initializeMap();
    }
    
    // Check auth requirements
    if (pageConfig.requiresAuth) {
      this.checkAuthentication();
    }
  }

  // Initialize search functionality
  initializeSearch(placeholder) {
    const searchInput = document.getElementById('search-input');
    if (searchInput && placeholder) {
      searchInput.placeholder = placeholder;
    }
    
    // Add consistent search behavior
    if (searchInput && !searchInput.hasAttribute('data-search-initialized')) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
      searchInput.setAttribute('data-search-initialized', 'true');
    }
  }

  // Initialize filter system
  initializeFilters() {
    // This will be populated by vendor manager
    console.log('PageManager: Filters will be initialized by VendorManager');
  }

  // Initialize map
  initializeMap() {
    // Map initialization handled by existing map integration
    console.log('PageManager: Map initialization delegated to map-integration.js');
  }

  // Check authentication requirements
  checkAuthentication() {
    if (window.authManager && !window.authManager.isAuthenticated) {
      console.log('PageManager: Page requires authentication');
      // Could redirect to login or show auth modal
    }
  }

  // Handle search across different page types
  handleSearch(searchTerm) {
    const pageConfig = this.pageConfig.pages[this.currentPage];
    
    switch (pageConfig.pageType) {
      case 'map':
        this.handleMapSearch(searchTerm);
        break;
      case 'listings':
        this.handleListingsSearch(searchTerm);
        break;
      default:
        console.log('PageManager: Search not implemented for page type:', pageConfig.pageType);
    }
  }

  // Handle map page search
  handleMapSearch(searchTerm) {
    if (window.mapIntegration && window.mapIntegration.searchLocations) {
      window.mapIntegration.searchLocations(searchTerm);
    }
  }

  // Handle listings page search
  handleListingsSearch(searchTerm) {
    // Trigger search in listings system
    const event = new CustomEvent('pageManagerSearch', { 
      detail: { searchTerm, pageType: 'listings' } 
    });
    document.dispatchEvent(event);
  }

  // Load page-specific content
  async loadPageSpecificContent() {
    const pageConfig = this.pageConfig.pages[this.currentPage];
    if (!pageConfig) return;
    
    // Load page-specific scripts and initialize features
    switch (pageConfig.pageType) {
      case 'map':
        await this.loadMapPageContent();
        break;
      case 'listings':
        await this.loadListingsPageContent();
        break;
      case 'form':
        await this.loadFormPageContent();
        break;
      case 'profile':
        await this.loadProfilePageContent();
        break;
    }
  }

  async loadMapPageContent() {
    // Map-specific initialization
    console.log('PageManager: Loading map page content');
  }

  async loadListingsPageContent() {
    // Listings-specific initialization
    console.log('PageManager: Loading listings page content');
  }

  async loadFormPageContent() {
    // Form-specific initialization
    console.log('PageManager: Loading form page content');
  }

  async loadProfilePageContent() {
    // Profile-specific initialization
    console.log('PageManager: Loading profile page content');
  }

  // Update page configuration
  updatePageConfig(updates) {
    this.pageConfig = { ...this.pageConfig, ...updates };
    this.refresh();
  }

  // Update common configuration
  updateCommonConfig(updates) {
    this.pageConfig.common = { ...this.pageConfig.common, ...updates };
    this.setupCommonHeader();
  }

  // Refresh page elements
  refresh() {
    this.setupCommonHeader();
    this.initializeCommonElements();
  }

  // Get current page configuration
  getCurrentPageConfig() {
    return this.pageConfig.pages[this.currentPage];
  }

  // Get common configuration
  getCommonConfig() {
    return this.pageConfig.common;
  }
}

// Global instance
window.pageManager = new PageManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.pageManager && !window.pageManager.isInitialized) {
    await window.pageManager.initialize();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageManager;
}