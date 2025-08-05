// Search utilities for PacksList
// Enhanced search with autocomplete and map integration

// Major cities and metro areas by state
const MAJOR_CITIES = [
  // Massachusetts
  { name: 'Boston', state: 'MA', key: 'boston', lat: 42.3601, lng: -71.0589 },
  { name: 'Cambridge', state: 'MA', key: 'cambridge', lat: 42.3736, lng: -71.1097 },
  { name: 'Worcester', state: 'MA', key: 'worcester', lat: 42.2626, lng: -71.8023 },
  { name: 'Springfield', state: 'MA', key: 'springfield', lat: 42.1015, lng: -72.5898 },
  { name: 'Lowell', state: 'MA', key: 'lowell', lat: 42.6334, lng: -71.3162 },
  { name: 'New Bedford', state: 'MA', key: 'new-bedford', lat: 41.6362, lng: -70.9342 },
  
  // Rhode Island
  { name: 'Providence', state: 'RI', key: 'providence', lat: 41.8240, lng: -71.4128 },
  { name: 'Newport', state: 'RI', key: 'newport', lat: 41.4901, lng: -71.3128 },
  { name: 'Warwick', state: 'RI', key: 'warwick', lat: 41.7001, lng: -71.4162 },
  { name: 'Woonsocket', state: 'RI', key: 'woonsocket', lat: 42.0029, lng: -71.5153 },
  
  // Connecticut
  { name: 'Hartford', state: 'CT', key: 'hartford', lat: 41.7658, lng: -72.6734 },
  { name: 'New Haven', state: 'CT', key: 'new-haven', lat: 41.3083, lng: -72.9279 },
  { name: 'Bridgeport', state: 'CT', key: 'bridgeport', lat: 41.1865, lng: -73.2052 },
  { name: 'Stamford', state: 'CT', key: 'stamford', lat: 41.0534, lng: -73.5387 },
  
  // New York
  { name: 'New York City', state: 'NY', key: 'nyc', lat: 40.7128, lng: -74.0060 },
  { name: 'Albany', state: 'NY', key: 'albany', lat: 42.6526, lng: -73.7562 },
  { name: 'Buffalo', state: 'NY', key: 'buffalo', lat: 42.8864, lng: -78.8784 },
  { name: 'Rochester', state: 'NY', key: 'rochester', lat: 43.1566, lng: -77.6088 },
];

// Product types for search
const PRODUCT_TYPES = [
  'Indica Pack',
  'Sativa Pack', 
  'Hybrid Pack',
  'Premium Pack',
  'Budget Pack'
];

class SearchManager {
  constructor() {
    this.searchData = [];
    this.currentResults = [];
    this.isSearching = false;
    this.searchCallbacks = [];
    this.lastSearchTerm = '';
  }

  // Initialize search data from vendor data and dynamic configs
  initializeSearchData(vendorData) {
    this.searchData = [];
    
    // Add pack titles from vendor data with privacy-friendly IDs
    vendorData.forEach(item => {
      if (item.title) {
        // Generate public ID if not exists
        const publicId = item.publicId || window.configManager.generatePublicId('pack');
        
        // Cache pack data with privacy protection
        if (window.cacheManager) {
          window.cacheManager.cachePack({
            ...item,
            publicId: publicId
          });
        }
        
        this.searchData.push({
          type: 'pack',
          text: item.title,
          display: item.title,
          data: { ...item, publicId: publicId },
          searchableText: item.title.toLowerCase()
        });
      }
    });

    // Add cities from dynamic config
    if (window.configManager && window.configManager.isInitialized) {
      const citiesConfig = window.configManager.getConfig('cities');
      if (citiesConfig.items) {
        citiesConfig.items.forEach(city => {
          if (city.isActive) {
            this.searchData.push({
              type: 'city',
              text: city.name,
              display: `${city.name}, ${city.state}`,
              data: city,
              searchableText: `${city.name} ${city.state}`.toLowerCase()
            });
          }
        });
      } else {
        // Fallback to hardcoded cities
        this.addFallbackCities();
      }

      // Add product types from dynamic config
      const productTypesConfig = window.configManager.getConfig('product-types');
      if (productTypesConfig.items) {
        productTypesConfig.items.forEach(product => {
          if (product.isActive) {
            this.searchData.push({
              type: 'product',
              text: product.name,
              display: product.name,
              data: { type: product.key, ...product },
              searchableText: product.searchTerms ? 
                product.searchTerms.join(' ').toLowerCase() : 
                product.name.toLowerCase()
            });
          }
        });
      } else {
        // Fallback to hardcoded product types
        this.addFallbackProductTypes();
      }
    } else {
      // Fallback when config manager not ready
      this.addFallbackCities();
      this.addFallbackProductTypes();
    }
  }

