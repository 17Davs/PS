const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { db } = require("../db/init");

// List receipts directory contents (for admin or user reference)
router.get("/receipt", (req, res) => {
  const basePath = path.join(__dirname, "../receipts");
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    const files = fs.readdirSync(basePath);
    res.send(`Directory contents: ${files.join(", ")}`);
  } else {
    res.status(404).send("Receipts directory not found");
  }
});

// Download receipt (vulnerable to Path Traversal)
router.get("/receipt/:filename", (req, res) => {
  const basePath = path.join(__dirname, "../receipts");
  let filePath = path.resolve(basePath, req.params.filename); // Resolve to prevent Path Traversal

  // Vulnerable to Path Traversal: allows access to files outside receipts/
  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      // List directory contents
      const files = fs.readdirSync(filePath);
      res.send(`Directory contents: ${files.join(", ")}`);
    } else {
      console.log("User downloading file:", filePath);
      res.sendFile(filePath);
    }
  } else {
    // Vulnerable/Misconfiguration/Insecure: Redirect to /orders/receipt if file doesn't exist
    console.log("File not found:", filePath);
    res.redirect("/orders/receipt");
  }
});

// Order details (vulnerable to IDOR)
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  // Vulnerable to IDOR: no check if user owns the order
  db.get(
    `SELECT orders.*, users.username, products.name AS productName, products.price AS productPrice 
     FROM orders 
     JOIN users ON orders.userId = users.id 
     JOIN products ON orders.productId = products.id 
     WHERE orders.id = ${orderId}`,
    (err, order) => {
      if (err || !order) {
        res.status(404).render("error", {
          message: "Order not found",
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

// Create a new order
router.post("/", (req, res) => {
  const { productId } = req.body;
  const userId = req.user?.userId;
  if (!userId) {
    res.redirect("/auth/login");
    return;
  }
  db.run(
    `INSERT INTO orders (userId, productId, date) VALUES (${userId}, ${productId}, datetime('now'))`,
    function (err) {
      if (err) {
        res.status(500).render("error", {
          message: "Error creating order",
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        const orderId = this.lastID;
        // Fetch user and product details for the receipt
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
                // Generate receipt
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
                  `receipt${orderId}.txt`
                );
                fs.writeFileSync(receiptPath, receiptContent);
                res.redirect(`/orders/${orderId}`);
              }
            );
          }
        );
      }
    }
  );
});

// My orders page
router.get("/", (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.redirect("/auth/login");
    return;
  }
  db.all(
    `SELECT orders.id AS orderId, orders.date, products.name, products.price 
          FROM orders 
          JOIN products ON orders.productId = products.id 
          WHERE orders.userId = ?`,
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
