const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Register (Cryptographic Failures)
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
        res.render("login", {
          message: "Error during login",
          isLoggedIn: false,
        });
      } else if (!user) {
        // Username Enumeration
        db.get(
          `SELECT * FROM users WHERE username = '${username}'`,
          (err, exists) => {
            if (!exists) {
              res.render("login", {
                message: "User does not exist",
                isLoggedIn: false,
              });
            } else {
              res.render("login", {
                message: "Incorrect password",
                isLoggedIn: false,
              });
            }
          }
        );
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.isAdmin; // Set isAdmin in session
        res.redirect("/");
      }
    }
  );
});

// Forgot Password (SQLi)
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    message: null,
    users: null,
    isLoggedIn: !!req.session.userId,
    isAdmin: req.session.isAdmin || false,
  });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  // Vulnerável a SQLi
  db.all(
    `SELECT username, email FROM users WHERE email = '${email}'`,
    (err, users) => {
      if (err) {
        res.render("forgot-password", {
          message: "Error retrieving user",
          users: null,
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
      } else if (users.length === 0) {
        res.render("forgot-password", {
          message: "No user found with that email",
          users: null,
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
      } else {
        res.render("forgot-password", {
          message: "User(s) found",
          users,
          isLoggedIn: !!req.session.userId,
          isAdmin: req.session.isAdmin || false,
        });
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
  res.render("login", { message: null, isLoggedIn: false });
});

router.get("/register", (req, res) => {
  res.render("register", { isLoggedIn: false });
});

module.exports = router;
