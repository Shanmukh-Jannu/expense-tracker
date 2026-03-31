require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ EJS Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ PostgreSQL (WORKS LOCAL + RENDER)
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

// ✅ Connect DB
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// ✅ Create Table Automatically
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount INT NOT NULL
      );
    `);
    console.log("✅ Table ready");
  } catch (err) {
    console.error("❌ Table error:", err);
  }
})();


// ================= ROUTES =================

// 👉 Home
app.get("/", (req, res) => {
  res.redirect("/login");
});

// 👉 Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

// 👉 Register Page
app.get("/register", (req, res) => {
  res.render("register");
});

// 👉 Dashboard Page
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});


// ================= API =================

// 👉 Get Expenses
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM expenses ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// 👉 Add Expense
app.post("/api/expenses", async (req, res) => {
  try {
    const { title, amount } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ error: "Missing data" });
    }

    const result = await pool.query(
      "INSERT INTO expenses (title, amount) VALUES ($1, $2) RETURNING *",
      [title, amount]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// 👉 Delete Expense
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM expenses WHERE id=$1",
      [req.params.id]
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});


// ✅ PORT (Render Fix)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});