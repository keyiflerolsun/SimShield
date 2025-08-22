// WebSocket yönetimi
class WebSocketManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.ws = null;
    this.connectWebSocket();
  }
  
  connectWebSocket() {
    try {
      this.ws = new WebSocket(WS_BASE);
      
      this.ws.onopen = () => {
        console.log('%c🌐 WebSocket bağlantısı kuruldu', 'color: #27ae60; font-weight: bold;');
        this.dashboard.elements.wsStatus.textContent = 'bağlı ✓';
        this.dashboard.elements.wsStatus.style.color = 'var(--accent)';
        this.dashboard.elements.wsDot.classList.remove('disconnected');
        this.dashboard.elements.wsDot.classList.add('connected');
        
        // İlk bağlantıda placeholder mesajını güncelle
        const alertsContainer = document.getElementById('alerts-list-panel');
        const placeholder = alertsContainer.querySelector('.alert-placeholder');
        if (placeholder) {
          placeholder.innerHTML = `
            <div class="alert-placeholder-icon">🚀</div>
            <div class="alert-placeholder-text">Canlı uyarı sistemi hazır<br>Anomali bildirimleri burada gösterilecek</div>
          `;
        }
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
      
      this.ws.onclose = () => {
        console.log('%c🔌 WebSocket bağlantısı kesildi - yeniden bağlanılıyor...', 'color: #f39c12;');
        this.dashboard.elements.wsStatus.textContent = 'bağlantı yok ✗';
        this.dashboard.elements.wsStatus.style.color = 'var(--danger)';
        this.dashboard.elements.wsDot.classList.add('disconnected');
        this.dashboard.appendMiniAlert('🔌 Canlı uyarı sistemi kesildi — yeniden bağlanıyor...');
        
        // 3 saniye sonra tekrar bağlan
        setTimeout(() => this.connectWebSocket(), 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('%c❌ WebSocket bağlantı hatası', 'color: #e74c3c; font-weight: bold;', error);
        this.dashboard.elements.wsStatus.textContent = 'bağlantı hatası ⚠️';
        this.dashboard.elements.wsStatus.style.color = 'var(--warning)';
        this.dashboard.elements.wsDot.classList.add('disconnected');
      };
      
    } catch (error) {
      console.error('%c❌ WebSocket başlatma hatası', 'color: #e74c3c; font-weight: bold;', error);
      this.dashboard.elements.wsStatus.textContent = 'bağlanamadı ✗';
      this.dashboard.elements.wsStatus.style.color = 'var(--danger)';
      this.dashboard.elements.wsDot.classList.add('disconnected');
    }
  }
  
  handleMessage(event) {
    try {
      const alert = JSON.parse(event.data);
      
      // Ses bildirimini çal
      playNotificationSound();
      
      // Anomali uyarısı için detaylı mesaj oluştur
      if (alert.type === 'anomaly_detected') {
        const detailedMessage = this.dashboard.formatAnomalyAlert(alert);
        
        // Mini panele ekle (alert verisini de gönder)
        this.dashboard.appendMiniAlert(detailedMessage, alert);
        
        // Popup göster
        this.dashboard.showAlertPopup(alert);
        
        // Fleet data'yı yenile
        setTimeout(() => this.dashboard.loadFleetData(), 1000);
      } else {
        // Bulk action veya diğer alert türleri için
        if (alert.type === 'bulk_action') {
          // Bulk action için özel alert formatı
          this.dashboard.appendMiniAlert(alert.message, alert);
          // Bulk action sonrası lastActionSimId'yi sıfırla
          this.dashboard.lastActionSimId = null;
        } else {
          const message = `${this.getSeverityIcon(alert.severity)} ${alert.message}`;
          this.dashboard.appendMiniAlert(message);
        }
        this.dashboard.showAlertPopup(alert);
      }
    } catch (e) {
      console.log(e);
      this.dashboard.appendMiniAlert(`📨 ${event.data}`);
    }
  }
  
  getSeverityIcon(severity) {
    const icons = {
      'red': '🚨',
      'orange': '⚠️',
      'yellow': '💛',
      'green': '✅',
      'info': 'ℹ️'
    };
    return icons[severity] || 'ℹ️';
  }
}
