/**
 * SCRAPER COLOMBIA
 * Obtiene resultados reales de loterías colombianas
 *
 * Fuentes:
 *  - Baloto/Revancha: scraping de resultadobaloto.com
 *  - Loterías tradicionales (Medellín, Boyacá, Bogotá):
 *    scraping de resultadodelaloteria.com
 *
 * Guarda en tabla lottery_results con formato:
 *   numbers JSONB → {"main": [5,12,23,31,42], "extra": [7]}
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://loteria:loteria123@localhost:5432/loterias',
});

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

// ─── UTILIDAD: parsear fecha en español ───────────────────
function parseSpanishDate(text) {
  const meses = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  const match = text.match(
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i
  );
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = meses[match[2].toLowerCase()];
  const year = match[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

// ─── UTILIDAD: parsear fecha DD/MM/YYYY ───────────────────
function parseDateDMY(text) {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

// ─── UTILIDAD: obtener game_id desde code ─────────────────
async function getGameId(gameCode) {
  const r = await pool.query(
    'SELECT id FROM games WHERE code = $1 LIMIT 1',
    [gameCode]
  );
  return r.rows.length > 0 ? r.rows[0].id : null;
}

// ─── UTILIDAD: verificar si ya existe el resultado ────────
async function resultExists(gameId, drawDate) {
  const r = await pool.query(
    'SELECT id FROM lottery_results WHERE game_id = $1 AND draw_date = $2 LIMIT 1',
    [gameId, drawDate]
  );
  return r.rows.length > 0;
}

// ─── UTILIDAD: guardar resultado en BD ────────────────────
async function saveResult(gameCode, drawDate, numbers, source, drawNumber) {
  const gameId = await getGameId(gameCode);
  if (!gameId) {
    console.log(`  ⚠️ Juego "${gameCode}" no encontrado en BD, saltando...`);
    return false;
  }

  const exists = await resultExists(gameId, drawDate);
  if (exists) {
    console.log(`  ℹ️ ${gameCode} ${drawDate} ya existe, saltando...`);
    return false;
  }

  await pool.query(
    `INSERT INTO lottery_results (game_id, draw_date, draw_number, numbers, source)
     VALUES ($1, $2, $3, $4, $5)`,
    [gameId, drawDate, drawNumber || null, JSON.stringify(numbers), source]
  );

  // Actualizar data_updates
  await pool.query(
    `INSERT INTO data_updates (game_id, last_update, status, records_updated)
     VALUES ($1, NOW(), 'success', 1)
     ON CONFLICT (game_id)
     DO UPDATE SET last_update = NOW(), status = 'success',
                   records_updated = data_updates.records_updated + 1`,
    [gameId]
  );

  console.log(`  ✅ ${gameCode} ${drawDate} guardado OK`);
  return true;
}

// ═══════════════════════════════════════════════════════════
// SCRAPER 1: BALOTO Y REVANCHA (resultadobaloto.com)
// ═══════════════════════════════════════════════════════════
async function scrapeBaloto() {
  console.log('\n[CO] 🎱 Scraping Baloto y Revancha...');
  const saved = [];

  try {
    const { data: html } = await axios.get(
      'https://www.resultadobaloto.com/',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();

    // ── Extraer fecha ──
    let drawDate = null;
    const dateMatch = fullText.match(
      /(\d{1,2})\s+de\s+(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+de\s+(\d{4})/i
    );
    if (dateMatch) {
      drawDate = parseSpanishDate(dateMatch[0]);
    }
    if (!drawDate) {
      drawDate = new Date().toISOString().split('T')[0];
    }

    // ── Extraer Baloto principal ──
    const balotoMatch = fullText.match(
      /ganadora\s+del\s+Baloto[:\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})/i
    );

    if (balotoMatch) {
      const mainNums = [];
      for (let i = 1; i <= 5; i++) {
        mainNums.push(parseInt(balotoMatch[i]));
      }

      // Buscar superbalota
      let superBalota = [];
      const sbMatch = fullText.match(
        /y\s+(\d{1,2})\s*-\s*(\d{1,2})\s+respectivamente/i
      );
      if (sbMatch) {
        superBalota = [parseInt(sbMatch[1])];
      }

      const ok = await saveResult(
        'baloto',
        drawDate,
        { main: mainNums, extra: superBalota },
        'resultadobaloto.com'
      );
      if (ok) saved.push('baloto');
    } else {
      console.log('  ⚠️ No se encontraron números de Baloto, intentando alternativa...');
      const altSaved = await scrapeBalotoAlternative();
      saved.push(...altSaved);
      return saved;
    }

    // ── Extraer Revancha ──
    const revanchaMatch = fullText.match(
      /(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})\s*-\s*(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})/
    );

    if (revanchaMatch) {
      const revNums = [];
      for (let i = 6; i <= 10; i++) {
        revNums.push(parseInt(revanchaMatch[i]));
      }

      let revSuperBalota = [];
      const sbMatch2 = fullText.match(
        /y\s+(\d{1,2})\s*-\s*(\d{1,2})\s+respectivamente/i
      );
      if (sbMatch2) {
        revSuperBalota = [parseInt(sbMatch2[2])];
      }

      const ok = await saveResult(
        'baloto-revancha',
        drawDate,
        { main: revNums, extra: revSuperBalota },
        'resultadobaloto.com'
      );
      if (ok) saved.push('baloto-revancha');
    }
  } catch (err) {
    console.error('  ❌ Error scraping Baloto:', err.message);
    const altSaved = await scrapeBalotoAlternative();
    saved.push(...altSaved);
  }

  return saved;
}

// ═══════════════════════════════════════════════════════════
// FUENTE ALTERNATIVA BALOTO (combinacionganadora.com)
// ═══════════════════════════════════════════════════════════
async function scrapeBalotoAlternative() {
  console.log('[CO] 🔄 Fuente alternativa Baloto...');
  const saved = [];

  try {
    const { data: html } = await axios.get(
      'https://www.combinacionganadora.com/co/baloto/',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();

    const numsMatch = fullText.match(
      /[Rr]esultado.*?(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})/
    );

    if (numsMatch) {
      const mainNums = [];
      for (let i = 1; i <= 5; i++) {
        mainNums.push(parseInt(numsMatch[i]));
      }

      const sbMatch = fullText.match(
        /[Ss][uú]per\s*[Bb]alota[:\s]+(\d{1,2})/
      );
      const extra = sbMatch ? [parseInt(sbMatch[1])] : [];

      const dateMatch = fullText.match(
        /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i
      );
      const drawDate = dateMatch
        ? parseSpanishDate(dateMatch[0])
        : new Date().toISOString().split('T')[0];

      const ok = await saveResult(
        'baloto',
        drawDate,
        { main: mainNums, extra },
        'combinacionganadora.com'
      );
      if (ok) saved.push('baloto');
    } else {
      console.log('  ⚠️ Fuente alternativa tampoco encontró números');
    }
  } catch (err) {
    console.error('  ❌ Error fuente alternativa:', err.message);
  }

  return saved;
}

// ═══════════════════════════════════════════════════════════
// SCRAPER 2: LOTERÍAS TRADICIONALES (resultadodelaloteria.com)
// Medellín, Boyacá, Bogotá
// ═══════════════════════════════════════════════════════════

const LOTERIAS_MAP = {
  'loteria-medellin': 'loteria-de-medellin',
  'loteria-boyaca': 'loteria-de-boyaca',
  'loteria-bogota': 'loteria-de-bogota',
};

async function scrapeLoteriasTradicionales() {
  console.log('\n[CO] 🎟️ Scraping loterías tradicionales...');
  const saved = [];

  for (const [gameCode, slug] of Object.entries(LOTERIAS_MAP)) {
    try {
      const url = `https://resultadodelaloteria.com/colombia/${slug}`;
      const { data: html } = await axios.get(url, {
        headers: HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      // Buscar tabla de sorteos recientes
      const rows = $('table tr').slice(1); // saltar header

      let savedCount = 0;
      rows.each(function () {
        if (savedCount >= 5) return; // máximo 5 resultados por lotería

        const cells = $(this).find('td');
        if (cells.length < 3) return;

        const sorteoNum = $(cells[0]).text().trim();
        const fechaText = $(cells[1]).text().trim();
        const resultText = $(cells[2]).text().trim();

        // Parsear fecha DD/MM/YYYY
        const drawDate = parseDateDMY(fechaText);
        if (!drawDate) return;

        // Extraer número (4 dígitos) y serie (3 dígitos)
        const numMatch = resultText.match(/(\d{4})\s*serie\s*(\d{3})/i);
        if (!numMatch) return;

        const numero = numMatch[1];
        const serie = numMatch[2];
        const digits = numero.split('').map(Number);
        const serieDigits = serie.split('').map(Number);

        // Guardar de forma asíncrona (se ejecuta después)
        const numbers = {
          main: digits,
          extra: serieDigits,
        };

        // Usamos una promesa para manejar el async dentro de each
        const self = this;
        const savePromise = saveResult(
          gameCode,
          drawDate,
          numbers,
          'resultadodelaloteria.com',
          sorteoNum
        ).then((ok) => {
          if (ok) saved.push(gameCode);
        });

        // Almacenar promesa para esperar después
        if (!self._promises) self._promises = [];
        self._promises.push(savePromise);
        savedCount++;
      });

      // Esperar todas las promesas de guardado
      // Como cheerio each es síncrono, recolectamos y esperamos
      const allPromises = [];
      rows.each(function () {
        if (this._promises) {
          allPromises.push(...this._promises);
        }
      });
      await Promise.all(allPromises);

    } catch (err) {
      console.error(`  ❌ Error ${gameCode}:`, err.message);

      const gameId = await getGameId(gameCode);
      if (gameId) {
        await pool.query(
          `INSERT INTO data_updates (game_id, last_update, status, error_message)
           VALUES ($1, NOW(), 'error', $2)
           ON CONFLICT (game_id)
           DO UPDATE SET last_update = NOW(), status = 'error',
                         error_message = $2`,
          [gameId, err.message]
        ).catch(() => {});
      }
    }

    // Pausa entre requests para no saturar
    await new Promise((r) => setTimeout(r, 1500));
  }

  return saved;
}

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: ejecutar todos los scrapers de Colombia
// ═══════════════════════════════════════════════════════════
async function scrapeAll() {
  console.log('====================================');
  console.log('🇨🇴 INICIANDO SCRAPERS COLOMBIA');
  console.log('====================================');
  const startTime = Date.now();

  const allSaved = [];

  const balotoSaved = await scrapeBaloto();
  allSaved.push(...balotoSaved);

  const loteriasSaved = await scrapeLoteriasTradicionales();
  allSaved.push(...loteriasSaved);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n====================================');
  console.log(`🇨🇴 COLOMBIA FINALIZADO en ${elapsed}s`);
  console.log(`   Resultados guardados: ${allSaved.length}`);
  if (allSaved.length > 0) {
    console.log(`   Juegos: ${[...new Set(allSaved)].join(', ')}`);
  }
  console.log('====================================\n');

  return {
    country: 'CO',
    saved: allSaved.length,
    games: [...new Set(allSaved)],
    elapsed: `${elapsed}s`,
  };
}

module.exports = {
  scrapeAll,
  scrapeBaloto,
  scrapeLoteriasTradicionales,
};