require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== DATABASE =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/expense_tracker",
  ssl: false
});

// create tables
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INT,
      title TEXT,
      amount INT,
      category TEXT,
      type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ DB Ready");
})();

// ===== AUTH MIDDLEWARE =====
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// ===== ROUTES =====
app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", isLoggedIn, (req, res) => res.render("dashboard"));

// ===== AUTH =====
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1,$2)",
      [email, hash]
    );
    res.redirect("/login");
  } catch {
    res.send("User exists");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (result.rows.length === 0) return res.send("User not found");

  const valid = await bcrypt.compare(password, result.rows[0].password);

  if (!valid) return res.send("Wrong password");

  req.session.userId = result.rows[0].id;
  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ===== API =====
app.get("/api/expenses", isLoggedIn, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM expenses WHERE user_id=$1 ORDER BY id DESC",
    [req.session.userId]
  );
  res.json(result.rows);
});

app.post("/api/expenses", isLoggedIn, async (req, res) => {
  const { title, amount, category, type } = req.body;

  const result = await pool.query(
    `INSERT INTO expenses (user_id,title,amount,category,type)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.session.userId, title, amount, category, type]
  );

  res.json(result.rows[0]);
});

app.delete("/api/expenses/:id", isLoggedIn, async (req, res) => {
  await pool.query(
    "DELETE FROM expenses WHERE id=$1 AND user_id=$2",
    [req.params.id, req.session.userId]
  );
  res.json({ success: true });
});

app.put("/api/expenses/:id", isLoggedIn, async (req, res) => {
  const { title, amount, category, type } = req.body;

  await pool.query(
    `UPDATE expenses SET title=$1, amount=$2, category=$3, type=$4
     WHERE id=$5 AND user_id=$6`,
    [title, amount, category, type, req.params.id, req.session.userId]
  );

  res.json({ success: true });
});

app.listen(3000, () => console.log("🚀 Running on 3000"));