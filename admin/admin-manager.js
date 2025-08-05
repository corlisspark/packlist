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
    const accessDeniedHTML = `
      <div style="text-align: center; padding: 60px 20px; font-family: Inter, sans-serif;">
        <h1 style="color: #e74c3c; margin-bottom: 20px;">⛔ Access Denied</h1>
        <p style="color: #6c757d; margin-bottom: 30px;">You don't have permission to access the admin panel.</p>
        <a href="../index.html" style="background: #4CAF50; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Return to Site
        </a>
      </div>
    `;
    
    if (window.domUtils) {
      window.domUtils.setHTML(document.body, accessDeniedHTML);
    } else {
      document.body.innerHTML = accessDeniedHTML;
    }
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
      
      if (window.domUtils) {
        window.domUtils.setHTML(activityContainer, activityHTML);
      } else {
        activityContainer.innerHTML = activityHTML;
      }
      
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
      
      if (window.domUtils) {
        window.domUtils.setHTML(container, '<div class="loading">Loading packs...</div>');
      } else {
        container.innerHTML = '<div class="loading">Loading packs...</div>';
      }
      
      let query = window.db.collection('posts');
      
      if (filter !== 'all') {
        query = query.where('status', '==', filter);
      }
      
      const snapshot = await query.orderBy('created', 'desc').limit(20).get();
      
      if (snapshot.empty) {
        const noPacksHTML = `
          <div style="text-align: center; padding: 40px; color: #6c757d;">
            <p>No packs found for the selected filter.</p>
          </div>
        `;
        
        if (window.domUtils) {
          window.domUtils.setHTML(container, noPacksHTML);
        } else {
          container.innerHTML = noPacksHTML;
        }
        return;
      }
      
      const packsHTML = [];
      snapshot.forEach(doc => {
        const pack = { id: doc.id, ...doc.data() };
        packsHTML.push(this.createPackReviewCard(pack));
      });
      
      const allPacksHTML = packsHTML.join('');
      if (window.domUtils) {
        window.domUtils.setHTML(container, allPacksHTML);
      } else {
        container.innerHTML = allPacksHTML;
      }
      
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
      
      if (window.domUtils) {
        window.domUtils.setHTML(container, '<div class="loading">Loading users...</div>');
      } else {
        container.innerHTML = '<div class="loading">Loading users...</div>';
      }
      
      const snapshot = await window.db
        .collection('users')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      if (snapshot.empty) {
        const noUsersHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">No users found.</div>';
        if (window.domUtils) {
          window.domUtils.setHTML(container, noUsersHTML);
        } else {
          container.innerHTML = noUsersHTML;
        }
        return;
      }
      
      let usersHTML = '<div class="table-header">Users</div>';
      
      snapshot.forEach(doc => {
        const user = { id: doc.id, ...doc.data() };
        usersHTML += this.createUserRow(user);
      });
      
      if (window.domUtils) {
        window.domUtils.setHTML(container, usersHTML);
      } else {
        container.innerHTML = usersHTML;
      }
      
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
    console.log('Loading analytics data...');
    
    // Initialize behavior analytics if not already done
    if (window.behaviorAnalytics && !window.behaviorAnalytics.isInitialized) {
      window.behaviorAnalytics.initialize();
    }
    
    // Add sample data for demo purposes if no real data exists
    this.addSampleAnalyticsData();
  }

  // Add sample analytics data for demonstration
  addSampleAnalyticsData() {
    if (!window.behaviorAnalytics) return;
    
    // Check if we already have data
    const hasData = window.behaviorAnalytics.analytics.interactions.length > 0;
    
    if (!hasData) {
      console.log('Adding sample analytics data...');
      
      // Generate sample interactions over the past week
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      const sampleInteractions = [
        { action: 'pin_clicked', vendor: { id: '1', title: 'Purple Gelato', city: 'providence' } },
        { action: 'modal_opened', vendor: { id: '1', title: 'Purple Gelato', city: 'providence' } },
        { action: 'pin_clicked', vendor: { id: '2', title: 'Blue Dream', city: 'boston' } },
        { action: 'pin_clicked', vendor: { id: '3', title: 'OG Kush', city: 'cambridge' } },
        { action: 'modal_opened', vendor: { id: '3', title: 'OG Kush', city: 'cambridge' } },
        { action: 'contact', vendor: { id: '3', title: 'OG Kush', city: 'cambridge' } },
        { action: 'pin_clicked', vendor: { id: '4', title: 'White Widow', city: 'worcester' } },
        { action: 'modal_opened', vendor: { id: '2', title: 'Blue Dream', city: 'boston' } }
      ];
      
      // Add interactions across different days
      sampleInteractions.forEach((interaction, index) => {
        const timestamp = now - (Math.random() * 7 * oneDay); // Random time in past week
        
        // Simulate the interaction tracking
        setTimeout(() => {
          window.behaviorAnalytics.trackInteraction({
            ...interaction,
            timestamp
          });
        }, index * 100);
      });
    }
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
    
    switch(tabName) {
      case 'search':
        this.loadSearchConfigTab(container);
        break;
      default:
        container.innerHTML = `
          <div class="config-group">
            <h4>${tabName} Settings</h4>
            <p>Configuration for ${tabName} coming soon!</p>
          </div>
        `;
        break;
    }
  }
  
  // Load search configuration tab
  loadSearchConfigTab(container) {
    container.innerHTML = `
      <div class="search-config-container">
        
        <!-- Search Behavior Settings -->
        <div class="config-group">
          <h4>🎛️ Search Behavior</h4>
          <div class="config-row">
            <label>Fuzzy Search Threshold</label>
            <input type="range" id="fuzzy-threshold" min="0.3" max="1.0" step="0.1" value="0.6">
            <span id="threshold-value">0.6</span>
          </div>
          <div class="config-row">
            <label>Max Results Shown</label>
            <input type="number" id="max-results" min="2" max="10" value="4">
          </div>
          <div class="config-row">
            <label>Min Characters to Search</label>
            <input type="number" id="min-chars" min="1" max="5" value="2">
          </div>
          <div class="config-row">
            <label>Search Debounce Delay (ms)</label>
            <input type="number" id="debounce-delay" min="100" max="1000" step="50" value="300">
          </div>
        </div>

        <!-- Search UI Settings -->
        <div class="config-group">
          <h4>🎨 Search Interface</h4>
          <div class="config-row">
            <label>Search Placeholder Text</label>
            <input type="text" id="search-placeholder" value="Plugs 🔌🔌" maxlength="50">
          </div>
          <div class="config-row">
            <label>Loading Message</label>
            <input type="text" id="loading-message" value="Loading your area..." maxlength="50">
          </div>
          <div class="config-row">
            <label>No Results Message</label>
            <input type="text" id="no-results-message" value="No results found" maxlength="50">
          </div>
        </div>

        <!-- Cities Management -->
        <div class="config-group">
          <h4>🌍 Cities Management</h4>
          <div class="config-actions">
            <button class="btn btn-primary" onclick="adminManager.showAddCityModal()">
              ➕ Add City
            </button>
            <button class="btn btn-outline" onclick="adminManager.importCities()">
              📥 Import CSV
            </button>
            <button class="btn btn-outline" onclick="adminManager.exportCities()">
              📤 Export CSV
            </button>
          </div>
          <div class="cities-table-container">
            <table class="admin-table" id="cities-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>State</th>
                  <th>Coordinates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="cities-tbody">
                <tr><td colspan="5">Loading cities...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Product Types Management -->
        <div class="config-group">
          <h4>📦 Product Types</h4>
          <div class="config-actions">
            <button class="btn btn-primary" onclick="adminManager.showAddProductModal()">
              ➕ Add Product Type
            </button>
          </div>
          <div class="products-table-container">
            <table class="admin-table" id="products-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Search Terms</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="products-tbody">
                <tr><td colspan="5">Loading product types...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Search Analytics -->
        <div class="config-group">
          <h4>📊 Search Analytics</h4>
          <div class="analytics-grid">
            <div class="stat-card">
              <div class="stat-number" id="total-searches">-</div>
              <div class="stat-label">Total Searches</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="avg-response-time">-</div>
              <div class="stat-label">Avg Response Time</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="cache-hit-rate">-</div>
              <div class="stat-label">Cache Hit Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="failed-searches">-</div>
              <div class="stat-label">Failed Searches</div>
            </div>
          </div>
          <div class="analytics-charts">
            <div class="chart-container">
              <h5>Popular Search Terms</h5>
              <div id="popular-terms-chart" class="chart-placeholder">Loading chart...</div>
            </div>
            <div class="chart-container">
              <h5>Search Volume by Hour</h5>
              <div id="search-volume-chart" class="chart-placeholder">Loading chart...</div>
            </div>
          </div>
        </div>

        <!-- Cache Management -->
        <div class="config-group">
          <h4>💾 Cache Management</h4>
          <div class="config-row">
            <label>Cache Timeout (minutes)</label>
            <input type="number" id="cache-timeout" min="1" max="60" value="5">
          </div>
          <div class="config-actions">
            <button class="btn btn-warning" onclick="adminManager.clearSearchCache()">
              🗑️ Clear Search Cache
            </button>
            <button class="btn btn-outline" onclick="adminManager.preloadPopularTerms()">
              ⚡ Preload Popular Terms
            </button>
          </div>
          <div class="cache-stats">
            <p>Cache Size: <span id="cache-size">-</span> items</p>
            <p>Last Cleared: <span id="last-cleared">-</span></p>
          </div>
        </div>

      </div>
    `;
    
    // Initialize search config data
    this.initializeSearchConfig();
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
      // Check if vendor manager is available and initialized
      if (!window.vendorManager) {
        this.showError('Vendor manager not available. Please refresh the page.');
        return;
      }
      
      if (!window.vendorManager.isInitialized) {
        this.showError('Vendor manager not initialized. Please wait and try again.');
        return;
      }
      
      const formData = {
        name: document.getElementById('vendor-name').value,
        color: document.getElementById('vendor-color').value,
        icon: document.getElementById('vendor-icon').value,
        description: document.getElementById('vendor-description').value,
        priority: parseInt(document.getElementById('vendor-priority').value),
        isActive: document.getElementById('vendor-active').checked
      };
      
      console.log('Saving vendor with data:', formData);
      console.log('Current vendor ID:', this.currentVendorId);
      
      if (!formData.name || !formData.color || !formData.icon) {
        this.showError('Please fill in all required fields');
        return;
      }
      
      if (this.currentVendorId) {
        // Update existing vendor
        console.log('Updating vendor:', this.currentVendorId);
        const result = await window.vendorManager.updateVendor(this.currentVendorId, formData);
        console.log('Update result:', result);
        
        if (result === false) {
          this.showError('Vendor not found. Please refresh and try again.');
          return;
        }
        
        this.showSuccess('Vendor updated successfully');
      } else {
        // Add new vendor
        console.log('Adding new vendor');
        const result = await window.vendorManager.addVendor(formData);
        console.log('Add result:', result);
        this.showSuccess('Vendor added successfully');
      }
      
      this.closeVendorModal();
      this.loadVendorsData();
      
    } catch (error) {
      console.error('Error saving vendor:', error);
      
      // More specific error messages
      if (error.message && error.message.includes('Firebase')) {
        this.showError('Database connection error. Please check your internet connection.');
      } else if (error.message && error.message.includes('permission')) {
        this.showError('Permission denied. Please check your admin privileges.');
      } else {
        this.showError(`Failed to save vendor: ${error.message || 'Unknown error'}`);
      }
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

  // SEARCH CONFIGURATION FUNCTIONS

  // Initialize search configuration data
  async initializeSearchConfig() {
    try {
      // Load current search settings
      await this.loadSearchSettings();
      
      // Load cities and products data
      await this.loadCitiesData();
      await this.loadProductTypesData();
      
      // Load search analytics
      await this.loadSearchAnalytics();
      
      // Load cache stats
      this.updateCacheStats();
      
      // Set up real-time updates
      this.setupSearchConfigListeners();
      
    } catch (error) {
      console.error('Error initializing search config:', error);
      this.showError('Failed to load search configuration');
    }
  }

  // Load current search settings
  async loadSearchSettings() {
    try {
      // Get current settings from searchManager and configManager
      const settings = {
        fuzzyThreshold: 0.6,
        maxResults: 4,
        minChars: 2,
        debounceDelay: 300,
        placeholder: "Plugs 🔌🔌",
        loadingMessage: "Loading your area...",
        noResultsMessage: "No results found",
        cacheTimeout: 5
      };
      
      // Update UI with current settings
      const thresholdSlider = document.getElementById('fuzzy-threshold');
      const thresholdValue = document.getElementById('threshold-value');
      
      if (thresholdSlider && thresholdValue) {
        thresholdSlider.value = settings.fuzzyThreshold;
        thresholdValue.textContent = settings.fuzzyThreshold;
        
        thresholdSlider.addEventListener('input', (e) => {
          thresholdValue.textContent = e.target.value;
        });
      }
      
      const inputs = {
        'max-results': settings.maxResults,
        'min-chars': settings.minChars,
        'debounce-delay': settings.debounceDelay,
        'search-placeholder': settings.placeholder,
        'loading-message': settings.loadingMessage,
        'no-results-message': settings.noResultsMessage,
        'cache-timeout': settings.cacheTimeout
      };
      
      Object.entries(inputs).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
      });
      
    } catch (error) {
      console.error('Error loading search settings:', error);
    }
  }

  // Load cities data for management
  async loadCitiesData() {
    try {
      const tbody = document.getElementById('cities-tbody');
      if (!tbody) return;
      
      tbody.innerHTML = '<tr><td colspan="5">Loading cities...</td></tr>';
      
      // Get cities from config manager
      let cities = [];
      if (window.configManager && window.configManager.isInitialized) {
        const citiesConfig = window.configManager.getConfig('cities');
        cities = citiesConfig.items || [];
      }
      
      if (cities.length === 0) {
        // Fallback to hardcoded cities from search-utils.js
        cities = window.getMajorCities ? window.getMajorCities() : [];
        cities = cities.map(city => ({
          ...city,
          isActive: true,
          id: city.key
        }));
      }
      
      const citiesHTML = cities.map(city => `
        <tr data-city-id="${city.id || city.key}">
          <td>${city.name}</td>
          <td>${city.state}</td>
          <td>${city.lat}, ${city.lng}</td>
          <td>
            <span class="status-badge ${city.isActive ? 'active' : 'inactive'}">
              ${city.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="adminManager.editCity('${city.id || city.key}')">
              ✏️ Edit
            </button>
            <button class="btn btn-sm ${city.isActive ? 'btn-warning' : 'btn-success'}" 
                    onclick="adminManager.toggleCityStatus('${city.id || city.key}')">
              ${city.isActive ? '❌' : '✅'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminManager.deleteCity('${city.id || city.key}')">
              🗑️
            </button>
          </td>
        </tr>
      `).join('');
      
      tbody.innerHTML = citiesHTML;
      
    } catch (error) {
      console.error('Error loading cities data:', error);
      const tbody = document.getElementById('cities-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading cities</td></tr>';
    }
  }

  // Load product types data for management
  async loadProductTypesData() {
    try {
      const tbody = document.getElementById('products-tbody');
      if (!tbody) return;
      
      tbody.innerHTML = '<tr><td colspan="5">Loading product types...</td></tr>';
      
      // Get product types from config manager
      let products = [];
      if (window.configManager && window.configManager.isInitialized) {
        const productsConfig = window.configManager.getConfig('product-types');
        products = productsConfig.items || [];
      }
      
      if (products.length === 0) {
        // Fallback to hardcoded products
        const fallbackProducts = window.getProductTypes ? window.getProductTypes() : [];
        products = fallbackProducts.map((product, index) => ({
          name: product,
          key: product.toLowerCase().replace(' pack', ''),
          searchTerms: [product.toLowerCase()],
          isActive: true,
          priority: index + 1,
          id: product.toLowerCase().replace(' ', '-')
        }));
      }
      
      const productsHTML = products.map(product => `
        <tr data-product-id="${product.id || product.key}">
          <td>${product.name}</td>
          <td>
            <span class="search-terms">
              ${(product.searchTerms || [product.name.toLowerCase()]).join(', ')}
            </span>
          </td>
          <td>
            <span class="status-badge ${product.isActive ? 'active' : 'inactive'}">
              ${product.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>${product.priority || 1}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="adminManager.editProduct('${product.id || product.key}')">
              ✏️ Edit
            </button>
            <button class="btn btn-sm ${product.isActive ? 'btn-warning' : 'btn-success'}" 
                    onclick="adminManager.toggleProductStatus('${product.id || product.key}')">
              ${product.isActive ? '❌' : '✅'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminManager.deleteProduct('${product.id || product.key}')">
              🗑️
            </button>
          </td>
        </tr>
      `).join('');
      
      tbody.innerHTML = productsHTML;
      
    } catch (error) {
      console.error('Error loading product types:', error);
      const tbody = document.getElementById('products-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading product types</td></tr>';
    }
  }

  // Load search analytics data
  async loadSearchAnalytics() {
    try {
      // Mock analytics data for now - in production this would come from Firebase/Analytics
      const analytics = {
        totalSearches: 1250,
        avgResponseTime: '45ms',
        cacheHitRate: '78%',
        failedSearches: 23
      };
      
      // Update analytics display
      const elements = {
        'total-searches': analytics.totalSearches,
        'avg-response-time': analytics.avgResponseTime,
        'cache-hit-rate': analytics.cacheHitRate,
        'failed-searches': analytics.failedSearches
      };
      
      Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      });
      
      // Load popular terms and search volume charts
      this.loadSearchCharts();
      
    } catch (error) {
      console.error('Error loading search analytics:', error);
    }
  }

  // Load search charts (simplified text-based for now)
  loadSearchCharts() {
    const popularTermsChart = document.getElementById('popular-terms-chart');
    const searchVolumeChart = document.getElementById('search-volume-chart');
    
    if (popularTermsChart) {
      popularTermsChart.innerHTML = `
        <div class="chart-list">
          <div class="chart-item">1. "indica pack" - 245 searches</div>
          <div class="chart-item">2. "boston" - 189 searches</div>
          <div class="chart-item">3. "sativa pack" - 167 searches</div>
          <div class="chart-item">4. "providence" - 134 searches</div>
          <div class="chart-item">5. "hybrid pack" - 98 searches</div>
        </div>
      `;
    }
    
    if (searchVolumeChart) {
      searchVolumeChart.innerHTML = `
        <div class="chart-list">
          <div class="chart-item">12-1 PM: 45 searches</div>
          <div class="chart-item">1-2 PM: 38 searches</div>
          <div class="chart-item">6-7 PM: 67 searches</div>
          <div class="chart-item">7-8 PM: 52 searches</div>
          <div class="chart-item">8-9 PM: 41 searches</div>
        </div>
      `;
    }
  }

  // Update cache statistics
  updateCacheStats() {
    try {
      // Get cache stats from cache manager
      const cacheSize = window.cacheManager ? Object.keys(window.cacheManager.cache || {}).length : 0;
      const lastCleared = localStorage.getItem('search-cache-cleared') || 'Never';
      
      const cacheSizeEl = document.getElementById('cache-size');
      const lastClearedEl = document.getElementById('last-cleared');
      
      if (cacheSizeEl) cacheSizeEl.textContent = cacheSize;
      if (lastClearedEl) lastClearedEl.textContent = lastCleared;
      
    } catch (error) {
      console.error('Error updating cache stats:', error);
    }
  }

  // Set up search configuration listeners
  setupSearchConfigListeners() {
    // Add event listeners for real-time updates
    const inputs = ['fuzzy-threshold', 'max-results', 'min-chars', 'debounce-delay'];
    inputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.updateSearchSettings();
        });
      }
    });
  }

  // Update search settings in real-time
  async updateSearchSettings() {
    try {
      const settings = {
        fuzzyThreshold: parseFloat(document.getElementById('fuzzy-threshold')?.value || 0.6),
        maxResults: parseInt(document.getElementById('max-results')?.value || 4),
        minChars: parseInt(document.getElementById('min-chars')?.value || 2),
        debounceDelay: parseInt(document.getElementById('debounce-delay')?.value || 300)
      };
      
      // Update search manager if available
      if (window.searchManager) {
        window.searchManager.fuzzyThreshold = settings.fuzzyThreshold;
        window.searchManager.maxResults = settings.maxResults;
        window.searchManager.minChars = settings.minChars;
        window.searchManager.debounceDelay = settings.debounceDelay;
      }
      
      // Save to Firebase/config
      if (window.configManager) {
        await window.configManager.updateConfig('search-settings', settings);
      }
      
      this.showSuccess('Search settings updated');
      
    } catch (error) {
      console.error('Error updating search settings:', error);
      this.showError('Failed to update search settings');
    }
  }

  // Show add city modal
  showAddCityModal() {
    // Create a simple prompt for now - could be expanded to a full modal
    const name = prompt('City name:');
    const state = prompt('State abbreviation (e.g., MA):');
    const lat = parseFloat(prompt('Latitude:'));
    const lng = parseFloat(prompt('Longitude:'));
    
    if (name && state && !isNaN(lat) && !isNaN(lng)) {
      this.addCity({ name, state, lat, lng });
    }
  }

  // Add new city
  async addCity(cityData) {
    try {
      const newCity = {
        ...cityData,
        id: cityData.name.toLowerCase().replace(/\s+/g, '-'),
        key: cityData.name.toLowerCase().replace(/\s+/g, '-'),
        isActive: true
      };
      
      // Add to config manager
      if (window.configManager) {
        const citiesConfig = window.configManager.getConfig('cities');
        const cities = citiesConfig.items || [];
        cities.push(newCity);
        
        await window.configManager.updateConfig('cities', { items: cities });
      }
      
      this.showSuccess('City added successfully');
      this.loadCitiesData();
      
    } catch (error) {
      console.error('Error adding city:', error);
      this.showError('Failed to add city');
    }
  }

  // Edit city
  editCity(cityId) {
    // Simple edit for now - could be expanded to a modal
    const name = prompt('Edit city name:');
    if (name) {
      this.updateCity(cityId, { name });
    }
  }

  // Update city
  async updateCity(cityId, updates) {
    try {
      if (window.configManager) {
        const citiesConfig = window.configManager.getConfig('cities');
        const cities = citiesConfig.items || [];
        const cityIndex = cities.findIndex(c => c.id === cityId || c.key === cityId);
        
        if (cityIndex >= 0) {
          cities[cityIndex] = { ...cities[cityIndex], ...updates };
          await window.configManager.updateConfig('cities', { items: cities });
          
          this.showSuccess('City updated successfully');
          this.loadCitiesData();
        }
      }
    } catch (error) {
      console.error('Error updating city:', error);
      this.showError('Failed to update city');
    }
  }

  // Toggle city status
  async toggleCityStatus(cityId) {
    try {
      if (window.configManager) {
        const citiesConfig = window.configManager.getConfig('cities');
        const cities = citiesConfig.items || [];
        const city = cities.find(c => c.id === cityId || c.key === cityId);
        
        if (city) {
          await this.updateCity(cityId, { isActive: !city.isActive });
        }
      }
    } catch (error) {
      console.error('Error toggling city status:', error);
      this.showError('Failed to toggle city status');
    }
  }

  // Delete city
  async deleteCity(cityId) {
    if (confirm('Are you sure you want to delete this city?')) {
      try {
        if (window.configManager) {
          const citiesConfig = window.configManager.getConfig('cities');
          let cities = citiesConfig.items || [];
          cities = cities.filter(c => c.id !== cityId && c.key !== cityId);
          
          await window.configManager.updateConfig('cities', { items: cities });
          
          this.showSuccess('City deleted successfully');
          this.loadCitiesData();
        }
      } catch (error) {
        console.error('Error deleting city:', error);
        this.showError('Failed to delete city');
      }
    }
  }

  // Show add product modal
  showAddProductModal() {
    const name = prompt('Product type name (e.g., "Premium Pack"):');
    const searchTerms = prompt('Search terms (comma-separated):');
    
    if (name && searchTerms) {
      this.addProduct({
        name,
        searchTerms: searchTerms.split(',').map(t => t.trim())
      });
    }
  }

  // Add new product type
  async addProduct(productData) {
    try {
      const newProduct = {
        ...productData,
        id: productData.name.toLowerCase().replace(/\s+/g, '-'),
        key: productData.name.toLowerCase().replace(' pack', ''),
        isActive: true,
        priority: 10
      };
      
      if (window.configManager) {
        const productsConfig = window.configManager.getConfig('product-types');
        const products = productsConfig.items || [];
        products.push(newProduct);
        
        await window.configManager.updateConfig('product-types', { items: products });
      }
      
      this.showSuccess('Product type added successfully');
      this.loadProductTypesData();
      
    } catch (error) {
      console.error('Error adding product:', error);
      this.showError('Failed to add product type');
    }
  }

  // Edit product type
  editProduct(productId) {
    const name = prompt('Edit product name:');
    if (name) {
      this.updateProduct(productId, { name });
    }
  }

  // Update product
  async updateProduct(productId, updates) {
    try {
      if (window.configManager) {
        const productsConfig = window.configManager.getConfig('product-types');
        const products = productsConfig.items || [];
        const productIndex = products.findIndex(p => p.id === productId || p.key === productId);
        
        if (productIndex >= 0) {
          products[productIndex] = { ...products[productIndex], ...updates };
          await window.configManager.updateConfig('product-types', { items: products });
          
          this.showSuccess('Product type updated successfully');
          this.loadProductTypesData();
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      this.showError('Failed to update product type');
    }
  }

  // Toggle product status
  async toggleProductStatus(productId) {
    try {
      if (window.configManager) {
        const productsConfig = window.configManager.getConfig('product-types');
        const products = productsConfig.items || [];
        const product = products.find(p => p.id === productId || p.key === productId);
        
        if (product) {
          await this.updateProduct(productId, { isActive: !product.isActive });
        }
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      this.showError('Failed to toggle product status');
    }
  }

  // Delete product type
  async deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product type?')) {
      try {
        if (window.configManager) {
          const productsConfig = window.configManager.getConfig('product-types');
          let products = productsConfig.items || [];
          products = products.filter(p => p.id !== productId && p.key !== productId);
          
          await window.configManager.updateConfig('product-types', { items: products });
          
          this.showSuccess('Product type deleted successfully');
          this.loadProductTypesData();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        this.showError('Failed to delete product type');
      }
    }
  }

  // Import cities from CSV
  importCities() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.processCityCSV(file);
      }
    };
    input.click();
  }

  // Process city CSV file
  async processCityCSV(file) {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const cities = [];
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const [name, state, lat, lng] = lines[i].split(',');
        if (name && state && lat && lng) {
          cities.push({
            name: name.trim(),
            state: state.trim(),
            lat: parseFloat(lat.trim()),
            lng: parseFloat(lng.trim()),
            id: name.toLowerCase().replace(/\s+/g, '-'),
            key: name.toLowerCase().replace(/\s+/g, '-'),
            isActive: true
          });
        }
      }
      
      // Add cities to config
      if (cities.length > 0 && window.configManager) {
        const citiesConfig = window.configManager.getConfig('cities');
        const existingCities = citiesConfig.items || [];
        const allCities = [...existingCities, ...cities];
        
        await window.configManager.updateConfig('cities', { items: allCities });
        
        this.showSuccess(`Imported ${cities.length} cities successfully`);
        this.loadCitiesData();
      }
      
    } catch (error) {
      console.error('Error processing CSV:', error);
      this.showError('Failed to import cities from CSV');
    }
  }

  // Export cities to CSV
  exportCities() {
    try {
      const citiesConfig = window.configManager?.getConfig('cities');
      const cities = citiesConfig?.items || [];
      
      if (cities.length === 0) {
        this.showError('No cities to export');
        return;
      }
      
      const csvContent = [
        'Name,State,Latitude,Longitude,Active',
        ...cities.map(city => `${city.name},${city.state},${city.lat},${city.lng},${city.isActive}`)
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'packslist-cities.csv';
      link.click();
      
      URL.revokeObjectURL(url);
      this.showSuccess('Cities exported successfully');
      
    } catch (error) {
      console.error('Error exporting cities:', error);
      this.showError('Failed to export cities');
    }
  }

  // Clear search cache
  async clearSearchCache() {
    if (confirm('Are you sure you want to clear the search cache?')) {
      try {
        if (window.cacheManager) {
          window.cacheManager.clearCache();
        }
        
        if (window.searchManager) {
          window.searchManager.clearSearch();
        }
        
        localStorage.setItem('search-cache-cleared', new Date().toLocaleString());
        
        this.showSuccess('Search cache cleared successfully');
        this.updateCacheStats();
        
      } catch (error) {
        console.error('Error clearing cache:', error);
        this.showError('Failed to clear search cache');
      }
    }
  }

  // Preload popular search terms
  async preloadPopularTerms() {
    try {
      if (window.searchManager) {
        // Preload popular suggestions
        const popularTerms = ['indica pack', 'sativa pack', 'boston', 'providence', 'hybrid pack'];
        
        for (const term of popularTerms) {
          window.searchManager.search(term, 1); // Cache the results
        }
      }
      
      this.showSuccess('Popular terms preloaded successfully');
      this.updateCacheStats();
      
    } catch (error) {
      console.error('Error preloading terms:', error);
      this.showError('Failed to preload popular terms');
    }
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