const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// OJO: en local (tu Mac) el host es localhost (porque expusimos 5432)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://loteria:loteria123@localhost:5432/loterias",
});

app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

app.get("/", (req, res) => res.send("API Loterias OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));

app.get("/dbwhoami", async (req, res) => {
  try {
    const r = await pool.query("select current_user, current_database()");
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
