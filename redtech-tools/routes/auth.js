const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Registro (Cryptographic Failures)
router.post("/register", (req, res) => {
  const { username, password, email } = req.body;
  // Senha em texto plano
  db.run(
    `INSERT INTO users (username, password, email, isAdmin) VALUES ('${username}', '${password}', '${email}', 0)`
  );
  res.redirect("/auth/login");
});

// Login (SQLi e Username Enumeration)
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Vulnerável a SQLi
  db.get(`SELECT * FROM users WHERE username = '${username}'`, (err, user) => {
    if (!user) {
      // Username Enumeration
      res.send("Usuário não existe");
    } else if (user.password !== password) {
      // Username Enumeration
      res.send("Senha incorreta");
    } else {
      req.session.userId = user.id;
      res.redirect("/");
    }
  });
});

// Páginas de login e registro
router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

module.exports = router;
