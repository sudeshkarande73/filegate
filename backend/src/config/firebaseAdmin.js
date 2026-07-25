const admin = require('firebase-admin');

// You will get this JSON from the Firebase Console (Project Settings > Service Accounts)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;