const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // For password hashing
const validator = require("validator"); // For input validation (e.g., email)
const { db } = require("../db/init");
const sanitizeHtml = require("sanitize-html");

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user?.userId) {
    return res.redirect("/auth/login");
  }
  next();
};

// Middleware to restrict to admin
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).render("error", {
      message: "Access denied: Admins only",
      isLoggedIn: !!req.user,
      isAdmin: false,
    });
  }
  next();
};

// Register page (GET)
router.get("/register", (req, res) => {
  res.render("register", { message: null, isLoggedIn: !!req.user });
});

// Register a new user (POST) - Fixed Cryptographic Failures
router.post("/register", async (req, res) => {
  let { username, email, password } = req.body;

  // Input validation
  if (!username || !email || !password) {
    return res.render("register", {
      message: "All fields are required",
      isLoggedIn: !!req.user,
    });
  }
  if (!validator.isEmail(email)) {
    return res.render("register", {
      message: "Invalid email format",
      isLoggedIn: !!req.user,
    });
  }
  if (username.length < 3 || password.length < 8) {
    return res.render("register", {
      message: "Username must be at least 3 characters, password at least 8",
      isLoggedIn: !!req.user,
    });
  }

  // [FIXED] - Sanitize username to prevent potential XSS if rendered unsafely
  username = sanitizeHtml(username, {
    allowedTags: [],
    allowedAttributes: {},
  });

  // Check if username or email already exists
  db.get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [username, email],
    async (err, user) => {
      if (err) {
        return res.status(500).render("error", {
          message: "Database error",
          isLoggedIn: !!req.user,
          isAdmin: false,
        });
      }
      if (user) {
        return res.render("register", {
          message: "Username or email already exists",
          isLoggedIn: !!req.user,
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      db.run(
        "INSERT INTO users (username, email, password, isAdmin) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, 0],
        (err) => {
          if (err) {
            return res.status(500).render("error", {
              message: "Error registering user",
              isLoggedIn: !!req.user,
              isAdmin: false,
            });
          }
          res.redirect("/auth/login");
        }
      );
    }
  );
});

// Login page (GET)
router.get("/login", (req, res) => {
  res.render("login", { message: null, isLoggedIn: !!req.user });
});

// Login (POST) - Fixed SQLi and Username Enumeration
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.render("login", {
      message: "All fields are required",
      isLoggedIn: !!req.user,
    });
  }

  // Secure query with parameterization
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).render("error", {
          message: "Database error",
          isLoggedIn: !!req.user,
          isAdmin: false,
        });
      }

      // Generic error message to prevent enumeration
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render("login", {
          message: "Invalid credentials",
          isLoggedIn: !!req.user,
        });
      }

      // Generate secure JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username, isAdmin: user.isAdmin },
        process.env.JWT_SECRET || "secure-long-random-secret-1234567890", // Use environment variable in production
        { expiresIn: "1h" }
      );

      // Set cookie with httpOnly, secure, and SameSite
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure in production
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
      });

      res.redirect("/");
    }
  );
});

// Forgot password page (GET)
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    message: null,
    users: null,
    isLoggedIn: !!req.user,
    isAdmin: req.user?.isAdmin || false,
  });
});

// Forgot password (POST) - Fixed SQLi and Input Validation
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  // Server-side input validation
  if (!email || !validator.isEmail(email)) {
    return res.status(400).render("forgot-password", {
      message: "Please provide a valid email",
      users: null,
      isLoggedIn: !!req.user,
      isAdmin: req.user?.isAdmin || false,
    });
  }

  // Secure query with parameterization and limit to 1 user
  db.get(
    "SELECT username, email FROM users WHERE email = ? LIMIT 1",
    [email],
    (err, user) => {
      // Generic response to prevent enumeration
      return res.render("forgot-password", {
        message: `Email sent to ${email} (if exists), check inbox`,
        isLoggedIn: !!req.user,
        isAdmin: req.user?.isAdmin || false,
      });
    }
  );
});

// Logout route - Clear the JWT cookie
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});

// Export the router and middleware for use in other routes
module.exports = {
  router,
  requireAuth,
  requireAdmin,
};
