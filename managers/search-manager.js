// Search Manager for PacksList
// Handles search functionality, results display, and search interactions

class SearchManager {
  constructor() {
    this.isInitialized = false;
    this.searchData = [];
    this.isSearchActive = false;
    this.searchSelectedIndex = -1;
    this.searchTimeout = null;
    this.searchResultsCallback = null;
  }

  // Initialize search manager
  async initialize() {
    if (this.isInitialized) return;

    if (window.errorHandler) {
      window.errorHandler.debug('Initializing search manager');
    }

    try {
      this.setupSearchUI();
      this.setupEventListeners();

      this.isInitialized = true;
      
      if (window.errorHandler) {
        window.errorHandler.info('Search manager initialized successfully');
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Search Manager Initialization');
      }
    }
  }

  // Initialize search data
  initializeSearchData(data) {
    this.searchData = data;
    
    if (window.errorHandler) {
      window.errorHandler.debug(`Search data initialized with ${data.length} items`);
    }
  }

  // Setup search UI elements
  setupSearchUI() {
    // Verify required elements exist
    const requiredElements = [
      'search-input',
      'search-dropdown', 
      'search-results'
    ];

    for (const elementId of requiredElements) {
      const element = document.getElementById(elementId);
      if (!element) {
        if (window.errorHandler) {
          window.errorHandler.warn(`Search element '${elementId}' not found`);
        }
      }
    }
  }

  // Setup search event listeners
  setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const searchAreaBtn = document.getElementById('search-area-btn');
    
    if (!searchInput || !searchDropdown) {
      if (window.errorHandler) {
        window.errorHandler.warn('Essential search elements not found');
      }
      return;
    }
    
