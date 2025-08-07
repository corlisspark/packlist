// Analytics Manager for PacksList Admin Panel
// Handles user behavior analytics, statistics, and reporting

class AnalyticsManager {
  constructor() {
    this.isInitialized = false;
    this.analyticsData = {};
    this.realtimeListener = null;
    this.updateInterval = null;
  }

  // Initialize analytics manager
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing analytics manager');
    }

    try {
      // Initialize behavior analytics if available
      if (window.behaviorAnalytics) {
        await window.behaviorAnalytics.initialize();
      }

      await this.loadAnalyticsData();
      this.setupRealtimeUpdates();
      this.startAutoRefresh();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Analytics manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Analytics Manager Initialization');
      }
    }
  }

  // Load analytics data
  async loadAnalyticsData() {
    try {
      await Promise.all([
        this.loadBehaviorStats(),
        this.loadInteractionData(),
        this.loadPopularContent(),
        this.loadUserJourney()
      ]);

      this.updateAnalyticsUI();
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Analytics Data Loading');
      }
    }
  }

  // Load behavior statistics
  async loadBehaviorStats() {
    try {
      // Get data from localStorage (behavior analytics)
      const today = new Date().toDateString();
      const interactions = JSON.parse(localStorage.getItem('behaviorAnalytics') || '{}');
      
      const todayData = interactions[today] || {};
      const allTimeData = Object.values(interactions).reduce((acc, dayData) => {
        Object.keys(dayData).forEach(key => {
          if (typeof dayData[key] === 'number') {
            acc[key] = (acc[key] || 0) + dayData[key];
          }
        });
        return acc;
      }, {});

      this.analyticsData.behavior = {
        today: {
          pinClicks: todayData.pinClicks || 0,
          modalViews: todayData.modalViews || 0,
          sessionTime: todayData.avgSessionTime || 0,
          mobileUsage: todayData.mobileUsers || 0
        },
        allTime: {
          pinClicks: allTimeData.pinClicks || 0,
          modalViews: allTimeData.modalViews || 0,
          totalSessions: allTimeData.sessions || 0,
          avgSessionTime: allTimeData.avgSessionTime || 0
        }
      };

      if (window.errorHandler) {
        window.errorHandler.debug('Behavior stats loaded', this.analyticsData.behavior);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Behavior Stats Loading');
      }
    }
  }

  // Load interaction data for charts
  async loadInteractionData() {
    try {
      const interactions = JSON.parse(localStorage.getItem('behaviorAnalytics') || '{}');
      
      // Get last 7 days of data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        last7Days.push({
          date: date.toLocaleDateString(),
          clicks: interactions[dateStr]?.pinClicks || 0,
          views: interactions[dateStr]?.modalViews || 0,
          sessions: interactions[dateStr]?.sessions || 0
        });
      }

      this.analyticsData.chartData = last7Days;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Interaction Data Loading');
      }
    }
  }

  // Load popular content data
  async loadPopularContent() {
    if (!firebase?.firestore) return;

    try {
      const db = firebase.firestore();
      
      // Get most viewed/clicked packs
      const packsSnapshot = await db.collection('posts')
        .where('status', '==', 'approved')
        .orderBy('viewCount', 'desc')
        .limit(10)
        .get();

      const popularPacks = [];
      packsSnapshot.forEach(doc => {
        const pack = { id: doc.id, ...doc.data() };
        popularPacks.push({
          title: pack.title,
          vendor: pack.vendor,
          views: pack.viewCount || 0,
          clicks: pack.clickCount || 0
        });
      });

      this.analyticsData.popularContent = popularPacks;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleFirebaseError(error, 'Popular Content Loading');
      }
    }
  }

  // Load user journey data
  async loadUserJourney() {
    try {
      const interactions = JSON.parse(localStorage.getItem('behaviorAnalytics') || '{}');
      const today = new Date().toDateString();
      const todayData = interactions[today] || {};

      this.analyticsData.userJourney = {
        mapLoads: todayData.mapLoads || 0,
        pinHovers: todayData.pinHovers || 0,
        pinClicks: todayData.pinClicks || 0,
        contacts: todayData.contacts || 0
      };

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'User Journey Loading');
      }
    }
  }

  // Update analytics UI
  updateAnalyticsUI() {
    this.updateBehaviorStats();
    this.updateCharts();
    this.updatePopularContent();
    this.updateUserJourney();
  }

  // Update behavior statistics cards
  updateBehaviorStats() {
    const behavior = this.analyticsData.behavior;
    if (!behavior) return;

    const stats = [
      { id: 'total-pin-clicks', value: behavior.today.pinClicks, change: '+0%' },
      { id: 'modal-views', value: behavior.today.modalViews, change: '+0%' },
      { id: 'avg-session-time', value: `${behavior.today.sessionTime}s`, change: '+0%' },
      { id: 'mobile-usage', value: `${behavior.today.mobileUsage}%`, change: '+0%' }
    ];

    stats.forEach(stat => {
      const valueElement = document.getElementById(stat.id);
      const changeElement = document.getElementById(`${stat.id}-change`);

      if (valueElement && window.domUtils) {
        window.domUtils.setText(valueElement, stat.value);
      }

      if (changeElement && window.domUtils) {
        window.domUtils.setText(changeElement, stat.change);
      }
    });
  }

  // Update charts
  updateCharts() {
    this.updatePinInteractionsChart();
    this.updateHotspotAnalysis();
  }

  // Update pin interactions chart
  updatePinInteractionsChart() {
    const chartContainer = document.getElementById('pin-interactions-chart');
    if (!chartContainer || !this.analyticsData.chartData) return;

    // Simple chart implementation (you could integrate Chart.js here)
    const chartHTML = `
      <div class="simple-chart">
        ${this.analyticsData.chartData.map((day, index) => `
          <div class="chart-bar" style="height: ${Math.max(day.clicks * 2, 10)}px;">
            <div class="bar-value">${day.clicks}</div>
            <div class="bar-label">${day.date.split('/').slice(0, 2).join('/')}</div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.domUtils) {
      window.domUtils.setHTML(chartContainer, chartHTML);
    }
  }

  // Update hotspot analysis
  updateHotspotAnalysis() {
    const hotspotContainer = document.getElementById('hotspot-list');
    if (!hotspotContainer) return;

    // Mock hotspot data (in a real app, this would come from actual analytics)
    const hotspots = [
      { location: 'Downtown Providence', clicks: 45, conversion: '12%' },
      { location: 'Federal Hill', clicks: 32, conversion: '8%' },
      { location: 'The Hill', clicks: 28, conversion: '15%' },
      { location: 'Elmwood', clicks: 19, conversion: '6%' }
    ];

    const hotspotsHTML = hotspots.map(spot => `
      <div class="hotspot-item">
        <div class="hotspot-location">${spot.location}</div>
        <div class="hotspot-stats">
          <span class="hotspot-clicks">${spot.clicks} clicks</span>
          <span class="hotspot-conversion">${spot.conversion} conversion</span>
        </div>
      </div>
    `).join('');

    if (window.domUtils) {
      window.domUtils.setHTML(hotspotContainer, hotspotsHTML);
    }
  }

  // Update popular content
  updatePopularContent() {
    const popularContainer = document.getElementById('popular-listings');
    if (!popularContainer) return;

    const popular = this.analyticsData.popularContent || [];
    
    if (popular.length === 0) {
      if (window.domUtils) {
        window.domUtils.setText(popularContainer, 'No popular listings data available');
      }
      return;
    }

    const popularHTML = popular.map((item, index) => `
      <div class="popular-item">
        <div class="popular-rank">#${index + 1}</div>
        <div class="popular-content">
          <div class="popular-title">${window.domUtils ? window.domUtils.escapeHTML(item.title) : item.title}</div>
          <div class="popular-vendor">${item.vendor}</div>
        </div>
        <div class="popular-stats">
          <div class="popular-views">${item.views} views</div>
          <div class="popular-clicks">${item.clicks} clicks</div>
        </div>
      </div>
    `).join('');

    if (window.domUtils) {
      window.domUtils.setHTML(popularContainer, popularHTML);
    }
  }

  // Update user journey
  updateUserJourney() {
    const journey = this.analyticsData.userJourney;
    if (!journey) return;

    const steps = [
      { id: 'step-load', value: journey.mapLoads },
      { id: 'step-hover', value: journey.pinHovers },
      { id: 'step-click', value: journey.pinClicks },
      { id: 'step-contact', value: journey.contacts }
    ];

    steps.forEach(step => {
      const element = document.getElementById(step.id);
      if (element && window.domUtils) {
        window.domUtils.setText(element, step.value);
      }
    });
  }

  // Track custom event
  trackEvent(eventName, eventData = {}) {
    try {
      if (window.behaviorAnalytics) {
        window.behaviorAnalytics.trackInteraction({
          action: eventName,
          ...eventData,
          timestamp: Date.now()
        });
      }

      if (window.errorHandler) {
        window.errorHandler.debug(`Analytics event tracked: ${eventName}`, eventData);
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Event Tracking');
      }
    }
  }

  // Generate analytics report
  generateReport(period = '7d') {
    try {
      const report = {
        period,
        generatedAt: new Date().toISOString(),
        summary: this.analyticsData.behavior,
        chartData: this.analyticsData.chartData,
        popularContent: this.analyticsData.popularContent,
        userJourney: this.analyticsData.userJourney,
        insights: this.generateInsights()
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `packslist-analytics-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.errorHandler) {
        window.errorHandler.info('Analytics report generated');
      }

      return report;
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Report Generation');
      }
    }
  }

  // Generate insights from data
  generateInsights() {
    const insights = [];
    const behavior = this.analyticsData.behavior;

    if (behavior?.today) {
      // Click-through rate insight
      if (behavior.today.modalViews > 0) {
        const ctr = (behavior.today.pinClicks / behavior.today.modalViews * 100).toFixed(1);
        insights.push(`Click-through rate: ${ctr}%`);
      }

      // Session time insight
      if (behavior.today.sessionTime > 0) {
        const sessionQuality = behavior.today.sessionTime > 60 ? 'Good' : 'Needs improvement';
        insights.push(`Average session time: ${behavior.today.sessionTime}s (${sessionQuality})`);
      }

      // Mobile usage insight
      if (behavior.today.mobileUsage > 0) {
        const mobileOptimization = behavior.today.mobileUsage > 50 ? 'Mobile-first approach recommended' : 'Desktop-focused is adequate';
        insights.push(`Mobile usage: ${behavior.today.mobileUsage}% (${mobileOptimization})`);
      }
    }

    return insights;
  }

  // Setup realtime updates
  setupRealtimeUpdates() {
    // Listen for behavior analytics updates
    if (window.addEventListener) {
      window.addEventListener('behaviorAnalyticsUpdate', () => {
        this.loadBehaviorStats();
        this.updateBehaviorStats();
      });
    }
  }

  // Start auto refresh
  startAutoRefresh() {
    // Refresh every 30 seconds
    this.updateInterval = setInterval(() => {
      this.refreshAnalytics();
    }, 30 * 1000);

    if (window.errorHandler) {
      window.errorHandler.debug('Analytics auto-refresh started (30 second interval)');
    }
  }

  // Refresh analytics data
  async refreshAnalytics() {
    try {
      await this.loadAnalyticsData();
      
      if (window.errorHandler) {
        window.errorHandler.debug('Analytics data refreshed');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Analytics Refresh');
      }
    }
  }

  // Clear activity feed
  clearActivityFeed() {
    const feedElement = document.getElementById('activity-feed');
    if (feedElement && window.domUtils) {
      window.domUtils.setHTML(feedElement, `
        <div class="activity-item welcome">
          <div class="activity-icon">🔄</div>
          <div class="activity-content">
            <div class="activity-text">Activity feed cleared</div>
            <div class="activity-time">Just now</div>
          </div>
        </div>
      `);
    }

    if (window.errorHandler) {
      window.errorHandler.info('Activity feed cleared');
    }
  }

  // Export analytics data
  exportAnalyticsData() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        behaviorAnalytics: JSON.parse(localStorage.getItem('behaviorAnalytics') || '{}'),
        currentData: this.analyticsData,
        insights: this.generateInsights()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `packslist-analytics-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.errorHandler) {
        window.errorHandler.info('Analytics data exported');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Analytics Export');
      }
    }
  }

  // Show section
  showSection() {
    const section = document.getElementById('analytics-section');
    if (section) {
      section.classList.add('active');
    }

    // Refresh analytics when showing
    this.refreshAnalytics();
  }

  // Hide section
  hideSection() {
    const section = document.getElementById('analytics-section');
    if (section) {
      section.classList.remove('active');
    }
  }

  // Get analytics summary
  getAnalyticsSummary() {
    return {
      behavior: this.analyticsData.behavior,
      chartData: this.analyticsData.chartData?.length || 0,
      popularContent: this.analyticsData.popularContent?.length || 0,
      insights: this.generateInsights()
    };
  }

  // Cleanup
  destroy() {
    // Clear auto refresh
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Remove event listeners
    if (window.removeEventListener) {
      window.removeEventListener('behaviorAnalyticsUpdate', this.refreshAnalytics);
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Analytics manager destroyed');
    }
  }
}

// Export for use by AdminManager
if (typeof window !== 'undefined') {
  window.AnalyticsManager = AnalyticsManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsManager;
}