import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3000";

export default function App() {
  const [lang, setLang] = useState("es");
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const [country, setCountry] = useState("");
  const [games, setGames] = useState([]);
  const [game, setGame] = useState("");

  // Cargar países
  useEffect(() => {
    fetch(`${API}/countries?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch((e) => setErr(String(e)));
  }, [lang]);

  // Cambio de país
  const onCountryChange = async (e) => {
    const next = e.target.value;
    setCountry(next);
    setGame("");
    setErr("");

    if (!next) {
      setGames([]);
      return;
    }

    try {
      const r = await fetch(`${API}/games?country=${next}`);
      const data = await r.json();
      setGames(Array.isArray(data) ? data : []);
    } catch (ex) {
      setErr(String(ex));
      setGames([]);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    return countries.filter((c) =>
      String(c.label || "").toLowerCase().includes(s)
    );
  }, [countries, q]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", padding: 24 }}>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Card principal */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 22,
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 1 }}>
                {lang === "es" ? "LOTERÍA" : "LOTTERY"}
              </div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                {lang === "es"
                  ? "Elige país y juego en segundos."
                  : "Pick country and game in seconds."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setLang("es")}
                disabled={lang === "es"}
                style={btn(lang === "es")}
              >
                ES
              </button>
              <button
                onClick={() => setLang("en")}
                disabled={lang === "en"}
                style={btn(lang === "en")}
              >
                EN
              </button>
            </div>
          </div>

          {err && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "rgba(220,20,60,0.18)",
                border: "1px solid rgba(220,20,60,0.35)",
                color: "white",
              }}
            >
              <b>Error:</b> {err}
            </div>
          )}

          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            <div>
              <div style={labelStyle}>
                {lang === "es" ? "Seleccione el país" : "Select country"}
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "es" ? "Buscar país..." : "Search country..."}
                style={inputStyle}
              />

              <select value={country} onChange={onCountryChange} style={selectStyle}>
                <option value="">
                  {lang === "es" ? "Seleccione..." : "Select..."}
                </option>

                {filtered.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>
                {lang === "es" ? "Seleccione el juego" : "Select game"}
              </div>

              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                disabled={!country}
                style={{
                  ...selectStyle,
                  opacity: !country ? 0.6 : 1,
                  cursor: !country ? "not-allowed" : "pointer",
                }}
              >
                <option value="">
                  {!country
                    ? lang === "es"
                      ? "Primero seleccione país"
                      : "Select country first"
                    : lang === "es"
                    ? "Seleccione..."
                    : "Select..."}
                </option>

                {games.map((g) => (
                  <option key={g.id} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Card lateral */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 18,
            padding: 18,
            color: "white",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.9 }}>
            {lang === "es" ? "Selección actual" : "Current selection"}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div style={pill}>
              <span style={{ opacity: 0.8 }}>{lang === "es" ? "País" : "Country"}</span>
              <b>{country || "—"}</b>
            </div>

            <div style={pill}>
              <span style={{ opacity: 0.8 }}>{lang === "es" ? "Juego" : "Game"}</span>
              <b>{game || "—"}</b>
            </div>
          </div>

          <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.4 }}>
            {lang === "es"
              ? "Luego seguimos con resultados, horarios, logos y colores por país."
              : "Next: results, schedules, logos and country themes."}
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(active) {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
    color: "white",
    cursor: active ? "default" : "pointer",
    fontWeight: 700,
  };
}

const labelStyle = { marginBottom: 8, fontWeight: 700, opacity: 0.92 };

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  marginBottom: 10,
};

const selectStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  cursor: "pointer",
};

const pill = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
};
