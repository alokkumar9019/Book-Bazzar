const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const connectMongo = require('connect-mongo');
// connect-mongo can export either a function or a default; make usage resilient
let MongoStore = connectMongo;
if (connectMongo && connectMongo.default) MongoStore = connectMongo.default;
const flash = require("connect-flash");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'abcdef',
    resave: false,
    saveUninitialized: false,
    store: (function createMongoStore() {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookbazzar';
      // Preferred: MongoStore.create if available
      if (MongoStore && typeof MongoStore.create === 'function') {
        console.log('[SESSION] Using MongoStore.create');
        return MongoStore.create({ mongoUrl: mongoUri, ttl: 14 * 24 * 60 * 60 });
      }
      // Fallback: Some versions export a function that needs to be passed `session`
      if (typeof MongoStore === 'function') {
        try {
          // Try the constructor approach
          console.log('[SESSION] Using new MongoStore({...})');
          return new MongoStore({ mongoUrl: mongoUri, ttl: 14 * 24 * 60 * 60 });
        } catch (err) {
          try {
            console.log('[SESSION] Trying MongoStore(session) fallback');
            return MongoStore(session)({ url: mongoUri, ttl: 14 * 24 * 60 * 60 });
          } catch (err2) {
            console.error('Failed to create MongoStore with fallback methods:', err, err2);
            return undefined;
          }
        }
      }
      console.error('connect-mongo is not compatible; please upgrade/downgrade connect-mongo package');
      return undefined;
    })(),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
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
