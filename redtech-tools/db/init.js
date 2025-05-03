const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Criar diretório db/ se não existir
const dbDir = path.join(__dirname, "..", "db");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Conectar ao banco
const dbPath = path.join(dbDir, "redtech.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    throw err;
  }
});

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Criar tabelas
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        email TEXT,
        isAdmin BOOLEAN
      )`,
        (err) => {
          if (err) return reject(err);
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price REAL
      )`,
        (err) => {
          if (err) return reject(err);
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        productId INTEGER,
        date TEXT
      )`,
        (err) => {
          if (err) return reject(err);
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER,
        userId INTEGER,
        comment TEXT
      )`,
        (err) => {
          if (err) return reject(err);
        }
      );

      // Inserir produtos de exemplo
      db.run(
        `INSERT OR IGNORE INTO products (id, name, description, price) VALUES
        (1, 'Metasploit Pro', 'Ferramenta de pentest avançada para exploração de vulnerabilidades', 299.99),
        (2, 'WiFi Pineapple', 'Dispositivo para testes de redes Wi-Fi e ataques MitM', 199.99),
        (3, 'Rubber Ducky', 'USB para injeção de payloads em sistemas', 49.99),
        (4, 'Burp Suite Professional', 'Software para testes de segurança em aplicações web', 399.00),
        (5, 'Kali Linux Toolkit', 'Distribuição Linux com ferramentas de segurança pré-instaladas', 0.00)`,
        (err) => {
          if (err) return reject(err);
          resolve(db);
        }
      );
    });
  });
}

module.exports = { db, initDatabase };
