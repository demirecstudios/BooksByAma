require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully at:", res.rows[0].now);
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (err) {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "not configured",
    });
  }
});
// Import routes
const booksRoutes = require("./routes/books");
const categoriesRoutes = require("./routes/categories");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");
const orderRoutes = require("./routes/orders");

// Use routes
app.use("/api/books", booksRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = { app };
