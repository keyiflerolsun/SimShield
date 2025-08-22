// Ana dashboard sınıfı ve başlatma
class SimShieldDashboard {
  constructor() {
    this.sims = [];
    this.selectedSim = null;
    this.lastActionSimId = null; // Son manuel aksiyon SIM ID'si
    
    this.initElements();
    this.initManagers(); // Bu zaten WebSocket'i başlatır
    this.initEventListeners();
    this.loadFleetData();
    
    // Başlangıç mesajı
    setTimeout(() => {
      this.appendLog('🚀 SimShield Dashboard başlatıldı - IoT filo izleme sistemi aktif');
    }, 1000);
    
    // Auto refresh every 30 seconds
    setInterval(() => this.loadFleetData(), 30000);
  }
  
  initElements() {
    this.elements = {
      fleetList: document.getElementById('fleet-list'),
      refreshBtn: document.getElementById('refresh'),
      selectedName: document.getElementById('selected-sim-name'),
      selectedMeta: document.getElementById('selected-sim-meta'),
      simDetails: document.getElementById('sim-details'),
      usageChart: document.getElementById('usage-chart'),
      analyzeBtn: document.getElementById('analyze-btn'),
      analyzeAllBtn: document.getElementById('analyze-all-btn'),
      actionsLog: document.getElementById('actions-log-panel'),
      alertsMini: document.getElementById('alerts-list-panel'),
      wsStatus: document.getElementById('ws-status'),
      wsDot: document.getElementById('ws-dot'),
      apiStatus: document.getElementById('api-status'),
      apiDot: document.getElementById('api-dot'),
      searchInput: document.getElementById('search-input'),
      riskFilter: document.getElementById('risk-filter'),
      statusFilter: document.getElementById('status-filter'),
      cityFilter: document.getElementById('city-filter'),
      freezeBtn: document.getElementById('freeze-btn'),
      throttleBtn: document.getElementById('throttle-btn'),
      notifyBtn: document.getElementById('notify-btn'),
      bestOptionsBtn: document.getElementById('best-options-btn'),
      whatifBtn: document.getElementById('whatif-btn')
    };
  }
  
  initManagers() {
    // Manager sınıflarını başlat
    this.fleetManager = new FleetManager(this);
    this.simDetailsManager = new SimDetailsManager(this);
    this.actionsManager = new ActionsManager(this);
    this.analysisManager = new AnalysisManager(this);
    this.usageManager = new UsageManager(this);
    this.filterManager = new FilterManager(this);
    this.modalsManager = new ModalsManager(this);
    this.wsManager = new WebSocketManager(this);
  }
  
  initEventListeners() {
    this.elements.refreshBtn.addEventListener('click', () => this.loadFleetData());
    this.elements.analyzeBtn.addEventListener('click', () => this.analysisManager.analyzeCurrentSim());
    this.elements.analyzeAllBtn.addEventListener('click', () => this.analysisManager.analyzeAllSims());
    this.elements.freezeBtn.addEventListener('click', () => this.actionsManager.executeAction('freeze_24h'));
    this.elements.throttleBtn.addEventListener('click', () => this.actionsManager.executeAction('throttle'));
    this.elements.notifyBtn.addEventListener('click', () => this.actionsManager.executeAction('notify'));
    this.elements.bestOptionsBtn.addEventListener('click', () => this.modalsManager.loadBestOptions());
    this.elements.whatifBtn.addEventListener('click', () => this.modalsManager.showWhatIfModal());
    
    // Filtreler
    this.elements.searchInput.addEventListener('input', () => {
      this.filterManager.clearStatFilter(); // Manuel arama yapıldığında stat filtresini temizle
      this.filterManager.filterAndRender();
    });
    this.elements.riskFilter.addEventListener('change', () => {
      this.filterManager.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterManager.filterAndRender();
    });
    this.elements.statusFilter.addEventListener('change', () => {
      this.filterManager.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterManager.filterAndRender();
    });
    this.elements.cityFilter.addEventListener('change', () => {
      this.filterManager.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterManager.filterAndRender();
    });
    
    // Tıklanabilir istatistik kartları
    document.querySelectorAll('.clickable-stat').forEach(stat => {
      stat.addEventListener('click', (e) => {
        const filterType = e.currentTarget.getAttribute('data-filter');
        this.filterManager.applyStatFilter(filterType, e.currentTarget);
      });
    });
  }
  
