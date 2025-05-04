const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Produto e avaliações (XSS)
router.get("/:id", (req, res) => {
  const productId = req.params.id;
  // Vulnerável a SQLi (secundário)
  db.get(`SELECT * FROM products WHERE id = ${productId}`, (err, product) => {
    if (err || !product) {
      res
        .status(404)
        .render("error", {
          message: "Product not found",
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
    } else {
      db.all(
        `SELECT * FROM reviews WHERE productId = ${productId}`,
        (err, reviews) => {
          res.render("product", {
            product,
            reviews,
            isLoggedIn: !!req.session.userId,
            isAdmin: req.session.isAdmin || false,
          });
        }
      );
    }
  });
});

router.post("/:id/review", (req, res) => {
  const { comment } = req.body;
  const productId = req.params.id;
  const userId = req.session.userId;
  if (!userId) {
    res.redirect("/auth/login");
    return;
  }
  // Escapa aspas simples para evitar crash, mantém XSS
  const escapedComment = comment.replace(/'/g, "''");
  // Vulnerável a XSS
  db.run(
    `INSERT INTO reviews (productId, userId, comment) VALUES (${productId}, ${userId}, '${escapedComment}')`,
    (err) => {
      if (err) {
        res
          .status(500)
          .render("error", {
            message: "Error submitting review",
            isLoggedIn: !!req.session.userId,
            isAdmin: req.session.isAdmin || false,
          });
      } else {
        res.redirect(`/products/${productId}`);
      }
    }
  );
});

module.exports = router;
