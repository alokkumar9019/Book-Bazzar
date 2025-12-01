require("dotenv").config();

const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const url = require('url');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in the .env file!");
}

function maskUri(uri) {
  try {
    const parsed = new url.URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    if (parsed.password) parsed.password = '*****';
    return `${parsed.username}:${parsed.password}@${parsed.host}${parsed.pathname}`;
  } catch (e) {
    return 'MASKED_URI';
  }
}

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  family: 4,
};

dbgr(`Attempting to connect to MongoDB: ${maskUri(MONGODB_URI)}`);

mongoose
  .connect(MONGODB_URI, connectOptions)
  .then(() => {
    dbgr("✅ MongoDB connected successfully!");
    dbgr(`MongoDB host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    dbgr("❌ MongoDB connection error:", err.message || err);
    dbgr("Connection options:", connectOptions);
  });

module.exports = mongoose.connection;
