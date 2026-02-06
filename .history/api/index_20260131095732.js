const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Conexión a Postgres
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://loteria:loteria123@localhost:5432/loterias",
});

// Health check
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// Root
app.get("/", (req, res) => res.send("API Loterias OK"));

// Saber usuario y BD
app.get("/dbwhoami", async (req, res) => {
  try {
    const r = await pool.query(
      "select current_user, current_database()"
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =======================
// Países
// =======================
app.get("/countries", async (req, res) => {
  const lang = String(req.query.lang || "es").toLowerCase();

  const label =
    lang === "en"
      ? "name_en AS label"
      : "name_es AS label";

  try {
    const r = await pool.query(
      `
      SELECT iso2, ${label}
      FROM countries
      WHERE is_active = true
      ORDER BY label
      `
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =======================
// Juegos por país
// =======================
app.get("/games", async (req, res) => {
  const country = String(req.query.country || "").toUpperCase().trim();
  if (!country) return res.status(400).end();

  try {
    const r = await pool.query(
      `
      SELECT id, code, name_es AS name
      FROM games
      WHERE country_code = $1
        AND is_active = true
      ORDER BY name_es
      `,
      [country]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Levantar servidor
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`API escuchando en http://localhost:${port}`)
);
