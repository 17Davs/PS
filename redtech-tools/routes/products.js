const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Product details and reviews (vulnerable to Stored XSS)
router.get("/:id", (req, res) => {
  const productId = req.params.id;
  // Vulnerable to SQLi (secondary vulnerability)
  db.get(`SELECT * FROM products WHERE id = ${productId}`, (err, product) => {
    if (err || !product) {
      res.status(404).render("error", {
        message: "Product not found",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      db.all(
        `SELECT * FROM reviews WHERE productId = ${productId}`,
        (err, reviews) => {
          res.render("product", {
            product,
            reviews,
            isLoggedIn: !!req.user,
            isAdmin: req.user?.isAdmin || false,
          });
        }
      );
    }
  });
});

// Submit a review (vulnerable to Stored XSS)
router.post("/:id/review", (req, res) => {
  const { comment } = req.body;
  const productId = req.params.id;
  const userId = req.user?.userId;
  if (!userId) {
    res.redirect("/auth/login");
    return;
  }
  // Escapes single quotes to avoid crashes, but still vulnerable to XSS
  const escapedComment = comment.replace(/'/g, "''");
  db.run(
    `INSERT INTO reviews (productId, userId, comment) 
        VALUES (${productId}, ${userId}, '${escapedComment}')`,
    (err) => {
      if (err) {
        res.status(500).render("error", {
          message: "Error submitting review",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        res.redirect(`/products/${productId}`);
      }
    }
  );
});

module.exports = router;
