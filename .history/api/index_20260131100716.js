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
    const r = await pool.query("select current_user, current_database()");
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =======================
// Países (derivados desde games)
// =======================
app.get("/countries", async (req, res) => {
  const lang = String(req.query.lang || "es").toLowerCase();

  // Etiquetas mínimas (puedes ampliar después)
  const labels = {
    CO: { es: "Colombia", en: "Colombia" },
    ES: { es: "España", en: "Spain" },
  };

  try {
    const r = await pool.query(
      `
      SELECT DISTINCT country_code
      FROM games
      WHERE country_code IS NOT NULL
        AND country_code <> ''
      ORDER BY country_code
      `
    );

    const out = r.rows.map(({ country_code }) => {
      const iso2 = String(country_code || "").trim().toUpperCase();
      const label =
        (labels[iso2] && labels[iso2][lang]) ||
        (labels[iso2] && labels[iso2].es) ||
        iso2;

      return { iso2, label };
    });

    res.json(out);
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
