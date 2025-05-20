const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Homepage (catalog)
router.get("/", (req, res) => {
  db.all("SELECT * FROM products", (err, products) => {
    res.render("index", {
      products,
      isLoggedIn: !!req.user,
      username: req.user?.username || null,
      isAdmin: req.user?.isAdmin || false,
    });
  });
});

// Product search (vulnerable to SQL Injection)
router.get("/search", (req, res) => {
  const { query } = req.query;
  // Vulnerable to SQLi: allows injection via unsanitized query parameter
  db.all(
    `SELECT * FROM products WHERE name LIKE '%${query}%'`,
    (err, products) => {
      res.render("index", {
        products,
        isLoggedIn: !!req.user,
        username: req.user?.username || null,
        isAdmin: req.user?.isAdmin || false,
      });
    }
  );
});

module.exports = router;
