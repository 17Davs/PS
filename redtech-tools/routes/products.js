const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Produto e avaliações (XSS)
router.get("/:id", (req, res) => {
  const productId = req.params.id;
  // Vulnerável a SQLi (secundário)
  db.get(`SELECT * FROM products WHERE id = ${productId}`, (err, product) => {
    db.all(
      `SELECT * FROM reviews WHERE productId = ${productId}`,
      (err, reviews) => {
        res.render("product", { product, reviews });
      }
    );
  });
});

router.post("/:id/review", (req, res) => {
  const { comment } = req.body;
  const productId = req.params.id;
  const userId = req.session.userId;
  // Vulnerável a XSS
  db.run(
    `INSERT INTO reviews (productId, userId, comment) VALUES (${productId}, ${userId}, '${comment}')`
  );
  res.redirect(`/products/${productId}`);
});

module.exports = router;
