// Smart Caching System with Privacy and Session Isolation
// Handles data caching while protecting user privacy

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.sessionCache = new Map();
    this.userSession = this.generateSessionId();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes default
    this.maxCacheSize = 100; // Max items per cache type
    this.sensitiveDataKeys = [
      'realCoords', 'exactLocation', 'vendorContact', 
      'personalInfo', 'fullAddress', 'phoneNumber'
    ];
  }

  // Generate unique session ID for privacy
  generateSessionId() {
    return 'cache_' + Math.random().toString(36).substr(2, 12) + 
           Date.now().toString(36);
  }

  // Cache pack data with privacy protection
  cachePack(packData, ttl = null) {
    const cacheKey = `pack_${packData.publicId || packData.id}_${this.userSession}`;
    const sanitizedData = this.sanitizePackData(packData);
    
    const cacheEntry = {
      data: sanitizedData,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTimeout,
      type: 'pack',
      sessionId: this.userSession
    };

    this.cache.set(cacheKey, cacheEntry);
    this.enforceMaxCacheSize('pack');
    
    return cacheKey;
  }

  // Sanitize pack data for caching (remove PII)
  sanitizePackData(data) {
    const sanitized = { ...data };
    
    // Remove sensitive data
    this.sensitiveDataKeys.forEach(key => {
      delete sanitized[key];
    });

    // Create fuzzy location if exact coordinates exist
    if (data.lat && data.lng) {
      sanitized.fuzzyCoords = this.createFuzzyCoordinates(data.lat, data.lng);
      delete sanitized.lat;
      delete sanitized.lng;
    }

    // Anonymize vendor information
    if (sanitized.vendor) {
      sanitized.vendorPublicId = sanitized.vendor.publicId || this.generateVendorId();
      delete sanitized.vendor;
    }

    // Keep only display-safe data
    return {
      publicId: sanitized.publicId || sanitized.id,
      title: sanitized.title,
      description: sanitized.description,
      price: sanitized.price,
      fuzzyCoords: sanitized.fuzzyCoords,
      vendorPublicId: sanitized.vendorPublicId,
      city: sanitized.city,
      productType: sanitized.productType,
      rating: sanitized.rating,
      inStock: sanitized.inStock,
      verified: sanitized.verified,
      images: sanitized.images ? sanitized.images.slice(0, 3) : [], // Limit images
      cached: true,
      cacheTimestamp: Date.now()
    };
  }

  // Create fuzzy coordinates for privacy (±0.5 mile accuracy)
  createFuzzyCoordinates(lat, lng) {
    const fuzzyRadius = 0.008; // ~0.5 mile in degrees
    
    return {
      lat: lat + (Math.random() - 0.5) * fuzzyRadius,
      lng: lng + (Math.random() - 0.5) * fuzzyRadius,
      accuracy: 'approximate'
    };
  }

  // Generate anonymous vendor ID
  generateVendorId() {
    return 'vendor_' + Math.random().toString(36).substr(2, 8);
  }

  // Cache configuration data
  cacheConfig(type, data, ttl = null) {
    const cacheKey = `config_${type}`;
    
    const cacheEntry = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl || (30 * 60 * 1000), // 30 minutes for configs
      type: 'config'
    };

    this.cache.set(cacheKey, cacheEntry);
    return cacheKey;
  }

  // Cache user session data
  cacheUserSession(userData) {
    const sessionKey = `session_${this.userSession}`;
    const sanitizedUser = this.sanitizeUserData(userData);
    
    const cacheEntry = {
      data: sanitizedUser,
      timestamp: Date.now(),
      ttl: 30 * 60 * 1000, // 30 minutes
      type: 'session'
    };

    this.sessionCache.set(sessionKey, cacheEntry);
    return sessionKey;
  }

  // Sanitize user data for caching
  sanitizeUserData(userData) {
    return {
      sessionId: this.userSession,
      preferences: userData.preferences || {},
      lastLocation: userData.lastLocation ? 
        this.createFuzzyCoordinates(userData.lastLocation.lat, userData.lastLocation.lng) : null,
      searchHistory: (userData.searchHistory || []).slice(0, 10), // Last 10 searches only
      favoriteRegions: userData.favoriteRegions || [],
      userType: userData.userType || 'anonymous',
      lastActive: Date.now()
    };
  }

  // Get cached data with expiration check
  getCached(key) {
    const cached = this.cache.get(key) || this.sessionCache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.sessionCache.delete(key);
      return null;
    }

    // Update access time for LRU
    cached.lastAccessed = Date.now();
    
    return cached.data;
  }

  // Get cached pack by public ID
  getCachedPack(publicId) {
    const cacheKey = `pack_${publicId}_${this.userSession}`;
    return this.getCached(cacheKey);
  }

  // Get cached config
  getCachedConfig(type) {
    const cacheKey = `config_${type}`;
    return this.getCached(cacheKey);
  }

  // Cache search results with privacy
  cacheSearchResults(query, results, userLocation = null) {
    const searchKey = `search_${this.hashQuery(query)}_${this.userSession}`;
    
    // Sanitize search results
    const sanitizedResults = results.map(result => {
      if (result.type === 'pack') {
        return this.sanitizePackData(result.data);
      }
      return result; // Cities and product types are safe
    });

    const cacheEntry = {
      data: {
        query: query,
        results: sanitizedResults,
        userLocation: userLocation ? 
          this.createFuzzyCoordinates(userLocation.lat, userLocation.lng) : null,
        resultCount: results.length
      },
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000, // 5 minutes for search results
      type: 'search'
    };

    this.cache.set(searchKey, cacheEntry);
    this.enforceMaxCacheSize('search');
    
    return searchKey;
  }

  // Get cached search results
  getCachedSearchResults(query) {
    const searchKey = `search_${this.hashQuery(query)}_${this.userSession}`;
    return this.getCached(searchKey);
  }

  // Hash query for consistent cache keys
  hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Enforce maximum cache size (LRU eviction)
  enforceMaxCacheSize(type) {
    const typeKeys = Array.from(this.cache.keys()).filter(key => 
      this.cache.get(key)?.type === type
    );

    if (typeKeys.length > this.maxCacheSize) {
      // Sort by last accessed time (LRU)
      typeKeys.sort((a, b) => {
        const aEntry = this.cache.get(a);
        const bEntry = this.cache.get(b);
        return (aEntry.lastAccessed || 0) - (bEntry.lastAccessed || 0);
      });

      // Remove oldest entries
      const toRemove = typeKeys.slice(0, typeKeys.length - this.maxCacheSize);
      toRemove.forEach(key => this.cache.delete(key));
    }
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Clear session cache only
  clearSessionCache() {
    this.sessionCache.clear();
    console.log('Session cache cleared');
  }

  // Clear expired entries
  clearExpired() {
    const now = Date.now();
    let removedCount = 0;

    // Clear main cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    // Clear session cache
    for (const [key, entry] of this.sessionCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.sessionCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} expired cache entries`);
    }
  }

  // Get cache statistics
  getCacheStats() {
    const mainCacheTypes = {};
    const sessionCacheTypes = {};

    // Count main cache by type
    for (const entry of this.cache.values()) {
      mainCacheTypes[entry.type] = (mainCacheTypes[entry.type] || 0) + 1;
    }

    // Count session cache by type
    for (const entry of this.sessionCache.values()) {
      sessionCacheTypes[entry.type] = (sessionCacheTypes[entry.type] || 0) + 1;
    }

    return {
      mainCache: {
        totalEntries: this.cache.size,
        byType: mainCacheTypes
      },
      sessionCache: {
        totalEntries: this.sessionCache.size,
        byType: sessionCacheTypes
      },
      sessionId: this.userSession,
      maxCacheSize: this.maxCacheSize
    };
  }

  // Preload common data
  async preloadCommonData() {
    try {
      // Preload frequently accessed configs
      const commonConfigs = ['cities', 'product-types', 'ui-strings'];
      
      for (const configType of commonConfigs) {
        if (!this.getCachedConfig(configType)) {
          const data = await window.configManager.getConfig(configType);
          this.cacheConfig(configType, data);
        }
      }

      console.log('Common data preloaded');
    } catch (error) {
      console.error('Failed to preload common data:', error);
    }
  }

  // Auto-cleanup expired entries every 5 minutes
  startAutoCleaning() {
    setInterval(() => {
      this.clearExpired();
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// Global instance
window.cacheManager = new CacheManager();

// Start auto-cleaning
window.cacheManager.startAutoCleaning();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}