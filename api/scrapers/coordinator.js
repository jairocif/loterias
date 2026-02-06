/**
 * COORDINADOR DE SCRAPERS
 * Ejecuta todos los scrapers por país y consolida resultados
 *
 * Uso:
 *   const scrapers = require('./scrapers');
 *   await scrapers.runAll();        // todos los países
 *   await scrapers.run('CO');       // solo Colombia
 *   await scrapers.run('ES');       // solo España
 *   await scrapers.run('US');       // solo USA
 */

const colombia = require('./colombia');
const espana = require('./espana');
const usa = require('./usa');

const SCRAPERS = {
  CO: colombia,
  ES: espana,
  US: usa,
};

// ─── Ejecutar scrapers de un país ─────────────────────────
async function run(countryCode) {
  const code = countryCode.toUpperCase();
  const scraper = SCRAPERS[code];

  if (!scraper) {
    console.error(`❌ No existe scraper para país: ${code}`);
    return { country: code, saved: 0, games: [], error: 'País no soportado' };
  }

  try {
    return await scraper.scrapeAll();
  } catch (err) {
    console.error(`❌ Error ejecutando scraper ${code}:`, err.message);
    return { country: code, saved: 0, games: [], error: err.message };
  }
}

// ─── Ejecutar TODOS los scrapers ──────────────────────────
async function runAll() {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║  🌎 EJECUTANDO TODOS LOS SCRAPERS  ║');
  console.log('╚════════════════════════════════════╝\n');
  const startTime = Date.now();

  const results = [];

  for (const code of Object.keys(SCRAPERS)) {
    const result = await run(code);
    results.push(result);
  }

  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
  const totalGames = results.reduce((arr, r) => [...arr, ...r.games], []);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('╔════════════════════════════════════╗');
  console.log('║        📊 RESUMEN GENERAL          ║');
  console.log('╠════════════════════════════════════╣');
  results.forEach((r) => {
    const status = r.error ? '❌' : '✅';
    console.log(`║  ${status} ${r.country}: ${r.saved} resultados guardados`);
  });
  console.log('╠════════════════════════════════════╣');
  console.log(`║  Total: ${totalSaved} resultados en ${elapsed}s`);
  console.log('╚════════════════════════════════════╝\n');

  return {
    results,
    totalSaved,
    totalGames: [...new Set(totalGames)],
    elapsed: `${elapsed}s`,
  };
}

module.exports = {
  run,
  runAll,
};