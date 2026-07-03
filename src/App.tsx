import { useGuitarAudio } from './hooks/useGuitarAudio';
import { calculateNoteFromHz } from './utils/noteUtils';

function App() {
  const { isActive, frequency, startAudio, stopAudio } = useGuitarAudio();
  const tunerData = calculateNoteFromHz(frequency);

  const guitarStrings = [
    { name: 'E4', note: 'E', octave: 4, freq: 329.6, label: '1-я струна' },
    { name: 'B3', note: 'B', octave: 3, freq: 246.9, label: '2-я струна' },
    { name: 'G3', note: 'G', octave: 3, freq: 196.0, label: '3-я струна' },
    { name: 'D3', note: 'D', octave: 3, freq: 146.8, label: '4-я струна' },
    { name: 'A2', note: 'A', octave: 2, freq: 110.0, label: '5-я струна' },
    { name: 'E2', note: 'E', octave: 2, freq: 82.4, label: '6-я струна' },
  ];

  // Вычисляем смещение бегунка в процентах (от -50 до +50 центов переводим в диапазон для translateX)
  const cents = tunerData?.cents ?? 0;
  // Ограничиваем крайние значения, чтобы бегунок не улетал за границы шкалы
  const boundedCents = Math.max(-50, Math.min(50, cents));
  // Переводим в проценты отклонения от центра (центр — это 0px)
  const pointerPosition = `${(boundedCents / 50) * 100}%`;

  const isPerfect = isActive && Math.abs(cents) <= 2;

  return (
    <div style={{ 
      padding: '16px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      background: '#0D0D0E', 
      color: '#F5F5F7', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    }}>
      
      {/* Хедер приложения */}
      <header style={{ textAlign: 'left', marginTop: '10px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
          guitar<span style={{ color: '#2541FF' }}>tuner</span>
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8E8E93' }}>6-String Guitar • Standard</p>
      </header>

      {/* Верхняя динамическая шкала (как в референсе) */}
      <div style={{ position: 'relative', margin: '40px 0', padding: '20px 0' }}>
        {/* Сетка фона */}
        <div style={{ 
          height: '60px', 
          borderLeft: '1px dashed #3A3A3C', 
          borderRight: '1px dashed #3A3A3C', 
          position: 'relative',
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.02), transparent)'
        }}>
          {/* Центральная линия */}
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            top: 0, 
            bottom: 0, 
            width: '2px', 
            backgroundColor: isPerfect ? '#2541FF' : '#3A3A3C',
            zIndex: 2,
            transition: 'background-color 0.2s'
          }} />

          {/* Подвижный бегунок */}
          {isActive && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${pointerPosition}), -50%)`,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: isPerfect ? '#2541FF' : '#FF9500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: isPerfect ? '0 0 20px rgba(37, 65, 255, 0.6)' : '0 0 15px rgba(255, 149, 0, 0.4)',
              transition: 'transform 0.15s ease-out, background-color 0.2s, box-shadow 0.2s',
              zIndex: 3
            }}>
              {cents > 0 ? `+${cents}` : cents}
            </div>
          )}
        </div>
        
        {/* Подсказка сверху шкалы */}
        {isActive && !isPerfect && (
          <div style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            color: cents > 0 ? '#FF9500' : '#FF453A',
            marginTop: '10px',
            fontWeight: 500
          }}>
            {cents > 0 ? 'Ослабь струну (Tune down)' : 'Натяни струну (Tune up)'}
          </div>
        )}
      </div>

      {/* Интерактивный UI выбора струн (Гриф) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        maxWidth: '320px', 
        margin: '0 auto', 
        width: '100%' 
      }}>
        {guitarStrings.map((str) => {
          // Проверяем, активна ли эта конкретная нота прямо сейчас
          const isCurrentString = tunerData?.note === str.note && tunerData?.octave === str.octave;
          
          return (
            <button
              key={str.name}
              onClick={() => startAudio(str.freq)}
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>{str.label}</span>
                <span style={{ block: 'block', fontSize: '12px', color: '#8E8E93', marginLeft: '10px' }}>
                  {str.freq} Hz
                </span>
              </div>
              
              {/* Кружок с названием ноты */}
              <div style={{
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
                transition: 'all 0.2s'
              }}>
                {str.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Нижняя кнопка управления */}
      <footer style={{ margin: '20px 0 10px', textAlign: 'center' }}>
        {isActive && (
          <button 
            onClick={stopAudio}
            style={{
              padding: '14px 40px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#FF453A',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
              maxWidth: '320px'
            }}
          >
            Заглушить звук
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;