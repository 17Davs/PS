const express = require("express");
const router = express.Router();
const path = require("path");
const { db } = require("../db/init");

// Pedido (IDOR)
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  // Vulnerável a IDOR, mas inclui username para demonstrar
  db.get(
    `SELECT orders.*, users.username FROM orders JOIN users ON orders.userId = users.id WHERE orders.id = ${orderId}`,
    (err, order) => {
      if (err || !order) {
        res.status(404).render("error", { message: "Order not found" });
      } else {
        res.render("order", { order });
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
    (err) => {
      if (err) {
        res.status(500).render("error", { message: "Error creating order" });
      } else {
        res.redirect("/");
      }
    }
  );
});

// Download de recibo (Path Traversal)
router.get("/receipt/:filename", (req, res) => {
  const filename = req.params.filename;
  // Vulnerável a Path Traversal
  res.sendFile(path.join(__dirname, "../receipts", filename));
});

module.exports = router;