  // Fleet data yükleme - Manager'a yönlendir
  async loadFleetData() {
    return this.fleetManager.loadFleetData();
  }
  
  // WebSocket bağlantısı - Manager'a yönlendir
  connectWebSocket() {
    // WebSocketManager zaten constructor'da başlatılıyor
  }
  
  // SIM seçimi - Manager'a yönlendir
  selectSimById(simId) {
    return this.simDetailsManager.selectSimById(simId);
  }
  
  // Anomali alert formatlama
  formatAnomalyAlert(alert) {
    const sim = this.sims ? this.sims.find(s => s.sim_id === alert.sim_id) : null;
    const simInfo = sim ? `${sim.sim_id} (${sim.device_type})` : alert.sim_id;
    
    // Tıklanabilir SIM ID oluştur
    const clickableSimId = `<span class="clickable-sim-id" data-sim-id="${alert.sim_id}" title="SIM'i seçmek için tıklayın">${simInfo}</span>`;
    
    // Risk skorunu görsel olarak formatla
    const riskScore = alert.risk_score ? Math.round(alert.risk_score) : 0;
    const riskIcon = this.getSeverityIcon(alert.severity || 'medium');
    
    // En son anomali tipini al - modelden gelen veri
    const latestAnomalyType = alert.latest_anomaly && alert.latest_anomaly.type ? 
      getAnomalyTypeText(alert.latest_anomaly.type) : 'Genel Anomali';
    
    return `${riskIcon} ${clickableSimId}'de ${latestAnomalyType} tespit edildi (Risk: ${riskScore})`;
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
  
  appendLog(message, cssClass = 'log-item') {
    const logItem = document.createElement('div');
    logItem.className = cssClass;
    
    // Mesaj tipine göre sınıf ekle
    if (message.includes('❌')) logItem.classList.add('error-item');
    else if (message.includes('🔍')) logItem.classList.add('analysis-item');
    else if (message.includes('⏳') || message.includes('✅')) logItem.classList.add('action-item');
    
    // Güvenli HTML oluşturma
    const timeDiv = document.createElement('div');
    timeDiv.className = 'log-time';
    timeDiv.textContent = new Date().toLocaleTimeString('tr-TR');
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'log-content';
    contentDiv.innerHTML = message; // HTML içerik için innerHTML kullan
    
    logItem.appendChild(timeDiv);
    logItem.appendChild(contentDiv);
    
    // Clickable SIM ID'lere event listener ekle
    const clickableElements = logItem.querySelectorAll('.clickable-sim-id');
    clickableElements.forEach(el => {
      el.addEventListener('click', () => {
        const simId = el.dataset.simId || el.textContent;
        this.selectSimById(simId);
      });
    });
    
    // Placeholder'ı kaldır
    const placeholder = this.elements.actionsLog.querySelector('.action-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    this.elements.actionsLog.insertBefore(logItem, this.elements.actionsLog.firstChild);
    
    // 50 kaydı geçmesin
    while (this.elements.actionsLog.children.length > 50) {
      this.elements.actionsLog.removeChild(this.elements.actionsLog.lastChild);
    }
  }
  
  appendMiniAlert(message, alertData = null) {
    const alertsContainer = document.getElementById('alerts-list-panel');
    const alertsCount = document.getElementById('alerts-count');
    const alertsCountPanel = document.getElementById('alerts-count-panel');
    
    // Placeholder'ı kaldır
    const placeholder = alertsContainer.querySelector('.alert-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    const alertItem = document.createElement('div');
    alertItem.className = 'alert-mini-item';
    
    if (alertData) {
      if (alertData.type === 'bulk_action') {
        // Bulk action için özel format - clickable SIM ID ile
        const message = alertData.message || '';
        let actionName = 'İşlem';
        let actionIcon = '✅';
        
        if (message.includes('notify')) {
          actionName = 'Uyarı Gönderme';
          actionIcon = '📢';
        } else if (message.includes('freeze')) {
          actionName = '24 Saat Dondurma';
          actionIcon = '❄️';
        } else if (message.includes('throttle')) {
          actionName = 'Hız Düşürme';
          actionIcon = '🐌';
        }
        
        // Seçili SIM'den bilgi al - önce lastActionSimId'yi kontrol et
        let simId = this.lastActionSimId || (this.selectedSim ? this.selectedSim.sim_id : 'Unknown');
        let deviceType = 'Device';
        let location = 'Bilinmiyor';
        
        if (this.lastActionSimId) {
          // Son aksiyon SIM'ini bul
          const lastActionSim = this.sims ? this.sims.find(s => s.sim_id === this.lastActionSimId) : null;
          if (lastActionSim) {
            deviceType = lastActionSim.device_type || 'Device';
            location = lastActionSim.city || getSimLocation(this.lastActionSimId, this.sims) || 'Bilinmiyor';
          }
        } else if (this.selectedSim) {
          deviceType = this.selectedSim.device_type || 'Device';
          location = this.selectedSim.city || getSimLocation(this.selectedSim.sim_id, this.sims) || 'Bilinmiyor';
        }
        
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        alertItem.innerHTML = `
          <div class="alert-mini-content compact">
            <div class="alert-mini-main">
              ${actionIcon} <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> 
              (${deviceType}) - ${actionName} Tamamlandı
            </div>
            <div class="alert-mini-meta">
              <span>📍 ${location}</span>
              <span class="alert-mini-time">${timestamp}</span>
            </div>
          </div>
        `;
        
        // Tıklanabilir SIM ID event'i ekle
        const clickableElements = alertItem.querySelectorAll('.clickable-sim-id');
        clickableElements.forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const simId = el.dataset.simId;
            if (simId) {
              this.selectSimById(simId);
            }
          });
        });
        
      } else {
        // Detaylı alert verisi var - KOMPAKT FORMAT (anomali için)
        const riskScore = alertData.risk_score || 0;
        const riskClass = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
        const severityIcon = riskScore >= 70 ? '🚨' : riskScore >= 40 ? '⚠️' : '✅';
        const simId = alertData.sim_id || 'UNKNOWN';
        
        // SIM listesinden device type bilgisini al
        let deviceType = 'Device';
        if (this.sims && simId !== 'UNKNOWN') {
          const sim = this.sims.find(s => s.sim_id === simId);
          if (sim) {
            deviceType = sim.device_type || 'Device';
          }
        }
        
        const location = alertData.location || getSimLocation(alertData.sim_id, this.sims) || 'Bilinmiyor';
        const anomalyType = alertData.latest_anomaly?.type ? 
          getAnomalyTypeText(alertData.latest_anomaly.type) : 'Anomali';
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        // Kompakt tek satır format
        alertItem.innerHTML = `
          <div class="alert-mini-content compact">
            <div class="alert-mini-main">
              ${severityIcon} <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> 
              (${deviceType}) - ${anomalyType} 
              <span class="alert-mini-score ${riskClass}">${Math.round(riskScore)}</span>
            </div>
            <div class="alert-mini-meta">
              <span>📍 ${location}</span>
              <span class="alert-mini-time">${timestamp}</span>
            </div>
          </div>
        `;
        
        // Tıklanabilir SIM ID event'i ekle
        const clickableElements = alertItem.querySelectorAll('.clickable-sim-id');
        clickableElements.forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const simId = el.dataset.simId;
            if (simId) {
              this.selectSimById(simId);
            }
          });
        });
        
        // Anomali uyarısı için ses çal
        if (alertData.type === 'anomaly_detected') {
          playNotificationSound();
        }
      }
      
    } else {
      // Basit mesaj - Manuel aksiyonlar için HTML korunarak format
      let formattedMessage = message;
      
      // Eğer mesaj HTML clickable SIM ID içeriyorsa, koru
      if (message.includes('<span class="clickable-sim-id"')) {
        formattedMessage = message; // HTML'i olduğu gibi koru
      } else {
        // Manuel aksiyon mesajlarını düzelt (sadece düz tekst için)
        if (message.includes('SIM\'e') && message.includes('eylemi uygulandı')) {
          // "1 SIM'e notify eylemi uygulandı" -> "✅ Uyarı Gönderme tamamlandı"
          if (message.includes('notify')) {
            formattedMessage = '✅ Uyarı Gönderme işlemi tamamlandı';
          } else if (message.includes('freeze_24h')) {
            formattedMessage = '✅ 24 Saat Dondurma işlemi tamamlandı';
          } else if (message.includes('throttle')) {
            formattedMessage = '✅ Hız Düşürme işlemi tamamlandı';
          }
        }
      }
      
      alertItem.innerHTML = `
        <div class="alert-mini-content">
          <div class="alert-mini-main">${formattedMessage}</div>
          <div class="alert-mini-meta">
            <span class="alert-mini-time">${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      `;
      
      // HTML içindeki clickable SIM ID'lere event listener ekle
      const clickableElements = alertItem.querySelectorAll('.clickable-sim-id');
      clickableElements.forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const simId = el.dataset.simId;
          if (simId) {
            this.selectSimById(simId);
          }
        });
      });
    }
    
    // En üste ekle (LIFO)
    alertsContainer.insertBefore(alertItem, alertsContainer.firstChild);
    
    // Maksimum 50 alert tutma
    const allAlerts = alertsContainer.querySelectorAll('.alert-mini-item');
    if (allAlerts.length > 50) {
      allAlerts[allAlerts.length - 1].remove();
    }
    
    // Alert sayısını güncelle
    const currentCount = allAlerts.length;
    if (alertsCount) {
      alertsCount.textContent = currentCount;
    }
    if (alertsCountPanel) {
      alertsCountPanel.textContent = currentCount;
    }
    
    // Floating alerts panel'e de ekle
    const panelContainer = document.querySelector('#floating-alerts-panel .floating-panel-content');
    if (panelContainer) {
      const clonedItem = alertItem.cloneNode(true);
      
      // Panel'deki placeholder'ı da kaldır
      const panelPlaceholder = panelContainer.querySelector('.alert-placeholder');
      if (panelPlaceholder) {
        panelPlaceholder.remove();
      }
      
      panelContainer.insertBefore(clonedItem, panelContainer.firstChild);
      
      // Panel'de de maksimum limit
      const panelAlerts = panelContainer.querySelectorAll('.alert-mini-item');
      if (panelAlerts.length > 50) {
        panelAlerts[panelAlerts.length - 1].remove();
      }
    }
    
    // Hafif animasyon
    alertItem.style.opacity = '0';
    alertItem.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      alertItem.style.transition = 'all 0.3s ease';
      alertItem.style.opacity = '1';
      alertItem.style.transform = 'translateY(0)';
    }, 50);
  }
  
  showAlertPopup(alert) {
    // Eski popup'ları kapat
    const existingPopups = document.querySelectorAll('.alert-popup');
    existingPopups.forEach(popup => popup.remove());
    
    // Mesaj içeriği hazırla
    let message = '';
    let title = '🚨 Yeni Uyarı';
    
    if (alert.type === 'anomaly_detected') {
      const sim = this.sims ? this.sims.find(s => s.sim_id === alert.sim_id) : null;
      const simInfo = sim ? `${sim.sim_id} (${sim.device_type})` : alert.sim_id;
      
      // Clickable SIM ID oluştur
      const clickableSimId = `<span class="clickable-sim-id" data-sim-id="${alert.sim_id}" title="SIM'i seçmek için tıklayın" style="color: #007bff; cursor: pointer; text-decoration: underline;">${simInfo}</span>`;
      
      title = '🚨 Anomali Tespit Edildi';
      message = `<strong>${clickableSimId}</strong>'de anomali tespit edildi.`;
      
      if (alert.details) {
        message += `<br><br><strong>Detaylar:</strong> ${alert.details}`;
      }
    } else if (alert.type === 'bulk_action') {
      // Manuel aksiyon alert'leri için
      title = '✅ İşlem Tamamlandı';
      
      // Mesajdan SIM ID'yi çıkart
      const actionMessage = alert.message || '';
      
      // "1 SIM'e notify eylemi uygulandı" -> SIM ID'yi bul
      if (this.selectedSim) {
        const simId = this.selectedSim.sim_id;
        const sim = this.selectedSim;
        const simInfo = `${simId} (${sim.device_type || 'Device'})`;
        
        // Clickable SIM ID oluştur
        const clickableSimId = `<span class="clickable-sim-id" data-sim-id="${simId}" title="SIM'i seçmek için tıklayın" style="color: #007bff; cursor: pointer; text-decoration: underline;">${simInfo}</span>`;
        
        // Action type'ı belirle
        let actionName = 'İşlem';
        if (actionMessage.includes('notify')) {
          actionName = 'Uyarı Gönderme';
        } else if (actionMessage.includes('freeze')) {
          actionName = '24 Saat Dondurma';
        } else if (actionMessage.includes('throttle')) {
          actionName = 'Hız Düşürme';
        }
        
        message = `<strong>${clickableSimId}</strong> için <strong>${actionName}</strong> işlemi başarıyla uygulandı.`;
      } else {
        message = actionMessage;
      }
    } else {
      message = alert.message || 'Yeni uyarı mesajı';
    }
    
    // Unique ID oluştur
    const popupId = `alert-popup-${Date.now()}`;
    
    // Popup HTML'i oluştur
    const popupHtml = `
      <div class="alert-popup" id="${popupId}">
        <div class="alert-popup-header">
          <div class="alert-popup-title">${title}</div>
          <button class="alert-popup-close" onclick="this.closest('.alert-popup').remove()">✕</button>
        </div>
        <div class="alert-popup-content">
          ${message}
        </div>
        <div class="alert-popup-time">
          ${new Date().toLocaleString('tr-TR')}
        </div>
      </div>
    `;
    
    // Popup'ı sayfaya ekle
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    
    // Popup içindeki clickable SIM ID'ler için event listener ekle
    const popup = document.getElementById(popupId);
    const clickableSimIds = popup.querySelectorAll('.clickable-sim-id');
    clickableSimIds.forEach(element => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        const simId = element.getAttribute('data-sim-id');
        this.selectSimById(simId);
        // Popup'ı kapat
        popup.remove();
      });
    });
    
    // 8 saniye sonra otomatik kapat
    setTimeout(() => {
      const popup = document.getElementById(popupId);
      if (popup) {
        popup.classList.add('closing');
        setTimeout(() => popup.remove(), 400);
      }
    }, 8000);
  }
}

