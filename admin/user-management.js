// User Management System for PacksList Admin
// Handles user roles, permissions, and account management

class UserManagement {
  constructor() {
    this.users = [];
    this.roles = ['user', 'admin', 'super_admin'];
    this.permissions = {
      user: ['browse', 'post', 'message'],
      admin: ['browse', 'post', 'message', 'moderate', 'manage_users'],
      super_admin: ['*'] // All permissions
    };
  }

  // Initialize user management system
  initialize() {
    console.log('User management system initialized');
    this.loadUsers();
  }

  // Load all users
  async loadUsers() {
    try {
      const snapshot = await window.db
        .collection('users')
        .orderBy('createdAt', 'desc')
        .get();
      
      this.users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return this.users;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Update user role
  async updateUserRole(userId, newRole) {
    try {
      if (!this.roles.includes(newRole)) {
        throw new Error('Invalid role');
      }

      await window.db
        .collection('users')
        .doc(userId)
        .update({
          role: newRole,
          permissions: this.permissions[newRole],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Log the role change
      await this.logUserAction('role_updated', {
        userId,
        newRole,
        updatedBy: window.authManager?.currentUser?.uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error };
    }
  }

  // Ban/unban user
  async toggleUserBan(userId, banned = true) {
    try {
      await window.db
        .collection('users')
        .doc(userId)
        .update({
          accountStatus: banned ? 'banned' : 'active',
          bannedAt: banned ? firebase.firestore.FieldValue.serverTimestamp() : null,
          bannedBy: banned ? window.authManager?.currentUser?.uid : null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      await this.logUserAction(banned ? 'user_banned' : 'user_unbanned', {
        userId,
        actionBy: window.authManager?.currentUser?.uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error toggling user ban:', error);
      return { success: false, error };
    }
  }

  // Log user management action
  async logUserAction(action, details) {
    try {
      await window.db.collection('user_management_logs').add({
        action,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        adminId: window.authManager?.currentUser?.uid
      });
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }
}

// Initialize user management
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be initialized
  function initializeWhenReady() {
    if (window.db && window.authManager) {
      window.userManagement = new UserManagement();
      window.userManagement.initialize();
    } else {
      setTimeout(initializeWhenReady, 100);
    }
  }
  initializeWhenReady();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserManagement;
}