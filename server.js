require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

// ================= VIEW =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // ✅ local
});

// test connection
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// create tables
(async () => {
  try {
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
        category TEXT DEFAULT 'General'
      );
    `);

    console.log("✅ Tables Ready");
  } catch (err) {
    console.error("❌ Table Error:", err);
  }
})();

// ================= AUTH =================
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// ================= ROUTES =================
app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", isLoggedIn, (req, res) => res.render("dashboard"));

// register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users(email,password) VALUES($1,$2)",
      [email, hash]
    );
    res.redirect("/login");
  } catch {
    res.send("User already exists");
  }
});

// login
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

// logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ================= EXPENSE API =================

// get
app.get("/api/expenses", isLoggedIn, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM expenses WHERE user_id=$1 ORDER BY id DESC",
    [req.session.userId]
  );

  res.json(result.rows);
});

// add
app.post("/api/expenses", isLoggedIn, async (req, res) => {
  const { title, amount, category } = req.body;

  const result = await pool.query(
    "INSERT INTO expenses(user_id,title,amount,category) VALUES($1,$2,$3,$4) RETURNING *",
    [req.session.userId, title, amount, category]
  );

  res.json(result.rows[0]);
});

// delete
app.delete("/api/expenses/:id", isLoggedIn, async (req, res) => {
  await pool.query(
    "DELETE FROM expenses WHERE id=$1 AND user_id=$2",
    [req.params.id, req.session.userId]
  );

  res.json({ message: "Deleted" });
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});