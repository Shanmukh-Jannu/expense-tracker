require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATABASE CONNECTION =================

// ✅ Works for BOTH local + Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false } // for Render
    : false, // for local
});

// Test DB connection
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "secret123",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");

// ================= AUTH =================

// Register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2)",
    [email, hashedPassword]
  );

  res.redirect("/login");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.send("User not found");
  }

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.send("Wrong password");
  }

  req.session.userId = user.id;

  res.redirect("/");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ================= DASHBOARD =================

app.get("/", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  const result = await pool.query(
    "SELECT * FROM expenses WHERE user_id=$1 ORDER BY created_at DESC",
    [req.session.userId]
  );

  res.render("dashboard", { expenses: result.rows });
});

// Add expense
app.post("/add", async (req, res) => {
  const { title, amount, category } = req.body;

  await pool.query(
    "INSERT INTO expenses (title, amount, category, user_id) VALUES ($1, $2, $3, $4)",
    [title, amount, category, req.session.userId]
  );

  res.redirect("/");
});

// ================= EDIT =================

app.get("/edit/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM expenses WHERE id=$1",
    [req.params.id]
  );

  res.render("edit", { expense: result.rows[0] });
});

app.post("/edit/:id", async (req, res) => {
  const { title, amount, category } = req.body;

  await pool.query(
    "UPDATE expenses SET title=$1, amount=$2, category=$3 WHERE id=$4",
    [title, amount, category, req.params.id]
  );

  res.redirect("/");
});

// ================= DELETE =================

app.get("/delete/:id", async (req, res) => {
  await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
  res.redirect("/");
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});