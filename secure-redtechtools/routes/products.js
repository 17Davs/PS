const express = require("express");
const router = express.Router();
const { db } = require("../db/init");
const { requireAuth, requireAdmin } = require("./auth");
const sanitizeHtml = require("sanitize-html");

// Product details and reviews (fixed SQL Injection)
router.get("/:id", (req, res) => {
  const productId = req.params.id;
  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
    if (err || !product) {
      res.status(404).render("error", {
        message: "Product not found",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    } else {
      // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
      db.all(
        "SELECT * FROM reviews WHERE productId = ?",
        [productId],
        (err, reviews) => {
          if (err) {
            res.status(500).render("error", {
              message: "Error fetching reviews",
              isLoggedIn: !!req.user,
              isAdmin: req.user?.isAdmin || false,
            });
          } else {
            res.render("product", {
              product,
              reviews,
              isLoggedIn: !!req.user,
              isAdmin: req.user?.isAdmin || false,
            });
          }
        }
      );
    }
  });
});

// Submit a review (fixed Stored XSS and SQL Injection)
router.post("/:id/review", requireAuth, (req, res) => {
  const { comment } = req.body || "";
  const productId = req.params.id;
  const userId = req.user?.userId;

  if (!userId) {
    res.redirect("/auth/login");
    return;
  }

  // [FIXED] - Sanitized comment to prevent Stored XSS using sanitize-html
  const sanitizedComment = sanitizeHtml(comment, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
  });

  // [FIXED] - Replaced string concatenation with parameterized query to prevent SQL Injection
  db.run(
    "INSERT INTO reviews (productId, userId, comment) VALUES (?, ?, ?)",
    [productId, userId, sanitizedComment],
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
