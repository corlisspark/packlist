// Firebase Configuration for PacksList
// This file must be loaded before any other PacksList scripts

console.log('Loading Firebase configuration...');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWkbZRee5HZHTRKucfH-6rXezkgmMy29k",
  authDomain: "cw55hf8nvt.firebaseapp.com",
  projectId: "cw55hf8nvt"
};

// Check if we're running locally and provide debug info
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.warn('🚨 Running locally - Firebase domain authorization required!');
  console.log('Current origin:', window.location.origin);
  console.log('Firebase authDomain:', firebaseConfig.authDomain);
  console.log('Solution: Add localhost to Firebase authorized domains or access via:', `https://${firebaseConfig.authDomain}`);
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
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
}

// Make Firebase globally available
window.firebase = firebase;