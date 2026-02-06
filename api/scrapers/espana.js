/**
 * SCRAPER ESPAÑA
 * Obtiene resultados reales de loterías españolas
 *
 * Fuente: loteriasyapuestas.es (página oficial de LAE)
 *
 * Juegos: EuroMillones, La Primitiva, Bonoloto, El Gordo, Lotería Nacional
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

// ─── UTILIDAD: parsear fecha dd/mm/yyyy → yyyy-mm-dd ──────
function parseDate(text) {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

// ═══════════════════════════════════════════════════════════
// SCRAPER PRINCIPAL: loteriasyapuestas.es
// Parsea la página de resultados que muestra todos los juegos
// ═══════════════════════════════════════════════════════════
async function scrapeLAE() {
  console.log('\n[ES] 🎰 Scraping loteriasyapuestas.es...');
  const saved = [];

  try {
    const { data: html } = await axios.get(
      'https://www.loteriasyapuestas.es/es/resultados',
      { headers: HEADERS, timeout: 20000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();

    // ── EUROMILLONES ──
    try {
      const euroSaved = parseEuromillones(fullText);
      if (euroSaved) {
        const ok = await saveResult(
          'euromillones',
          euroSaved.date,
          euroSaved.numbers,
          'loteriasyapuestas.es'
        );
        if (ok) saved.push('euromillones');
      }
    } catch (err) {
      console.error('  ❌ Error EuroMillones:', err.message);
    }

    // ── LA PRIMITIVA ──
    try {
      const primSaved = parsePrimitiva(fullText);
      if (primSaved) {
        const ok = await saveResult(
          'primitiva',
          primSaved.date,
          primSaved.numbers,
          'loteriasyapuestas.es'
        );
        if (ok) saved.push('primitiva');
      }
    } catch (err) {
      console.error('  ❌ Error Primitiva:', err.message);
    }

    // ── BONOLOTO ──
    try {
      const bonoSaved = parseBonoloto(fullText);
      if (bonoSaved) {
        const ok = await saveResult(
          'bonoloto',
          bonoSaved.date,
          bonoSaved.numbers,
          'loteriasyapuestas.es'
        );
        if (ok) saved.push('bonoloto');
      }
    } catch (err) {
      console.error('  ❌ Error Bonoloto:', err.message);
    }

    // ── EL GORDO ──
    try {
      const gordoSaved = parseElGordo(fullText);
      if (gordoSaved) {
        const ok = await saveResult(
          'elgordo',
          gordoSaved.date,
          gordoSaved.numbers,
          'loteriasyapuestas.es'
        );
        if (ok) saved.push('elgordo');
      }
    } catch (err) {
      console.error('  ❌ Error El Gordo:', err.message);
    }

  } catch (err) {
    console.error('  ❌ Error general scraping LAE:', err.message);
    // Intentar fuente alternativa
    const altSaved = await scrapeAlternative();
    saved.push(...altSaved);
  }

  return saved;
}

// ═══════════════════════════════════════════════════════════
// PARSERS INDIVIDUALES POR JUEGO
// ═══════════════════════════════════════════════════════════

// ── EuroMillones: 5 números (1-50) + 2 estrellas (1-12) ──
function parseEuromillones(text) {
  // Buscar patrón: fecha seguida de números de EuroMillones
  const dateMatch = text.match(
    /Euromillones.*?(\d{2}\/\d{2}\/\d{4})/i
  );
  const date = dateMatch ? parseDate(dateMatch[1]) : null;

  // Buscar 5 números principales + 2 estrellas
  // El texto de LAE muestra los números en secuencia
  const numsMatch = text.match(
    /Euromillones.*?(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2}).*?(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})/i
  );

  if (!numsMatch) {
    // Intento alternativo: buscar patrón con "Nota de Prensa"
    const altMatch = text.match(
      /Nota\s+de\s+Prensa\s+del\s+sorteo\s+del\s+(\d{2}\/\d{2}\/\d{4})\s+Euromillones/i
    );
    if (altMatch) {
      const altDate = parseDate(altMatch[1]);
      // Buscar números después de esta fecha
      const afterText = text.substring(text.indexOf(altMatch[0]));
      const nums = afterText.match(
        /(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})/
      );
      if (nums) {
        const main = [];
        for (let i = 1; i <= 5; i++) main.push(parseInt(nums[i]));
        // Estrellas vienen después
        const starsText = afterText.substring(afterText.indexOf(nums[0]) + nums[0].length);
        const stars = starsText.match(/(\d{1,2})\s+(\d{1,2})/);
        const extra = stars ? [parseInt(stars[1]), parseInt(stars[2])] : [];
        console.log(`  🌟 EuroMillones: ${main.join(', ')} + estrellas: ${extra.join(', ')}`);
        return { date: altDate, numbers: { main, extra } };
      }
    }
    console.log('  ⚠️ EuroMillones: no se pudieron extraer números');
    return null;
  }

  // Primera secuencia son los números en orden de aparición
  const main = [];
  for (let i = 1; i <= 5; i++) main.push(parseInt(numsMatch[i]));
  // Las estrellas vienen más adelante en el texto
  const extra = [];
  // Buscar estrellas específicamente
  const starsMatch = text.match(
    /estrellas.*?(\d{1,2})\s+(\d{1,2})/i
  );
  if (starsMatch) {
    extra.push(parseInt(starsMatch[1]), parseInt(starsMatch[2]));
  }

  if (main.length >= 5) {
    console.log(`  🌟 EuroMillones: ${main.join(', ')} + estrellas: ${extra.join(', ')}`);
    return {
      date: date || new Date().toISOString().split('T')[0],
      numbers: { main, extra },
    };
  }
  return null;
}

// ── La Primitiva: 6 números (1-49) + complementario + reintegro ──
function parsePrimitiva(text) {
  const dateMatch = text.match(
    /Primitiva.*?(\d{2}\/\d{2}\/\d{4})/i
  );
  const date = dateMatch ? parseDate(dateMatch[1]) : null;

  // Buscar después de "Primitiva" una secuencia de 6 números de 2 dígitos
  const section = text.substring(text.search(/La\s+Primitiva/i));
  const numsMatch = section.match(
    /(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})/
  );

  if (!numsMatch) {
    console.log('  ⚠️ Primitiva: no se pudieron extraer números');
    return null;
  }

  const main = [];
  for (let i = 1; i <= 6; i++) main.push(parseInt(numsMatch[i]));

  // Complementario (C) y Reintegro (R)
  const compMatch = section.match(/C\s+(\d{1,2})/);
  const reintMatch = section.match(/R\s+(\d{1,2})/);
  const extra = [];
  if (compMatch) extra.push(parseInt(compMatch[1]));
  if (reintMatch) extra.push(parseInt(reintMatch[1]));

  console.log(`  🎯 Primitiva: ${main.join(', ')} C:${extra[0] || '?'} R:${extra[1] || '?'}`);
  return {
    date: date || new Date().toISOString().split('T')[0],
    numbers: { main, extra },
  };
}

// ── Bonoloto: 6 números (1-49) + complementario + reintegro ──
function parseBonoloto(text) {
  const section = text.substring(text.search(/Bonoloto/i));
  const dateMatch = section.match(/(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? parseDate(dateMatch[1]) : null;

  const numsMatch = section.match(
    /(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})/
  );

  if (!numsMatch) {
    console.log('  ⚠️ Bonoloto: no se pudieron extraer números');
    return null;
  }

  const main = [];
  for (let i = 1; i <= 6; i++) main.push(parseInt(numsMatch[i]));

  const compMatch = section.match(/C\s+(\d{1,2})/);
  const reintMatch = section.match(/R\s+(\d{1,2})/);
  const extra = [];
  if (compMatch) extra.push(parseInt(compMatch[1]));
  if (reintMatch) extra.push(parseInt(reintMatch[1]));

  console.log(`  🎲 Bonoloto: ${main.join(', ')} C:${extra[0] || '?'} R:${extra[1] || '?'}`);
  return {
    date: date || new Date().toISOString().split('T')[0],
    numbers: { main, extra },
  };
}

// ── El Gordo: 5 números (1-54) + número clave (0-9) ──
function parseElGordo(text) {
  const section = text.substring(text.search(/El\s+Gordo/i));
  const dateMatch = section.match(/(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? parseDate(dateMatch[1]) : null;

  const numsMatch = section.match(
    /(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})/
  );

  if (!numsMatch) {
    console.log('  ⚠️ El Gordo: no se pudieron extraer números');
    return null;
  }

  const main = [];
  for (let i = 1; i <= 5; i++) main.push(parseInt(numsMatch[i]));

  // Número clave
  const claveMatch = section.match(/clave\s+(\d{1,2})/i);
  const extra = claveMatch ? [parseInt(claveMatch[1])] : [];

  console.log(`  💰 El Gordo: ${main.join(', ')} clave: ${extra[0] || '?'}`);
  return {
    date: date || new Date().toISOString().split('T')[0],
    numbers: { main, extra },
  };
}

// ═══════════════════════════════════════════════════════════
// FUENTE ALTERNATIVA (combinacionganadora.com)
// ═══════════════════════════════════════════════════════════
async function scrapeAlternative() {
  console.log('[ES] 🔄 Intentando fuente alternativa...');
  const saved = [];

  const GAMES_ALT = {
    euromillones: 'https://www.combinacionganadora.com/euromillones/',
    primitiva: 'https://www.combinacionganadora.com/primitiva/',
    bonoloto: 'https://www.combinacionganadora.com/bonoloto/',
  };

  for (const [gameCode, url] of Object.entries(GAMES_ALT)) {
    try {
      const { data: html } = await axios.get(url, {
        headers: HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(html);
      const fullText = $('body').text();

      // Buscar números en el texto
      const numsMatch = fullText.match(
        /[Rr]esultado.*?(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})[,\s]+(\d{1,2})/
      );

      if (numsMatch) {
        const main = [];
        for (let i = 1; i <= 5; i++) main.push(parseInt(numsMatch[i]));

        // Para Primitiva y Bonoloto buscar el 6to número
        if (gameCode === 'primitiva' || gameCode === 'bonoloto') {
          const sixthMatch = fullText.match(
            new RegExp(numsMatch[0] + '[,\\s]+(\\d{1,2})')
          );
          if (sixthMatch) main.push(parseInt(sixthMatch[1]));
        }

        const dateMatch = fullText.match(
          /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i
        );
        const drawDate = dateMatch
          ? parseDateSpanish(dateMatch[0])
          : new Date().toISOString().split('T')[0];

        const ok = await saveResult(
          gameCode,
          drawDate,
          { main, extra: [] },
          'combinacionganadora.com'
        );
        if (ok) saved.push(gameCode);
      }
    } catch (err) {
      console.error(`  ❌ Error alternativa ${gameCode}:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return saved;
}

// Parsear fecha en español para fuente alternativa
function parseDateSpanish(text) {
  const meses = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  const match = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = meses[match[2].toLowerCase()];
  const year = match[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: ejecutar todos los scrapers de España
// ═══════════════════════════════════════════════════════════
async function scrapeAll() {
  console.log('====================================');
  console.log('🇪🇸 INICIANDO SCRAPERS ESPAÑA');
  console.log('====================================');
  const startTime = Date.now();

  const allSaved = [];

  const laeSaved = await scrapeLAE();
  allSaved.push(...laeSaved);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n====================================');
  console.log(`🇪🇸 ESPAÑA FINALIZADO en ${elapsed}s`);
  console.log(`   Resultados guardados: ${allSaved.length}`);
  if (allSaved.length > 0) {
    console.log(`   Juegos: ${[...new Set(allSaved)].join(', ')}`);
  }
  console.log('====================================\n');

  return {
    country: 'ES',
    saved: allSaved.length,
    games: [...new Set(allSaved)],
    elapsed: `${elapsed}s`,
  };
}

module.exports = {
  scrapeAll,
  scrapeLAE,
};