const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { db } = require("../db/init");

// Login page
router.get("/login", (req, res) => {
  res.render("login", { message: null, isLoggedIn: !!req.user });
});

// Register page
router.get("/register", (req, res) => {
  res.render("register", { isLoggedIn: !!req.user });
});

// Register user (vulnerable to Cryptographic Failures: plaintext password storage)
router.post("/register", (req, res) => {
  const { username, password, email } = req.body;
  db.run(
    `INSERT INTO users (username, password, email, isAdmin) VALUES ('${username}', '${password}', '${email}', 0)`
  );
  res.redirect("/auth/login");
});

// Login (vulnerable to SQL Injection and Username Enumeration)
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Vulnerable to SQLi: unsanitized input in query
  db.get(
    `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`,
    (err, user) => {
      if (err) {
        res.render("login", {
          message: "Error during login",
          isLoggedIn: false,
        });
      } else if (!user) {
        // Username Enumeration: different messages for non-existent user vs wrong password
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
        // Generate JWT without httpOnly (vulnerable to XSS)
        const token = jwt.sign(
          { userId: user.id, username: user.username, isAdmin: user.isAdmin },
          "insecure-secret",
          { expiresIn: "1h" }
        );
        res.cookie("token", token); // No httpOnly, allows token theft via XSS
        res.redirect("/");
      }
    }
  );
});

// Forgot password page
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    message: null,
    users: null,
    isLoggedIn: !!req.user,
    isAdmin: req.user?.isAdmin || false,
  });
});

// Forgot password (vulnerable to SQL Injection)
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  // Vulnerable to SQLi: unsanitized input in query
  db.all(
    `SELECT username, email FROM users WHERE email = '${email}'`,
    (err, users) => {
      if (err) {
        res.render("forgot-password", {
          message: "Error retrieving user",
          users: null,
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else if (users.length === 0) {
        res.render("forgot-password", {
          message: "No user found with that email",
          users: null,
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      } else {
        res.render("forgot-password", {
          message: "User(s) found",
          users,
          isLoggedIn: !!req.user,
          isAdmin: req.user?.isAdmin || false,
        });
      }
    }
  );
});

// Logout (clear JWT cookie)
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

module.exports = router;
