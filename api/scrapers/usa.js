/**
 * SCRAPER USA
 * Obtiene resultados reales de loterías estadounidenses
 *
 * Fuentes:
 *  - Powerball: powerball.com
 *  - Mega Millions: megamillions.com
 *  - Lotto America, Cash4Life, Lucky for Life: scraping
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

// ─── UTILIDAD: parsear fecha mm/dd/yyyy → yyyy-mm-dd ──────
function parseUSDate(text) {
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

// ─── UTILIDAD: parsear fecha "Month Day, Year" → yyyy-mm-dd
function parseEnglishDate(text) {
  const months = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };
  const match = text.match(
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (!match) return null;
  const month = months[match[1].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[2].padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// SCRAPER 1: POWERBALL (powerball.com)
// 5 números (1-69) + Powerball (1-26)
// ═══════════════════════════════════════════════════════════
async function scrapePowerball() {
  console.log('\n[US] 🔴 Scraping Powerball...');

  try {
    const { data: html } = await axios.get(
      'https://www.powerball.com/',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();

    // Buscar números ganadores
    const mainNums = [];
    let powerball = null;
    let drawDate = null;

    // Buscar elementos con clase de números
    $('.white-ball, .ball-white, .game-ball-white, .number-ball.white').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 69) {
        mainNums.push(num);
      }
    });

    // Buscar Powerball rojo
    $('.red-ball, .ball-red, .game-ball-red, .number-ball.red, .powerball').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 26) {
        powerball = num;
      }
    });

    // Buscar fecha
    $('.draw-date, .game-date, .next-draw-date').each(function () {
      const text = $(this).text().trim();
      const parsed = parseEnglishDate(text) || parseUSDate(text);
      if (parsed && !drawDate) drawDate = parsed;
    });

    // Fallback: buscar en el texto
    if (mainNums.length === 0) {
      // Patrón: "Winning Numbers: 5 12 23 31 42 PB: 7"
      const numsMatch = fullText.match(
        /[Ww]inning\s+[Nn]umbers[:\s]+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/
      );
      if (numsMatch) {
        for (let i = 1; i <= 5; i++) mainNums.push(parseInt(numsMatch[i]));
      }

      const pbMatch = fullText.match(
        /(?:PB|Powerball)[:\s]+(\d{1,2})/i
      );
      if (pbMatch) powerball = parseInt(pbMatch[1]);
    }

    // Fecha fallback
    if (!drawDate) {
      const dateMatch = fullText.match(
        /(\w+\s+\d{1,2},?\s+\d{4})/
      );
      if (dateMatch) drawDate = parseEnglishDate(dateMatch[1]);
    }
    if (!drawDate) drawDate = new Date().toISOString().split('T')[0];

    if (mainNums.length >= 5) {
      const extra = powerball ? [powerball] : [];
      console.log(`  🔴 Powerball: ${mainNums.slice(0, 5).join(', ')} + PB: ${powerball || '?'}`);
      const ok = await saveResult(
        'powerball',
        drawDate,
        { main: mainNums.slice(0, 5), extra },
        'powerball.com'
      );
      return ok ? ['powerball'] : [];
    }

    console.log('  ⚠️ Powerball: no se pudieron extraer números, intentando alternativa...');
    return await scrapePowerballAlternative();
  } catch (err) {
    console.error('  ❌ Error scraping Powerball:', err.message);
    return await scrapePowerballAlternative();
  }
}

// ── Powerball fuente alternativa ──────────────────────────
async function scrapePowerballAlternative() {
  console.log('[US] 🔄 Fuente alternativa Powerball...');

  try {
    const { data: html } = await axios.get(
      'https://www.lottery.net/powerball/numbers',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();
    const mainNums = [];

    // Buscar bolas
    $('.ball, .result-ball, .winning-number').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && mainNums.length < 5 && num >= 1 && num <= 69) {
        mainNums.push(num);
      }
    });

    let powerball = null;
    $('.powerball, .bonus-ball, .special-ball').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 26) powerball = num;
    });

    // Fallback texto
    if (mainNums.length === 0) {
      const match = fullText.match(
        /(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/
      );
      if (match) {
        for (let i = 1; i <= 5; i++) mainNums.push(parseInt(match[i]));
        powerball = parseInt(match[6]);
      }
    }

    if (mainNums.length >= 5) {
      const drawDate = new Date().toISOString().split('T')[0];
      const ok = await saveResult(
        'powerball',
        drawDate,
        { main: mainNums.slice(0, 5), extra: powerball ? [powerball] : [] },
        'lottery.net'
      );
      return ok ? ['powerball'] : [];
    }
  } catch (err) {
    console.error('  ❌ Error alternativa Powerball:', err.message);
  }

  return [];
}

// ═══════════════════════════════════════════════════════════
// SCRAPER 2: MEGA MILLIONS (megamillions.com)
// 5 números (1-70) + Mega Ball (1-25)
// ═══════════════════════════════════════════════════════════
async function scrapeMegaMillions() {
  console.log('\n[US] 🟡 Scraping Mega Millions...');

  try {
    const { data: html } = await axios.get(
      'https://www.megamillions.com/',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();

    const mainNums = [];
    let megaBall = null;
    let drawDate = null;

    // Buscar bolas blancas
    $('.ball, .white-ball, .game-ball-white, .winning-number-white').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 70 && mainNums.length < 5) {
        mainNums.push(num);
      }
    });

    // Buscar Mega Ball dorada
    $('.gold-ball, .mega-ball, .game-ball-gold, .winning-number-gold').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 25) megaBall = num;
    });

    // Fecha
    $('.draw-date, .game-date').each(function () {
      const text = $(this).text().trim();
      const parsed = parseEnglishDate(text) || parseUSDate(text);
      if (parsed && !drawDate) drawDate = parsed;
    });

    // Fallback texto
    if (mainNums.length === 0) {
      const numsMatch = fullText.match(
        /[Ww]inning\s+[Nn]umbers[:\s]+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/
      );
      if (numsMatch) {
        for (let i = 1; i <= 5; i++) mainNums.push(parseInt(numsMatch[i]));
      }

      const mbMatch = fullText.match(
        /(?:MB|Mega\s*Ball)[:\s]+(\d{1,2})/i
      );
      if (mbMatch) megaBall = parseInt(mbMatch[1]);
    }

    if (!drawDate) {
      const dateMatch = fullText.match(/(\w+\s+\d{1,2},?\s+\d{4})/);
      if (dateMatch) drawDate = parseEnglishDate(dateMatch[1]);
    }
    if (!drawDate) drawDate = new Date().toISOString().split('T')[0];

    if (mainNums.length >= 5) {
      const extra = megaBall ? [megaBall] : [];
      console.log(`  🟡 Mega Millions: ${mainNums.slice(0, 5).join(', ')} + MB: ${megaBall || '?'}`);
      const ok = await saveResult(
        'megamillions',
        drawDate,
        { main: mainNums.slice(0, 5), extra },
        'megamillions.com'
      );
      return ok ? ['megamillions'] : [];
    }

    console.log('  ⚠️ Mega Millions: no se pudieron extraer números, intentando alternativa...');
    return await scrapeMegaMillionsAlternative();
  } catch (err) {
    console.error('  ❌ Error scraping Mega Millions:', err.message);
    return await scrapeMegaMillionsAlternative();
  }
}

// ── Mega Millions fuente alternativa ─────────────────────
async function scrapeMegaMillionsAlternative() {
  console.log('[US] 🔄 Fuente alternativa Mega Millions...');

  try {
    const { data: html } = await axios.get(
      'https://www.lottery.net/mega-millions/numbers',
      { headers: HEADERS, timeout: 15000 }
    );

    const $ = cheerio.load(html);
    const fullText = $('body').text();
    const mainNums = [];

    $('.ball, .result-ball, .winning-number').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && mainNums.length < 5 && num >= 1 && num <= 70) {
        mainNums.push(num);
      }
    });

    let megaBall = null;
    $('.mega-ball, .bonus-ball, .special-ball').each(function () {
      const num = parseInt($(this).text().trim());
      if (!isNaN(num) && num >= 1 && num <= 25) megaBall = num;
    });

    if (mainNums.length === 0) {
      const match = fullText.match(
        /(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/
      );
      if (match) {
        for (let i = 1; i <= 5; i++) mainNums.push(parseInt(match[i]));
        megaBall = parseInt(match[6]);
      }
    }

    if (mainNums.length >= 5) {
      const drawDate = new Date().toISOString().split('T')[0];
      const ok = await saveResult(
        'megamillions',
        drawDate,
        { main: mainNums.slice(0, 5), extra: megaBall ? [megaBall] : [] },
        'lottery.net'
      );
      return ok ? ['megamillions'] : [];
    }
  } catch (err) {
    console.error('  ❌ Error alternativa Mega Millions:', err.message);
  }

  return [];
}

// ═══════════════════════════════════════════════════════════
// SCRAPER 3: OTROS JUEGOS USA
// Lotto America, Cash4Life, Lucky for Life
// ═══════════════════════════════════════════════════════════
async function scrapeOtherUSGames() {
  console.log('\n[US] 🎰 Scraping otros juegos USA...');
  const saved = [];

  const GAMES = [
    {
      code: 'lottoamerica',
      url: 'https://www.lottery.net/lotto-america/numbers',
      mainCount: 5,
      mainMax: 52,
      extraName: 'Star Ball',
      extraMax: 10,
    },
    {
      code: 'cash4life',
      url: 'https://www.lottery.net/cash4life/numbers',
      mainCount: 5,
      mainMax: 60,
      extraName: 'Cash Ball',
      extraMax: 4,
    },
    {
      code: 'luckyforlife',
      url: 'https://www.lottery.net/lucky-for-life/numbers',
      mainCount: 5,
      mainMax: 48,
      extraName: 'Lucky Ball',
      extraMax: 18,
    },
  ];

  for (const game of GAMES) {
    try {
      const { data: html } = await axios.get(game.url, {
        headers: HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(html);
      const fullText = $('body').text();
      const mainNums = [];

      // Buscar bolas
      $('.ball, .result-ball, .winning-number').each(function () {
        const num = parseInt($(this).text().trim());
        if (!isNaN(num) && mainNums.length < game.mainCount && num >= 1 && num <= game.mainMax) {
          mainNums.push(num);
        }
      });

      let extraBall = null;
      $('.bonus-ball, .special-ball, .extra-ball').each(function () {
        const num = parseInt($(this).text().trim());
        if (!isNaN(num) && num >= 1 && num <= game.extraMax) extraBall = num;
      });

      // Fallback texto
      if (mainNums.length === 0) {
        const match = fullText.match(
          /(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/
        );
        if (match) {
          for (let i = 1; i <= 5; i++) mainNums.push(parseInt(match[i]));
          extraBall = parseInt(match[6]);
        }
      }

      if (mainNums.length >= game.mainCount) {
        const drawDate = new Date().toISOString().split('T')[0];
        const extra = extraBall ? [extraBall] : [];
        console.log(`  🎰 ${game.code}: ${mainNums.join(', ')} + ${game.extraName}: ${extraBall || '?'}`);
        const ok = await saveResult(
          game.code,
          drawDate,
          { main: mainNums.slice(0, game.mainCount), extra },
          'lottery.net'
        );
        if (ok) saved.push(game.code);
      } else {
        console.log(`  ⚠️ ${game.code}: no se pudieron extraer números`);
      }
    } catch (err) {
      console.error(`  ❌ Error ${game.code}:`, err.message);

      const gameId = await getGameId(game.code);
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

    await new Promise((r) => setTimeout(r, 1000));
  }

  return saved;
}

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: ejecutar todos los scrapers de USA
// ═══════════════════════════════════════════════════════════
async function scrapeAll() {
  console.log('====================================');
  console.log('🇺🇸 INICIANDO SCRAPERS USA');
  console.log('====================================');
  const startTime = Date.now();

  const allSaved = [];

  const pbSaved = await scrapePowerball();
  allSaved.push(...pbSaved);

  const mmSaved = await scrapeMegaMillions();
  allSaved.push(...mmSaved);

  const otherSaved = await scrapeOtherUSGames();
  allSaved.push(...otherSaved);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n====================================');
  console.log(`🇺🇸 USA FINALIZADO en ${elapsed}s`);
  console.log(`   Resultados guardados: ${allSaved.length}`);
  if (allSaved.length > 0) {
    console.log(`   Juegos: ${[...new Set(allSaved)].join(', ')}`);
  }
  console.log('====================================\n');

  return {
    country: 'US',
    saved: allSaved.length,
    games: [...new Set(allSaved)],
    elapsed: `${elapsed}s`,
  };
}

module.exports = {
  scrapeAll,
  scrapePowerball,
  scrapeMegaMillions,
  scrapeOtherUSGames,
};