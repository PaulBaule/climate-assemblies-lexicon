/* eslint-disable no-console */
const admin = require('firebase-admin');

// IMPORTANT: Path to your service account key file.
// You need to download this from your Firebase project settings.
// Example: './serviceAccountKey.json'
const serviceAccount = require('./serviceAccountKey.json');

// The UID of the user you want to make an admin.
// You can find this in the Firebase Authentication console.
const uid = 'swsh3eYLgZenIFdZxnRjJ6HyVwC3';

// Initialize the Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log('Firebase Admin SDK already initialized.');
  } else {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

// Set the custom claim 'admin' to true for the specified user
admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Successfully set user ${uid} as an admin.`);
    console.log('Please note: It may take a few minutes for the new role to propagate.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom user claims:', error);
    process.exit(1);
  }); 