  // Fallback city data
  addFallbackCities() {
    MAJOR_CITIES.forEach(city => {
      this.searchData.push({
        type: 'city',
        text: city.name,
        display: `${city.name}, ${city.state}`,
        data: city,
        searchableText: `${city.name} ${city.state}`.toLowerCase()
      });
    });
  }

  // Fallback product type data
  addFallbackProductTypes() {
    PRODUCT_TYPES.forEach(type => {
      this.searchData.push({
        type: 'product',
        text: type,
        display: type,
        data: { type: type.toLowerCase().replace(' pack', '') },
        searchableText: type.toLowerCase()
      });
    });
  }

  // Fuzzy search implementation
  fuzzyMatch(searchTerm, targetText, threshold = 0.6) {
    searchTerm = searchTerm.toLowerCase().trim();
    targetText = targetText.toLowerCase();
    
    // Exact match gets highest score
    if (targetText.includes(searchTerm)) {
      return 1.0;
    }
    
    // Calculate Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(searchTerm, targetText);
    const maxLength = Math.max(searchTerm.length, targetText.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold ? similarity : 0;
  }

  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Perform search with autocomplete
  search(query, limit = 4) {
    if (!query || query.length < 2) {
      return [];
    }

    const results = [];
    const seen = new Set();

    // Search through all data
    this.searchData.forEach(item => {
      const score = this.fuzzyMatch(query, item.searchableText);
      if (score > 0) {
        // Avoid duplicates
        const key = `${item.type}-${item.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            ...item,
            score: score
          });
        }
      }
    });

    // Sort by score (highest first) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get suggestions for empty search (popular items)
  getPopularSuggestions(limit = 4) {
    const popular = [
      { type: 'city', text: 'Boston', display: 'Boston, MA', data: MAJOR_CITIES.find(c => c.key === 'boston') },
      { type: 'city', text: 'Providence', display: 'Providence, RI', data: MAJOR_CITIES.find(c => c.key === 'providence') },
      { type: 'product', text: 'Indica Pack', display: 'Indica Pack', data: { type: 'indica' } },
      { type: 'product', text: 'Sativa Pack', display: 'Sativa Pack', data: { type: 'sativa' } }
    ];
    
    return popular.slice(0, limit);
  }

  // Add callback for search results
  onSearchResults(callback) {
    this.searchCallbacks.push(callback);
  }

  // Notify all callbacks of search results
  notifySearchResults(results, query) {
    this.searchCallbacks.forEach(callback => {
      try {
        callback(results, query);
      } catch (error) {
        console.error('Search callback error:', error);
      }
    });
  }

  // Debounced search
  debouncedSearch(query, delay = 300) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      const results = this.search(query);
      this.currentResults = results;
      this.lastSearchTerm = query;
      this.notifySearchResults(results, query);
    }, delay);
  }

  // Get current search results
  getCurrentResults() {
    return this.currentResults;
  }

  // Clear search
  clearSearch() {
    this.currentResults = [];
    this.lastSearchTerm = '';
    this.notifySearchResults([], '');
  }
}

// Global instance
window.searchManager = new SearchManager();

// Utility functions
window.getMajorCities = () => MAJOR_CITIES;
window.getProductTypes = () => PRODUCT_TYPES;