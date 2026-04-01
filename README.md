# expense-tracker
# 💰 Personal Expense Tracker (Full Stack Web Application)

A modern full-stack web application to manage daily income and expenses with real-time balance calculation and interactive analytics.

---

## 🚀 Features

- 🔐 User Authentication (Register & Login)
- ➕ Add Income & Expenses
- ✏️ Edit Expenses
- 🗑 Delete Expenses
- 💰 Automatic Balance Calculation
- 📊 Category-wise Expense Pie Chart
- 📈 Income vs Expense Bar Chart
- 🌙 Premium Dark Theme UI
- ⚡ Fast & Responsive Interface

---

## 🧠 Core Concept

The application helps users track their financial activities by calculating:
Balance = Total Income - Total expenses

- If balance is positive → shown in **green**
- If balance is negative → shown in **red**

---

## 🛠 Tech Stack

### 🔹 Frontend
- HTML5
- CSS3
- EJS (Embedded JavaScript Templates)
- Chart.js (for graphs)

### 🔹 Backend
- Node.js
- Express.js

### 🔹 Database
- PostgreSQL

### 🔹 Authentication
- bcrypt (password hashing)
- express-session (session management)

---

## 📂 Project Structure
expense-tracker/
│
├── views/
│ ├── login.ejs
│ ├── register.ejs
│ └── dashboard.ejs
│
├── server.js
├── package.json
├── package-lock.json
├── .env
└── README.md

