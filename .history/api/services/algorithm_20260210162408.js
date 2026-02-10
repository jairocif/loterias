const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://loteria:loteria123@localhost:5432/loterias',
});

/**
 * ALGORITMO INTELIGENTE - Generar 5 jugadas con diferentes estrategias
 */
async function generateIntelligentPlays(gameCode, playsCount = 5) {
  try {
    // 1. Obtener información del juego
    const gameResult = await pool.query(
      'SELECT * FROM games WHERE code = $1 AND is_active = true',
      [gameCode]
    );

    if (gameResult.rows.length === 0) {
      throw new Error('Juego no encontrado');
    }

    const game = gameResult.rows[0];
    const config = game.config;

    // 2. Obtener datos históricos reales
    const historicalData = await getHistoricalData(game.id);

    // 3. Calcular edad de los datos
    const dataAge = calculateDataAge(historicalData);

    // 4. Analizar datos con múltiples técnicas
    const analysis = analyzeData(historicalData, config);

    // 5. Generar las 5 jugadas con diferentes estrategias
    const strategies = [
      { name: 'Súper Calientes', icon: '🔥', type: 'hot' },
      { name: 'Equilibrio Perfecto', icon: '⚖️', type: 'balanced' },
      { name: 'Parejas Frecuentes', icon: '🤝', type: 'pairs' },
      { name: 'Tendencia Reciente', icon: '📈', type: 'trending' },
      { name: 'Algoritmo Maestro', icon: '🧠', type: 'master' },
    ];

    const plays = [];
    const usedCombinations = new Set();
const usedExtras = [];

    for (let i = 0; i < Math.min(playsCount, strategies.length); i++) {
      const strategy = strategies[i];
      let play;
      let attempts = 0;

      // Evitar jugadas duplicadas
      do {
        play = generateSinglePlay(config, analysis, strategy.type, usedExtras);
        attempts++;
      } while (
        usedCombinations.has(play.mainNumbers.join(',')) &&
        attempts < 10
      );

      usedCombinations.add(play.mainNumbers.join(','));
      usedExtras.push(...play.extraNumbers);

      plays.push({
        id: i + 1,
        strategy: strategy.name,
        icon: strategy.icon,
        mainNumbers: play.mainNumbers,
        extraNumbers: play.extraNumbers,
        confidence: play.confidence,
        description: getStrategyDescription(strategy.type, game.name_es),
      });
    }

    return {
      success: true,
      gameCode: game.code,
      gameName: game.name_es,
      timestamp: new Date().toISOString(),
      dataAge: dataAge,
      totalDrawsAnalyzed: historicalData.length,
      plays: plays,
    };
  } catch (error) {
    console.error('Error generando jugadas:', error);
    throw error;
  }
}

/**
 * OBTENER DATOS HISTÓRICOS REALES
 */
async function getHistoricalData(gameId) {
  const result = await pool.query(
    'SELECT * FROM lottery_results WHERE game_id = $1 ORDER BY draw_date DESC LIMIT 100',
    [gameId]
  );
  return result.rows;
}

/**
 * CALCULAR EDAD DE LOS DATOS
 */
function calculateDataAge(historicalData) {
  if (historicalData.length === 0) return 'Sin datos';

  const lastDraw = new Date(historicalData[0].draw_date);
  const now = new Date();
  const diffMs = now - lastDraw;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return `${diffHours} horas`;
  if (diffDays === 1) return '1 día';
  return `${diffDays} días`;
}

/**
 * ANÁLISIS COMPLETO DE DATOS HISTÓRICOS
 * Calcula: frecuencias, parejas, tendencias recientes, números retrasados
 */
