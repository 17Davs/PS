const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { db } = require("../db/init");
const { requireAuth, requireAdmin } = require("./auth");

// List receipts directory contents (restricted to admin)
router.get("/receipt", requireAuth, requireAdmin, (req, res) => {
  const basePath = path.join(__dirname, "../receipts");
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    const files = fs.readdirSync(basePath);
    res.send(`Directory contents: ${files.join(", ")}`);
  } else {
    res.status(404).send("Receipts directory not found");
  }
});

// Secure download receipt (fixed Path Traversal and IDOR)
router.get("/receipt/:filename", requireAuth, (req, res) => {
  const basePath = path.join(__dirname, "../receipts");
  const filename = req.params.filename;
  const filePath = path.join(basePath, filename);

  if (filePath.indexOf(basePath) !== 0) {
    return res.status(403).render("error", {
      message: "Access to this file is forbidden",
      isLoggedIn: !!req.user,
      isAdmin: req.user?.isAdmin || false,
    });
  }

  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      return res.status(400).send("Cannot download directories");
    }

    const receiptContent = fs.readFileSync(filePath, "utf8");
    const usernameMatch = receiptContent.match(/User: (.*)/);
    if (!usernameMatch) {
      return res.status(400).render("error", {
        message: "Invalid receipt format",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    }
    const receiptUsername = usernameMatch[1];

    if (receiptUsername !== req.user.username && !req.user.isAdmin) {
      return res.status(403).render("error", {
        message: "Access denied: You do not own this receipt",
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    }

    console.log("User downloading file:", filePath);
    res.sendFile(filePath);
  } else {
    res.status(404).render("error", {
      message: "Receipt not found",
      isLoggedIn: !!req.user,
      isAdmin: req.user?.isAdmin || false,
    });
  }
});

// Secure order details (fixed IDOR and SQL Injection)
router.get("/:id", requireAuth, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.userId;

  // [FIXED] - Added receiptFilename to the query for order details
  db.get(
    "SELECT orders.*, orders.receiptFilename, users.username, products.name AS productName, products.price AS productPrice " +
      "FROM orders " +
      "JOIN users ON orders.userId = users.id " +
      "JOIN products ON orders.productId = products.id " +
      "WHERE orders.id = ? AND orders.userId = ?",
    [orderId, userId],
    (err, order) => {
      if (err || !order) {
        res.status(404).render("error", {
          message: "Order not found or access denied",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        res.render("order", {
          order,
          isLoggedIn: !!req.user,
          username: req.user?.username || null,
          isAdmin: req.user?.isAdmin || false,
        });
      }
    }
  );
});

// Secure create a new order (fixed SQL Injection)
router.post("/", requireAuth, (req, res) => {
  const { productId } = req.body || {};
  const userId = req.user.userId;

  if (!userId || !productId) {
    res.status(400).render("error", {
      message: "Missing required fields",
      isLoggedIn: !!req.user,
      isAdmin: req.user?.isAdmin || false,
    });
    return;
  }

  db.run(
    "INSERT INTO orders (userId, productId, date) VALUES (?, ?, datetime('now'))",
    [userId, productId],
    function (err) {
      if (err) {
        res.status(500).render("error", {
          message: "Error creating order",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        const orderId = this.lastID;
        db.get(
          "SELECT username FROM users WHERE id = ?",
          [userId],
          (err, user) => {
            if (err) {
              res.status(500).render("error", {
                message: "Error fetching user",
                isLoggedIn: !!req.user,
                isAdmin: req.user?.isAdmin || false,
              });
              return;
            }
            db.get(
              "SELECT name, price FROM products WHERE id = ?",
              [productId],
              (err, product) => {
                if (err) {
                  res.status(500).render("error", {
                    message: "Error fetching product",
                    isLoggedIn: !!req.user,
                    isAdmin: req.user?.isAdmin || false,
                  });
                  return;
                }
                const randomFilename = `receipt_${crypto.randomUUID()}.txt`;
                const receiptContent = `
RedTech Tools Receipt
--------------------
Order ID: ${orderId}
User: ${user.username}
Product ID: ${productId}
Product Name: ${product.name}
Price: $${product.price}
Timestamp: ${new Date().toISOString()}
--------------------
Thank you for your purchase!
`;
                const receiptPath = path.join(
                  __dirname,
                  "../receipts",
                  randomFilename
                );
                fs.writeFileSync(receiptPath, receiptContent);

                db.run(
                  "UPDATE orders SET receiptFilename = ? WHERE id = ?",
                  [randomFilename, orderId],
                  (err) => {
                    if (err) {
                      res.status(500).render("error", {
                        message: "Error updating order with receipt filename",
                        isLoggedIn: !!req.user,
                        isAdmin: req.user?.isAdmin || false,
                      });
                      return;
                    }
                    res.redirect(`/orders/${orderId}`);
                  }
                );
              }
            );
          }
        );
      }
    }
  );
});

// My orders page
router.get("/", requireAuth, (req, res) => {
  const userId = req.user.userId;
  db.all(
    "SELECT orders.id AS orderId, orders.date, orders.receiptFilename, products.name, products.price " +
      "FROM orders " +
      "JOIN products ON orders.productId = products.id " +
      "WHERE orders.userId = ?",
    [userId],
    (err, orders) => {
      if (err) {
        res.status(500).render("error", {
          message: "Error fetching orders",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        res.render("my-orders", {
          orders,
          isLoggedIn: !!req.user,
          username: req.user?.username || null,
          isAdmin: req.user?.isAdmin || false,
        });
      }
    }
  );
});

module.exports = router;
