import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "es");
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    fetch(`http://localhost:3000/countries?lang=${lang}`)
      .then((r) => r.json())
      .then(setCountries)
      .catch((e) => setErr(String(e)));
  }, [lang]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    return countries.filter((c) => (c.label || "").toLowerCase().includes(s));
  }, [countries, q]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 24, maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>LOTERÍA        <h1 style={{ margin:           <h1 style={{ margin: 0 }}>LOTERÍA        <h === "es"}>ES</button>{" "}
          <button onClick={() => setLang("en")} disabled={lang === "en"}>EN</button>
        </div>
      </div>

      <p style={{ marginTop: 16 }}>
        {lang === "es" ? "Seleccione el país:" : "Select cou        {lang === "es" ? "Seleccionere>        {lang ===           {lang === "es" ? "Seleng === "es        {lang === "es" ? "Seleccione el país:" : "Selelue        {lang === "es" ? "S=> setQ(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom:        style={{ width: "10ect
                                       e={                         t.val                                       e={                         t.val     alue="">{lang === "es" ? "-- Elija un país --" : "-- Choose a country --"}</option>
        {filtered.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.label}
          </option>
                                                                                                                                                               ou                                                                                   
