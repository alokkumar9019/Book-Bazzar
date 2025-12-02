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

app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'abcdef',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

const db = require("./config/mongoose-connection");  // ✅ ONLY ONE MONGODB CONNECTION

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

app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.cookies.token;
  next();
});

app.use(async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.isAdmin = false;

    if (req.cookies.token) {
      const decoded = jwt.verify(req.cookies.token, 'abcdef');
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
