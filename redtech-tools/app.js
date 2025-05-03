const express = require("express");
const path = require("path");
const session = require("express-session");
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const { initDatabase } = require("./db/init");

const app = express();

// Configuração vulnerável (Cryptographic Failures: sem HTTPS)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Sessão vulnerável (chave fraca, sem timeout)
app.use(
  session({
    secret: "insecure-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Inicializar banco de dados
initDatabase()
  .then(() => {
    // Rotas
    app.use("/", indexRouter);
    app.use("/auth", authRouter);
    app.use("/products", productsRouter);
    app.use("/orders", ordersRouter);

    // Tratamento de erro
    app.use((req, res) => {
      res.status(404).render("error", { message: "Página não encontrada" });
    });
  })
  .catch((err) => {
    console.error("Erro ao inicializar o banco de dados:", err);
    process.exit(1);
  });

console.log("Server is running on port 3000: http://localhost:3000");

module.exports = app;
