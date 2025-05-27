const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const indexRouter = require("./routes/index"); // Direct import
const {
  router: authRouter,
  requireAuth,
  requireAdmin,
} = require("./routes/auth");
const productsRouter = require("./routes/products"); // Direct import
const ordersRouter = require("./routes/orders"); // Direct import
const adminRouter = require("./routes/admin"); // Direct import
const { db, initDatabase } = require("./db/init");

require("dotenv").config();

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "sd4x7eEtULkm3Dr7Jn8CysxzcFkp4Ls2", // [FIXED] - Use secure session secret from environment variable
    resave: false,
    saveUninitialized: true, // [FIXED] - Allow session for unauthenticated users
    cookie: {
      secure: process.env.NODE_ENV === "production", // [FIXED] - Secure cookies in production
      sameSite: "Lax", // [FIXED] - Prevent CSRF by restricting cross-site cookie usage
    },
  })
);

// Add cookie-parser middleware to parse cookies
app.use(cookieParser());

// Middleware to verify JWT and re-validate user
app.use((req, res, next) => {
  const token =
    req.headers["authorization"]?.split(" ")[1] || req.cookies.token;
  if (token) {
    try {
      // [FIXED] - Use secure JWT secret from environment variable
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET ||
          "FtA44jd4iEA6ku5NEhW9PqVFoGe4XpRud2Y0QCo7wzeQL"
      );

      // [FIXED] - Re-validate user against database to ensure token is still valid
      db.get(
        "SELECT id, username, isAdmin FROM users WHERE id = ?",
        [decoded.userId],
        (err, user) => {
          if (err || !user) {
            req.user = null; // User not found or deleted
            res.clearCookie("token", { sameSite: "Lax" }); // [FIXED] - Clear with SameSite
            return next();
          }
          // Ensure token data matches current user data
          if (
            user.id === decoded.userId &&
            user.username === decoded.username &&
            user.isAdmin === decoded.isAdmin
          ) {
            req.user = {
              userId: user.id,
              username: user.username,
              isAdmin: user.isAdmin,
            };
          } else {
            req.user = null; // Token data outdated
            res.clearCookie("token", { sameSite: "Lax" }); // [FIXED] - Clear with SameSite
          }
          next();
        }
      );
    } catch (err) {
      req.user = null;
      res.clearCookie("token", { sameSite: "Lax" }); // [FIXED] - Clear with SameSite
      next();
    }
  } else {
    req.user = null;
    next();
  }
});

// Initialize database
initDatabase()
  .then(() => {
    // Routes
    app.use("/", indexRouter);
    app.use("/auth", authRouter);
    app.use("/products", productsRouter);
    app.use("/orders", ordersRouter);
    app.use("/admin", adminRouter);

    // Error handling
    app.use((req, res) => {
      // [FIXED] - Added isLoggedIn and isAdmin for consistent UI rendering
      res.status(404).render("error", {
        message: "Page not found",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    });
  })
  .catch((err) => {
    console.error("Error initializing database:", err);
    process.exit(1);
  });

console.log(`Server is running at http://localhost:3000`);

module.exports = app;
