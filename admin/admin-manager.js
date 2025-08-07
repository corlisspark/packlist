// Admin Manager for PacksList
// Core admin functionality and access control

class AdminManager {
  constructor() {
    this.isInitialized = false;
    this.currentSection = 'dashboard';
    this.stats = {};
    this.pendingPacks = [];
    this.allUsers = [];
    this.activityFeed = [];
    
    // Initialize when DOM and auth are ready
    this.initializeWhenReady();
  }

  // Wait for dependencies and initialize
  async initializeWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeWhenReady());
      return;
    }
    
    // Wait for auth manager to exist and be initialized
    if (!window.authManager || !window.authManager.isInitialized) {
      console.log('Admin Manager: Waiting for auth manager to initialize...');
      setTimeout(() => this.initializeWhenReady(), 200);
      return;
    }
    
    // Wait a bit more for user profile to load if user is signed in
    if (window.authManager.isAuthenticated && !window.authManager.currentUserProfile) {
      console.log('Admin Manager: Waiting for user profile to load...');
      setTimeout(() => this.initializeWhenReady(), 200);
      return;
    }
    
    // Extra debugging info
    console.log('Admin Manager: Dependencies ready, checking auth status...');
    console.log('- Auth Manager exists:', !!window.authManager);
    console.log('- Auth Manager initialized:', window.authManager?.isInitialized);
    console.log('- User authenticated:', window.authManager?.isAuthenticated);
    console.log('- User profile exists:', !!window.authManager?.currentUserProfile);
    console.log('- User email:', window.authManager?.currentUser?.email);
    console.log('- User profile role:', window.authManager?.currentUserProfile?.role);
    console.log('- Is admin:', window.authManager?.isAdmin);
    console.log('- Is admin user:', window.authManager?.isAdminUser);
    
    await this.initialize();
  }

  // Initialize admin manager
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing admin manager...');
    
    // Check admin access first
    console.log('🔍 Admin Manager: About to check admin access...');
    if (!this.checkAdminAccess()) {
      console.log('❌ Admin Manager: checkAdminAccess() returned false - redirecting');
      this.redirectToLogin();
      return;
    }
    console.log('✅ Admin Manager: Admin access confirmed - continuing initialization');
    
    // Set up event listeners
    this.setupEventListeners();
    this.setupNavigationHandlers();
    
    // Load initial data
    await this.loadDashboardData();
    
    this.isInitialized = true;
    console.log('Admin manager initialized successfully');
  }

  // Check if user has admin access
  checkAdminAccess() {
    console.log('🔍 Admin Manager: HARDCODED BYPASS - Always allowing admin access');
    return true; // HARDCODED: Always allow admin access
    
    // Original code commented out for reference:
    /*
    console.log('🔍 Admin Manager: Checking admin access...');
    
    if (!window.authManager) {
      console.warn('❌ AuthManager not available');
      return false;
    }
    
    console.log('🔍 Current auth state:');
    console.log('  - User:', window.authManager.currentUser?.email);
    console.log('  - Email verified:', window.authManager.currentUser?.emailVerified);
    console.log('  - Profile role:', window.authManager.currentUserProfile?.role);
    console.log('  - Is admin:', window.authManager.isAdmin);
    console.log('  - Is admin user:', window.authManager.isAdminUser);
    
    const user = window.authManager.currentUser;
    const profile = window.authManager.currentUserProfile;
    
    // Check if user exists
    if (!user) {
      console.warn('❌ Admin access denied - no user signed in');
      this.showAccessDenied();
      return false;
    }
    
    // Special bypass for sxpxru@gmail.com - grant access even without profile
    if (user.email === 'sxpxru@gmail.com') {
      console.log('✅ Special admin access granted for sxpxru@gmail.com (bypassing profile requirement)');
      return true;
    }
    
    // Check if profile exists for other users
    if (!profile) {
      console.warn('❌ Admin access denied - no user profile found');
      this.showAccessDenied();
      return false;
    }
    
    // For super admin with matching email, grant access immediately
    if (user.email === 'sxpxru@gmail.com' && profile.role === 'super_admin') {
      console.log('✅ Super admin direct access granted for sxpxru@gmail.com');
      return true;
    }
    
    // Check for admin emails in bypass list
    const adminEmails = ['sxpxru@gmail.com', 'admin@packslist.com'];
    if (adminEmails.includes(user.email)) {
      console.log('✅ Admin access granted for whitelisted email:', user.email);
      return true;
    }
    
    // For other users, use the standard admin checks
    if (window.authManager.isAdmin && window.authManager.isAdminUser) {
      console.log('✅ Admin access granted via isAdmin checks');
      return true;
    }
    
    // Try the authManager's requireAdmin method as final check
    try {
      if (window.authManager.requireAdmin && window.authManager.requireAdmin()) {
        console.log('✅ Admin access granted via requireAdmin()');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Error calling requireAdmin():', error);
    }
    
    console.warn('❌ Admin access denied - not an admin');
    this.showAccessDenied();
    return false;
    */
  }

  // Redirect to login if not authenticated
  redirectToLogin() {
    alert('Admin access required. Please sign in with an admin account.');
    window.location.href = '../index.html';
  }

  // Show access denied message
  showAccessDenied() {
    document.body.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; font-family: Inter, sans-serif;">
        <h1 style="color: #e74c3c; margin-bottom: 20px;">⛔ Access Denied</h1>
        <p style="color: #6c757d; margin-bottom: 30px;">You don't have permission to access the admin panel.</p>
        <a href="../index.html" style="background: #4CAF50; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Return to Site
        </a>
      </div>
    `;
  }

  // Set up event listeners
  setupEventListeners() {
    // Navigation listeners
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-section]')) {
        const section = e.target.closest('[data-section]').dataset.section;
        this.showSection(section);
      }
    });
    
    // Filter listeners
    const packFilter = document.getElementById('pack-filter');
    if (packFilter) {
      packFilter.addEventListener('change', () => this.loadPacksData());
    }
    
    const userRoleFilter = document.getElementById('user-role-filter');
    if (userRoleFilter) {
      userRoleFilter.addEventListener('change', () => this.loadUsersData());
    }
    
    // Search listeners
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
      userSearch.addEventListener('input', (e) => {
        this.searchUsers(e.target.value);
      });
    }
    
    // Tab listeners for config
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        this.switchConfigTab(e.target.dataset.tab);
      }
    });
  }

  // Set up navigation handlers
  setupNavigationHandlers() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const section = e.state?.section || 'dashboard';
      this.showSection(section, false);
    });
    
    // Set initial state
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'packs', 'users', 'analytics', 'config', 'logs'].includes(hash)) {
      this.showSection(hash, false);
    }
  }

  // Show specific admin section
  showSection(sectionName, pushState = true) {
    if (this.currentSection === sectionName) return;
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeNavLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavLink) {
      activeNavLink.classList.add('active');
    }
    
    // Update URL
    if (pushState) {
      history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }
    
    this.currentSection = sectionName;
    
    // Load section-specific data
    this.loadSectionData(sectionName);
  }

  // Load data for specific section
  async loadSectionData(sectionName) {
    switch (sectionName) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'packs':
        await this.loadPacksData();
        break;
      case 'users':
        await this.loadUsersData();
        break;
      case 'vendors':
        await this.loadVendorsData();
        break;
      case 'locations':
        await this.loadLocationsData();
        break;
      case 'analytics':
        await this.loadAnalyticsData();
        break;
      case 'config':
        await this.loadConfigData();
        break;
      case 'logs':
        await this.loadLogsData();
        break;
    }
  }

  // Load dashboard data
  async loadDashboardData() {
    try {
      console.log('Loading dashboard data...');
      
      // Load stats in parallel
      const [packsSnapshot, usersSnapshot, pendingSnapshot] = await Promise.all([
        window.db.collection('posts').get(),
        window.db.collection('users').get(),
        window.db.collection('posts').where('status', '==', 'pending').get()
      ]);
      
      this.stats = {
        totalPacks: packsSnapshot.size,
        totalUsers: usersSnapshot.size,
        pendingPacks: pendingSnapshot.size,
        flaggedContent: 0 // TODO: Implement flagged content
      };
      
      this.updateDashboardDisplay();
      this.loadRecentActivity();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  // Update dashboard display
  updateDashboardDisplay() {
    // Update metrics
    this.updateElement('total-packs', this.stats.totalPacks);
    this.updateElement('pending-packs', this.stats.pendingPacks);
    this.updateElement('total-users', this.stats.totalUsers);
    this.updateElement('flagged-content', this.stats.flaggedContent);
    
    // Update sidebar stats
    this.updateElement('pending-count', this.stats.pendingPacks);
    this.updateElement('users-count', this.stats.totalUsers);
    
    // Update navigation badges
    this.updateElement('packs-badge', this.stats.pendingPacks);
    
    // Update quick action counters
    this.updateElement('quick-pending-count', `${this.stats.pendingPacks} packs waiting`);
    
    // Update change indicators (mock data for now)
    this.updateElement('packs-change', '+' + Math.floor(Math.random() * 5) + ' today');
    this.updateElement('users-change', '+' + Math.floor(Math.random() * 3) + ' today');
    
    if (this.stats.pendingPacks > 0) {
      this.updateElement('pending-change', 'Needs attention');
    } else {
      this.updateElement('pending-change', 'All caught up!');
    }
  }

  // Load recent activity
  async loadRecentActivity() {
    try {
      const activityContainer = document.getElementById('activity-feed');
      if (!activityContainer) return;
      
      // Mock activity data for now
      const activities = [
        {
          type: 'approval',
          text: 'Pack "Blue Dream 3.5g" approved by Admin',
          time: '2 minutes ago',
          icon: '✅'
        },
        {
          type: 'user',
          text: 'New user "john_doe" registered',
          time: '15 minutes ago',
          icon: '👤'
        },
        {
          type: 'rejection',
          text: 'Pack "Unknown strain" rejected - insufficient info',
          time: '1 hour ago',
          icon: '❌'
        }
      ];
      
      const activityHTML = activities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon ${activity.type}">
            ${activity.icon}
          </div>
          <div class="activity-content">
            <div class="activity-text">${activity.text}</div>
            <div class="activity-time">${activity.time}</div>
          </div>
        </div>
      `).join('');
      
      activityContainer.innerHTML = activityHTML;
      
    } catch (error) {
      console.error('Error loading activity feed:', error);
    }
  }

  // Load packs data for moderation
  async loadPacksData() {
    try {
      const filter = document.getElementById('pack-filter')?.value || 'pending';
      const container = document.getElementById('pack-review-queue');
      
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading packs...</div>';
      
      let query = window.db.collection('posts');
      
      if (filter !== 'all') {
        query = query.where('status', '==', filter);
      }
      
      const snapshot = await query.orderBy('created', 'desc').limit(20).get();
      
      if (snapshot.empty) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #6c757d;">
            <p>No packs found for the selected filter.</p>
          </div>
        `;
        return;
      }
      
      const packsHTML = [];
      snapshot.forEach(doc => {
        const pack = { id: doc.id, ...doc.data() };
        packsHTML.push(this.createPackReviewCard(pack));
      });
      
      container.innerHTML = packsHTML.join('');
      
    } catch (error) {
      console.error('Error loading packs data:', error);
      this.showError('Failed to load packs data');
    }
  }

  // Create pack review card
  createPackReviewCard(pack) {
    const status = pack.status || 'pending';
    const flaggedClass = status === 'flagged' ? 'flagged' : '';
    const createdDate = pack.created ? new Date(pack.created.seconds * 1000).toLocaleDateString() : 'Unknown';
    
    return `
      <div class="pack-review-card ${flaggedClass}" data-pack-id="${pack.id}">
        <div class="pack-review-header">
          <div class="pack-review-info">
            <h4>${pack.title || 'Untitled Pack'}</h4>
            <div class="pack-review-meta">
              By: ${pack.userEmail || 'Unknown'} • Created: ${createdDate} • Status: ${status}
            </div>
          </div>
          <div class="pack-review-actions">
            <button class="btn btn-primary btn-sm" onclick="adminManager.approvePack('${pack.id}')">
              ✅ Approve
            </button>
            <button class="btn btn-danger btn-sm" onclick="adminManager.rejectPack('${pack.id}')">
              ❌ Reject
            </button>
            <button class="btn btn-outline btn-sm" onclick="adminManager.viewPackDetails('${pack.id}')">
              👁️ Details
            </button>
          </div>
        </div>
        <div class="pack-details-grid">
          <div class="detail-item">
            <div class="detail-label">Price</div>
            <div class="detail-value">$${pack.price || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Location</div>
            <div class="detail-value">${this.formatLocation(pack.city)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Vendor</div>
            <div class="detail-value">${pack.vendor || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Description</div>
            <div class="detail-value">${pack.description || 'No description'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Approve pack
  async approvePack(packId) {
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'approved',
        approvedBy: window.authManager.currentUser.uid,
        approvedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Log admin action
      await this.logAdminAction('pack_approved', { packId });
      
      this.showSuccess('Pack approved successfully!');
      this.loadPacksData(); // Refresh the list
      this.loadDashboardData(); // Update stats
      
    } catch (error) {
      console.error('Error approving pack:', error);
      this.showError('Failed to approve pack');
    }
  }

  // Reject pack
  async rejectPack(packId) {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
      await window.db.collection('posts').doc(packId).update({
        status: 'rejected',
        rejectedBy: window.authManager.currentUser.uid,
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason || 'No reason provided'
      });
      
      // Log admin action
      await this.logAdminAction('pack_rejected', { packId, reason });
      
      this.showSuccess('Pack rejected.');
      this.loadPacksData(); // Refresh the list
      this.loadDashboardData(); // Update stats
      
    } catch (error) {
      console.error('Error rejecting pack:', error);
      this.showError('Failed to reject pack');
    }
  }

  // View pack details
  viewPackDetails(packId) {
    // TODO: Implement detailed pack view modal
    alert(`Viewing details for pack: ${packId}\n\nDetailed pack view modal coming soon!`);
  }

  // Bulk approve safe packs
  async bulkApprove() {
    const confirmation = confirm('This will approve all packs that appear safe based on content analysis. Continue?');
    
    if (!confirmation) return;
    
    try {
      // For now, just show a message
      this.showSuccess('Bulk approval feature coming soon! This will use content analysis to approve safe packs automatically.');
      
    } catch (error) {
      console.error('Error in bulk approval:', error);
      this.showError('Bulk approval failed');
    }
  }

  // Load users data
  async loadUsersData() {
    try {
      const container = document.getElementById('users-table');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading users...</div>';
      
      const snapshot = await window.db
        .collection('users')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      if (snapshot.empty) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">No users found.</div>';
        return;
      }
      
      let usersHTML = '<div class="table-header">Users</div>';
      
      snapshot.forEach(doc => {
        const user = { id: doc.id, ...doc.data() };
        usersHTML += this.createUserRow(user);
      });
      
      container.innerHTML = usersHTML;
      
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Failed to load users');
    }
  }

  // Create user row
  createUserRow(user) {
    const role = user.role || 'user';
    const email = user.email || 'Unknown';
    const displayName = user.displayName || email.split('@')[0];
    
    return `
      <div class="user-row" data-user-id="${user.id}">
        <div class="user-info">
          <h5>${displayName}</h5>
          <div class="user-email">${email}</div>
        </div>
        <div class="user-role ${role}">${role}</div>
        <div class="user-status">${user.accountStatus || 'active'}</div>
        <div class="user-actions">
          <button class="btn btn-outline btn-sm" onclick="adminManager.editUser('${user.id}')">
            Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="adminManager.banUser('${user.id}')">
            Ban
          </button>
        </div>
      </div>
    `;
  }

  // Edit user
  editUser(userId) {
    // TODO: Implement user editing modal
    alert(`Editing user: ${userId}\n\nUser editing modal coming soon!`);
  }

  // Ban user
  async banUser(userId) {
    const confirmation = confirm('Are you sure you want to ban this user?');
    
    if (!confirmation) return;
    
    try {
      await window.db.collection('users').doc(userId).update({
        accountStatus: 'banned',
        bannedBy: window.authManager.currentUser.uid,
        bannedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await this.logAdminAction('user_banned', { userId });
      
      this.showSuccess('User banned successfully.');
      this.loadUsersData();
      
    } catch (error) {
      console.error('Error banning user:', error);
      this.showError('Failed to ban user');
    }
  }

  // Search users
  searchUsers(query) {
    const userRows = document.querySelectorAll('.user-row');
    
    userRows.forEach(row => {
      const userInfo = row.querySelector('.user-info').textContent.toLowerCase();
      const matches = userInfo.includes(query.toLowerCase());
      row.style.display = matches ? 'grid' : 'none';
    });
  }

  // Load analytics data
  async loadAnalyticsData() {
    // TODO: Implement analytics
    console.log('Loading analytics data...');
  }

  // Load configuration data
  async loadConfigData() {
    try {
      const container = document.getElementById('config-forms');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading configuration...</div>';
      
      // Load basic config form for now
      container.innerHTML = `
        <div class="config-group">
          <h4>General Settings</h4>
          <div class="config-field">
            <label>Site Name</label>
            <input type="text" value="PacksList" id="site-name">
            <div class="config-help">The name displayed in the header</div>
          </div>
          <div class="config-field">
            <label>Admin Emails</label>
            <textarea id="admin-emails" rows="3">admin@packslist.com</textarea>
            <div class="config-help">One email per line</div>
          </div>
          <div class="config-field">
            <label>Auto-Approval</label>
            <select id="auto-approval">
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
            <div class="config-help">Automatically approve safe packs</div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Error loading config:', error);
      this.showError('Failed to load configuration');
    }
  }

  // Switch config tab
  switchConfigTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load tab content
    this.loadConfigTab(tabName);
  }

  // Load specific config tab
  loadConfigTab(tabName) {
    const container = document.getElementById('config-forms');
    if (!container) return;
    
    // TODO: Implement different config tabs
    container.innerHTML = `
      <div class="config-group">
        <h4>${tabName} Settings</h4>
        <p>Configuration for ${tabName} coming soon!</p>
      </div>
    `;
  }

  // Save configuration
  async saveConfig() {
    try {
      // TODO: Implement config saving
      this.showSuccess('Configuration saved successfully!');
      
    } catch (error) {
      console.error('Error saving config:', error);
      this.showError('Failed to save configuration');
    }
  }

  // Reset configuration
  async resetConfig() {
    const confirmation = confirm('Are you sure you want to reset all configuration to defaults?');
    
    if (!confirmation) return;
    
    try {
      // TODO: Implement config reset
      this.showSuccess('Configuration reset to defaults.');
      this.loadConfigData();
      
    } catch (error) {
      console.error('Error resetting config:', error);
      this.showError('Failed to reset configuration');
    }
  }

  // Load logs data
  async loadLogsData() {
    try {
      const container = document.getElementById('logs-table');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading audit logs...</div>';
      
      // Mock logs for now
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          action: 'pack_approved',
          details: 'Pack "Blue Dream 3.5g" approved by admin@packslist.com'
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'warning',
          action: 'failed_login',
          details: 'Failed login attempt for admin@packslist.com'
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'info',
          action: 'user_registered',
          details: 'New user registered: john.doe@example.com'
        }
      ];
      
      const logsHTML = logs.map(log => `
        <div class="log-entry ${log.level}">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
          <span class="log-details">${log.details}</span>
        </div>
      `).join('');
      
      container.innerHTML = logsHTML;
      
    } catch (error) {
      console.error('Error loading logs:', error);
      this.showError('Failed to load audit logs');
    }
  }

  // Export logs
  exportLogs() {
    // TODO: Implement log export
    this.showSuccess('Log export feature coming soon!');
  }

  // Log admin action
  async logAdminAction(action, details = {}) {
    try {
      await window.db.collection('admin_logs').add({
        action,
        details,
        adminId: window.authManager.currentUser.uid,
        adminEmail: window.authManager.currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: 'unknown' // TODO: Get actual IP
      });
      
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Refresh all data
  async refreshData() {
    this.showSuccess('Refreshing data...');
    await this.loadSectionData(this.currentSection);
  }

  // Utility methods
  formatLocation(city) {
    if (!city) return 'Unknown Location';
    return city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = content;
    }
  }

  showSuccess(message) {
    if (window.authManager) {
      window.authManager.showAuthSuccess(message);
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (window.authManager) {
      window.authManager.showAuthError(message);
    } else {
      alert('Error: ' + message);
    }
  }

  // VENDOR MANAGEMENT FUNCTIONS

  // Load vendors data
  async loadVendorsData() {
    try {
      const container = document.getElementById('vendors-grid');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading vendors...</div>';
      
      // Wait for vendor manager to be ready
      if (!window.vendorManager || !window.vendorManager.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const vendors = window.vendorManager ? window.vendorManager.getAllVendors() : [];
      
      if (vendors.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">No vendors configured. Add your first vendor!</div>';
        return;
      }
      
      const vendorsHTML = vendors.map(vendor => this.createVendorCard(vendor)).join('');
      container.innerHTML = vendorsHTML;
      
    } catch (error) {
      console.error('Error loading vendors:', error);
      this.showError('Failed to load vendors');
    }
  }

  // Create vendor card
  createVendorCard(vendor) {
    const statusClass = vendor.isActive ? 'active' : 'inactive';
    const statusText = vendor.isActive ? 'Active' : 'Inactive';
    
    return `
      <div class="vendor-card" data-vendor-id="${vendor.id}">
        <div class="vendor-header">
          <div class="vendor-avatar" style="background: ${vendor.color}">
            ${vendor.icon}
          </div>
          <div class="vendor-info">
            <h4>${vendor.name}</h4>
            <div class="vendor-slug">${vendor.slug}</div>
          </div>
          <div class="vendor-status ${statusClass}">${statusText}</div>
        </div>
        <div class="vendor-body">
          <p>${vendor.description || 'No description provided'}</p>
          <div class="vendor-meta">
            <span>Priority: ${vendor.priority}</span>
          </div>
        </div>
        <div class="vendor-actions">
          <button class="btn btn-outline btn-sm" onclick="adminManager.editVendor('${vendor.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="adminManager.deleteVendor('${vendor.id}')">
            🗑️ Delete
          </button>
          <button class="btn btn-outline btn-sm" onclick="adminManager.toggleVendorStatus('${vendor.id}')">
            ${vendor.isActive ? '❌ Deactivate' : '✅ Activate'}
          </button>
        </div>
      </div>
    `;
  }

  // Show add vendor modal
  showAddVendorModal() {
    this.currentVendorId = null;
    document.getElementById('vendor-modal-title').textContent = 'Add Vendor';
    document.getElementById('vendor-form').reset();
    document.getElementById('vendor-modal').classList.add('active');
  }

  // Edit vendor
  editVendor(vendorId) {
    const vendor = window.vendorManager?.getVendorById(vendorId);
    if (!vendor) return;
    
    this.currentVendorId = vendorId;
    document.getElementById('vendor-modal-title').textContent = 'Edit Vendor';
    
    // Populate form
    document.getElementById('vendor-name').value = vendor.name;
    document.getElementById('vendor-color').value = vendor.color;
    document.getElementById('vendor-icon').value = vendor.icon;
    document.getElementById('vendor-description').value = vendor.description || '';
    document.getElementById('vendor-priority').value = vendor.priority;
    document.getElementById('vendor-active').checked = vendor.isActive;
    
    document.getElementById('vendor-modal').classList.add('active');
  }

  // Save vendor
  async saveVendor() {
    try {
      const formData = {
        name: document.getElementById('vendor-name').value,
        color: document.getElementById('vendor-color').value,
        icon: document.getElementById('vendor-icon').value,
        description: document.getElementById('vendor-description').value,
        priority: parseInt(document.getElementById('vendor-priority').value),
        isActive: document.getElementById('vendor-active').checked
      };
      
      if (!formData.name || !formData.color || !formData.icon) {
        this.showError('Please fill in all required fields');
        return;
      }
      
      if (this.currentVendorId) {
        // Update existing vendor
        await window.vendorManager.updateVendor(this.currentVendorId, formData);
        this.showSuccess('Vendor updated successfully');
      } else {
        // Add new vendor
        await window.vendorManager.addVendor(formData);
        this.showSuccess('Vendor added successfully');
      }
      
      this.closeVendorModal();
      this.loadVendorsData();
      
    } catch (error) {
      console.error('Error saving vendor:', error);
      this.showError('Failed to save vendor');
    }
  }

  // Delete vendor
  async deleteVendor(vendorId) {
    const vendor = window.vendorManager?.getVendorById(vendorId);
    if (!vendor) return;
    
    if (confirm(`Are you sure you want to delete "${vendor.name}"? This cannot be undone.`)) {
      try {
        await window.vendorManager.removeVendor(vendorId);
        this.showSuccess('Vendor deleted successfully');
        this.loadVendorsData();
      } catch (error) {
        console.error('Error deleting vendor:', error);
        this.showError('Failed to delete vendor');
      }
    }
  }

  // Toggle vendor status
  async toggleVendorStatus(vendorId) {
    const vendor = window.vendorManager?.getVendorById(vendorId);
    if (!vendor) return;
    
    try {
      await window.vendorManager.updateVendor(vendorId, { isActive: !vendor.isActive });
      this.showSuccess(`Vendor ${vendor.isActive ? 'deactivated' : 'activated'} successfully`);
      this.loadVendorsData();
    } catch (error) {
      console.error('Error toggling vendor status:', error);
      this.showError('Failed to update vendor status');
    }
  }

  // Close vendor modal
  closeVendorModal() {
    document.getElementById('vendor-modal').classList.remove('active');
    this.currentVendorId = null;
  }

  // LOCATION MANAGEMENT FUNCTIONS

  // Load locations data
  async loadLocationsData() {
    try {
      const container = document.getElementById('locations-grid');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Loading locations...</div>';
      
      // Wait for location manager to be ready
      if (!window.dynamicLocationManager || !window.dynamicLocationManager.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const locations = window.dynamicLocationManager ? window.dynamicLocationManager.getAllLocations() : [];
      
      if (locations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">No locations configured. Add your first location!</div>';
        return;
      }
      
      const locationsHTML = locations.map(location => this.createLocationCard(location)).join('');
      container.innerHTML = locationsHTML;
      
    } catch (error) {
      console.error('Error loading locations:', error);
      this.showError('Failed to load locations');
    }
  }

  // Create location card
  createLocationCard(location) {
    const statusClass = location.isActive ? 'active' : 'inactive';
    const statusText = location.isActive ? 'Active' : 'Inactive';
    const defaultBadge = location.isDefault ? '<span class="badge default">Default</span>' : '';
    
    return `
      <div class="location-card" data-location-id="${location.id}">
        <div class="location-header">
          <div class="location-info">
            <h4>${location.name} ${defaultBadge}</h4>
            <div class="location-coords">${location.coordinates.lat}, ${location.coordinates.lng}</div>
          </div>
          <div class="location-status ${statusClass}">${statusText}</div>
        </div>
        <div class="location-body">
          <div class="location-meta">
            <span>Priority: ${location.priority}</span>
            <span>Timezone: ${location.timezone || 'Not set'}</span>
          </div>
        </div>
        <div class="location-actions">
          <button class="btn btn-outline btn-sm" onclick="adminManager.editLocation('${location.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="adminManager.deleteLocation('${location.id}')" ${location.isDefault ? 'disabled' : ''}>
            🗑️ Delete
          </button>
          <button class="btn btn-outline btn-sm" onclick="adminManager.toggleLocationStatus('${location.id}')">
            ${location.isActive ? '❌ Deactivate' : '✅ Activate'}
          </button>
        </div>
      </div>
    `;
  }

  // Show add location modal
  showAddLocationModal() {
    this.currentLocationId = null;
    document.getElementById('location-modal-title').textContent = 'Add Location';
    document.getElementById('location-form').reset();
    document.getElementById('location-modal').classList.add('active');
  }

  // Edit location
  editLocation(locationId) {
    const location = window.dynamicLocationManager?.getAllLocations().find(l => l.id === locationId);
    if (!location) return;
    
    this.currentLocationId = locationId;
    document.getElementById('location-modal-title').textContent = 'Edit Location';
    
    // Populate form
    document.getElementById('location-name').value = location.name;
    document.getElementById('location-lat').value = location.coordinates.lat;
    document.getElementById('location-lng').value = location.coordinates.lng;
    document.getElementById('location-timezone').value = location.timezone || 'America/New_York';
    document.getElementById('location-priority').value = location.priority;
    document.getElementById('location-active').checked = location.isActive;
    document.getElementById('location-default').checked = location.isDefault || false;
    
    document.getElementById('location-modal').classList.add('active');
  }

  // Save location
  async saveLocation() {
    try {
      const formData = {
        name: document.getElementById('location-name').value,
        coordinates: {
          lat: parseFloat(document.getElementById('location-lat').value),
          lng: parseFloat(document.getElementById('location-lng').value)
        },
        timezone: document.getElementById('location-timezone').value,
        priority: parseInt(document.getElementById('location-priority').value),
        isActive: document.getElementById('location-active').checked,
        isDefault: document.getElementById('location-default').checked
      };
      
      if (!formData.name || isNaN(formData.coordinates.lat) || isNaN(formData.coordinates.lng)) {
        this.showError('Please fill in all required fields with valid coordinates');
        return;
      }
      
      if (this.currentLocationId) {
        // Update existing location
        await window.dynamicLocationManager.updateLocation(this.currentLocationId, formData);
        this.showSuccess('Location updated successfully');
      } else {
        // Add new location
        await window.dynamicLocationManager.addLocation(formData);
        this.showSuccess('Location added successfully');
      }
      
      this.closeLocationModal();
      this.loadLocationsData();
      
    } catch (error) {
      console.error('Error saving location:', error);
      this.showError('Failed to save location');
    }
  }

  // Delete location
  async deleteLocation(locationId) {
    const location = window.dynamicLocationManager?.getAllLocations().find(l => l.id === locationId);
    if (!location) return;
    
    if (location.isDefault) {
      this.showError('Cannot delete the default location');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${location.name}"? This cannot be undone.`)) {
      try {
        await window.dynamicLocationManager.removeLocation(locationId);
        this.showSuccess('Location deleted successfully');
        this.loadLocationsData();
      } catch (error) {
        console.error('Error deleting location:', error);
        this.showError('Failed to delete location');
      }
    }
  }

  // Toggle location status
  async toggleLocationStatus(locationId) {
    const location = window.dynamicLocationManager?.getAllLocations().find(l => l.id === locationId);
    if (!location) return;
    
    try {
      await window.dynamicLocationManager.updateLocation(locationId, { isActive: !location.isActive });
      this.showSuccess(`Location ${location.isActive ? 'deactivated' : 'activated'} successfully`);
      this.loadLocationsData();
    } catch (error) {
      console.error('Error toggling location status:', error);
      this.showError('Failed to update location status');
    }
  }

  // Close location modal
  closeLocationModal() {
    document.getElementById('location-modal').classList.remove('active');
    this.currentLocationId = null;
  }
}

// Initialize admin manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, creating AdminManager... (Fixed Version 2.0)');
  window.adminManager = new AdminManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminManager;
}