// Dashboard'ı başlat
let dashboard;
let panelManager;
let isInitialized = false; // Tekrarlı initialization'ı engelle

function initializeDashboard() {
  // Eğer zaten initialize edilmişse, tekrar yapma
  if (isInitialized) {
    console.log('%c⚠️ Dashboard zaten başlatılmış - tekrarlama engellendi', 'color: #f39c12;');
    return;
  }
  
  console.log('%c⚙️ Dashboard bileşenleri hazırlanıyor...', 'color: #3498db;');
  
  dashboard = new SimShieldDashboard();
  panelManager = new PanelManager();
  isInitialized = true; // Flag'i set et
  
  console.log('%c✅ Dashboard aktif - IoT filo izleme sistemi hazır', 'color: #27ae60; font-weight: bold;');
  
  // Tab navigation functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update tab buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update tab panes
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === `tab-${targetTab}`) {
          pane.classList.add('active');
        }
      });
    });
  });
  
  // Header'daki panel butonlarını ayarla
  const alertsBtn = document.getElementById('alerts-btn');
  const actionsBtn = document.getElementById('actions-btn');
  
  if (alertsBtn) {
    alertsBtn.addEventListener('click', () => {
      // Ses iznini al (ilk kullanıcı etkileşimi)
      initAudioContext();
      panelManager.showPanel('alerts-panel');
    });
  }
  
  if (actionsBtn) {
    actionsBtn.addEventListener('click', () => {
      panelManager.showPanel('actions-panel');
    });
  }
  
  // Sidebar butonları için event listener'lar - sadece temizleme butonu
  const clearAlertsBtn = document.getElementById('clear-alerts');
  
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', () => {
      const alertsContainer = document.getElementById('alerts-mini');
      const alertsCount = document.getElementById('alerts-count');
      
      // Tüm alert'leri temizle
      alertsContainer.innerHTML = `
        <div class="alert-placeholder">
          <div class="alert-placeholder-icon">✨</div>
          <div class="alert-placeholder-text">Tüm uyarılar temizlendi</div>
        </div>
      `;
      
      if (alertsCount) {
        alertsCount.textContent = '0';
      }
    });
  }
}

// DOM hazır olup olmadığını kontrol et
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  // DOM zaten hazır, hemen başlat
  initializeDashboard();
}

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault();
    if (dashboard) {
      dashboard.loadFleetData();
    }
  }
});
