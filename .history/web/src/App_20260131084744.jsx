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

  // Cargar países (esto es un efecto válido)
  useEffect(() => {
    fetch(`${API}/countries?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch((e) => setErr(String(e)));
  }, [lang]);

  // Cargar juegos SOLO cuando el usuario cambia el país (evento, no effect)
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
    <div style={{ fontFamily: "Arial, sans-serif", padding: 24, maxWidth: 560 }}>
      <h1>{lang === "es" ? "LOTERÍA" : "LOTTERY"}</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setLang("es")} disabled={lang === "es"}>
          ES
        </button>{" "}
        <button onClick={() => setLang("en")} disabled={lang === "en"}>
          EN
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      <p>{lang === "es" ? "Seleccione el país:" : "Select country:"}</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={lang === "es" ? "Buscar país..." : "Search country..."}
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <select
        value={country}
        onChange={onCountryChange}
        style={{ width: "100%", padding: 8, marginBottom: 16 }}
      >
        <option value="">
          {lang === "es" ? "Seleccione..." : "Select..."}
        </option>

        {filtered.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.label}
          </option>
        ))}
      </select>

      <p>{lang === "es" ? "Seleccione el juego:" : "Select game:"}</p>

      <select
        value={game}
        onChange={(e) => setGame(e.target.value)}
        disabled={!country}
        style={{ width: "100%", padding: 8 }}
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
  );
}
