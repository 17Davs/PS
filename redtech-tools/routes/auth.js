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
  // Vulnerável a SQLi (inclui password na query para facilitar bypass)
  db.get(
    `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`,
    (err, user) => {
      if (err) {
        res.render("login", { message: "Error during login" });
      } else if (!user) {
        // Username Enumeration
        db.get(
          `SELECT * FROM users WHERE username = '${username}'`,
          (err, exists) => {
            if (!exists) {
              res.render("login", { message: "Invalid Username" });
            } else {
              res.render("login", { message: "Incorrect password" });
            }
          }
        );
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect("/");
      }
    }
  );
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Páginas de login e registro
router.get("/login", (req, res) => {
  res.render("login", { message: null });
});

router.get("/register", (req, res) => {
  res.render("register");
});

module.exports = router;
