const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 PostgreSQL connection (Render ready)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ✅ Create table automatically
async function createTable() {
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
}
createTable();

// ✅ Test DB
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// 👉 Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ================= ROUTES =================

// 👉 Get all expenses
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM expenses ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// 👉 Add expense
app.post("/api/expenses", async (req, res) => {
  try {
    const { title, amount } = req.body;

    const result = await pool.query(
      "INSERT INTO expenses (title, amount) VALUES ($1, $2) RETURNING *",
      [title, amount]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

// 👉 Delete expense
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 👉 Fallback route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// 🔥 PORT FIX FOR RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});