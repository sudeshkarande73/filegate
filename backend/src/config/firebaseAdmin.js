const { initializeApp, cert } = require('firebase-admin/app');

// 1. Parse the JSON from the environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// 2. Initialize the modular app
initializeApp({
  credential: cert(serviceAccount)
});

console.log("✅ Firebase Admin (Modular) Initialized Successfully");