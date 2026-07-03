import { useAudioEngine } from './hooks/useAudioEngine';
import { getStandardTuning } from './music-theory';

const TUNING = getStandardTuning();

function App() {
  const { presentation, engineStatus, error, frequency, isRunning, start, stop } = useAudioEngine();
  const { state, target, cents, inTune } = presentation;

  const boundedCents = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const pointerPosition = `${(boundedCents / 50) * 100}%`;
  const showNeedle = cents !== null;

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0D0D0E',
        color: '#F5F5F7',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ textAlign: 'left', marginTop: '10px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
          guitar<span style={{ color: '#2541FF' }}>tuner</span>
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8E8E93' }}>{TUNING.name}</p>
      </header>

      <div style={{ position: 'relative', margin: '40px 0', padding: '20px 0' }}>
        <div
          style={{
            height: '60px',
            borderLeft: '1px dashed #3A3A3C',
            borderRight: '1px dashed #3A3A3C',
            position: 'relative',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.02), transparent)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: inTune ? '#2541FF' : '#3A3A3C',
              zIndex: 2,
              transition: 'background-color 0.2s',
            }}
          />

          {showNeedle && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pointerPosition}), -50%)`,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: inTune ? '#2541FF' : '#FF9500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: inTune ? '0 0 20px rgba(37, 65, 255, 0.6)' : '0 0 15px rgba(255, 149, 0, 0.4)',
                transition: 'transform 0.15s ease-out, background-color 0.2s, box-shadow 0.2s, opacity 0.4s',
                opacity: state === 'lost' ? 0.4 : 1,
                zIndex: 3,
              }}
            >
              {Math.round(cents!) > 0 ? `+${Math.round(cents!)}` : Math.round(cents!)}
            </div>
          )}
        </div>

        {showNeedle && !inTune && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: cents! > 0 ? '#FF9500' : '#FF453A',
              marginTop: '10px',
              fontWeight: 500,
            }}
          >
            {cents! > 0 ? 'Tune down' : 'Tune up'}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '320px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {TUNING.strings.map((str) => {
          const isCurrentString = target?.id === str.id;

          return (
            <div
              key={str.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '14px',
                border: '1px solid',
                borderColor: isCurrentString ? '#2541FF' : '#1C1C1E',
                backgroundColor: isCurrentString ? 'rgba(37, 65, 255, 0.08)' : '#1C1C1E',
                color: '#fff',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{str.label}</span>

              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: isCurrentString ? '#2541FF' : '#3A3A3C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  backgroundColor: isCurrentString ? '#2541FF' : 'transparent',
                  color: '#fff',
                  transition: 'all 0.2s',
                }}
              >
                {str.id}
              </div>
            </div>
          );
        })}
      </div>

      {/* Debug info: current lifecycle state and raw detected frequency. */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#8E8E93', margin: '10px 0' }}>
        {frequency !== null ? `${frequency.toFixed(1)} Hz` : '—'} &middot; {state}
      </div>

      {error && (
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#FF453A', margin: '0 0 10px' }}>
          {error.message}
        </div>
      )}

      <footer style={{ margin: '20px 0 10px', textAlign: 'center' }}>
        <button
          onClick={isRunning ? stop : start}
          disabled={engineStatus === 'requesting-permission'}
          style={{
            padding: '14px 40px',
            fontSize: '15px',
            fontWeight: 600,
            borderRadius: '24px',
            border: 'none',
            backgroundColor: isRunning ? '#FF453A' : '#2541FF',
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '320px',
            opacity: engineStatus === 'requesting-permission' ? 0.6 : 1,
          }}
        >
          {engineStatus === 'requesting-permission' ? 'Requesting mic access…' : isRunning ? 'Stop' : 'Start Tuning'}
        </button>
      </footer>
    </div>
  );
}

export default App;
