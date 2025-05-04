const express = require("express");
const path = require("path");
const session = require("express-session");
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");
const { db, initDatabase } = require("./db/init");

const app = express();

// Vulnerable configuration (Cryptographic Failures: no HTTPS)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Vulnerable session (weak key, no timeout)
app.use(
  session({
    secret: "insecure-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to check admin access
app.use("/admin", (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }
  db.get(
    "SELECT isAdmin FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err || !user || !user.isAdmin) {
        return res
          .status(403)
          .render("error", { message: "Access denied: Admins only" });
      }
      next();
    }
  );
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
