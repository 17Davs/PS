const express = require("express");
const router = express.Router();
const { db } = require("../db/init");
const { requireAuth, requireAdmin } = require("./auth");

// Homepage (catalog)
router.get("/", (req, res) => {
  db.all("SELECT * FROM products", (err, products) => {
    if (err) {
      res.status(500).render("error", {
        message: "Error fetching products",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      res.render("index", {
        products,
        searchQuery: null,
        isLoggedIn: !!req.user,
        username: req.user?.username || null,
        isAdmin: req.user?.isAdmin || false,
      });
    }
  });
});

// Product search (fixed SQL Injection)
router.get("/search", (req, res) => {
  let { query } = req.query || "";
  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.all(
    "SELECT * FROM products WHERE name LIKE ?",
    [`%${query}%`],
    (err, products) => {
      if (err) {
        res.status(500).render("error", {
          message: "Error searching products",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        res.render("index", {
          products,
          searchQuery: query, // Safe to pass since EJS escapes with <%= %>
          isLoggedIn: !!req.user,
          username: req.user?.username || null,
          isAdmin: req.user?.isAdmin || false,
        });
      }
    }
  );
});

module.exports = router;
