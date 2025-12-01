const express = require("express");
const isLoggedIn = require("../middlewares/isLoggedIn");
const isAdmin = require("../middlewares/isAdmin");
const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product.model");
router.get("/", isLoggedIn, (req, res) => {
  res.send(req.user);
});

router.post("/create", isLoggedIn, isAdmin, upload.single("image"), async (req, res) => {
  const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;
  // If the upload is memory-based, write to public/uploads and store path
  let imagePath = '';
  if (req.file && req.file.buffer) {
    const fs = require('fs');
    const path = require('path');
    const filename = Date.now() + '-' + req.file.originalname.replace(/\s+/g, '-');
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, req.file.buffer);
    imagePath = '/uploads/' + filename;
  }

  const product = await productModel.create({
    image: imagePath,
    name,
    price,
    discount,
    bgcolor,
    panelcolor,
    textcolor,
  });

  res.redirect("/owners/admin");
});
module.exports = router;
