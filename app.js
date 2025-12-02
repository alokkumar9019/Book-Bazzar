const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const connectMongo = require('connect-mongo');

let MongoStore = connectMongo;
if (connectMongo && connectMongo.default) MongoStore = connectMongo.default;

const flash = require("connect-flash");
require("dotenv").config();
const PORT = process.env.PORT || 3000;

// Set cookie parser before session so session middleware can access cookies
// cookie parser is used only once; it was previously declared before and here

// Session (store in MongoDB for production)
// Parse cookies before session and auth so req.cookies is available
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'abcdef',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
      touchAfter: 24 * 3600, // only resave session once per day (seconds)
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// flash must come after session
app.use(flash());

// Make flash messages available in views via res.locals.messages
app.use((req, res, next) => {
  try {
    res.locals.messages = {
      success: req.flash('success') || [],
      error: req.flash('error') || [],
    };
  } catch (e) {
    res.locals.messages = { success: [], error: [] };
  }
  next();
});

const db = require("./config/mongoose-connection");  // ✅ ONLY ONE MONGODB CONNECTION

app.set("view engine", "ejs");

const homeRouter = require("./routes/index");
const ownerRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const jwt = require('jsonwebtoken');
const userModel = require('./models/user.model');
const ownerModel = require('./models/owner.model');

app.use((req, res, next) => {
  res.locals.isAuthenticated = !!(req.cookies && req.cookies.token);
  next();
});

// Request/response timing middleware for performance debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.once('finish', () => {
    const ms = Date.now() - start;
    if (ms > 300) { // log only slow requests (over 300ms)
      console.log(`[PERF] ${req.method} ${req.originalUrl} took ${ms}ms`);
    }
  });
  next();
});

app.use(async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.isAdmin = false;

    if (req.cookies && req.cookies.token) {
      // Use env-based secret for JWT verification (falls back to SESSION_SECRET)
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'abcdef';
      const decoded = jwt.verify(req.cookies.token, jwtSecret);
      const user = await userModel.findOne({ email: decoded.email }).select('-password');

      if (user) {
        res.locals.user = user;
        res.locals.isAdmin = user.isadmin;
      } else {
        const owner = await ownerModel.findOne({ email: decoded.email });
        if (owner) res.locals.isAdmin = true;
      }
    }
  } catch {}
  next();
});

app.use("/", homeRouter);
app.use("/owners", ownerRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
