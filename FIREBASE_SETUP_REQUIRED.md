# Firebase Setup Required

The application is experiencing permission errors and missing indexes. Follow these steps to fix the issues:

## 1. Update Firebase Security Rules

Copy the updated rules from `firebase-security-rules.txt` to your Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`cw55hf8nvt`)
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with the content from `firebase-security-rules.txt`
5. Click **Publish**

## 2. Add Required Firebase Indexes

The application needs these Firestore indexes. Go to **Firestore Database** → **Indexes** and create:

### Posts Index (for user pack queries)
- **Collection ID**: `posts`
- **Fields**:
  - `userId` (Ascending)
  - `created` (Descending)
  - `__name__` (Ascending)
- **Query scope**: Collection

**Or click this direct link from the error:**
https://console.firebase.google.com/v1/r/project/cw55hf8nvt/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9jdzU1aGY4bnZ0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wb3N0cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoLCgdjcmVhdGVkEAIaDAoIX19uYW1lX18QAg

### Additional Recommended Indexes
Create these for better performance:

1. **Notifications Index**
   - Collection: `notifications`
   - Fields: `userId` (Ascending), `createdAt` (Descending)

2. **Posts Status Index** 
   - Collection: `posts`
   - Fields: `status` (Ascending), `created` (Descending)

3. **Posts Location Index**
   - Collection: `posts` 
   - Fields: `location.city` (Ascending), `status` (Ascending), `created` (Descending)

## 3. Setup Configuration Data

1. Open `setup-configs.html` in your browser
2. Click "Setup All Configurations" 
3. This will populate the required config documents

## 4. Add Localhost to Authorized Domains (for local development)

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add these domains:
   - `localhost`
   - `127.0.0.1` 
   - `localhost:8000` (or whatever port you use)

## 5. Test the Setup

After completing the above:
1. Refresh your application
2. Try creating an account
3. All permission errors should be resolved

## Current Issues Being Fixed:

- ✅ **User profile access** - Fixed security rules recursion
- ✅ **Notifications permissions** - Updated rules for proper access
- ✅ **Favorites permissions** - Simplified access rules  
- ✅ **Favicon 404** - Added SVG favicon
- ⏳ **Missing indexes** - Need to be created in Firebase Console
- ⏳ **Domain authorization** - Need to add localhost to Firebase

## Error Details:

The main issues were:
1. Security rules had recursion when new users tried to read their profile
2. Missing Firestore indexes for complex queries
3. Domain authorization blocking localhost requests
4. Missing favicon causing 404s

Once you complete the Firebase Console setup, all authentication and data access should work properly.