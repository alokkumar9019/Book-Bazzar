require("dotenv").config();
const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is missing from .env");
}

dbgr("Connecting to MongoDB...");

// Clean connection (no deprecated options!)
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    dbgr("✅ MongoDB connected!");
    console.log("MongoDB connected:", mongoose.connection.host);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

module.exports = mongoose.connection;
