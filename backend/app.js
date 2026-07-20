require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");           // 🚀 NEW: Security Headers
const compression = require("compression"); // 🚀 NEW: Payload Compression

// FIXED PATHS: Added ./src/ to point to the right folders
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes"); 
const fileRoutes = require("./src/routes/fileRoutes"); 

// Initialize App
const app = express();

// Connect to Database
connectDB();

// 🚀 NEW: Production Security Middlewares
app.use(helmet()); 
app.use(compression()); 

// 🚀 UPGRADED: Dynamic CORS array for Local + Production
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174',
  process.env.FRONTEND_URL // Reads your live Vercel URL during production!
].filter(Boolean); // Safely ignores FRONTEND_URL if it's undefined locally

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or postman) OR if origin is in our allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 
app.use(cookieParser()); 

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes); 

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is securely running on port ${PORT}`);
});