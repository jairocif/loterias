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

  useEffect(() => {
    fetch(`${API}/countries?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch((e) => setErr(String(e)));
  }, [lang]);

  const onCountryChange = async (e) => {
    const next = e.target.value;
    setCountry(next);
    setGame("");
    setErr("");
    setQ("");

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

  const selectedGameName = useMemo(() => {
    if (!game) return "";
    const g = games.find((x) => String(x.code) === String(game));
    return g ? String(g.name || g.code || "") : String(game);
  }, [game, games]);

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <div style={styles.title}>{lang === "es" ? "LOTERÍA" : "LOTTERY"}</div>
            <div style={styles.subtitle}>
              {lang === "es" ? "Elige país y juego." : "Pick country and game."}
            </div>
          </div>

          <div style={styles.langWrap}>
            <button
              onClick={() => setLang("es")}
              disabled={lang === "es"}
              style={styles.langBtn(lang === "es")}
            >
              ES
            </button>
            <button
              onClick={() => setLang("en")}
              disabled={lang === "en"}
              style={styles.langBtn(lang === "en")}
            >
              EN
            </button>
          </div>
        </header>

        <main style={styles.main}>
          <section style={styles.card}>
            {err && (
              <div style={styles.errorBox}>
                <b>Error:</b> {err}
              </div>
            )}

            <div style={styles.block}>
              <div style={styles.label}>
                {lang === "es" ? "Seleccione el país" : "Select country"}
              </div>

              {!country && (
  <input
    value={q}
    onChange={(e) => setQ(e.target.value)}
    placeholder={lang === "es" ? "Buscar país..." : "Search country..."}
    style={styles.input}
  />
)}


              <select value={country} onChange={onCountryChange} style={styles.select}>
                <option value="">{lang === "es" ? "Seleccione..." : "Select..."}</option>
                {filtered.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.block}>
              <div style={styles.label}>
                {lang === "es" ? "Seleccione el juego" : "Select game"}
              </div>

              <select
  value={game}
  onChange={(e) => {
    setGame(e.target.value);
    const c = countries.find(x => String(x.iso2) === String(country));
    setQ(c ? c.label : "");
  }}
  disabled={!country}
  style={styles.selectDisabled(!country)}
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
          </section>

          <aside style={styles.cardSmall}>
            <div style={styles.sideTitle}>
              {lang === "es" ? "Selección actual" : "Current selection"}
            </div>

            <div style={styles.pill}>
              <span style={styles.pillKey}>{lang === "es" ? "País" : "Country"}</span>
              <b style={styles.pillVal}>{country || "—"}</b>
            </div>

            <div style={styles.pill}>
              <span style={styles.pillKey}>{lang === "es" ? "Juego" : "Game"}</span>
              <b style={styles.pillVal}>{selectedGameName || "—"}</b>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#070c14",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "absolute",
    top: -200,
    left: -200,
    width: 520,
    height: 520,
    background: "rgba(99,102,241,0.25)",
    filter: "blur(80px)",
    borderRadius: 9999,
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    bottom: -220,
    right: -240,
    width: 620,
    height: 620,
    background: "rgba(34,197,94,0.18)",
    filter: "blur(90px)",
    borderRadius: 9999,
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: {
    color: "white",
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: 1,
    lineHeight: 1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 8,
    fontSize: 16,
  },
  langWrap: { display: "flex", gap: 10 },
  langBtn: (active) => ({
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
    color: "white",
    cursor: active ? "default" : "pointer",
    fontWeight: 800,
    minWidth: 64,
  }),
  main: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(320px, 1fr) minmax(260px, 360px)",
    alignItems: "start",
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 18,
    color: "white",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  cardSmall: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 18,
    color: "white",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    minHeight: 120,
  },
  sideTitle: { fontWeight: 900, fontSize: 16, opacity: 0.92, marginBottom: 12 },
  block: { display: "grid", gap: 10, marginTop: 12 },
  label: { fontWeight: 900, opacity: 0.92, fontSize: 16 },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  selectDisabled: (disabled) => ({
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    boxSizing: "border-box",
  }),
  pill: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    marginTop: 10,
  },
  pillKey: { opacity: 0.78, fontWeight: 800 },
  pillVal: { fontWeight: 900 },
  errorBox: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    background: "rgba(220,20,60,0.18)",
    border: "1px solid rgba(220,20,60,0.35)",
  },
};

// Responsive simple sin CSS externo: una columna en pantallas angostas
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(max-width: 860px)");
  const apply = () => {
    const main = document.querySelector("[data-main-grid]");
    if (!main) return;
    main.style.gridTemplateColumns = mq.matches ? "1fr" : "minmax(320px, 1fr) minmax(260px, 360px)";
  };
  mq.addEventListener?.("change", apply);
  setTimeout(apply, 0);
}
