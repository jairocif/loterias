const express = require('express');
const router = express.Router();
const { generateIntelligentPlays } = require('../services/algorithm');

/**
 * POST /generate
 * Genera números inteligentes para un juego
 */
router.post('/', async (req, res) => {
  try {
    const { gameCode, plays = 5 } = req.body;

    // Validación
    if (!gameCode) {
      return res.status(400).json({
        success: false,
        error: 'gameCode es requerido',
      });
    }

    if (plays < 1 || plays > 10) {
      return res.status(400).json({
        success: false,
        error: 'plays debe estar entre 1 y 10',
      });
    }

    // Generar jugadas
    const result = await generateIntelligentPlays(gameCode, plays);

    res.json(result);
  } catch (error) {
    console.error('Error en /generate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error generando números',
    });
  }
});

module.exports = router;