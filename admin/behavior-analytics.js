// Behavior Analytics System for PacksList Admin
// Tracks and analyzes user interactions with map pins and listings

class BehaviorAnalytics {
  constructor() {
    this.analytics = {
      pinClicks: [],
      modalViews: [],
      sessions: [],
      interactions: []
    };
    
    this.currentSession = {
      start: Date.now(),
      pinClicks: 0,
      modalViews: 0,
      interactions: []
    };
    
    this.refreshInterval = null;
    this.isInitialized = false;
  }

  // Initialize the analytics system
  initialize() {
    // Initializing Behavior Analytics
    
    // Load existing data from localStorage
    this.loadStoredData();
    
    // Set up event listeners for pin interactions
    this.setupEventListeners();
    
    // Start real-time updates
    this.startRealTimeUpdates();
    
    // Update dashboard immediately
    this.updateDashboard();
    
    this.isInitialized = true;
    // Behavior Analytics initialized
  }

  // Load stored analytics data
  loadStoredData() {
    try {
      const stored = localStorage.getItem('behaviorAnalytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.analytics = { ...this.analytics, ...data };
      }
    } catch (error) {
      console.warn('Error loading stored analytics:', error);
    }
  }

  // Save analytics data to localStorage
  saveData() {
    try {
      localStorage.setItem('behaviorAnalytics', JSON.stringify(this.analytics));
    } catch (error) {
      console.warn('Error saving analytics:', error);
    }
  }

  // Set up event listeners for tracking user behavior
  setupEventListeners() {
    // Listen for pin interactions from main app
    window.addEventListener('vendorInteraction', (event) => {
      this.trackInteraction(event.detail);
    });

    window.addEventListener('packInteraction', (event) => {
      this.trackInteraction(event.detail);
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endSession();
      } else {
        this.startNewSession();
      }
    });

