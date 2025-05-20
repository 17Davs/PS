const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser"); // Add cookie-parser
const jwt = require("jsonwebtoken");
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");
const { db, initDatabase } = require("./db/init");

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Add cookie-parser middleware to parse cookies
app.use(cookieParser());

// Middleware to verify JWT
app.use((req, res, next) => {
  const token =
    req.headers["authorization"]?.split(" ")[1] || req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, "insecure-secret");
      req.user = decoded; // { userId, username, isAdmin }
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
});

// Middleware to check admin access
app.use("/admin", (req, res, next) => {
  if (!req.user) {
    return res.redirect("/auth/login");
  }
  if (!req.user.isAdmin) {
    return res
      .status(403)
      .render("error", { message: "Access denied: Admins only" });
  }
  next();
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
      res.status(404).render("error", { message: "Page not found" });
    });
  })
  .catch((err) => {
    console.error("Error initializing database:", err);
    process.exit(1);
  });

console.log(`Server is running at http://localhost:3000`);

module.exports = app;
