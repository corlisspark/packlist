// Dynamic Navigation Manager for PacksList
// Centralized navigation configuration and rendering

class NavigationManager {
  constructor() {
    this.config = {
      // Navigation items configuration
      items: [
        {
          id: 'home',
          label: 'Home',
          icon: '🏠',
          href: 'index.html',
          headerNav: true,
          bottomNav: true,
          authRequired: false,
          adminOnly: false
        },
        {
          id: 'listings',
          label: 'Listings',
          icon: '📋',
          href: 'listings.html',
          headerNav: false,
          bottomNav: true,
          authRequired: false,
          adminOnly: false
        },
        {
          id: 'post',
          label: 'Post',
          icon: '⛽',
          href: 'new.html',
          headerNav: true,
          bottomNav: true,
          authRequired: true,
          adminOnly: false
        },
        {
          id: 'admin',
          label: 'Admin',
          icon: '⚙️',
          href: '/admin/admin-panel.html',
          headerNav: true,
          bottomNav: false,
          authRequired: true,
          adminOnly: true
        },
        {
          id: 'account',
          label: 'Account',
          icon: '👤',
          href: 'account.html',
          headerNav: true,
          bottomNav: true,
          authRequired: false,
          adminOnly: false
        }
      ],
      
      // Current page detection
      currentPage: this.getCurrentPage()
    };
    
    this.isInitialized = false;
  }

  // Initialize navigation manager
  initialize() {
    if (this.isInitialized) return;
    
    this.renderHeaderNavigation();
    this.renderBottomNavigation();
    this.updateActiveStates();
    
    this.isInitialized = true;
    console.log('NavigationManager: Initialized successfully');
  }

  // Get current page from URL
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Map filenames to nav item IDs
    const pageMap = {
      'index.html': 'home',
      '': 'home', // Root path
      'listings.html': 'listings',
      'new.html': 'post',
      'admin-panel.html': 'admin',
      'account.html': 'account'
    };
    
    return pageMap[filename] || 'home';
  }

  // Filter items based on permissions and location
  getFilteredItems(location) {
    return this.config.items.filter(item => {
      // Check if item should appear in this location
      if (!item[location]) return false;
      
      // Check authentication requirements
      if (item.authRequired && !this.isUserAuthenticated()) {
        return false;
      }
      
      // Check admin requirements
      if (item.adminOnly && !this.isUserAdmin()) {
        return false;
      }
      
      return true;
    });
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return window.authManager?.isAuthenticated || false;
  }

  // Check if user is admin
  isUserAdmin() {
    return window.authManager?.isAdmin || false;
  }

  // Render header navigation
  renderHeaderNavigation() {
    const headerNav = document.querySelector('.header-nav');
    if (!headerNav) return;
    
    const items = this.getFilteredItems('headerNav');
    const navHTML = items.map(item => this.createHeaderNavItem(item)).join('');
    
    headerNav.innerHTML = navHTML;
  }

  // Create header navigation item
  createHeaderNavItem(item) {
    const isActive = item.id === this.config.currentPage ? 'active' : '';
    const classes = ['nav-btn', isActive];
    
    if (item.authRequired) classes.push('auth-required');
    if (item.adminOnly) classes.push('admin-only');
    
    return `
      <a href="${item.href}" class="${classes.join(' ')}" data-nav-id="${item.id}">
        <span class="nav-btn-icon">${item.icon}</span>
      </a>
    `;
  }

  // Render bottom navigation
  renderBottomNavigation() {
    const bottomNav = document.querySelector('.toolbar-nav');
    if (!bottomNav) return;
    
    const items = this.getFilteredItems('bottomNav');
    const navHTML = items.map(item => this.createBottomNavItem(item)).join('');
    
    bottomNav.innerHTML = navHTML;
  }

  // Create bottom navigation item
  createBottomNavItem(item) {
    const isActive = item.id === this.config.currentPage ? 'active' : '';
    const classes = ['toolbar-item', isActive];
    
    if (item.authRequired) classes.push('auth-required');
    if (item.adminOnly) classes.push('admin-only');
    
    return `
      <a href="${item.href}" class="${classes.join(' ')}" data-nav-id="${item.id}">
        <span class="toolbar-icon">${item.icon}</span>
        <span class="toolbar-label">${item.label}</span>
      </a>
    `;
  }

  // Update active states (useful for SPA navigation)
  updateActiveStates(newPage = null) {
    if (newPage) {
      this.config.currentPage = newPage;
    }
    
    // Update header nav active states
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.navId === this.config.currentPage) {
        btn.classList.add('active');
      }
    });
    
    // Update bottom nav active states
    document.querySelectorAll('.toolbar-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.navId === this.config.currentPage) {
        item.classList.add('active');
      }
    });
  }

  // Add new navigation item
  addNavItem(item) {
    this.config.items.push(item);
    this.refresh();
  }

  // Remove navigation item
  removeNavItem(id) {
    this.config.items = this.config.items.filter(item => item.id !== id);
    this.refresh();
  }

  // Update navigation item
  updateNavItem(id, updates) {
    const itemIndex = this.config.items.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      this.config.items[itemIndex] = { ...this.config.items[itemIndex], ...updates };
      this.refresh();
    }
  }

  // Refresh navigation (re-render)
  refresh() {
    this.renderHeaderNavigation();
    this.renderBottomNavigation();
    this.updateActiveStates();
  }

  // Get navigation configuration (for debugging or external use)
  getConfig() {
    return this.config;
  }

  // Set custom configuration
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.refresh();
  }

  // Listen for auth state changes and refresh navigation
  onAuthStateChange() {
    if (window.authManager) {
      window.authManager.onAuthStateChange?.(() => {
        console.log('NavigationManager: Auth state changed, refreshing navigation');
        this.refresh();
      });
    }
  }
}

// Global instance
window.navigationManager = new NavigationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.navigationManager && !window.navigationManager.isInitialized) {
    window.navigationManager.initialize();
    window.navigationManager.onAuthStateChange();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationManager;
}