    // Track chart control interactions
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('chart-btn')) {
        this.trackChartInteraction(event.target.dataset.metric);
      }
    });
  }

  // Track user interactions
  trackInteraction(detail) {
    const interaction = {
      timestamp: Date.now(),
      type: detail.action,
      vendorId: detail.vendor?.id || detail.pack?.id,
      vendorName: detail.vendor?.title || detail.pack?.title,
      location: detail.vendor?.city || detail.pack?.city,
      userAgent: navigator.userAgent,
      isMobile: this.isMobileDevice()
    };

    // Add to analytics
    this.analytics.interactions.push(interaction);
    
    // Update current session
    this.currentSession.interactions.push(interaction);
    
    if (detail.action.includes('click')) {
      this.currentSession.pinClicks++;
      this.analytics.pinClicks.push(interaction);
    }
    
    if (detail.action.includes('modal')) {
      this.currentSession.modalViews++;
      this.analytics.modalViews.push(interaction);
    }

    // Update real-time activity feed
    this.addActivityItem(interaction);
    
    // Save data
    this.saveData();
    
    // Update dashboard
    this.updateDashboard();
    
    console.log('📊 Tracked interaction:', interaction);
  }

  // Track chart interactions
  trackChartInteraction(metric) {
    this.trackInteraction({
      action: 'chart_view',
      vendor: { id: 'admin', title: `Chart: ${metric}` }
    });
  }

  // Start a new session
  startNewSession() {
    // End current session
    this.endSession();
    
    // Start new session
    this.currentSession = {
      start: Date.now(),
      pinClicks: 0,
      modalViews: 0,
      interactions: []
    };
  }

  // End current session
  endSession() {
    if (this.currentSession.start) {
      const session = {
        ...this.currentSession,
        end: Date.now(),
        duration: Date.now() - this.currentSession.start
      };
      
      this.analytics.sessions.push(session);
      this.saveData();
    }
  }

  // Check if device is mobile
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Update the admin dashboard with current analytics
  updateDashboard() {
    this.updateStatCards();
    this.updateHotspots();
    this.updatePopularListings();
    this.updateUserJourney();
    this.updateChart();
  }

  // Update stat cards with current metrics
  updateStatCards() {
    const today = Date.now() - (24 * 60 * 60 * 1000);
    const yesterday = today - (24 * 60 * 60 * 1000);
    
    // Pin clicks today
    const pinClicksToday = this.analytics.pinClicks.filter(click => click.timestamp > today).length;
    const pinClicksYesterday = this.analytics.pinClicks.filter(click => 
      click.timestamp > yesterday && click.timestamp <= today
    ).length;
    
    // Modal views today
    const modalViewsToday = this.analytics.modalViews.filter(view => view.timestamp > today).length;
    const modalViewsYesterday = this.analytics.modalViews.filter(view => 
      view.timestamp > yesterday && view.timestamp <= today
    ).length;
    
    // Average session time
    const recentSessions = this.analytics.sessions.filter(session => session.start > today);
    const avgSessionTime = recentSessions.length > 0 
      ? Math.round(recentSessions.reduce((sum, session) => sum + session.duration, 0) / recentSessions.length / 1000)
      : 0;
    
    // Mobile usage
    const todayInteractions = this.analytics.interactions.filter(interaction => interaction.timestamp > today);
    const mobileInteractions = todayInteractions.filter(interaction => interaction.isMobile);
    const mobileUsage = todayInteractions.length > 0 
      ? Math.round((mobileInteractions.length / todayInteractions.length) * 100) 
      : 0;

    // Update DOM elements
    this.updateElement('total-pin-clicks', pinClicksToday);
    this.updateElement('pin-clicks-change', this.formatChange(pinClicksToday, pinClicksYesterday));
    
    this.updateElement('modal-views', modalViewsToday);
    this.updateElement('modal-views-change', this.formatChange(modalViewsToday, modalViewsYesterday));
    
    this.updateElement('avg-session-time', `${avgSessionTime}s`);
    this.updateElement('mobile-usage', `${mobileUsage}%`);
  }

  // Update hotspot analysis
  updateHotspots() {
    const hotspotList = document.getElementById('hotspot-list');
    if (!hotspotList) return;

    // Count interactions by location
    const locationCounts = {};
    this.analytics.interactions.forEach(interaction => {
      if (interaction.location) {
        const location = this.formatLocation(interaction.location);
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    // Sort by count
    const sortedLocations = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (sortedLocations.length === 0) {
      hotspotList.innerHTML = '<div class="loading">No hotspot data available</div>';
      return;
    }

    hotspotList.innerHTML = sortedLocations.map(([location, count]) => `
      <div class="hotspot-item">
        <div class="hotspot-location">${location}</div>
        <div class="hotspot-count">${count}</div>
      </div>
    `).join('');
  }

  // Update popular listings
  updatePopularListings() {
    const popularListings = document.getElementById('popular-listings');
    if (!popularListings) return;

    // Count interactions by vendor/listing
    const listingCounts = {};
    this.analytics.interactions.forEach(interaction => {
      if (interaction.vendorId && interaction.vendorName) {
        const key = interaction.vendorId;
        if (!listingCounts[key]) {
          listingCounts[key] = {
            name: interaction.vendorName,
            location: interaction.location,
            count: 0,
            clicks: 0,
            views: 0
          };
        }
        listingCounts[key].count++;
        if (interaction.type.includes('click')) listingCounts[key].clicks++;
        if (interaction.type.includes('modal')) listingCounts[key].views++;
      }
    });

    // Sort by interaction count
    const sortedListings = Object.values(listingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    if (sortedListings.length === 0) {
      popularListings.innerHTML = '<div class="loading">No listing data available</div>';
      return;
    }

    popularListings.innerHTML = sortedListings.map((listing, index) => {
      const colors = ['#8e44ad', '#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#95a5a6'];
      const color = colors[index % colors.length];
      
      return `
        <div class="popular-item">
          <div class="popular-avatar" style="background: ${color}">
            ${listing.name.charAt(0).toUpperCase()}
          </div>
          <div class="popular-info">
            <div class="popular-title">${listing.name}</div>
            <div class="popular-stats">${listing.clicks} clicks • ${listing.views} views</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update user journey flow
  updateUserJourney() {
    const today = Date.now() - (24 * 60 * 60 * 1000);
    const todayInteractions = this.analytics.interactions.filter(interaction => interaction.timestamp > today);
    
    // Count journey steps
    const mapLoads = this.analytics.sessions.filter(session => session.start > today).length;
    const pinHovers = todayInteractions.filter(i => i.type.includes('hover')).length;
    const pinClicks = todayInteractions.filter(i => i.type.includes('click')).length;
    const contacts = todayInteractions.filter(i => i.type.includes('contact')).length;

    this.updateElement('step-load', mapLoads);
    this.updateElement('step-hover', pinHovers);
    this.updateElement('step-click', pinClicks);
    this.updateElement('step-contact', contacts);
  }

  // Update the interactions chart
  updateChart() {
    const canvas = document.getElementById('pin-interactions-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get last 7 days of data
    const days = 7;
    const data = [];
    const labels = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      
      const dayInteractions = this.analytics.interactions.filter(interaction => 
        interaction.timestamp >= dayStart && interaction.timestamp < dayEnd
      ).length;
      
      data.push(dayInteractions);
      labels.push(date.getDate());
    }

    // Draw simple bar chart
    const maxValue = Math.max(...data) || 1;
    const barWidth = width / days * 0.8;
    const barSpacing = width / days * 0.2;

    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * (height - 40);
      const x = index * (barWidth + barSpacing) + barSpacing / 2;
      const y = height - barHeight - 20;

      // Draw bar
      ctx.fillStyle = '#007bff';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw label
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[index], x + barWidth / 2, height - 5);

      // Draw value
      if (value > 0) {
        ctx.fillStyle = '#333';
        ctx.fillText(value, x + barWidth / 2, y - 5);
      }
    });
  }

  // Add activity item to real-time feed
  addActivityItem(interaction) {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed) return;

    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const icon = this.getActivityIcon(interaction.type);
    const text = this.getActivityText(interaction);
    const time = this.formatTime(interaction.timestamp);

    item.innerHTML = `
      <div class="activity-icon">${icon}</div>
      <div class="activity-content">
        <div class="activity-text">${text}</div>
        <div class="activity-time">${time}</div>
      </div>
    `;

    // Add to top of feed
    const firstChild = activityFeed.firstChild;
    if (firstChild) {
      activityFeed.insertBefore(item, firstChild);
    } else {
      activityFeed.appendChild(item);
    }

    // Limit to 50 items
    const items = activityFeed.querySelectorAll('.activity-item');
    if (items.length > 50) {
      items[items.length - 1].remove();
    }

    // Scroll to top
    activityFeed.scrollTop = 0;
  }

  // Get icon for activity type
  getActivityIcon(type) {
    const icons = {
      'pin_clicked': '🎯',
      'modal_opened': '👁️',
      'contact': '💬',
      'search': '🔍',
      'hover': '✨',
      'chart_view': '📊'
    };
    return icons[type] || '📍';
  }

  // Get descriptive text for activity
  getActivityText(interaction) {
    const action = interaction.type;
    const vendor = interaction.vendorName || 'Unknown';
    const location = this.formatLocation(interaction.location) || '';
    
    const texts = {
      'pin_clicked': `Pin clicked: ${vendor} ${location}`,
      'modal_opened': `Modal viewed: ${vendor}`,
      'contact': `Contact initiated: ${vendor}`,
      'search': `Search performed: ${vendor}`,
      'hover': `Pin hovered: ${vendor}`,
      'chart_view': `Chart viewed: ${vendor}`
    };
    
    return texts[action] || `${action}: ${vendor}`;
  }

  // Start real-time updates
  startRealTimeUpdates() {
    // Update every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (document.getElementById('auto-refresh-toggle')?.checked) {
        this.updateDashboard();
      }
    }, 30000);
  }

  // Helper functions
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  formatChange(current, previous) {
    if (previous === 0) return current > 0 ? '+100%' : '+0%';
    const change = Math.round(((current - previous) / previous) * 100);
    return change >= 0 ? `+${change}%` : `${change}%`;
  }

  formatLocation(location) {
    if (!location) return '';
    return location.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  // Clear activity feed
  clearActivityFeed() {
    const activityFeed = document.getElementById('activity-feed');
    if (activityFeed) {
      activityFeed.innerHTML = `
        <div class="activity-item welcome">
          <div class="activity-icon">🧹</div>
          <div class="activity-content">
            <div class="activity-text">Activity feed cleared</div>
            <div class="activity-time">Just now</div>
          </div>
        </div>
      `;
    }
  }

  // Destroy analytics system
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.endSession();
  }
}

// Global function to clear activity feed
function clearActivityFeed() {
  if (window.behaviorAnalytics) {
    window.behaviorAnalytics.clearActivityFeed();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize in admin panel
  if (document.querySelector('.admin-container')) {
    window.behaviorAnalytics = new BehaviorAnalytics();
    
    // Initialize when analytics section is shown
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const analyticsSection = document.getElementById('analytics-section');
          if (analyticsSection && !analyticsSection.classList.contains('hidden') && !window.behaviorAnalytics.isInitialized) {
            window.behaviorAnalytics.initialize();
          }
        }
      });
    });
    
    const analyticsSection = document.getElementById('analytics-section');
    if (analyticsSection) {
      observer.observe(analyticsSection, { attributes: true });
    }
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehaviorAnalytics;
}