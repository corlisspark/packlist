// Setup Initial Firebase Configuration Data
// Run this script once to populate the config collection

async function setupInitialConfigs() {
  if (!window.db) {
    console.error('Firestore not initialized');
    return;
  }

  const configs = {
    'cities': {
      cities: [
        { name: 'San Francisco', state: 'CA', coordinates: { lat: 37.7749, lng: -122.4194 } },
        { name: 'Los Angeles', state: 'CA', coordinates: { lat: 34.0522, lng: -118.2437 } },
        { name: 'New York', state: 'NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
        { name: 'Chicago', state: 'IL', coordinates: { lat: 41.8781, lng: -87.6298 } },
        { name: 'Austin', state: 'TX', coordinates: { lat: 30.2672, lng: -97.7431 } }
      ]
    },
    'product-types': {
      types: [
        { id: 'high-tolerance', name: 'High Tolerance', icon: '🔥' },
        { id: 'bozo-headstash', name: 'Bozo Headstash', icon: '🤡' },
        { id: 'deep-fried', name: 'Deep Fried', icon: '🍟' },
        { id: 'gumbo', name: 'Gumbo', icon: '🍲' },
        { id: 'other', name: 'Other', icon: '📦' }
      ]
    },
    'vendor-categories': {
      categories: [
        { id: 'delivery', name: 'Delivery', icon: '🚗' },
        { id: 'pickup', name: 'Pickup', icon: '🏪' },
        { id: 'meetup', name: 'Meetup', icon: '🤝' }
      ]
    },
    'metro-areas': {
      areas: [
        {
          name: 'San Francisco Bay Area',
          bounds: {
            north: 38.5,
            south: 36.5,
            east: -121.0,
            west: -123.5
          },
          cities: ['San Francisco', 'Oakland', 'San Jose', 'Berkeley']
        },
        {
          name: 'Los Angeles Metro',
          bounds: {
            north: 34.8,
            south: 33.5,
            east: -117.5,
            west: -119.0
          },
          cities: ['Los Angeles', 'Long Beach', 'Anaheim', 'Santa Monica']
        }
      ]
    },
    'ui-strings': {
      strings: {
        appName: 'PacksList',
        tagline: 'Local Delivery',
        searchPlaceholder: 'Search for packs...',
        noResultsFound: 'No packs found in this area',
        signInPrompt: 'Sign in to post packs',
        emailVerificationRequired: 'Please verify your email to continue'
      }
    },
    'region-settings': {
      defaultRegion: 'sf-bay-area',
      supportedRegions: ['sf-bay-area', 'la-metro', 'ny-metro'],
      maxSearchRadius: 50,
      defaultSearchRadius: 10
    }
  };

  console.log('Setting up initial configurations...');

  for (const [configType, configData] of Object.entries(configs)) {
    try {
      await window.db.collection('config').doc(configType).set(configData);
      console.log(`✅ Config '${configType}' created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create config '${configType}':`, error);
    }
  }

  console.log('Initial configuration setup complete!');
}

// Run setup
setupInitialConfigs();