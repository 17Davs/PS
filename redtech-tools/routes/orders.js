const express = require("express");
const router = express.Router();
const path = require("path");
const { db } = require("../db/init");

// Pedido (IDOR)
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  // Vulnerável a IDOR
  db.get(`SELECT * FROM orders WHERE id = ${orderId}`, (err, order) => {
    res.render("order", { order });
  });
});

router.post("/", (req, res) => {
  const { productId } = req.body;
  const userId = req.session.userId;
  db.run(
    `INSERT INTO orders (userId, productId, date) VALUES (${userId}, ${productId}, datetime('now'))`
  );
  res.redirect("/");
});

// Download de recibo (Path Traversal)
router.get("/receipt/:filename", (req, res) => {
  const filename = req.params.filename;
  // Vulnerável a Path Traversal
  res.sendFile(path.join(__dirname, "../receipts", filename));
});

module.exports = router;
