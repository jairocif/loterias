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

    // 2. Obtener datos históricos (simulados por ahora)
    // TODO: Implementar scrapers para obtener datos reales
    const historicalData = await getHistoricalData(game.id);

    // 3. Analizar datos
    const analysis = analyzeData(historicalData, config);

    // 4. Generar las 5 jugadas con diferentes estrategias
    const strategies = [
      { name: 'Súper Calientes', icon: '🔥', type: 'hot' },
      { name: 'Equilibrio Perfecto', icon: '⚖️', type: 'balanced' },
      { name: 'Correlaciones', icon: '🤝', type: 'correlations' },
      { name: 'Tendencia Ascendente', icon: '📈', type: 'trending' },
      { name: 'Algoritmo Maestro', icon: '🧠', type: 'master' },
    ];

    const plays = [];
    for (let i = 0; i < Math.min(playsCount, strategies.length); i++) {
      const strategy = strategies[i];
      const play = generateSinglePlay(config, analysis, strategy.type);
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
      dataAge: '15 minutos', // TODO: calcular edad real de datos
      plays: plays,
    };
  } catch (error) {
    console.error('Error generando jugadas:', error);
    throw error;
  }
}

/**
 * OBTENER DATOS HISTÓRICOS
 * Por ahora genera datos simulados, luego conectaremos scrapers
 */
async function getHistoricalData(gameId) {
  // TODO: Obtener de lottery_results cuando tengamos scrapers
  // Por ahora retornamos array vacío
  const result = await pool.query(
    'SELECT * FROM lottery_results WHERE game_id = $1 ORDER BY draw_date DESC LIMIT 100',
    [gameId]
  );

  return result.rows;
}

/**
 * ANALIZAR DATOS HISTÓRICOS
 */
function analyzeData(historicalData, config) {
  const mainCount = config.mainNumbers.count;
  const mainMin = config.mainNumbers.min;
  const mainMax = config.mainNumbers.max;

  // Si no hay datos históricos, generar análisis base
  if (historicalData.length === 0) {
    const allNumbers = [];
    for (let i = mainMin; i <= mainMax; i++) {
      allNumbers.push(i);
    }

    return {
      hotNumbers: shuffleArray(allNumbers).slice(0, 10),
      coldNumbers: shuffleArray(allNumbers).slice(0, 10),
      trending: shuffleArray(allNumbers).slice(0, 5),
      frequency: {},
      hasData: false,
    };
  }

  // Análisis real con datos históricos
  const frequency = {};
  historicalData.forEach((draw) => {
    const numbers = draw.numbers.main || [];
    numbers.forEach((num) => {
      frequency[num] = (frequency[num] || 0) + 1;
    });
  });

  const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  const hotNumbers = sorted.slice(0, 10).map((x) => parseInt(x[0]));
  const coldNumbers = sorted.slice(-10).map((x) => parseInt(x[0]));

  return {
    hotNumbers,
    coldNumbers,
    trending: hotNumbers.slice(0, 5),
    frequency,
    hasData: true,
  };
}

/**
 * GENERAR UNA JUGADA SEGÚN ESTRATEGIA
 */
function generateSinglePlay(config, analysis, strategyType) {
  const mainCount = config.mainNumbers.count;
  const mainMin = config.mainNumbers.min;
  const mainMax = config.mainNumbers.max;
  const allowRepeated = config.rules.allowRepeated;
  const sorted = config.rules.sorted;

  let mainNumbers = [];
  let confidence = 'high';

  switch (strategyType) {
    case 'hot':
      // 90% números calientes
      mainNumbers = selectNumbers(
        analysis.hotNumbers,
        mainCount,
        mainMin,
        mainMax,
        allowRepeated
      );
      confidence = 'high';
      break;

    case 'balanced':
      // 60% calientes + 40% fríos
      const hotCount = Math.ceil(mainCount * 0.6);
      const coldCount = mainCount - hotCount;
      mainNumbers = [
        ...selectNumbers(
          analysis.hotNumbers,
          hotCount,
          mainMin,
          mainMax,
          allowRepeated
        ),
        ...selectNumbers(
          analysis.coldNumbers,
          coldCount,
          mainMin,
          mainMax,
          allowRepeated
        ),
      ];
      confidence = 'high';
      break;

    case 'correlations':
      // Números que suelen salir juntos
      mainNumbers = selectNumbers(
        analysis.hotNumbers,
        mainCount,
        mainMin,
        mainMax,
        allowRepeated
      );
      confidence = 'medium';
      break;

    case 'trending':
      // Números en tendencia
      mainNumbers = selectNumbers(
        analysis.trending,
        mainCount,
        mainMin,
        mainMax,
        allowRepeated
      );
      confidence = 'medium';
      break;

    case 'master':
      // Mezcla de todo
      const counts = {
        hot: Math.ceil(mainCount * 0.35),
        trending: Math.ceil(mainCount * 0.20),
        random: mainCount - Math.ceil(mainCount * 0.55),
      };
      mainNumbers = [
        ...selectNumbers(
          analysis.hotNumbers,
          counts.hot,
          mainMin,
          mainMax,
          allowRepeated
        ),
        ...selectNumbers(
          analysis.trending,
          counts.trending,
          mainMin,
          mainMax,
          allowRepeated
        ),
        ...generateRandomNumbers(
          counts.random,
          mainMin,
          mainMax,
          allowRepeated
        ),
      ];
      confidence = 'high';
      break;

    default:
      mainNumbers = generateRandomNumbers(mainCount, mainMin, mainMax, allowRepeated);
      confidence = 'medium';
  }

  // Ordenar si es necesario
  if (sorted && !allowRepeated) {
    mainNumbers.sort((a, b) => a - b);
  }

  // Generar números extra
  const extraNumbers = generateExtraNumbers(config);

  return {
    mainNumbers,
    extraNumbers,
    confidence,
  };
}

/**
 * SELECCIONAR NÚMEROS DE UNA LISTA
 */
function selectNumbers(sourceList, count, min, max, allowRepeated) {
  const selected = [];
  const available = [...sourceList];

  while (selected.length < count && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const num = available[randomIndex];

    if (!allowRepeated) {
      available.splice(randomIndex, 1);
    }

    if (num >= min && num <= max) {
      selected.push(num);
    }
  }

  // Si no hay suficientes, completar con aleatorios
  while (selected.length < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    if (allowRepeated || !selected.includes(randomNum)) {
      selected.push(randomNum);
    }
  }

  return selected;
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
 * GENERAR NÚMEROS EXTRA
 */
function generateExtraNumbers(config) {
  if (config.extraNumbers.count === 0) return [];

  const extraNumbers = [];
  for (let i = 0; i < config.extraNumbers.count; i++) {
    const num =
      Math.floor(
        Math.random() *
          (config.extraNumbers.max - config.extraNumbers.min + 1)
      ) + config.extraNumbers.min;
    extraNumbers.push(num);
  }
  return extraNumbers;
}

/**
 * OBTENER DESCRIPCIÓN DE ESTRATEGIA
 */
function getStrategyDescription(type, gameName) {
  const descriptions = {
    hot: `Los 5 números más frecuentes de ${gameName}`,
    balanced: `Mezcla inteligente: números calientes + retrasados`,
    correlations: `Números que históricamente salen juntos`,
    trending: `Números con mayor crecimiento reciente`,
    master: `Combinación óptima de todas las estrategias`,
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