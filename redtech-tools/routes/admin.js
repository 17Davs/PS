const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Admin panel
router.get("/", (req, res) => {
  db.all("SELECT * FROM users", (err, users) => {
    db.all("SELECT * FROM products", (err, products) => {
      db.all("SELECT * FROM reviews", (err, reviews) => {
        res.render("admin", { users, products, reviews });
      });
    });
  });
});

// Delete user
router.post("/delete-user/:id", (req, res) => {
  const userId = req.params.id;
  db.run(`DELETE FROM users WHERE id = ${userId}`, (err) => {
    if (err) {
      res
        .status(500)
        .render("error", {
          message: "Error deleting user",
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
    } else {
      res.redirect("/admin");
    }
  });
});

// Delete product
router.post("/delete-product/:id", (req, res) => {
  const productId = req.params.id;
  db.run(`DELETE FROM products WHERE id = ${productId}`, (err) => {
    if (err) {
      res
        .status(500)
        .render("error", {
          message: "Error deleting product",
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
    } else {
      res.redirect("/admin");
    }
  });
});

// Delete review
router.post("/delete-review/:id", (req, res) => {
  const reviewId = req.params.id;
  db.run(`DELETE FROM reviews WHERE id = ${reviewId}`, (err) => {
    if (err) {
      res
        .status(500)
        .render("error", {
          message: "Error deleting review",
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
    } else {
      res.redirect("/admin");
    }
  });
});

module.exports = router;
