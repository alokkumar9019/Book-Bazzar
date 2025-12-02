require("dotenv").config();
const mongoose = require("mongoose");
const dbUri = process.env.MONGODB_URI;
if (!dbUri) {
  throw new Error('MONGODB_URI not set');
}

const connectOptions = {
  // server selection timeout ensures connect error surfaces quickly
  serverSelectionTimeoutMS: 10000,
  family: 4,
  // increase pool size to handle more concurrent operations
  maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '25', 10),
};

mongoose
  .connect(dbUri, connectOptions)
  .then(() => console.log(`MongoDB Connected Successfully to ${mongoose.connection.host}/${mongoose.connection.name}`))
  .catch((err) => console.error("MongoDB Connection Error:", err.message));

module.exports = mongoose.connection;
