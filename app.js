const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
app.use(flash());
app.use(
  session({
    secret: "abcdef",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);
app.use((req, res, next) => {
  res.locals.messages = {
    success: req.flash("success"),
    error: req.flash("error"),
  };
  next();
});

const db = require("./config/mongoose-connection");
app.set("view engine", "ejs");

const homeRouter = require("./routes/index");
const ownerRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
const jwt = require('jsonwebtoken');
const userModel = require('./models/user.model');
const ownerModel = require('./models/owner.model');

// Middleware to pass the token status to EJS views
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.cookies.token; // Set isAuthenticated as true if token exists
  next();
});

// If user has a token, decode it and populate res.locals with user and isAdmin
app.use(async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.isAdmin = false;
    if (req.cookies.token) {
      const decoded = jwt.verify(req.cookies.token, 'abcdef');
      const user = await userModel.findOne({ email: decoded.email }).select('-password');
      if (user) {
        res.locals.user = user;
        if (user.isadmin) res.locals.isAdmin = true;
      }
      // If not found in users, check ownerModel
      if (!res.locals.isAdmin) {
        const owner = await ownerModel.findOne({ email: decoded.email });
        if (owner) res.locals.isAdmin = true;
      }
    }
  } catch (err) {
    // Ignore; res.locals will remain default
  }
  next();
});
app.use("/", homeRouter);
app.use("/owners", ownerRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);

app.listen(PORT,()=>{
  console.log(`Server started on ${PORT}` )
});
