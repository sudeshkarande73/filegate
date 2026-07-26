const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    // TEMPORARY: Since Firebase only gives us an email and password right now, 
    // we should make name false until you build a profile setup page later!
    required: false, 
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Active session tracking for concurrency control
  activeSessionToken: {
    type: String,
    default: null
  }
}, { timestamps: true });


// --- THE AUTO-CLEANUP SCRIPT ---
mongoose.connection.once('open', async () => {
  try {
    // This forces MongoDB to delete the old phone rule
    await mongoose.connection.collection('users').dropIndex('phone_1');
    console.log("SUCCESS: The ghost phone rule has been deleted!");
  } catch (error) {
    // It will silently ignore this if the index is already gone
  }
});

module.exports = mongoose.model('User', userSchema);