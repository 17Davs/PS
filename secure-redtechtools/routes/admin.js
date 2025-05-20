const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Admin panel (accessible only to users with isAdmin: true)
router.get("/", (req, res) => {
  db.all("SELECT * FROM users", (err, users) => {
    db.all("SELECT * FROM products", (err, products) => {
      db.all("SELECT * FROM reviews", (err, reviews) => {
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

// Delete user (vulnerable to SQL Injection, though not directly exploitable here)
router.post("/delete-user/:id", (req, res) => {
  const userId = req.params.id;
  db.run(`DELETE FROM users WHERE id = ${userId}`, (err) => {
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

// Delete product (vulnerable to SQL Injection, though not directly exploitable here)
router.post("/delete-product/:id", (req, res) => {
  const productId = req.params.id;
  db.run(`DELETE FROM products WHERE id = ${productId}`, (err) => {
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

// Delete review (vulnerable to SQL Injection, though not directly exploitable here)
router.post("/delete-review/:id", (req, res) => {
  const reviewId = req.params.id;
  db.run(`DELETE FROM reviews WHERE id = ${reviewId}`, (err) => {
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
