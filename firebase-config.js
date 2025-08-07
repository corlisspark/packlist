// Firebase Configuration for PacksList
// This file must be loaded before any other PacksList scripts

<<<<<<< HEAD
console.log('Loading Firebase configuration...');
=======
// Firebase configuration loading
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWkbZRee5HZHTRKucfH-6rXezkgmMy29k",
  authDomain: "cw55hf8nvt.firebaseapp.com",
  projectId: "cw55hf8nvt"
};

// Check if we're running locally and provide debug info
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
<<<<<<< HEAD
  console.warn('🚨 Running locally - Firebase domain authorization required!');
  console.log('Current origin:', window.location.origin);
  console.log('Firebase authDomain:', firebaseConfig.authDomain);
  console.log('Solution: Add localhost to Firebase authorized domains or access via:', `https://${firebaseConfig.authDomain}`);
=======
  // Running locally - Firebase domain authorization required
  // Current origin: window.location.origin
  // Firebase authDomain: firebaseConfig.authDomain
  // Solution: Add localhost to Firebase authorized domains
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
<<<<<<< HEAD
  console.log('Firebase initialized successfully');
  
  // Initialize Firestore
  window.db = firebase.firestore();
  console.log('Firestore initialized');
  
  // Test Firebase Auth availability
  if (firebase.auth) {
    console.log('Firebase Auth is available');
  } else {
    console.warn('Firebase Auth not available');
  }
  
} catch (error) {
  console.error('Error initializing Firebase:', error);
=======
  // Firebase initialized successfully
  
  // Initialize Firestore
  window.db = firebase.firestore();
  // Firestore initialized
  
  // Test Firebase Auth availability
  if (firebase.auth) {
    // Firebase Auth is available
  } else {
    // Firebase Auth not available
  }
  
} catch (error) {
  // Error initializing Firebase - check configuration
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
}

// Make Firebase globally available
window.firebase = firebase;