// Profile Manager for PacksList
// Handles user profile management, settings, and account actions

class ProfileManager {
  constructor() {
    this.userProfile = null;
    this.userPacks = [];
    this.userFavorites = [];
    this.isInitialized = false;
    
    // Initialize when auth manager is ready
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

  // Initialize profile manager
  initialize() {
    if (this.isInitialized) return;
    
    // Listen for auth state changes
    window.authManager.addAuthListener((event, data) => {
      this.handleAuthEvent(event, data);
    });
    
    // Initialize UI if user is already authenticated
    if (window.authManager.isAuthenticated) {
      this.loadUserProfile();
    }
    
    this.setupEventListeners();
    this.isInitialized = true;
    
    console.log('Profile manager initialized');
  }

  // Handle authentication events
  handleAuthEvent(event, data) {
    switch (event) {
      case 'authenticated':
        this.loadUserProfile();
        this.showAuthenticatedView();
        break;
      case 'unauthenticated':
        this.clearProfile();
        this.showGuestView();
        break;
      case 'profileUpdated':
        this.userProfile = data;
        this.updateProfileDisplay();
        break;
    }
  }

  // Load complete user profile data
  async loadUserProfile() {
    if (!window.authManager.isAuthenticated) return;
    
    try {
      this.userProfile = window.authManager.currentUserProfile;
      
      // Load additional profile data in parallel
      await Promise.all([
        this.loadUserPacks(),
        this.loadUserFavorites(),
        this.loadUserStats()
      ]);
      
      this.updateProfileDisplay();
      this.updateSettingsDisplay();
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.showError('Failed to load profile data');
    }
  }

  // Load user's posted packs
  async loadUserPacks() {
    if (!window.authManager.currentUser) return;
    
    try {
      const snapshot = await firebase.firestore()
        .collection('posts')
        .where('userId', '==', window.authManager.currentUser.uid)
        .orderBy('created', 'desc')
        .get();
      
      this.userPacks = [];
      snapshot.forEach(doc => {
        this.userPacks.push({ id: doc.id, ...doc.data() });
      });
      
      this.displayUserPacks();
      
    } catch (error) {
      console.error('Error loading user packs:', error);
    }
  }

  // Load user's favorite packs
  async loadUserFavorites() {
    if (!window.authManager.currentUser) return;
    
    try {
      const snapshot = await firebase.firestore()
        .collection('favorites')
        .where('userId', '==', window.authManager.currentUser.uid)
        .get();
      
      this.userFavorites = [];
      snapshot.forEach(doc => {
        this.userFavorites.push({ id: doc.id, ...doc.data() });
      });
      
      this.displayUserFavorites();
      
    } catch (error) {
      console.error('Error loading user favorites:', error);
    }
  }

  // Load user statistics
  async loadUserStats() {
    const packsCount = this.userPacks.length;
    const favoritesCount = this.userFavorites.length;
    
    // Update stats display
    this.updateElement('user-packs-count', packsCount);
    this.updateElement('user-favorites-count', favoritesCount);
    this.updateElement('user-messages-count', '0'); // TODO: Implement messaging
    this.updateElement('user-rating', '5.0'); // TODO: Implement rating system
  }

  // Update profile display
  updateProfileDisplay() {
    if (!this.userProfile) return;
    
    // Update basic info
    const displayName = this.userProfile.displayName || 
                       window.authManager.currentUser?.email.split('@')[0] || 
                       'Anonymous User';
    
    this.updateElement('profile-display-name', displayName);
    this.updateElement('profile-email', window.authManager.currentUser?.email || '');
    
    // Update avatar initials
    const initials = this.getInitials(displayName);
    this.updateElement('profile-initials', initials);
    
    // Update badges
    const adminBadge = document.getElementById('profile-admin-badge');
    const verifiedBadge = document.getElementById('profile-verified-badge');
    
    if (adminBadge) {
      adminBadge.style.display = window.authManager.isAdminUser ? 'inline-block' : 'none';
    }
    
    if (verifiedBadge) {
      verifiedBadge.style.display = window.authManager.isEmailVerified ? 'inline-block' : 'none';
    }
  }

  // Update settings display
  updateSettingsDisplay() {
    if (!this.userProfile || !this.userProfile.preferences) return;
    
    const preferences = this.userProfile.preferences;
    
    // Update toggle switches
    this.updateToggle('email-notifications-toggle', preferences.emailNotifications);
    this.updateToggle('location-sharing-toggle', preferences.locationSharing);
    this.updateToggle('profile-visibility-toggle', preferences.profileVisibility !== false);
  }

  // Display user's packs
  displayUserPacks() {
    const container = document.getElementById('user-packs-list');
    if (!container) return;
    
    if (this.userPacks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>You haven't posted any packs yet.</p>
          <a href="new.html" class="btn btn-primary">Post Your First Pack</a>
        </div>
      `;
      return;
    }
    
    const packsHTML = this.userPacks.map(pack => this.createPackCard(pack)).join('');
    container.innerHTML = packsHTML;
  }

  // Display user's favorites
  displayUserFavorites() {
    const container = document.getElementById('user-favorites-list');
    if (!container) return;
    
    if (this.userFavorites.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>You haven't saved any favorites yet.</p>
          <a href="index.html" class="btn btn-outline">Browse Packs</a>
        </div>
      `;
      return;
    }
    
    // TODO: Load actual pack data for favorites
    container.innerHTML = `
      <div class="empty-state">
        <p>Favorites feature coming soon!</p>
      </div>
    `;
  }

  // Create pack card HTML
  createPackCard(pack) {
    const status = pack.status || 'pending';
    const statusBadge = this.getStatusBadge(status);
    
    return `
      <div class="pack-card" data-pack-id="${pack.id}">
        <div class="pack-header">
          <h4>${pack.title}</h4>
          ${statusBadge}
        </div>
        <div class="pack-details">
          <div class="pack-price">$${pack.price}</div>
          <div class="pack-location">${this.formatLocation(pack.city)}</div>
        </div>
        <div class="pack-actions">
          <button class="btn btn-outline btn-sm" onclick="profileManager.editPack('${pack.id}')">
            Edit
          </button>
          <button class="btn btn-link btn-sm" onclick="profileManager.deletePack('${pack.id}')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  // Get status badge HTML
  getStatusBadge(status) {
    const badges = {
      'pending': '<span class="status-badge pending">⏳ Pending Review</span>',
      'approved': '<span class="status-badge approved">✅ Approved</span>',
      'rejected': '<span class="status-badge rejected">❌ Rejected</span>',
      'flagged': '<span class="status-badge flagged">🚩 Flagged</span>'
    };
    
    return badges[status] || '<span class="status-badge unknown">❓ Unknown</span>';
  }

  // Format location display
  formatLocation(city) {
    if (!city) return 'Unknown Location';
    return city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Get user initials for avatar
  getInitials(name) {
    if (!name) return '??';
    
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
  }

  // Show/hide views based on auth state
  showAuthenticatedView() {
    this.updateElement('user-account', '', el => el.style.display = 'block');
    this.updateElement('guest-account', '', el => el.style.display = 'none');
  }

  showGuestView() {
    this.updateElement('user-account', '', el => el.style.display = 'none');
    this.updateElement('guest-account', '', el => el.style.display = 'block');
  }

  // Clear profile data
  clearProfile() {
    this.userProfile = null;
    this.userPacks = [];
    this.userFavorites = [];
  }

  // Profile management methods
  async editProfile() {
    const displayName = prompt('Enter your display name:', this.userProfile?.displayName || '');
    
    if (displayName !== null && displayName !== this.userProfile?.displayName) {
      try {
        await window.authManager.updateProfile({ displayName });
        window.authManager.showAuthSuccess('Profile updated successfully!');
      } catch (error) {
        window.authManager.showAuthError('Failed to update profile');
      }
    }
  }

  async editAvatar() {
    window.authManager.showAuthError('Avatar upload feature coming soon!');
  }

  async changePassword() {
    const email = window.authManager.currentUser?.email;
    if (email) {
      const result = await window.authManager.resetPassword(email);
      if (result.success) {
        window.authManager.showAuthSuccess('Password reset email sent to your inbox!');
      }
    }
  }

  async downloadData() {
    const userData = {
      profile: this.userProfile,
      packs: this.userPacks,
      favorites: this.userFavorites
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `packslist-data-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    window.authManager.showAuthSuccess('Data download started!');
  }

  async deleteAccount() {
    const confirmation = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (confirmation) {
      const email = prompt('Type your email address to confirm account deletion:');
      
      if (email === window.authManager.currentUser?.email) {
        try {
          // TODO: Implement proper account deletion with backend cleanup
          await window.authManager.currentUser.delete();
          window.authManager.showAuthSuccess('Account deleted successfully.');
        } catch (error) {
          if (error.code === 'auth/requires-recent-login') {
            window.authManager.showAuthError('Please sign in again before deleting your account.');
          } else {
            window.authManager.showAuthError('Failed to delete account. Please try again.');
          }
        }
      } else {
        window.authManager.showAuthError('Email confirmation did not match.');
      }
    }
  }

  // Pack management methods
  async editPack(packId) {
    window.location.href = `new.html?edit=${packId}`;
  }

  async deletePack(packId) {
    const confirmation = confirm('Are you sure you want to delete this pack?');
    
    if (confirmation) {
      try {
        await firebase.firestore().collection('posts').doc(packId).delete();
        
        // Remove from local array
        this.userPacks = this.userPacks.filter(pack => pack.id !== packId);
        this.displayUserPacks();
        this.updateElement('user-packs-count', this.userPacks.length);
        
        window.authManager.showAuthSuccess('Pack deleted successfully!');
      } catch (error) {
        console.error('Error deleting pack:', error);
        window.authManager.showAuthError('Failed to delete pack');
      }
    }
  }

  async clearFavorites() {
    const confirmation = confirm('Are you sure you want to clear all favorites?');
    
    if (confirmation) {
      try {
        // TODO: Implement favorites clearing
        this.userFavorites = [];
        this.displayUserFavorites();
        this.updateElement('user-favorites-count', 0);
        
        window.authManager.showAuthSuccess('Favorites cleared!');
      } catch (error) {
        window.authManager.showAuthError('Failed to clear favorites');
      }
    }
  }

  // Settings management
  setupEventListeners() {
    // Settings toggles
    this.setupToggleListener('email-notifications-toggle', 'emailNotifications');
    this.setupToggleListener('location-sharing-toggle', 'locationSharing');
    this.setupToggleListener('profile-visibility-toggle', 'profileVisibility');
  }

  setupToggleListener(toggleId, preferenceName) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener('change', async (e) => {
        await this.updatePreference(preferenceName, e.target.checked);
      });
    }
  }

  async updatePreference(preferenceName, value) {
    if (!window.authManager.isAuthenticated) return;
    
    try {
      const updates = {
        [`preferences.${preferenceName}`]: value
      };
      
      await window.authManager.updateProfile(updates);
      
      // Update local profile
      if (this.userProfile && this.userProfile.preferences) {
        this.userProfile.preferences[preferenceName] = value;
      }
      
    } catch (error) {
      console.error('Error updating preference:', error);
      window.authManager.showAuthError('Failed to update setting');
    }
  }

  // Utility methods
  updateElement(id, content, callback = null) {
    const element = document.getElementById(id);
    if (element) {
      if (callback) {
        callback(element);
      } else {
        element.textContent = content;
      }
    }
  }

  updateToggle(toggleId, checked) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.checked = checked;
    }
  }

  showError(message) {
    console.error(message);
    if (window.authManager) {
      window.authManager.showAuthError(message);
    }
  }
}

// Initialize profile manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileManager;
}