function analyzeData(historicalData, config) {
  const mainMin = config.mainNumbers.min;
  const mainMax = config.mainNumbers.max;

  // Si no hay datos, generar análisis aleatorio
  if (historicalData.length === 0) {
    const allNumbers = [];
    for (let i = mainMin; i <= mainMax; i++) {
      allNumbers.push(i);
    }
    return {
      hotNumbers: shuffleArray(allNumbers).slice(0, 15),
      coldNumbers: shuffleArray(allNumbers).slice(0, 15),
      trendingNumbers: shuffleArray(allNumbers).slice(0, 10),
      overdueNumbers: shuffleArray(allNumbers).slice(0, 10),
      frequentPairs: [],
      frequency: {},
      hasData: false,
    };
  }

  // ── 1. FRECUENCIA GENERAL ──
  const frequency = {};
  for (let i = mainMin; i <= mainMax; i++) {
    frequency[i] = 0;
  }

  historicalData.forEach((draw) => {
    const numbers = draw.numbers.main || [];
    numbers.forEach((num) => {
      if (frequency[num] !== undefined) {
        frequency[num] = (frequency[num] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map((x) => parseInt(x[0]));

  const hotNumbers = sorted.slice(0, 15);
  const coldNumbers = sorted.slice(-15).reverse();

  // ── 2. TENDENCIA RECIENTE (últimos 10 sorteos vs anteriores) ──
  const recentDraws = historicalData.slice(0, Math.min(10, historicalData.length));
  const olderDraws = historicalData.slice(10);

  const recentFreq = {};
  const olderFreq = {};

  recentDraws.forEach((draw) => {
    const numbers = draw.numbers.main || [];
    numbers.forEach((num) => {
      recentFreq[num] = (recentFreq[num] || 0) + 1;
    });
  });

  olderDraws.forEach((draw) => {
    const numbers = draw.numbers.main || [];
    numbers.forEach((num) => {
      olderFreq[num] = (olderFreq[num] || 0) + 1;
    });
  });

  // Números que subieron de frecuencia recientemente
  const trendScores = {};
  for (let i = mainMin; i <= mainMax; i++) {
    const recent = (recentFreq[i] || 0) / Math.max(recentDraws.length, 1);
    const older = (olderFreq[i] || 0) / Math.max(olderDraws.length, 1);
    trendScores[i] = recent - older;
  }

  const trendingNumbers = Object.entries(trendScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((x) => parseInt(x[0]));

  // ── 3. NÚMEROS RETRASADOS (no salen hace tiempo) ──
  const lastSeen = {};
  for (let i = mainMin; i <= mainMax; i++) {
    lastSeen[i] = 999;
  }

  historicalData.forEach((draw, index) => {
    const numbers = draw.numbers.main || [];
    numbers.forEach((num) => {
      if (lastSeen[num] === 999) {
        lastSeen[num] = index;
      }
    });
  });

  const overdueNumbers = Object.entries(lastSeen)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((x) => parseInt(x[0]));

  // ── 4. PAREJAS FRECUENTES ──
  const pairCount = {};

  historicalData.forEach((draw) => {
    const numbers = (draw.numbers.main || []).sort((a, b) => a - b);
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const key = `${numbers[i]}-${numbers[j]}`;
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    }
  });

  const frequentPairs = Object.entries(pairCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map((x) => ({
      pair: x[0].split('-').map(Number),
      count: x[1],
    }));

  // ── 5. ANÁLISIS DE EXTRAS ──
  const extraFrequency = {};
  historicalData.forEach((draw) => {
    const extras = draw.numbers.extra || [];
    extras.forEach((num) => {
      extraFrequency[num] = (extraFrequency[num] || 0) + 1;
    });
  });

  const hotExtras = Object.entries(extraFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((x) => parseInt(x[0]));

  return {
    hotNumbers,
    coldNumbers,
    trendingNumbers,
    overdueNumbers,
    frequentPairs,
    hotExtras,
    frequency,
    extraFrequency,
    hasData: true,
    totalDraws: historicalData.length,
  };
}

/**
 * GENERAR UNA JUGADA SEGÚN ESTRATEGIA
 */
function generateSinglePlay(config, analysis, strategyType, usedExtras = []) {
  const mainCount = config.mainNumbers.count;
  const mainMin = config.mainNumbers.min;
  const mainMax = config.mainNumbers.max;
  const allowRepeated = config.rules.allowRepeated;
  const sorted = config.rules.sorted;

  let mainNumbers = [];
  let confidence = 'high';

  switch (strategyType) {
    case 'hot':
      // 80% números más frecuentes + 20% aleatorio
      mainNumbers = pickFromWeightedPool(
        analysis.hotNumbers,
        mainCount,
        mainMin,
        mainMax,
        allowRepeated,
        0.8
      );
      confidence = analysis.hasData ? 'high' : 'medium';
      break;

    case 'balanced':
      // 50% calientes + 30% retrasados + 20% aleatorio
      {
        const hotCount = Math.ceil(mainCount * 0.5);
        const overdueCount = Math.ceil(mainCount * 0.3);
        const randomCount = mainCount - hotCount - overdueCount;

        const hot = selectUniqueNumbers(
          analysis.hotNumbers, hotCount, mainMin, mainMax
        );
        const overdue = selectUniqueNumbers(
          analysis.overdueNumbers.filter((n) => !hot.includes(n)),
          overdueCount, mainMin, mainMax
        );
        const usedNums = [...hot, ...overdue];
        const random = generateRandomExcluding(
          randomCount, mainMin, mainMax, usedNums
        );

        mainNumbers = [...hot, ...overdue, ...random];
      }
      confidence = analysis.hasData ? 'high' : 'medium';
      break;

    case 'pairs':
      // Usar parejas más frecuentes como base
      {
        const usedNums = new Set();

        if (analysis.frequentPairs.length > 0) {
          // Tomar 1-2 parejas frecuentes
          const pairsToUse = Math.min(
            Math.floor(mainCount / 2),
            analysis.frequentPairs.length
          );

          const shuffledPairs = shuffleArray([...analysis.frequentPairs]);
          for (let i = 0; i < pairsToUse && usedNums.size < mainCount; i++) {
            const pair = shuffledPairs[i].pair;
            pair.forEach((n) => {
              if (usedNums.size < mainCount && n >= mainMin && n <= mainMax) {
                usedNums.add(n);
              }
            });
          }
        }

        // Completar con números calientes
        const hotPool = shuffleArray([...analysis.hotNumbers]);
        for (const n of hotPool) {
          if (usedNums.size >= mainCount) break;
          if (!usedNums.has(n) && n >= mainMin && n <= mainMax) {
            usedNums.add(n);
          }
        }

        // Si aún falta, completar con aleatorios
        while (usedNums.size < mainCount) {
          const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
          if (!usedNums.has(n)) usedNums.add(n);
        }

        mainNumbers = Array.from(usedNums);
      }
      confidence = analysis.hasData && analysis.frequentPairs.length > 0 ? 'high' : 'medium';
      break;

    case 'trending':
      // 70% números en tendencia reciente + 30% calientes
      {
        const trendCount = Math.ceil(mainCount * 0.7);
        const hotCount = mainCount - trendCount;

        const trend = selectUniqueNumbers(
          analysis.trendingNumbers, trendCount, mainMin, mainMax
        );
        const hot = selectUniqueNumbers(
          analysis.hotNumbers.filter((n) => !trend.includes(n)),
          hotCount, mainMin, mainMax
        );

        mainNumbers = [...trend, ...hot];

        // Si falta, completar
        while (mainNumbers.length < mainCount) {
          const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
          if (!mainNumbers.includes(n)) mainNumbers.push(n);
        }
      }
      confidence = analysis.hasData ? 'medium' : 'low';
      break;

    case 'master':
      // Combinación ponderada: 30% calientes + 25% tendencia + 20% parejas + 15% retrasados + 10% aleatorio
      {
        const usedNums = new Set();

        // Calientes
        const hotPool = shuffleArray([...analysis.hotNumbers]);
        const hotTarget = Math.ceil(mainCount * 0.3);
        for (const n of hotPool) {
          if (usedNums.size >= hotTarget) break;
          if (n >= mainMin && n <= mainMax) usedNums.add(n);
        }

        // Tendencia
        const trendPool = shuffleArray([...analysis.trendingNumbers]);
        const trendTarget = usedNums.size + Math.ceil(mainCount * 0.25);
        for (const n of trendPool) {
          if (usedNums.size >= trendTarget) break;
          if (!usedNums.has(n) && n >= mainMin && n <= mainMax) usedNums.add(n);
        }

        // Parejas
        if (analysis.frequentPairs.length > 0) {
          const randomPair =
            analysis.frequentPairs[
              Math.floor(Math.random() * Math.min(5, analysis.frequentPairs.length))
            ];
          randomPair.pair.forEach((n) => {
            if (usedNums.size < mainCount && n >= mainMin && n <= mainMax) {
              usedNums.add(n);
            }
          });
        }

        // Retrasados
        const overduePool = shuffleArray([...analysis.overdueNumbers]);
        for (const n of overduePool) {
          if (usedNums.size >= mainCount - 1) break;
          if (!usedNums.has(n) && n >= mainMin && n <= mainMax) usedNums.add(n);
        }

        // Aleatorio para completar
        while (usedNums.size < mainCount) {
          const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
          usedNums.add(n);
        }

        mainNumbers = Array.from(usedNums).slice(0, mainCount);
      }
      confidence = analysis.hasData ? 'high' : 'medium';
      break;

    default:
      mainNumbers = generateRandomNumbers(mainCount, mainMin, mainMax, allowRepeated);
      confidence = 'low';
  }

  // Asegurar cantidad correcta
  mainNumbers = mainNumbers.slice(0, mainCount);

  // Eliminar duplicados si no se permiten
  if (!allowRepeated) {
    mainNumbers = [...new Set(mainNumbers)];
    while (mainNumbers.length < mainCount) {
      const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
      if (!mainNumbers.includes(n)) mainNumbers.push(n);
    }
  }

  // Ordenar si es necesario
  if (sorted) {
    mainNumbers.sort((a, b) => a - b);
  }

  // Generar números extra (usando datos históricos si hay)
  const extraNumbers = generateExtraNumbers(config, analysis, usedExtras);

  return {
    mainNumbers,
    extraNumbers,
    confidence,
  };
}

/**
 * SELECCIONAR NÚMEROS DE POOL CON PESO
 */
function pickFromWeightedPool(pool, count, min, max, allowRepeated, weight) {
  const selected = new Set();
  const weightedCount = Math.ceil(count * weight);
  const shuffled = shuffleArray([...pool]);

  // Números del pool
  for (const n of shuffled) {
    if (selected.size >= weightedCount) break;
    if (n >= min && n <= max) selected.add(n);
  }

  // Completar con aleatorios
  while (selected.size < count) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (allowRepeated || !selected.has(n)) selected.add(n);
  }

  return Array.from(selected);
}

/**
 * SELECCIONAR NÚMEROS ÚNICOS DE UNA LISTA
 */
function selectUniqueNumbers(sourceList, count, min, max) {
  const selected = [];
  const shuffled = shuffleArray([...sourceList]);

  for (const n of shuffled) {
    if (selected.length >= count) break;
    if (n >= min && n <= max && !selected.includes(n)) {
      selected.push(n);
    }
  }

  return selected;
}

/**
 * GENERAR ALEATORIOS EXCLUYENDO CIERTOS NÚMEROS
 */
function generateRandomExcluding(count, min, max, exclude) {
  const numbers = [];
  let attempts = 0;
  while (numbers.length < count && attempts < 1000) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!exclude.includes(n) && !numbers.includes(n)) {
      numbers.push(n);
    }
    attempts++;
  }
  return numbers;
}

/**
 * GENERAR NÚMEROS ALEATORIOS
 */
function generateRandomNumbers(count, min, max, allowRepeated) {
  const numbers = [];
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    if (allowRepeated || !numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

/**
 * GENERAR NÚMEROS EXTRA (con análisis histórico)
 */
function generateExtraNumbers(config, analysis, usedExtras = []) {
  if (config.extraNumbers.count === 0) return [];

  const extraNumbers = [];
  const min = config.extraNumbers.min;
  const max = config.extraNumbers.max;
  const count = config.extraNumbers.count;

  // Si hay datos históricos de extras, usar 50% frecuentes + 50% aleatorio
  if (analysis.hasData && analysis.hotExtras && analysis.hotExtras.length > 0) {
    const hotCount = Math.ceil(count * 0.5);
    const shuffledHot = shuffleArray([...analysis.hotExtras]);

    for (let i = 0; i < Math.min(hotCount, shuffledHot.length); i++) {
      const n = shuffledHot[i];
      if (n >= min && n <= max && !extraNumbers.includes(n) && !usedExtras.includes(n)) {
        extraNumbers.push(n);
      }
    }
  }

  // Completar con aleatorios
  while (extraNumbers.length < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!extraNumbers.includes(num) && !usedExtras.includes(num)) {
      extraNumbers.push(num);
    }
  }

  return extraNumbers;
}

/**
 * OBTENER DESCRIPCIÓN DE ESTRATEGIA
 */
function getStrategyDescription(type, gameName) {
  const descriptions = {
    hot: `Números con mayor frecuencia histórica en ${gameName}`,
    balanced: `Mezcla inteligente: números calientes + retrasados que están por salir`,
    pairs: `Basado en números que históricamente salen juntos con más frecuencia`,
    trending: `Números cuya frecuencia ha aumentado en los últimos sorteos`,
    master: `Combinación ponderada de todas las estrategias para máxima cobertura`,
  };
  return descriptions[type] || 'Generación inteligente';
}

/**
 * UTILIDAD: MEZCLAR ARRAY
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  generateIntelligentPlays,
};