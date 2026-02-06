import { useState, useEffect } from 'react';

function Generator({ game, gameName, onBack }) {
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameCode: game,
          plays: 5,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlays(data.plays);
      } else {
        setError(data.error || 'Error generando números');
      }
    } catch (err) {
      setError('Error conectando con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyPlay = (play) => {
    const text = `${play.mainNumbers.join(', ')}${
      play.extraNumbers.length > 0 ? ' + ' + play.extraNumbers.join(', ') : ''
    }`;
    navigator.clipboard.writeText(text);
    alert('Números copiados al portapapeles');
  };

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>
        ← Volver
      </button>

      <h1 style={styles.title}>{gameName}</h1>

      {loading ? (
        <div style={styles.loadingSection}>
          <div style={styles.spinner}>⏳</div>
          <p style={styles.loadingText}>Analizando datos históricos...</p>
          <p style={styles.loadingSubtext}>Generando 5 opciones inteligentes</p>
        </div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <div style={styles.playsContainer}>
          <p style={styles.infoText}>
            5 opciones generadas basadas en análisis estadístico
          </p>
          
          {plays.map((play) => (
            <div key={play.id} style={styles.playCard}>
              <div style={styles.playHeader}>
                <span style={styles.playIcon}>{play.icon}</span>
                <span style={styles.playStrategy}>{play.strategy}</span>
                <span style={styles.playConfidence}>
                  {'⭐'.repeat(play.confidence === 'high' ? 5 : play.confidence === 'medium' ? 4 : 3)}
                </span>
              </div>

              <div style={styles.numbersRow}>
                {play.mainNumbers.map((num, idx) => (
                  <div key={idx} style={styles.number}>
                    {num}
                  </div>
                ))}
                {play.extraNumbers.length > 0 && (
                  <>
                    <span style={styles.plus}>+</span>
                    {play.extraNumbers.map((num, idx) => (
                      <div key={idx} style={styles.numberExtra}>
                        {num}
                      </div>
                    ))}
                  </>
                )}
              </div>

              <p style={styles.playDescription}>{play.description}</p>

              <button onClick={() => copyPlay(play)} style={styles.copyButton}>
                📋 Copiar
              </button>
            </div>
          ))}

          <div style={styles.footerNote}>
            💡 Para generar nuevas opciones, vuelve y selecciona el juego nuevamente
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
    color: 'white',
    padding: '2rem',
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '3rem',
    fontWeight: '900',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  loadingSection: {
    maxWidth: '600px',
    margin: '4rem auto',
    textAlign: 'center',
  },
  spinner: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  loadingText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  loadingSubtext: {
    fontSize: '1rem',
    opacity: 0.7,
  },
  infoText: {
    fontSize: '1rem',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: '2rem',
  },
  playsContainer: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  playCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  playHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  playIcon: {
    fontSize: '2rem',
  },
  playStrategy: {
    fontSize: '1.2rem',
    fontWeight: '700',
    flex: 1,
  },
  playConfidence: {
    fontSize: '1rem',
  },
  numbersRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  number: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '900',
  },
  numberExtra: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: '2px solid rgba(99,102,241,0.5)',
    background: 'rgba(99,102,241,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '900',
  },
  plus: {
    fontSize: '1.5rem',
    margin: '0 0.5rem',
  },
  playDescription: {
    fontSize: '0.9rem',
    opacity: 0.8,
    marginBottom: '1rem',
    textAlign: 'center',
  },
  copyButton: {
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
  },
  footerNote: {
    marginTop: '2rem',
    padding: '1rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    textAlign: 'center',
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  error: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '2px solid rgba(239, 68, 68, 0.5)',
    borderRadius: '12px',
    padding: '1rem',
    marginTop: '2rem',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '2rem auto',
  },
};

export default Generator;