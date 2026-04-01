require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

// ================= VIEW ENGINE =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= DATABASE =================
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// connect DB
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// create tables
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INT,
        title TEXT,
        amount INT
      );
    `);

    console.log("✅ Tables Ready");
  } catch (err) {
    console.error("❌ Table Error:", err);
  }
})();

// ================= AUTH MIDDLEWARE =================
function isLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ================= ROUTES =================

// Root
app.get("/", (req, res) => res.redirect("/login"));

// Pages
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", isLoggedIn, (req, res) => res.render("dashboard"));

// ================= AUTH =================

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.redirect("/login");
  } catch (err) {
    res.send("User already exists");
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (result.rows.length === 0) return res.send("User not found");

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.send("Wrong password");

  req.session.userId = user.id;

  res.redirect("/dashboard");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ================= API =================

// Get expenses
app.get("/api/expenses", isLoggedIn, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM expenses WHERE user_id=$1 ORDER BY id DESC",
    [req.session.userId]
  );

  res.json(result.rows);
});

// Add expense
app.post("/api/expenses", isLoggedIn, async (req, res) => {
  const { title, amount } = req.body;

  const result = await pool.query(
    "INSERT INTO expenses (user_id, title, amount) VALUES ($1,$2,$3) RETURNING *",
    [req.session.userId, title, amount]
  );

  res.json(result.rows[0]);
});

// Delete expense
app.delete("/api/expenses/:id", isLoggedIn, async (req, res) => {
  await pool.query(
    "DELETE FROM expenses WHERE id=$1 AND user_id=$2",
    [req.params.id, req.session.userId]
  );

  res.json({ message: "Deleted" });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});