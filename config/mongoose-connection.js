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

// Enable insecure TLS for testing only when explicitly set (do NOT use in production)
if (process.env.DEBUG_TLS_ALLOW_INVALID === 'true') {
  connectOptions.tls = true;
  connectOptions.tlsAllowInvalidCertificates = true;
  dbgr('[DEBUG] tlsAllowInvalidCertificates=true (temporary testing only)');
}

dbgr(`Attempting to connect to MongoDB: ${maskUri(MONGODB_URI)}`);

// DNS debugging for SRV/A records (helps identify Render DNS issues)
try {
  const dns = require('dns').promises;
  (async () => {
    try {
      // Extract host only from URI
      const stripped = MONGODB_URI.replace(/^mongodb\+srv:\/\//, '').replace(/^mongodb:\/\//, '');
      const host = stripped.split('/')[0].split('?')[0].split(',')[0];
      if (host) {
        dbgr(`[DNS] resolving SRV for host: ${host}`);
        try {
          const srv = await dns.resolveSrv(`_mongodb._tcp.${host}`);
          dbgr(`[DNS] SRV records:`, srv);
        } catch (e) {
          dbgr(`[DNS] SRV resolve error (not necessarily fatal):`, e.message || e);
        }
        try {
          const a = await dns.resolve4(host);
          dbgr(`[DNS] A records:`, a);
        } catch (e) {
          dbgr(`[DNS] A resolve error:`, e.message || e);
        }
      }
    } catch (e) {
      dbgr('[DNS] DNS debug failure:', e.message || e);
    }
  })();
} catch (e) {
  dbgr('[DNS] DNS module not available or failed to run:', e.message || e);
}

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
