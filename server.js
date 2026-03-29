const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

dotenv.config();

const app = express();

// ================= DB =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("PostgreSQL Connected ✅"))
  .catch(err => console.error("DB Error ❌", err));

// ================= MIDDLEWARE =================
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

// ================= AUTH =================
function isAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// ================= ROUTES =================

// HOME
app.get("/", (req, res) => {
  res.redirect("/login");
});

// ---------------- REGISTER ----------------
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashedPassword]
    );

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.send("Register error ❌");
  }
});

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.send("User not found ❌");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = user;
      res.redirect("/dashboard");
    } else {
      res.send("Wrong password ❌");
    }

  } catch (err) {
    console.error(err);
    res.send("Login error ❌");
  }
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard", isAuth, async (req, res) => {
  const user_id = req.session.user.id;

  const expenses = await pool.query(
    "SELECT * FROM expenses WHERE user_id=$1 ORDER BY created_at",
    [user_id]
  );

  const totalResult = await pool.query(
    "SELECT SUM(amount) FROM expenses WHERE user_id=$1",
    [user_id]
  );

  const total = totalResult.rows[0].sum || 0;

  // CATEGORY CHART
  const categoryResult = await pool.query(
    "SELECT category, SUM(amount) as total FROM expenses WHERE user_id=$1 GROUP BY category",
    [user_id]
  );

  const categories = categoryResult.rows.map(r => r.category);
  const amounts = categoryResult.rows.map(r => r.total);

  // DAILY CHART
  const dailyResult = await pool.query(
    "SELECT DATE(created_at) as day, SUM(amount) as total FROM expenses WHERE user_id=$1 GROUP BY day ORDER BY day",
    [user_id]
  );

  const dailyLabels = dailyResult.rows.map(r =>
    new Date(r.day).toLocaleDateString()
  );

  const dailyData = dailyResult.rows.map(r => r.total);

  res.render("dashboard", {
    expenses: expenses.rows,
    total,
    categories,
    amounts,
    dailyLabels,
    dailyData
  });
});

// ---------------- ADD EXPENSE ----------------
app.post("/add-expense", isAuth, async (req, res) => {
  const { title, amount, category } = req.body;
  const user_id = req.session.user.id;

  await pool.query(
    "INSERT INTO expenses (title, amount, category, user_id, created_at) VALUES ($1,$2,$3,$4,NOW())",
    [title, amount, category, user_id]
  );

  res.redirect("/dashboard");
});

// ---------------- DELETE ----------------
app.get("/delete-expense/:id", isAuth, async (req, res) => {
  await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
  res.redirect("/dashboard");
});

// ---------------- EDIT ----------------
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

  res.redirect("/dashboard");
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000 🚀");
});