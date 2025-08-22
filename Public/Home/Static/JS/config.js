// --- CONFIG: SimShield API endpoints ---
const API_BASE = window.location.origin; // Otomatik olarak mevcut sunucu
const WS_BASE = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host + '/api/v1/ws/alerts';

// API call yardımcı fonksiyonu
async function apiCall(path, options = {}) {
  try {
    const response = await fetch(API_BASE + path, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${path}:`, error);
    throw error;
  }
}
