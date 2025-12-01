require('dotenv').config();

const path = require('path');
const mongooseConnection = require('../config/mongoose-connection');
const Product = require('../models/product.model');

const productsPath = path.join(__dirname, '..', 'seed', 'products.json');
const products = require(productsPath);

(async function seed() {
  try {
    console.log('Connecting to MongoDB...');

    // Wait for mongoose connection to be ready
    await new Promise((resolve, reject) => {
      mongooseConnection.once('open', resolve);
      mongooseConnection.on('error', reject);
    });

    console.log('Connected. Seeding products...');

    // Optionally clear existing products - comment out if you don't want this
    await Product.deleteMany({});

    const inserted = await Product.insertMany(products);

    console.log(`Inserted ${inserted.length} products successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
