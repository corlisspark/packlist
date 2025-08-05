// User Manager for PacksList Admin Panel
// Handles user management, roles, and user-related admin operations

class UserManager {
  constructor() {
    this.allUsers = [];
    this.filteredUsers = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.realtimeListener = null;
    this.isInitialized = false;
  }

  // Initialize user manager
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing user manager');
    }

    try {
      await this.loadUsers();
      this.setupRealtimeListener();
      this.setupEventListeners();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('User manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Manager Initialization');
      }
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Search input handler
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.filterUsers();
      });
    }

    // Role filter handler
    const roleFilter = document.getElementById('user-role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.filterUsers();
      });
    }
  }

  // Load all users
  async loadUsers() {
    if (!firebase?.firestore) {
      if (window.errorHandler) {
        window.errorHandler.warn('Firebase not available for user loading');
      }
      return;
    }

    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('users')
        .orderBy('createdAt', 'desc')
        .get();

      this.allUsers = [];
      snapshot.forEach(doc => {
        const user = { id: doc.id, ...doc.data() };
        if (user.createdAt) {
          user.createdAt = user.createdAt.toDate();
        }
        if (user.lastLoginAt) {
          user.lastLoginAt = user.lastLoginAt.toDate();
        }
        this.allUsers.push(user);
      });

      this.filterUsers();

      if (window.errorHandler) {
        window.errorHandler.debug(`Loaded ${this.allUsers.length} users`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'User Loading');
      }
    }
  }

  // Filter users based on search and role
  filterUsers() {
    this.filteredUsers = this.allUsers.filter(user => {
      // Apply search filter
      const matchesSearch = !this.searchQuery || 
        user.email?.toLowerCase().includes(this.searchQuery) ||
        user.displayName?.toLowerCase().includes(this.searchQuery) ||
        user.firstName?.toLowerCase().includes(this.searchQuery) ||
        user.lastName?.toLowerCase().includes(this.searchQuery);

      // Apply role filter
      const matchesRole = this.currentFilter === 'all' || 
        user.role === this.currentFilter ||
        (this.currentFilter === 'banned' && user.banned);

      return matchesSearch && matchesRole;
    });

    this.updateUserDisplay();
  }

  // Update user display in UI
  updateUserDisplay() {
    const tableElement = document.getElementById('users-table');
    if (!tableElement || !window.domUtils) return;

    if (this.filteredUsers.length === 0) {
      const message = this.searchQuery ? 
        'No users match your search criteria' : 
        'No users found';
      
      window.domUtils.setText(tableElement, message);
      return;
    }

    const tableHTML = `
      <table class="users-data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredUsers.map(user => this.createUserRow(user)).join('')}
        </tbody>
      </table>
    `;

    window.domUtils.setHTML(tableElement, tableHTML);
  }

  // Create user table row
  createUserRow(user) {
    const safeEmail = window.domUtils ? window.domUtils.escapeHTML(user.email || 'No email') : (user.email || 'No email');
    const safeName = window.domUtils ? window.domUtils.escapeHTML(user.displayName || user.firstName || 'No name') : (user.displayName || user.firstName || 'No name');
    
    const joinDate = user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown';
    const lastLogin = user.lastLoginAt ? this.getTimeAgo(user.lastLoginAt) : 'Never';
    
    const roleClass = this.getRoleClass(user.role);
    const statusClass = this.getStatusClass(user);
    const statusText = this.getStatusText(user);

    return `
      <tr class="user-row" data-user-id="${user.id}">
        <td class="user-info">
          <div class="user-avatar">
            ${user.photoURL ? 
              `<img src="${user.photoURL}" alt="${safeName}" class="avatar-img">` : 
              `<div class="avatar-placeholder">${safeName.charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div class="user-details">
            <div class="user-name">${safeName}</div>
            ${user.firstName && user.lastName ? 
              `<div class="user-full-name">${window.domUtils.escapeHTML(`${user.firstName} ${user.lastName}`)}</div>` : 
              ''
            }
          </div>
        </td>
        <td class="user-email">${safeEmail}</td>
        <td class="user-role">
          <span class="role-badge ${roleClass}">${user.role || 'user'}</span>
        </td>
        <td class="user-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="user-joined">${joinDate}</td>
        <td class="user-last-login">${lastLogin}</td>
        <td class="user-actions">
          <button class="btn btn-sm btn-outline" onclick="userManager.viewUserDetails('${user.id}')">
            👁️ View
          </button>
          ${user.role !== 'admin' ? `
            <button class="btn btn-sm btn-primary" onclick="userManager.editUserRole('${user.id}')">
              👤 Role
            </button>
          ` : ''}
          ${!user.banned ? `
            <button class="btn btn-sm btn-warning" onclick="userManager.banUser('${user.id}')">
              🚫 Ban
            </button>
          ` : `
            <button class="btn btn-sm btn-success" onclick="userManager.unbanUser('${user.id}')">
              ✅ Unban
            </button>
          `}
        </td>
      </tr>
    `;
  }

  // Get role CSS class
  getRoleClass(role) {
    const classes = {
      admin: 'role-admin',
      moderator: 'role-moderator',
      user: 'role-user',
      guest: 'role-guest'
    };
    return classes[role] || classes.user;
  }

  // Get status CSS class
  getStatusClass(user) {
    if (user.banned) return 'status-banned';
    if (user.emailVerified === false) return 'status-unverified';
    return 'status-active';
  }

  // Get status text
  getStatusText(user) {
    if (user.banned) return 'Banned';
    if (user.emailVerified === false) return 'Unverified';
    return 'Active';
  }

  // Get time ago string
  getTimeAgo(date) {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;

    return date.toLocaleDateString();
  }

  // View user details
  viewUserDetails(userId) {
    const user = this.allUsers.find(u => u.id === userId);
    if (!user) return;

    const details = `
      <div class="user-details-modal">
        <div class="user-detail-section">
          <h4>Basic Information</h4>
          <p><strong>Name:</strong> ${user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
          <p><strong>Role:</strong> ${user.role || 'user'}</p>
        </div>
        
        <div class="user-detail-section">
          <h4>Account Status</h4>
          <p><strong>Status:</strong> ${this.getStatusText(user)}</p>
          <p><strong>Email Verified:</strong> ${user.emailVerified ? 'Yes' : 'No'}</p>
          <p><strong>Account Created:</strong> ${user.createdAt ? user.createdAt.toLocaleString() : 'Unknown'}</p>
          <p><strong>Last Login:</strong> ${user.lastLoginAt ? user.lastLoginAt.toLocaleString() : 'Never'}</p>
        </div>
        
        <div class="user-detail-section">
          <h4>Activity Statistics</h4>
          <p><strong>Total Posts:</strong> ${user.postCount || 0}</p>
          <p><strong>Approved Posts:</strong> ${user.approvedPostCount || 0}</p>
          <p><strong>Rejected Posts:</strong> ${user.rejectedPostCount || 0}</p>
        </div>
        
        ${user.bio ? `
          <div class="user-detail-section">
            <h4>Bio</h4>
            <p>${window.domUtils ? window.domUtils.escapeHTML(user.bio) : user.bio}</p>
          </div>
        ` : ''}
      </div>
    `;

    if (window.errorHandler && window.errorHandler.showModal) {
      window.errorHandler.showModal('User Details', details);
    }
  }

  // Edit user role
  async editUserRole(userId) {
    const user = this.allUsers.find(u => u.id === userId);
    if (!user) return;

    try {
      const roles = ['user', 'moderator', 'admin'];
      const currentRole = user.role || 'user';
      
      // Create role selection dialog
      const roleOptions = roles.map(role => 
        `<option value="${role}" ${role === currentRole ? 'selected' : ''}>${role}</option>`
      ).join('');

      const content = `
        <div class="role-edit-form">
          <p>Current role: <strong>${currentRole}</strong></p>
          <p>Select new role for ${user.email}:</p>
          <select id="new-role-select" class="form-control">
            ${roleOptions}
          </select>
        </div>
      `;

      if (window.errorHandler && window.errorHandler.showModal) {
        const modal = window.errorHandler.showModal('Edit User Role', content, {
          confirmText: 'Update Role',
          onConfirm: async () => {
            const newRole = document.getElementById('new-role-select')?.value;
            if (newRole && newRole !== currentRole) {
              await this.updateUserRole(userId, newRole);
            }
          }
        });
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Role Edit Dialog');
      }
    }
  }

  // Update user role in database
  async updateUserRole(userId, newRole) {
    try {
      if (!firebase?.firestore) {
        throw new Error('Firebase not available');
      }

      const db = firebase.firestore();
      
      await db.collection('users').doc(userId).update({
        role: newRole,
        roleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        roleUpdatedBy: window.authManager?.currentUser?.email || 'Unknown'
      });

      // Log the action
      await this.logUserAction(userId, 'role_updated', { 
        newRole, 
        oldRole: this.allUsers.find(u => u.id === userId)?.role 
      });

      // Update local data
      const user = this.allUsers.find(u => u.id === userId);
      if (user) {
        user.role = newRole;
      }

      this.filterUsers();
      
      if (window.errorHandler) {
        window.errorHandler.info(`User role updated to ${newRole}`);
      }
      
      this.showToast(`User role updated to ${newRole}`, 'success');

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Role Update');
      }
      this.showToast('Failed to update user role', 'error');
    }
  }

  // Ban user
  async banUser(userId) {
    try {
      const user = this.allUsers.find(u => u.id === userId);
      if (!user) return;

      const reason = await this.showBanDialog(user.email);
      if (!reason) return;

      await this.updateUserBanStatus(userId, true, reason);
      
      if (window.errorHandler) {
        window.errorHandler.info(`User ${user.email} banned`);
      }
      
      this.showToast('User banned successfully', 'warning');

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Ban');
      }
      this.showToast('Failed to ban user', 'error');
    }
  }

  // Unban user
  async unbanUser(userId) {
    try {
      const user = this.allUsers.find(u => u.id === userId);
      if (!user) return;

      const confirmed = await this.showConfirmation(
        'Unban User',
        `Are you sure you want to unban ${user.email}?`
      );

      if (!confirmed) return;

      await this.updateUserBanStatus(userId, false);
      
      if (window.errorHandler) {
        window.errorHandler.info(`User ${user.email} unbanned`);
      }
      
      this.showToast('User unbanned successfully', 'success');

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Unban');
      }
      this.showToast('Failed to unban user', 'error');
    }
  }

  // Update user ban status
  async updateUserBanStatus(userId, banned, reason = null) {
    if (!firebase?.firestore) {
      throw new Error('Firebase not available');
    }

    const db = firebase.firestore();
    
    const updateData = {
      banned,
      bannedAt: banned ? firebase.firestore.FieldValue.serverTimestamp() : null,
      bannedBy: banned ? (window.authManager?.currentUser?.email || 'Unknown') : null,
      banReason: banned ? reason : null,
      unbannedAt: !banned ? firebase.firestore.FieldValue.serverTimestamp() : null,
      unbannedBy: !banned ? (window.authManager?.currentUser?.email || 'Unknown') : null
    };

    await db.collection('users').doc(userId).update(updateData);

    // Log the action
    await this.logUserAction(userId, banned ? 'user_banned' : 'user_unbanned', { 
      reason: banned ? reason : null 
    });

    // Update local data
    const user = this.allUsers.find(u => u.id === userId);
    if (user) {
      user.banned = banned;
      if (banned) {
        user.banReason = reason;
      }
    }

    this.filterUsers();
  }

  // Show ban dialog
  async showBanDialog(userEmail) {
    if (window.errorHandler && window.errorHandler.prompt) {
      return await window.errorHandler.prompt(
        'Ban User',
        `Please provide a reason for banning ${userEmail}:`,
        'Violation of terms of service'
      );
    }
    
    return prompt(`Please provide a reason for banning ${userEmail}:`, 'Violation of terms of service');
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

  // Log user management action
  async logUserAction(userId, action, data = {}) {
    try {
      if (!firebase?.firestore) return;

      const db = firebase.firestore();
      
      await db.collection('audit_logs').add({
        action,
        userId: window.authManager?.currentUser?.uid,
        userEmail: window.authManager?.currentUser?.email,
        targetId: userId,
        targetType: 'user',
        data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Action Logging');
      }
    }
  }

  // Setup realtime listener
  setupRealtimeListener() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();
      
      this.realtimeListener = db.collection('users')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            this.handleUserChange(change.doc.data(), change.type, change.doc.id);
          });
        });

      if (window.errorHandler) {
        window.errorHandler.debug('User manager realtime listener setup');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'User Realtime Listener Setup');
      }
    }
  }

  // Handle user changes from realtime updates
  handleUserChange(userData, changeType, userId) {
    const user = { id: userId, ...userData };
    
    if (user.createdAt && typeof user.createdAt.toDate === 'function') {
      user.createdAt = user.createdAt.toDate();
    }
    if (user.lastLoginAt && typeof user.lastLoginAt.toDate === 'function') {
      user.lastLoginAt = user.lastLoginAt.toDate();
    }

    if (changeType === 'added') {
      this.allUsers.unshift(user);
    } else if (changeType === 'modified') {
      const index = this.allUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        this.allUsers[index] = user;
      }
    } else if (changeType === 'removed') {
      this.allUsers = this.allUsers.filter(u => u.id !== userId);
    }

    this.filterUsers();
  }

  // Show section
  showSection() {
    const section = document.getElementById('users-section');
    if (section) {
      section.classList.add('active');
    }

    // Refresh users when showing
    this.loadUsers();
  }

  // Hide section
  hideSection() {
    const section = document.getElementById('users-section');
    if (section) {
      section.classList.remove('active');
    }
  }

  // Get user statistics
  getUserStats() {
    const stats = {
      total: this.allUsers.length,
      active: this.allUsers.filter(u => !u.banned).length,
      banned: this.allUsers.filter(u => u.banned).length,
      verified: this.allUsers.filter(u => u.emailVerified).length,
      admins: this.allUsers.filter(u => u.role === 'admin').length,
      moderators: this.allUsers.filter(u => u.role === 'moderator').length
    };

    return stats;
  }

  // Search users by query
  searchUsers(query) {
    this.searchQuery = query.toLowerCase();
    this.filterUsers();
  }

  // Filter users by role
  filterByRole(role) {
    this.currentFilter = role;
    this.filterUsers();
  }

  // Cleanup
  destroy() {
    if (this.realtimeListener) {
      this.realtimeListener();
      this.realtimeListener = null;
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('User manager destroyed');
    }
  }
}

// Export for use by AdminManager
if (typeof window !== 'undefined') {
  window.UserManager = UserManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserManager;
}