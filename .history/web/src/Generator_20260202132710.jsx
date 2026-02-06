import { useState } from 'react';

function Generator({ game, gameName, onBack }) {
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      {plays.length === 0 ? (
        <div style={styles.generateSection}>
          <p style={styles.subtitle}>
            Genera 5 opciones inteligentes basadas en análisis estadístico
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              ...styles.generateButton,
              ...(loading ? styles.generateButtonDisabled : {}),
            }}
          >
            {loading ? '⏳ Generando...' : '🎲 GENERAR 5 OPCIONES ELITE'}
          </button>
        </div>
      ) : (
        <div style={styles.playsContainer}>
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

          <button onClick={handleGenerate} style={styles.regenerateButton}>
            🔄 Generar 5 nuevas opciones
          </button>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
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
  subtitle: {
    fontSize: '1.2rem',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: '2rem',
  },
  generateSection: {
    maxWidth: '600px',
    margin: '4rem auto',
    textAlign: 'center',
  },
  generateButton: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    color: 'white',
    padding: '1.5rem 3rem',
    borderRadius: '16px',
    fontSize: '1.5rem',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
    transition: 'transform 0.2s',
  },
  generateButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
  regenerateButton: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    color: 'white',
    padding: '1.25rem 2rem',
    borderRadius: '16px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1rem',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '2px solid rgba(239, 68, 68, 0.5)',
    borderRadius: '12px',
    padding: '1rem',
    marginTop: '1rem',
    textAlign: 'center',
  },
};

export default Generator;