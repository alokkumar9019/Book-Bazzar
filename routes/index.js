const express = require("express");
const productModel = require("../models/product.model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const router = express.Router();
const upload = require("../config/multer-config");
const userModel = require("../models/user.model");
router.get("/", (req, res) => {
  let error = req.flash("error");
  res.render("index", { error, user: true });
});

router.get("/shop", async (req, res) => {
  try {
    const cached = req.app.locals.productsCache;
    let products;
        if (cached && cached.count && (Date.now() - cached.timestamp) < 1000 * 60 * 2) {
          // Cache hit (2 minutes TTL)
          console.log('[SHOP] Cache hit for products');
          products = cached.products;
        } else {
          products = await productModel
            .find()
            .select('image name price discount bgcolor panelcolor textcolor')
            .lean();
          console.log("[SHOP] Products found:", products.length);
          req.app.locals.productsCache = { products, count: products.length, timestamp: Date.now() };
        }
    // Debug: show first product _id (if any)
    if (products && products.length > 0) console.log("[SHOP] First product:", products[0].name);
    res.render("listofproducts", { products });
  } catch (err) {
    console.error("[SHOP] Error loading products:", err);
    // Render page with an empty list so UI doesn't crash; show a helpful message
    req.flash("error", "Unable to load products right now. Please try again later.");
    res.render("listofproducts", { products: [] });
  }
});

// DEBUG: Return products count & first document (dev only)
router.get('/debug/products', async (req, res) => {
  try {
    const count = await productModel.countDocuments();
    const sample = await productModel.findOne();
    res.json({ count, sample });
  } catch (err) {
    console.error('[DEBUG] Error fetching products:', err);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

router.get("/wishlist/:id", isLoggedIn, async (req, res) => {
  // Use atomic update to reduce DB roundtrips
  await userModel.findOneAndUpdate(
    { email: req.user.email },
    { $push: { cart: req.params.id } },
    { new: true }
  );
  req.flash("success", "Product added to cart! 🛒");
  res.redirect("/shop");
});

router.get("/cart", isLoggedIn, async (req, res) => {
  const user = await userModel
    .findOne({ email: req.user.email })
    .populate("cart");
  res.render("cart", { user });
});

router.post("/cart/remove/:id", isLoggedIn, async (req, res) => {
  // Use atomic update to reduce DB roundtrips
  await userModel.findOneAndUpdate(
    { email: req.user.email },
    { $pull: { cart: req.params.id } },
    { new: true }
  );
  req.flash("success", "Product removed from cart! 🛒");
  res.redirect("/cart");
});

router.get("/myaccount", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email });
  res.render("myaccount", { user });
});

router.get("/admininfo", (req, res) => {
  res.render("admininfo");
});

router.get("/update-profile", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email });
  res.render("update-account", { user });
});

router.post(
  "/update-profile/:id",
  upload.single("picture"),
  async (req, res) => {
    const { fullname, contact } = req.body;
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    await userModel.findOneAndUpdate(
      { _id: req.params.id },
      { fullname, contact, picture: req.file.buffer }
    );

    res.redirect("/myaccount");
  }
);
module.exports = router;
