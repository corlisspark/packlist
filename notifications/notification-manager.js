// Real-time Notification Manager for PacksList
// Handles all user notifications, pack status updates, and system alerts

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.isInitialized = false;
    this.unreadCount = 0;
    this.maxNotifications = 100;
    this.notificationTimeout = 5000; // 5 seconds
    
    // Notification types
    this.types = {
      PACK_APPROVED: 'pack_approved',
      PACK_REJECTED: 'pack_rejected',
      PACK_FLAGGED: 'pack_flagged',
      MESSAGE_RECEIVED: 'message_received',
      SYSTEM_ALERT: 'system_alert',
      ADMIN_ACTION: 'admin_action'
    };
    
    // Initialize when auth is ready
    this.initializeWhenReady();
  }

  // Wait for auth manager and initialize
  async initializeWhenReady() {
    if (window.authManager) {
      this.initialize();
    } else {
      setTimeout(() => this.initializeWhenReady(), 100);
    }
  }

  // Initialize notification system
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing notification manager...');
    
    // Create notification UI
    this.createNotificationUI();
    
    // Set up auth listener
    window.authManager.addAuthListener((event, data) => {
      this.handleAuthEvent(event, data);
    });
    
    // Initialize for current user if authenticated
    if (window.authManager.isAuthenticated) {
      await this.setupUserNotifications();
    }
    
    this.isInitialized = true;
    console.log('Notification manager initialized');
  }

  // Handle authentication events
  handleAuthEvent(event, data) {
    switch (event) {
      case 'authenticated':
        this.setupUserNotifications();
        break;
      case 'unauthenticated':
        this.clearUserNotifications();
        break;
    }
  }

  // Set up notifications for authenticated user
  async setupUserNotifications() {
    if (!window.authManager.currentUser) return;
    
    console.log('Setting up user notifications...');
    
    // Load existing notifications
    await this.loadUserNotifications();
    
    // Set up real-time listener
    this.setupRealTimeListener();
    
    // Listen for pack status changes
    this.setupPackStatusListener();
  }

  // Load existing notifications from Firestore
  async loadUserNotifications() {
    if (!window.authManager.currentUser) return;
    
    try {
      const snapshot = await firebase.firestore()
        .collection('notifications')
        .where('userId', '==', window.authManager.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      this.notifications = [];
      snapshot.forEach(doc => {
        const notification = { id: doc.id, ...doc.data() };
        if (notification.createdAt) {
          notification.createdAt = notification.createdAt.toDate();
        }
        this.notifications.push(notification);
      });
      
      this.updateNotificationCount();
      this.updateNotificationUI();
      
      console.log(`Loaded ${this.notifications.length} notifications`);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Set up real-time notification listener
  setupRealTimeListener() {
    if (!window.authManager.currentUser) return;
    
    const unsubscribe = firebase.firestore()
      .collection('notifications')
      .where('userId', '==', window.authManager.currentUser.uid)
      .where('createdAt', '>', new Date())
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() };
            if (notification.createdAt) {
              notification.createdAt = notification.createdAt.toDate();
            }
            this.addNotification(notification);
          }
        });
      }, (error) => {
        console.error('Error in notification listener:', error);
      });
    
    this.listeners.push(unsubscribe);
  }

  // Set up pack status change listener
  setupPackStatusListener() {
    if (!window.authManager.currentUser) return;
    
    const unsubscribe = firebase.firestore()
      .collection('posts')
      .where('userId', '==', window.authManager.currentUser.uid)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const pack = { id: change.doc.id, ...change.doc.data() };
            this.handlePackStatusChange(pack);
          }
        });
      }, (error) => {
        console.error('Error in pack status listener:', error);
      });
    
    this.listeners.push(unsubscribe);
  }

  // Handle pack status changes
  handlePackStatusChange(pack) {
    const status = pack.status;
    let message = '';
    let type = '';
    
    switch (status) {
      case 'approved':
        message = `Your pack "${pack.title}" has been approved and is now live!`;
        type = this.types.PACK_APPROVED;
        break;
      case 'rejected':
        const reason = pack.rejectionReason || 'No reason provided';
        message = `Your pack "${pack.title}" was rejected. Reason: ${reason}`;
        type = this.types.PACK_REJECTED;
        break;
      case 'flagged':
        message = `Your pack "${pack.title}" has been flagged for review.`;
        type = this.types.PACK_FLAGGED;
        break;
      default:
        return; // Don't notify for other status changes
    }
    
    // Show toast notification
    this.showToast(message, status === 'approved' ? 'success' : 'warning');
    
    // Create persistent notification
    this.createNotification({
      type,
      title: `Pack ${status}`,
      message,
      packId: pack.id,
      packTitle: pack.title,
      metadata: {
        packStatus: status,
        rejectionReason: pack.rejectionReason
      }
    });
  }

  // Add new notification
  addNotification(notification) {
    // Add to beginning of array
    this.notifications.unshift(notification);
    
    // Limit total notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }
    
    // Update UI
    this.updateNotificationCount();
    this.updateNotificationUI();
    
    // Show toast for new notifications
    if (!notification.read) {
      this.showToast(notification.message, this.getToastType(notification.type));
    }
  }

  // Create and store new notification
  async createNotification(notificationData) {
    if (!window.authManager.currentUser) return;
    
    try {
      const notification = {
        userId: window.authManager.currentUser.uid,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...notificationData
      };
      
      await firebase.firestore().collection('notifications').add(notification);
      
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await firebase.firestore()
        .collection('notifications')
        .doc(notificationId)
        .update({
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      // Update local notification
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        notification.readAt = new Date();
        this.updateNotificationCount();
        this.updateNotificationUI();
      }
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const batch = firebase.firestore().batch();
      const unreadNotifications = this.notifications.filter(n => !n.read);
      
      unreadNotifications.forEach(notification => {
        const docRef = firebase.firestore().collection('notifications').doc(notification.id);
        batch.update(docRef, {
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        notification.read = true;
        notification.readAt = new Date();
      });
      
      await batch.commit();
      
      this.updateNotificationCount();
      this.updateNotificationUI();
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await firebase.firestore()
        .collection('notifications')
        .doc(notificationId)
        .delete();
      
      // Remove from local array
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.updateNotificationCount();
      this.updateNotificationUI();
      
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  // Create notification UI
  createNotificationUI() {
    // Bell icon removed from header design
    // const userInfo = document.querySelector('.user-info');
    // Bell creation code disabled
    
    // Create notification panel
    if (!document.getElementById('notification-panel')) {
      const panel = document.createElement('div');
      panel.id = 'notification-panel';
      panel.className = 'notification-panel';
      panel.innerHTML = `
        <div class="notification-header">
          <h3>Notifications</h3>
          <div class="notification-actions">
            <button class="btn-link" onclick="notificationManager.markAllAsRead()">Mark all read</button>
            <button class="btn-close" onclick="notificationManager.toggleNotificationPanel()">✕</button>
          </div>
        </div>
        <div class="notification-list" id="notification-list">
          <div class="no-notifications">No notifications yet</div>
        </div>
      `;
      document.body.appendChild(panel);
    }
    
    // Create toast container
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Add CSS
    this.addNotificationCSS();
  }

  // Add notification CSS
  addNotificationCSS() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-bell {
        position: relative;
        margin-left: 16px;
      }
      
      .bell-icon {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        position: relative;
        padding: 8px;
        border-radius: 50%;
        transition: background 0.2s ease;
      }
      
      .bell-icon:hover {
        background: rgba(0,0,0,0.1);
      }
      
      .notification-count {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #e74c3c;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        min-width: 16px;
        text-align: center;
      }
      
      .notification-panel {
        position: absolute;
        top: 60px;
        right: 20px;
        width: 350px;
        max-height: 500px;
        background: white;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        z-index: 1000;
        display: none;
      }
      
      .notification-panel.active {
        display: block;
      }
      
      .notification-header {
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .notification-header h3 {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
      }
      
      .notification-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      
      .btn-link {
        background: none;
        border: none;
        color: #4CAF50;
        cursor: pointer;
        font-size: 12px;
        text-decoration: underline;
      }
      
      .btn-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #6c757d;
        padding: 4px;
      }
      
      .notification-list {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .notification-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .notification-item:hover {
        background: #f8f9fa;
      }
      
      .notification-item.unread {
        background: #e8f5e8;
        border-left: 4px solid #4CAF50;
      }
      
      .notification-item:last-child {
        border-bottom: none;
      }
      
      .notification-title {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      .notification-message {
        color: #6c757d;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 4px;
      }
      
      .notification-time {
        color: #95a5a6;
        font-size: 11px;
      }
      
      .notification-delete {
        float: right;
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        font-size: 12px;
        padding: 2px;
      }
      
      .no-notifications {
        padding: 40px 20px;
        text-align: center;
        color: #6c757d;
        font-style: italic;
      }
      
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        max-width: 400px;
      }
      
      .toast {
        background: white;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid #4CAF50;
        animation: toastSlideIn 0.3s ease-out;
        cursor: pointer;
      }
      
      .toast.warning {
        border-left-color: #ffc107;
      }
      
      .toast.error {
        border-left-color: #e74c3c;
      }
      
      .toast.info {
        border-left-color: #17a2b8;
      }
      
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @media (max-width: 480px) {
        .notification-panel {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
        }
        
        .toast-container {
          left: 20px;
          right: 20px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Toggle notification panel
  toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (panel) {
      panel.classList.toggle('active');
      
      // Mark notifications as read when panel is opened
      if (panel.classList.contains('active')) {
        setTimeout(() => {
          this.markAllAsRead();
        }, 1000);
      }
    }
  }

  // Update notification count
  updateNotificationCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    
    const countElement = document.getElementById('notification-count');
    if (countElement) {
      if (this.unreadCount > 0) {
        countElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        countElement.style.display = 'block';
      } else {
        countElement.style.display = 'none';
      }
    }
  }

  // Update notification UI
  updateNotificationUI() {
    const listElement = document.getElementById('notification-list');
    if (!listElement) return;
    
    if (this.notifications.length === 0) {
      listElement.innerHTML = '<div class="no-notifications">No notifications yet</div>';
      return;
    }
    
    const notificationsHtml = this.notifications.map(notification => `
      <div class="notification-item ${notification.read ? '' : 'unread'}" 
           onclick="notificationManager.handleNotificationClick('${notification.id}')">
        <button class="notification-delete" onclick="event.stopPropagation(); notificationManager.deleteNotification('${notification.id}')">
          ✕
        </button>
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${this.formatTime(notification.createdAt)}</div>
      </div>
    `).join('');
    
    listElement.innerHTML = notificationsHtml;
  }

  // Handle notification click
  handleNotificationClick(notificationId) {
    this.markAsRead(notificationId);
    
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.packId) {
      // Navigate to pack or relevant page
      if (notification.type === this.types.PACK_APPROVED) {
        window.location.href = 'index.html'; // Go to map to see approved pack
      } else if (notification.type === this.types.PACK_REJECTED) {
        window.location.href = 'account.html'; // Go to account to see packs
      }
    }
    
    this.toggleNotificationPanel();
  }

  // Show toast notification
  showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Auto-remove after timeout
    toast.onclick = () => toast.remove();
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, this.notificationTimeout);
  }

  // Get toast type from notification type
  getToastType(notificationType) {
    switch (notificationType) {
      case this.types.PACK_APPROVED:
        return 'success';
      case this.types.PACK_REJECTED:
      case this.types.PACK_FLAGGED:
        return 'warning';
      case this.types.SYSTEM_ALERT:
        return 'error';
      default:
        return 'info';
    }
  }

  // Format time for display
  formatTime(date) {
    if (!date) return '';
    
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

  // Clear user notifications
  clearUserNotifications() {
    // Remove listeners
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = [];
    
    // Clear notifications
    this.notifications = [];
    this.unreadCount = 0;
    
    // Update UI
    this.updateNotificationCount();
    this.updateNotificationUI();
    
    console.log('User notifications cleared');
  }

  // Send admin notification
  async sendAdminNotification(title, message, type = 'admin_action') {
    try {
      // Get all admin users
      const adminsSnapshot = await firebase.firestore()
        .collection('users')
        .where('role', 'in', ['admin', 'super_admin'])
        .get();
      
      const batch = firebase.firestore().batch();
      
      adminsSnapshot.forEach(doc => {
        const notificationRef = firebase.firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          userId: doc.id,
          type,
          title,
          message,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('Admin notification sent');
      
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Cleanup
  destroy() {
    this.clearUserNotifications();
    
    // Remove UI elements
    const bell = document.getElementById('notification-bell');
    const panel = document.getElementById('notification-panel');
    const toastContainer = document.getElementById('toast-container');
    const styles = document.getElementById('notification-styles');
    
    [bell, panel, toastContainer, styles].forEach(el => {
      if (el) el.remove();
    });
    
    console.log('Notification manager destroyed');
  }
}

// Global instance
window.notificationManager = new NotificationManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}