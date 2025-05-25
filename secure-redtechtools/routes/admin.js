const express = require("express");
const router = express.Router();
const { db } = require("../db/init");
const { requireAuth, requireAdmin } = require("./auth");

// Admin panel (accessible only to users with isAdmin: true)
router.get("/", requireAuth, requireAdmin, (req, res) => {
  db.all("SELECT * FROM users", (err, users) => {
    if (err) {
      return res.status(500).render("error", {
        message: "Error fetching users",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    }
    db.all("SELECT * FROM products", (err, products) => {
      if (err) {
        return res.status(500).render("error", {
          message: "Error fetching products",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      }
      db.all("SELECT * FROM reviews", (err, reviews) => {
        if (err) {
          return res.status(500).render("error", {
            message: "Error fetching reviews",
            isLoggedIn: !!req.user,
            isAdmin: req.user?.isAdmin || false,
          });
        }
        res.render("admin", {
          users,
          products,
          reviews,
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      });
    });
  });
});

// Delete user (fixed SQL Injection)
router.post("/delete-user/:id", requireAuth, requireAdmin, (req, res) => {
  const userId = req.params.id;
  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
    if (err) {
      res.status(500).render("error", {
        message: "Error deleting user",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      res.redirect("/admin");
    }
  });
});

// Delete product (fixed SQL Injection)
router.post("/delete-product/:id", requireAuth, requireAdmin, (req, res) => {
  const productId = req.params.id;
  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.run("DELETE FROM products WHERE id = ?", [productId], (err) => {
    if (err) {
      res.status(500).render("error", {
        message: "Error deleting product",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      res.redirect("/admin");
    }
  });
});

// Delete review (fixed SQL Injection)
router.post("/delete-review/:id", requireAuth, requireAdmin, (req, res) => {
  const reviewId = req.params.id;
  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.run("DELETE FROM reviews WHERE id = ?", [reviewId], (err) => {
    if (err) {
      res.status(500).render("error", {
        message: "Error deleting review",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      res.redirect("/admin");
    }
  });
});

module.exports = router;
