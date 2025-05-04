const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { db } = require("../db/init");

// My orders page
router.get("/", (req, res) => {
  const userId = req.session.userId;
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
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
      } else {
        res.render("my-orders", {
          orders,
          isLoggedIn: !!req.session.userId,
          username: req.session.username || null,
          isAdmin: req.session.isAdmin || false,
        });
      }
    }
  );
});

// Pedido (IDOR)
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  const userId = req.session.userId;

  if (!userId) {
    res.redirect("/auth/login");
    return;
  }

  // Updated query to include product information
  db.get(
    `SELECT orders.*, products.name AS productName, products.price AS productPrice, users.username 
     FROM orders 
     JOIN products ON orders.productId = products.id 
     JOIN users ON orders.userId = users.id 
     WHERE orders.id = ? AND orders.userId = ?`,
    [orderId, userId],
    (err, order) => {
      if (err || !order) {
        res.status(404).render("error", {
          message: "Order not found",
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
      } else {
        res.render("order", {
          order,
          isLoggedIn: !!req.session.userId,
          username: req.session.username || null,
          isAdmin: req.session.isAdmin || false,
        });
      }
    }
  );
});

router.post("/", (req, res) => {
  const { productId } = req.body;
  const userId = req.session.userId;
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
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
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
                isLoggedIn: !!req.session.userId,
                isAdmin: req.session.isAdmin || false,
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
                    isLoggedIn: !!req.session.userId,
                    isAdmin: req.session.isAdmin || false,
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

// List receipts directory contents
router.get("/receipt", (req, res) => {
  const basePath = path.join(__dirname, "../receipts");
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    const files = fs.readdirSync(basePath);
    res.send(`Directory contents: ${files.join(", ")}`);
  } else {
    res.status(404).send("Receipts directory not found");
  }
});

// Download de recibo (Path Traversal)
router.get("/receipt/:filename", (req, res) => {
  const filename = req.params.filename || ""; // Default to empty string if no filename
  const basePath = path.join(__dirname, "../receipts");
  let filePath = path.join(basePath, filename);

  // Handle root directory listing (/orders/receipt/)
  if (filename === "" || filename === "/") {
    res.redirect("/orders/receipt");
    return;
  }

  // Vulnerável a Path Traversal
  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      // Listar conteúdos do diretório
      const files = fs.readdirSync(filePath);
      res.send(`Directory contents: ${files.join(", ")}`);
    } else {
      res.sendFile(filePath);
    }
  } else {
    // Redirect to /orders/receipt if file doesn't exist
    res.redirect("/orders/receipt");
  }
});

module.exports = router;
