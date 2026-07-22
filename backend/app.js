require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");

// Database & Routes
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const fileRoutes = require("./src/routes/fileRoutes");

// Initialize App
const app = express();

// Connect Database
connectDB();

// Security Middlewares
app.use(helmet());
app.use(compression());

// =======================
// CORS (ALLOW EVERYONE)
// =======================
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

// Body Parser
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FileGate Backend is Running 🚀",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
