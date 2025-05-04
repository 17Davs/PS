const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Página inicial (catálogo)
router.get("/", (req, res) => {
  db.all("SELECT * FROM products", (err, products) => {
    res.render("index", {
      products,
      isLoggedIn: !!req.session.userId,
      username: req.session.username || null,
    });
  });
});

// Busca de produtos (SQLi)
router.get("/search", (req, res) => {
  const { query } = req.query;
  // Vulnerável a SQLi
  db.all(
    `SELECT * FROM products WHERE name LIKE '%${query}%'`,
    (err, products) => {
      res.render("index", {
        products,
        isLoggedIn: !!req.session.userId,
        username: req.session.username || null,
      });
    }
  );
});

module.exports = router;