    // Search input events
    searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e);
    });
    
    // Focus events
    searchInput.addEventListener('focus', () => {
      this.handleSearchFocus();
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      this.handleSearchKeydown(e);
    });
    
    // Clear button
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        this.clearSearch();
      });
    }
    
    // Search area button
    if (searchAreaBtn) {
      searchAreaBtn.addEventListener('click', () => {
        this.searchCurrentMapArea();
      });
    }
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        this.hideSearchDropdown();
      }
    });

    if (window.errorHandler) {
      window.errorHandler.debug('Search event listeners setup');
    }
  }

  // Handle search input
  handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      this.hideSearchDropdown();
      this.clearSearchHighlights();
      this.showSearchClearBtn(false);
      return;
    }
    
    this.showSearchClearBtn(true);
    this.debouncedSearch(query, 300);
  }

  // Handle search focus
  handleSearchFocus() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value?.trim();
    
    if (query && query.length >= 2) {
      this.debouncedSearch(query, 100);
    }
  }

  // Handle search keydown navigation
  handleSearchKeydown(e) {
    const results = document.querySelectorAll('.search-result-item');
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.searchSelectedIndex = Math.min(this.searchSelectedIndex + 1, results.length - 1);
        this.updateSearchSelection(results);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.searchSelectedIndex = Math.max(this.searchSelectedIndex - 1, -1);
        this.updateSearchSelection(results);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.searchSelectedIndex >= 0 && results[this.searchSelectedIndex]) {
          results[this.searchSelectedIndex].click();
        }
        break;
      case 'Escape':
        this.hideSearchDropdown();
        document.getElementById('search-input')?.blur();
        break;
    }
  }

  // Debounced search function
  debouncedSearch(query, delay) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, delay);
  }

  // Perform search
  performSearch(query) {
    if (!query || query.length < 2) {
      this.hideSearchDropdown();
      return;
    }

    try {
      const results = this.searchVendorData(query);
      this.displaySearchResults(results, query);

      if (window.errorHandler) {
        window.errorHandler.debug(`Search performed for "${query}" - ${results.length} results`);
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Search Performance');
      }
    }
  }

  // Search vendor data
  searchVendorData(query) {
    const queryLower = query.toLowerCase();
    const results = [];

    // Search packs
    this.searchData.forEach(pack => {
      let score = 0;
      let matches = [];

      // Title match (highest priority)
      if (pack.title && pack.title.toLowerCase().includes(queryLower)) {
        score += 10;
        matches.push('title');
      }

      // Vendor match
      if (pack.vendorDisplay && pack.vendorDisplay.toLowerCase().includes(queryLower)) {
        score += 8;
        matches.push('vendor');
      }

      // Description match
      if (pack.description && pack.description.toLowerCase().includes(queryLower)) {
        score += 5;
        matches.push('description');
      }

      // City match
      if (pack.city && pack.city.toLowerCase().includes(queryLower)) {
        score += 6;
        matches.push('city');
      }

      if (score > 0) {
        results.push({
          type: 'pack',
          display: pack.title,
          data: pack,
          score,
          matches
        });
      }
    });

    // Add city suggestions
    const cityMatches = this.searchCities(queryLower);
    results.push(...cityMatches);

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Limit results
    return results.slice(0, 10);
  }

  // Search cities
  searchCities(query) {
    const cityCoordinates = {
      'providence': { lat: 41.8240, lng: -71.4128 },
      'woonsocket': { lat: 42.0029, lng: -71.5153 },
      'newport': { lat: 41.4901, lng: -71.3128 },
      'southcoast-ma': { lat: 41.6362, lng: -70.9342 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'cambridge': { lat: 42.3736, lng: -71.1097 },
      'worcester': { lat: 42.2626, lng: -71.8023 },
      'north-shore-ma': { lat: 42.5584, lng: -70.8648 }
    };

    const results = [];

    Object.keys(cityCoordinates).forEach(cityKey => {
      const cityName = cityKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (cityName.toLowerCase().includes(query)) {
        results.push({
          type: 'city',
          display: cityName,
          data: {
            key: cityKey,
            name: cityName,
            lat: cityCoordinates[cityKey].lat,
            lng: cityCoordinates[cityKey].lng
          },
          score: 4
        });
      }
    });

    return results;
  }

  // Display search results in dropdown
  displaySearchResults(results, query) {
    const searchDropdown = document.getElementById('search-dropdown');
    const searchResults = document.getElementById('search-results');
    
    if (!searchResults) return;
    
    if (results.length === 0) {
      if (window.domUtils) {
        window.domUtils.setHTML(searchResults, '<div class="search-no-results">No results found</div>');
      } else {
        searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      }
      this.showSearchDropdown();
      return;
    }
    
    const resultHtml = results.map((result, index) => {
      const icon = this.getSearchResultIcon(result.type);
      const subtitle = this.getSearchResultSubtitle(result);
      const safeDisplay = window.domUtils ? window.domUtils.escapeHTML(result.display) : result.display;
      
      return `
        <div class="search-result-item" data-index="${index}" data-type="${result.type}">
          <div class="search-result-icon">${icon}</div>
          <div class="search-result-content">
            <div class="search-result-title">${this.highlightSearchTerm(safeDisplay, query)}</div>
            ${subtitle ? `<div class="search-result-subtitle">${subtitle}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    if (window.domUtils) {
      window.domUtils.setHTML(searchResults, resultHtml);
    } else {
      searchResults.innerHTML = resultHtml;
    }
    
    // Add click listeners
    searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectSearchResult(results[index]);
      });
      
      item.addEventListener('mouseenter', () => {
        this.searchSelectedIndex = index;
        this.updateSearchSelection(searchResults.querySelectorAll('.search-result-item'));
      });
    });
    
    this.showSearchDropdown();
    this.searchSelectedIndex = -1;

    // Callback for external handling
    if (this.searchResultsCallback) {
      this.searchResultsCallback(results, query);
    }
  }

  // Get icon for search result type
  getSearchResultIcon(type) {
    switch(type) {
      case 'pack': return '📦';
      case 'city': return '📍';
      case 'product': return '🏷️';
      default: return '🔍';
    }
  }

  // Get subtitle for search result
  getSearchResultSubtitle(result) {
    switch(result.type) {
      case 'pack':
        if (result.data.city) {
          const cityName = result.data.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `Pack in ${cityName}`;
        }
        return 'Pack';
      case 'city':
        return 'City';
      case 'product':
        return 'Product type';
      default:
        return '';
    }
  }

  // Highlight search term in result
  highlightSearchTerm(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  // Select a search result
  selectSearchResult(result) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = result.display;
    }
    
    this.hideSearchDropdown();
    
    // Handle different result types
    switch(result.type) {
      case 'pack':
        this.highlightPackOnMap(result.data);
        break;
      case 'city':
        this.focusOnCity(result.data);
        break;
      case 'product':
        this.filterByProductType(result.data.type);
        break;
    }
    
    this.isSearchActive = true;
    this.showSearchAreaButton();
  }

  // Highlight specific pack on map
  highlightPackOnMap(packData) {
    this.clearSearchHighlights();
    
    if (window.mapManager) {
      window.mapManager.highlightPacksOnMap([packData]);
      
      // Show modal after highlighting
      setTimeout(() => {
        if (window.vendorDisplayManager) {
          window.vendorDisplayManager.showVendorModal(packData);
        }
      }, 500);
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Pack highlighted on map', packData);
    }
  }

  // Focus on city
  focusOnCity(cityData) {
    this.clearSearchHighlights();
    
    if (window.mapManager) {
      window.mapManager.focusOnCity(cityData);
      
      // Filter packs in this city
      const cityPacks = this.searchData.filter(pack => {
        return pack.city === cityData.key;
      });
      
      window.mapManager.highlightPacksOnMap(cityPacks);
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Focused on city', cityData);
    }
  }

  // Filter by product type
  filterByProductType(productType) {
    this.clearSearchHighlights();
    
    if (window.mapManager) {
      // This would need to be implemented based on how products are categorized
      // For now, we'll highlight all markers
      window.mapManager.highlightPacksOnMap(this.searchData);
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Filtered by product type', productType);
    }
  }

  // Search current map area
  searchCurrentMapArea() {
    if (window.mapManager) {
      const visibleVendors = window.mapManager.searchCurrentMapArea();
      window.mapManager.highlightPacksOnMap(visibleVendors);
    }
    
    this.hideSearchAreaButton();

    if (window.errorHandler) {
      window.errorHandler.debug('Searched current map area');
    }
  }

  // Clear search
  clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    
    this.hideSearchDropdown();
    this.clearSearchHighlights();
    this.showSearchClearBtn(false);
    
    if (searchInput) {
      searchInput.focus();
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Search cleared');
    }
  }

  // Clear search highlights
  clearSearchHighlights() {
    this.isSearchActive = false;
    this.hideSearchAreaButton();
    
    if (window.mapManager) {
      window.mapManager.clearSearchHighlights();
    }
  }

  // UI helper functions
  showSearchDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.style.display = 'block';
  }

  hideSearchDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    this.searchSelectedIndex = -1;
  }

  showSearchClearBtn(show) {
    const btn = document.getElementById('search-clear-btn');
    if (btn) btn.style.display = show ? 'block' : 'none';
  }

  showSearchAreaButton() {
    const container = document.getElementById('search-area-container');
    if (container) container.style.display = 'block';
  }

  hideSearchAreaButton() {
    const container = document.getElementById('search-area-container');
    if (container) container.style.display = 'none';
  }

  updateSearchSelection(items) {
    items.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.searchSelectedIndex);
    });
  }

  // Set search results callback
  onSearchResults(callback) {
    this.searchResultsCallback = callback;
  }

  // Setup map event listeners (if map is available)
  setupMapEventListeners(map) {
    if (map) {
      map.addListener('bounds_changed', () => {
        if (this.isSearchActive) {
          this.showSearchAreaButton();
        }
      });

      if (window.errorHandler) {
        window.errorHandler.debug('Search map event listeners setup');
      }
    }
  }

  // Filter vendors by search term (legacy support)
  filterVendorsBySearch(searchTerm, vendors, currentFilter = 'all') {
    return vendors.filter(vendor => {
      const matchesSearch = vendor.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = currentFilter === 'all' || vendor.vendor === currentFilter;
      return matchesSearch && matchesFilter;
    });
  }

  // Get search data
  getSearchData() {
    return [...this.searchData];
  }

  // Update search data
  updateSearchData(data) {
    this.searchData = data;
    
    if (window.errorHandler) {
      window.errorHandler.debug(`Search data updated with ${data.length} items`);
    }
  }

  // Get search state
  getSearchState() {
    return {
      isActive: this.isSearchActive,
      selectedIndex: this.searchSelectedIndex,
      hasData: this.searchData.length > 0
    };
  }

  // Cleanup
  destroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    this.clearSearch();
    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Search manager destroyed');
    }
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.SearchManager = SearchManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchManager;
}