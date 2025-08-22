// Yardımcı fonksiyonlar ve ses yönetimi
let soundEnabled = true;
let audioContext = null;

// HTML güvenlik fonksiyonu
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Audio context'i kullanıcı etkileşimi ile başlat
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Ses çalma fonksiyonu
function playNotificationSound() {
  if (!soundEnabled) return;
  
  try {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playBeep(ctx);
      });
    } else {
      playBeep(ctx);
    }
  } catch (error) {
    console.warn('Ses çalmada hata:', error);
  }
}

function playBeep(audioContext) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

// Anomali türü metinleri
function getAnomalyTypeText(type) {
  const typeMap = {
    // Enum'larda tanımlı anomali türleri
    'sudden_spike': 'Ani Kullanım Artışı',
    'sustained_drain': 'Sürekli Yüksek Kullanım',
    'inactivity': 'Uzun Süreli İnaktivite',
    'unexpected_roaming': 'Beklenmeyen Roaming'
  };
  
  return typeMap[type] || type;
}

// SIM lokasyon bilgisi alma
function getSimLocation(simId, sims) {
  const sim = sims ? sims.find(s => s.sim_id === simId) : null;
  return sim ? sim.city : null;
}
