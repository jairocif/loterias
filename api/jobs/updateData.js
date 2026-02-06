/**
 * CRON JOB - Actualización automática de datos
 * Ejecuta los scrapers cada 2 horas para mantener datos frescos
 *
 * Uso:
 *   require('./jobs/updateData').start();  // desde index.js
 *   require('./jobs/updateData').runNow(); // ejecución manual
 */

const cron = require('node-cron');
const scrapers = require('../scrapers/coordinator');

let isRunning = false;

// ─── Ejecutar actualización ───────────────────────────────
async function runNow() {
  if (isRunning) {
    console.log('⏳ Ya hay una actualización en curso, saltando...');
    return null;
  }

  isRunning = true;
  console.log(`\n⏰ [${new Date().toISOString()}] Iniciando actualización programada...\n`);

  try {
    const result = await scrapers.runAll();
    console.log(`✅ Actualización completada: ${result.totalSaved} resultados nuevos\n`);
    return result;
  } catch (err) {
    console.error('❌ Error en actualización programada:', err.message);
    return null;
  } finally {
    isRunning = false;
  }
}

// ─── Iniciar cron job (cada 2 horas) ─────────────────────
function start() {
  console.log('🕐 Cron job configurado: cada 2 horas');

  // Ejecutar al iniciar el servidor
  setTimeout(() => {
    console.log('🚀 Primera ejecución al iniciar servidor...');
    runNow();
  }, 10000); // espera 10 segundos para que la BD esté lista

  // Programar cada 2 horas: minuto 0 de cada hora par
  cron.schedule('0 */2 * * *', () => {
    runNow();
  });
}

module.exports = {
  start,
  runNow,
};