// Dashboard Manager for PacksList Admin Panel
// Handles dashboard metrics, statistics, and activity feeds

class DashboardManager {
  constructor() {
    this.stats = {};
    this.activityFeed = [];
    this.realtimeListeners = [];
    this.updateInterval = null;
    this.isInitialized = false;
  }

  // Initialize dashboard
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing dashboard manager');
    }

    try {
      await this.loadDashboardData();
      this.setupRealtimeUpdates();
      this.startAutoRefresh();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Dashboard manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Dashboard Initialization');
      }
    }
  }

  // Load all dashboard data
  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadStats(),
        this.loadActivityFeed(),
        this.loadQuickStats()
      ]);

      this.updateUI();
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Dashboard Data Loading');
      }
    }
  }

  // Load dashboard statistics
  async loadStats() {
    if (!firebase?.firestore) {
      if (window.errorHandler) {
        window.errorHandler.warn('Firebase not available for stats loading');
      }
      return;
    }

    try {
      const db = firebase.firestore();
      
      // Get total packs
      const packsSnapshot = await db.collection('posts').get();
      const totalPacks = packsSnapshot.size;
      
      // Get pending packs
      const pendingSnapshot = await db.collection('posts')
        .where('status', '==', 'pending')
        .get();
      const pendingPacks = pendingSnapshot.size;
      
      // Get total users
      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;
      
      // Get flagged content
      const flaggedSnapshot = await db.collection('posts')
        .where('status', '==', 'flagged')
        .get();
      const flaggedContent = flaggedSnapshot.size;
      
      // Calculate today's changes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayPacksSnapshot = await db.collection('posts')
        .where('createdAt', '>=', today)
        .get();
      const packsToday = todayPacksSnapshot.size;
      
      const todayUsersSnapshot = await db.collection('users')
        .where('createdAt', '>=', today)
        .get();
      const usersToday = todayUsersSnapshot.size;

      this.stats = {
        totalPacks,
        pendingPacks,
        totalUsers,
        flaggedContent,
        packsToday,
        usersToday,
        lastUpdated: new Date().toISOString()
      };

      if (window.errorHandler) {
        window.errorHandler.debug('Stats loaded successfully', this.stats);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Stats Loading');
      }
    }
  }

  // Load activity feed
  async loadActivityFeed() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();
      
      // Get recent activities from audit logs
      const activitiesSnapshot = await db.collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
      
      this.activityFeed = [];
      activitiesSnapshot.forEach(doc => {
        const activity = { id: doc.id, ...doc.data() };
        if (activity.timestamp) {
          activity.timestamp = activity.timestamp.toDate();
        }
        this.activityFeed.push(activity);
      });

      if (window.errorHandler) {
        window.errorHandler.debug(`Loaded ${this.activityFeed.length} activity items`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Activity Feed Loading');
      }
    }
  }

  // Load quick stats for sidebar
  async loadQuickStats() {
    try {
      const pendingCount = this.stats.pendingPacks || 0;
      const usersCount = this.stats.totalUsers || 0;

      // Update sidebar quick stats
      const pendingElement = document.getElementById('pending-count');
      const usersElement = document.getElementById('users-count');

      if (pendingElement && window.domUtils) {
        window.domUtils.setText(pendingElement, pendingCount);
      }

      if (usersElement && window.domUtils) {
        window.domUtils.setText(usersElement, usersCount);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Quick Stats Update');
      }
    }
  }

  // Update dashboard UI
  updateUI() {
    this.updateMetricCards();
    this.updateActivityFeed();
    this.updateQuickActions();
  }

  // Update metric cards
  updateMetricCards() {
    const metrics = [
      { id: 'total-packs', value: this.stats.totalPacks || 0, change: this.stats.packsToday || 0 },
      { id: 'pending-packs', value: this.stats.pendingPacks || 0, changeText: 'Needs attention' },
      { id: 'total-users', value: this.stats.totalUsers || 0, change: this.stats.usersToday || 0 },
      { id: 'flagged-content', value: this.stats.flaggedContent || 0, changeText: '0 unresolved' }
    ];

    metrics.forEach(metric => {
      const valueElement = document.getElementById(metric.id);
      const changeElement = document.getElementById(`${metric.id.replace('total-', '').replace('pending-', '')}-change`);

      if (valueElement && window.domUtils) {
        window.domUtils.setText(valueElement, metric.value);
      }

      if (changeElement && window.domUtils) {
        const changeText = metric.changeText || `+${metric.change} today`;
        window.domUtils.setText(changeElement, changeText);
      }
    });
  }

  // Update activity feed UI
  updateActivityFeed() {
    const feedElement = document.getElementById('activity-feed');
    if (!feedElement || !window.domUtils) return;

    if (this.activityFeed.length === 0) {
      window.domUtils.setText(feedElement, 'No recent activity');
      return;
    }

    const activitiesHTML = this.activityFeed.map(activity => {
      const timeAgo = this.getTimeAgo(activity.timestamp);
      const icon = this.getActivityIcon(activity.action);
      const message = this.formatActivityMessage(activity);

      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">${window.domUtils ? window.domUtils.escapeHTML(message) : message}</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

    window.domUtils.setHTML(feedElement, activitiesHTML);
  }

  // Update quick actions
  updateQuickActions() {
    const quickPendingElement = document.getElementById('quick-pending-count');
    if (quickPendingElement && window.domUtils) {
      const count = this.stats.pendingPacks || 0;
      const text = count === 1 ? '1 pack waiting' : `${count} packs waiting`;
      window.domUtils.setText(quickPendingElement, text);
    }
  }

  // Get activity icon based on action
  getActivityIcon(action) {
    const icons = {
      'pack_approved': '✅',
      'pack_rejected': '❌',
      'pack_flagged': '🚩',
      'user_registered': '👤',
      'admin_action': '⚙️',
      'system_alert': '🔔',
      'login': '🔐',
      'logout': '🚪',
      'default': '📋'
    };

    return icons[action] || icons.default;
  }

  // Format activity message
  formatActivityMessage(activity) {
    const templates = {
      'pack_approved': `Pack "${activity.data?.packTitle || 'Unknown'}" was approved`,
      'pack_rejected': `Pack "${activity.data?.packTitle || 'Unknown'}" was rejected`,
      'pack_flagged': `Pack "${activity.data?.packTitle || 'Unknown'}" was flagged`,
      'user_registered': `New user registered: ${activity.data?.userEmail || 'Unknown'}`,
      'admin_action': activity.message || 'Admin action performed',
      'system_alert': activity.message || 'System alert',
      'login': `User logged in: ${activity.data?.userEmail || 'Unknown'}`,
      'logout': `User logged out: ${activity.data?.userEmail || 'Unknown'}`
    };

    return templates[activity.action] || activity.message || 'Unknown activity';
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

  // Setup realtime updates
  setupRealtimeUpdates() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();

      // Listen for pack changes
      const packsListener = db.collection('posts')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              this.handlePackChange(change.doc.data(), change.type);
            }
          });
        });

      // Listen for user changes
      const usersListener = db.collection('users')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              this.handleUserChange(change.doc.data(), change.type);
            }
          });
        });

      this.realtimeListeners.push(packsListener, usersListener);

      if (window.errorHandler) {
        window.errorHandler.debug('Realtime listeners setup successfully');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Realtime Updates Setup');
      }
    }
  }

  // Handle pack changes
  handlePackChange(pack, changeType) {
    if (changeType === 'added') {
      this.stats.totalPacks = (this.stats.totalPacks || 0) + 1;
      if (pack.status === 'pending') {
        this.stats.pendingPacks = (this.stats.pendingPacks || 0) + 1;
      }
    }

    // Update UI
    this.updateMetricCards();
    this.updateQuickActions();

    // Add to activity feed
    this.addActivityItem({
      action: `pack_${changeType}`,
      message: `Pack "${pack.title}" was ${changeType}`,
      data: { packTitle: pack.title, packId: pack.id },
      timestamp: new Date()
    });
  }

  // Handle user changes
  handleUserChange(user, changeType) {
    if (changeType === 'added') {
      this.stats.totalUsers = (this.stats.totalUsers || 0) + 1;
      
      // Update UI
      this.updateMetricCards();

      // Add to activity feed
      this.addActivityItem({
        action: 'user_registered',
        message: `New user registered: ${user.email}`,
        data: { userEmail: user.email, userId: user.id },
        timestamp: new Date()
      });
    }
  }

  // Add activity item
  addActivityItem(activity) {
    this.activityFeed.unshift(activity);
    
    // Limit activity feed size
    if (this.activityFeed.length > 50) {
      this.activityFeed = this.activityFeed.slice(0, 50);
    }

    // Update activity feed UI
    this.updateActivityFeed();
  }

  // Start auto refresh
  startAutoRefresh() {
    // Refresh every 5 minutes
    this.updateInterval = setInterval(() => {
      this.refreshData();
    }, 5 * 60 * 1000);

    if (window.errorHandler) {
      window.errorHandler.debug('Auto-refresh started (5 minute interval)');
    }
  }

  // Refresh dashboard data
  async refreshData() {
    try {
      await this.loadDashboardData();
      
      if (window.errorHandler) {
        window.errorHandler.debug('Dashboard data refreshed');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Dashboard Refresh');
      }
    }
  }

  // Show dashboard section
  showSection() {
    const section = document.getElementById('dashboard-section');
    if (section) {
      section.classList.add('active');
    }

    // Refresh data when showing
    this.refreshData();
  }

  // Hide dashboard section
  hideSection() {
    const section = document.getElementById('dashboard-section');
    if (section) {
      section.classList.remove('active');
    }
  }

  // Cleanup
  destroy() {
    // Clear auto refresh
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Remove realtime listeners
    this.realtimeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.realtimeListeners = [];

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Dashboard manager destroyed');
    }
  }

  // Get dashboard statistics
  getStats() {
    return { ...this.stats };
  }

  // Get activity feed
  getActivityFeed() {
    return [...this.activityFeed];
  }
}

// Export for use by AdminManager
if (typeof window !== 'undefined') {
  window.DashboardManager = DashboardManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardManager;
}