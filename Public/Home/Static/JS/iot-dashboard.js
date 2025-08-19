// --- CONFIG: SimShield API endpoints ---
const API_BASE = window.location.origin; // Otomatik olarak mevcut sunucu
const WS_BASE = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host + '/api/v1/ws/alerts';
// -------------------------------

class SimShieldDashboard {
  constructor() {
    this.sims = [];
    this.selectedSim = null;
    this.ws = null;
    this.chartData = null;
    
    this.initElements();
    this.initEventListeners();
    this.connectWebSocket();
    this.loadFleetData();
    
    // Auto refresh every 30 seconds
    setInterval(() => this.loadFleetData(), 30000);
  }
  
  initElements() {
    this.elements = {
      fleetList: document.getElementById('fleet-list'),
      refreshBtn: document.getElementById('refresh'),
      selectedName: document.getElementById('selected-sim-name'),
      selectedMeta: document.getElementById('selected-sim-meta'),
      usageChart: document.getElementById('usage-chart'),
      analyzeBtn: document.getElementById('analyze-btn'),
      actionsLog: document.getElementById('actions-log'),
      alertsLog: document.getElementById('alerts-log'),
      wsStatus: document.getElementById('ws-status'),
      wsDot: document.getElementById('ws-dot'),
      apiStatus: document.getElementById('api-status'),
      searchInput: document.getElementById('search-input'),
      riskFilter: document.getElementById('risk-filter'),
      statusFilter: document.getElementById('status-filter'),
      cityFilter: document.getElementById('city-filter'),
      freezeBtn: document.getElementById('freeze-btn'),
      throttleBtn: document.getElementById('throttle-btn'),
      notifyBtn: document.getElementById('notify-btn'),
      bestOptionsBtn: document.getElementById('best-options-btn'),
      anomalyAnalysis: document.getElementById('anomaly-analysis')
    };
  }
  
  initEventListeners() {
    this.elements.refreshBtn.addEventListener('click', () => this.loadFleetData());
    this.elements.analyzeBtn.addEventListener('click', () => this.analyzeCurrentSim());
    this.elements.freezeBtn.addEventListener('click', () => this.executeAction('freeze_24h'));
    this.elements.throttleBtn.addEventListener('click', () => this.executeAction('throttle'));
    this.elements.notifyBtn.addEventListener('click', () => this.executeAction('notify'));
    this.elements.bestOptionsBtn.addEventListener('click', () => this.loadBestOptions());
    
    // Filtreler
    this.elements.searchInput.addEventListener('input', () => this.filterAndRender());
    this.elements.riskFilter.addEventListener('change', () => this.filterAndRender());
    this.elements.statusFilter.addEventListener('change', () => this.filterAndRender());
    this.elements.cityFilter.addEventListener('change', () => this.filterAndRender());
  }
  
  async apiCall(path, options = {}) {
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
  
  async loadFleetData() {
    try {
      this.elements.fleetList.innerHTML = '<div class="muted">📡 Filo verileri yükleniyor...</div>';
      this.elements.apiStatus.textContent = 'yükleniyor...';
      
      const data = await this.apiCall('/api/v1/fleet');
      this.sims = Array.isArray(data) ? data : (data.sims || []);
      
      this.updateStatistics();
      this.populateCityFilter();
      this.filterAndRender();
      
      this.elements.apiStatus.textContent = 'bağlı ✓';
      this.elements.apiStatus.style.color = 'var(--accent)';
      
    } catch (error) {
      console.error('Fleet data load error:', error);
      this.elements.fleetList.innerHTML = `<div class="muted">❌ Filo yüklenemedi: ${error.message}</div>`;
      this.elements.apiStatus.textContent = 'hata ✗';
      this.elements.apiStatus.style.color = 'var(--danger)';
    }
  }
  
  updateStatistics() {
    const total = this.sims.length;
    const active = this.sims.filter(s => s.status === 'active').length;
    const highRisk = this.sims.filter(s => (s.risk_level === 'red' || s.risk_score >= 70)).length;
    const anomalies = this.sims.reduce((sum, s) => sum + (s.anomaly_count || 0), 0);
    
    document.getElementById('total-sims').textContent = total;
    document.getElementById('active-sims').textContent = active;
    document.getElementById('high-risk-sims').textContent = highRisk;
    document.getElementById('anomaly-count').textContent = anomalies;
  }
  
  populateCityFilter() {
    const cities = [...new Set(this.sims.map(s => s.city).filter(Boolean))].sort();
    const cityFilter = this.elements.cityFilter;
    
    // Mevcut seçimi koru
    const currentValue = cityFilter.value;
    cityFilter.innerHTML = '<option value="">Tüm Şehir</option>';
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityFilter.appendChild(option);
    });
    cityFilter.value = currentValue;
  }
  
  filterAndRender() {
    const searchTerm = this.elements.searchInput.value.toLowerCase();
    const riskFilter = this.elements.riskFilter.value;
    const statusFilter = this.elements.statusFilter.value;
    const cityFilter = this.elements.cityFilter.value;
    
    const filtered = this.sims.filter(sim => {
      const matchesSearch = !searchTerm || 
        sim.sim_id.toLowerCase().includes(searchTerm) ||
        (sim.device_type || '').toLowerCase().includes(searchTerm);
      
      const matchesRisk = !riskFilter || sim.risk_level === riskFilter || 
        (riskFilter === 'red' && (sim.risk_score || 0) >= 70) ||
        (riskFilter === 'orange' && (sim.risk_score || 0) >= 40 && (sim.risk_score || 0) < 70) ||
        (riskFilter === 'green' && (sim.risk_score || 0) < 40);
      
      const matchesStatus = !statusFilter || sim.status === statusFilter;
      const matchesCity = !cityFilter || sim.city === cityFilter;
      
      return matchesSearch && matchesRisk && matchesStatus && matchesCity;
    });
    
    this.renderFleet(filtered);
  }
  
  renderFleet(simsToRender = this.sims) {
    if (!simsToRender || simsToRender.length === 0) {
      this.elements.fleetList.innerHTML = '<div class="muted">📭 Kriterlere uygun SIM bulunamadı.</div>';
      return;
    }
    
    this.elements.fleetList.innerHTML = '';
    simsToRender.forEach(sim => {
      const element = this.createSimElement(sim);
      this.elements.fleetList.appendChild(element);
    });
  }
  
  createSimElement(sim) {
    const el = document.createElement('div');
    el.className = 'sim-item';
    if (this.selectedSim && this.selectedSim.sim_id === sim.sim_id) {
      el.classList.add('selected');
    }
    
    const riskScore = sim.risk_score || 0;
    const riskLevel = sim.risk_level || this.calculateRiskLevel(riskScore);
    const hasAnomalies = (sim.anomaly_count || 0) > 0;
    
    el.innerHTML = `
      <div class="sim-info">
        <div class="sim-id">
          ${hasAnomalies ? '<span class="anomaly-indicator"></span>' : ''}
          ${this.escapeHtml(sim.sim_id)}
        </div>
        <div class="sim-meta">
          <span>${this.getDeviceIcon(sim.device_type)} ${this.escapeHtml(sim.device_type || 'Bilinmiyor')}</span>
          <span>📍 ${this.escapeHtml(sim.city || '—')}</span>
          <span>📊 ${this.escapeHtml(sim.plan_name || sim.plan || '—')}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${riskLevel}">${riskScore}</span>
      </div>
    `;
    
    el.addEventListener('click', () => this.selectSim(sim));
    return el;
  }
  
  calculateRiskLevel(score) {
    if (score >= 70) return 'red';
    if (score >= 40) return 'orange';
    return 'green';
  }
  
  getDeviceIcon(deviceType) {
    const icons = {
      'POS': '💳',
      'SmartMeter': '⚡',
      'Tracker': '📍',
      'Camera': '📹',
      'Sensor': '🌡️'
    };
    return icons[deviceType] || '🔧';
  }
  
  async selectSim(sim) {
    this.selectedSim = sim;
    
    // UI güncellemelerini yap
    this.elements.selectedName.textContent = sim.sim_id;
    this.elements.selectedMeta.textContent = `${sim.device_type || '—'} • Plan: ${sim.plan_name || sim.plan || '—'} • Durum: ${this.getStatusText(sim.status)}`;
    
    // Butonları aktifleştir
    this.elements.analyzeBtn.disabled = false;
    this.elements.freezeBtn.disabled = false;
    this.elements.throttleBtn.disabled = false;
    this.elements.notifyBtn.disabled = false;
    this.elements.bestOptionsBtn.disabled = false;
    
    // Seçili SIM'i görsel olarak göster
    this.filterAndRender();
    
    // Verileri yükle
    await this.loadSimData(sim.sim_id);
  }
  
  async loadSimData(simId) {
    try {
      // Kullanım verileri yükle
      await this.loadUsageData(simId);
      
      // Anomali analizi yükle
      await this.loadAnomalyData(simId);
      
    } catch (error) {
      console.error('SIM data load error:', error);
      this.appendLog(`❌ ${simId} verileri yüklenirken hata: ${error.message}`);
    }
  }
  
  async loadUsageData(simId) {
    try {
      this.elements.usageChart.innerHTML = '<div class="muted">📊 Kullanım verileri yükleniyor...</div>';
      
      const data = await this.apiCall(`/api/v1/usage/${encodeURIComponent(simId)}?days=30`);
      this.chartData = data;
      this.renderUsageChart(data);
      
    } catch (error) {
      this.elements.usageChart.innerHTML = `<div class="muted">❌ Kullanım verileri alınamadı: ${error.message}</div>`;
    }
  }
  
  renderUsageChart(data) {
    if (!data || (!Array.isArray(data) && !data.usage)) {
      this.elements.usageChart.innerHTML = '<div class="muted">📈 Kullanım verisi bulunamadı</div>';
      return;
    }
    
    const usage = Array.isArray(data) ? data : data.usage || [];
    if (usage.length === 0) {
      this.elements.usageChart.innerHTML = '<div class="muted">📈 30 günlük kullanım verisi bulunamadı</div>';
      return;
    }
    
    // Son 30 günlük veriyi al
    const last30 = usage.slice(-30);
    const maxUsage = Math.max(...last30.map(u => u.mb_used || 0), 1);
    
    const barsHtml = last30.map(u => {
      const height = Math.max(2, ((u.mb_used || 0) / maxUsage) * 100);
      const isHigh = height > 60;
      return `<div class="usage-bar ${isHigh ? 'high' : ''}" style="height:${height}%" title="${u.mb_used || 0} MB - ${u.timestamp}"></div>`;
    }).join('');
    
    this.elements.usageChart.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column">
        <div style="text-align:center;margin-bottom:8px;font-size:12px;color:var(--muted)">Son 30 Gün (MB)</div>
        <div class="usage-bars">${barsHtml}</div>
        <div style="text-align:center;margin-top:4px;font-size:11px;color:var(--muted)">Toplam: ${last30.reduce((sum, u) => sum + (u.mb_used || 0), 0).toFixed(1)} MB</div>
      </div>
    `;
  }
  
  async loadAnomalyData(simId) {
    try {
      this.elements.anomalyAnalysis.innerHTML = '<div class="muted">🔍 Anomali verileri yükleniyor...</div>';
      
      const analysis = await this.apiCall(`/api/v1/analyze/${encodeURIComponent(simId)}/latest`);
      this.renderAnomalyAnalysis(analysis);
      
    } catch (error) {
      this.elements.anomalyAnalysis.innerHTML = `<div class="muted">ℹ️ Anomali verisi bulunamadı</div>`;
    }
  }
  
  renderAnomalyAnalysis(analysis) {
    if (!analysis || !analysis.anomalies || analysis.anomalies.length === 0) {
      this.elements.anomalyAnalysis.innerHTML = '<div class="analysis-item success">✅ Anomali tespit edilmedi</div>';
      return;
    }
    
    const anomalyItems = analysis.anomalies.map(anomaly => {
      const type = this.getAnomalyType(anomaly.type);
      const severity = anomaly.severity || 'warning';
      
      return `
        <div class="analysis-item ${severity}">
          <strong>${type.icon} ${type.title}</strong><br>
          <span style="font-size:11px">${this.escapeHtml(anomaly.reason || anomaly.description || 'Detay bilgi yok')}</span>
        </div>
      `;
    }).join('');
    
    this.elements.anomalyAnalysis.innerHTML = `
      <div class="analysis-item ${analysis.risk_level || 'warning'}">
        <strong>📊 Risk Skoru: ${analysis.risk_score || 0}</strong><br>
        <span style="font-size:11px">${this.escapeHtml(analysis.summary || 'Analiz tamamlandı')}</span>
      </div>
      ${anomalyItems}
    `;
  }
  
  getAnomalyType(type) {
    const types = {
      'sudden_spike': { icon: '⬆️', title: 'Ani Artış' },
      'sustained_drain': { icon: '🔋', title: 'Sürekli Yüksek Kullanım' },
      'inactivity': { icon: '😴', title: 'İnaktivite' },
      'unexpected_roaming': { icon: '🌍', title: 'Beklenmeyen Roaming' },
      'data_anomaly': { icon: '📊', title: 'Veri Anomalisi' },
      'location_anomaly': { icon: '📍', title: 'Konum Anomalisi' }
    };
    return types[type] || { icon: '⚠️', title: 'Bilinmeyen Anomali' };
  }
  
  async analyzeCurrentSim() {
    if (!this.selectedSim) return;
    
    const btn = this.elements.analyzeBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔄 Analiz ediliyor...';
    btn.disabled = true;
    
    try {
      const result = await this.apiCall(`/api/v1/analyze/${encodeURIComponent(this.selectedSim.sim_id)}`, {
        method: 'POST'
      });
      
      this.appendLog(`🔍 ${this.selectedSim.sim_id} analizi tamamlandı: ${result.summary || 'Analiz başarılı'}`);
      
      // Anomali analizi yenile
      await this.loadAnomalyData(this.selectedSim.sim_id);
      
      // Fleet data'yı yenile (risk skoru güncellenmiş olabilir)
      await this.loadFleetData();
      
    } catch (error) {
      this.appendLog(`❌ Analiz hatası: ${error.message}`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
  
  async executeAction(action) {
    if (!this.selectedSim) return;
    
    const actionNames = {
      'freeze_24h': '❄️ 24 Saat Dondurma',
      'throttle': '🐌 Hız Düşürme',
      'notify': '📢 Uyarı Gönderme'
    };
    
    try {
      this.appendLog(`⏳ ${actionNames[action]} işlemi başlatıldı...`);
      
      const result = await this.apiCall('/api/v1/actions', {
        method: 'POST',
        body: JSON.stringify({
          sim_ids: [this.selectedSim.sim_id],
          action: action,
          reason: `Manuel ${action} eylemi`
        })
      });
      
      this.appendLog(`✅ ${actionNames[action]} işlemi tamamlandı: ${result.message || 'Başarılı'}`);
      
    } catch (error) {
      this.appendLog(`❌ ${actionNames[action]} hatası: ${error.message}`);
    }
  }
  
  async loadBestOptions() {
    if (!this.selectedSim) return;
    
    try {
      this.appendLog(`💡 ${this.selectedSim.sim_id} için en iyi seçenekler araştırılıyor...`);
      
      const options = await this.apiCall(`/api/v1/best-options/${encodeURIComponent(this.selectedSim.sim_id)}`);
      
      if (options && options.length > 0) {
        const topOption = options[0];
        const saving = topOption.saving || 0;
        this.appendLog(`💰 En iyi seçenek: ${topOption.description} (${saving > 0 ? '₺' + saving.toFixed(2) + ' tasarruf' : 'maliyet artışı'})`);
      } else {
        this.appendLog(`ℹ️ Şu an için daha iyi bir seçenek bulunamadı`);
      }
      
    } catch (error) {
      this.appendLog(`❌ Seçenek analizi hatası: ${error.message}`);
    }
  }
  
  connectWebSocket() {
    try {
      console.log('Attempting WebSocket connection to:', WS_BASE);
      this.ws = new WebSocket(WS_BASE);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.elements.wsStatus.textContent = 'Bağlı';
        this.elements.wsDot.classList.remove('disconnected');
        
        // İlk bağlantıda placeholder mesajı temizle
        this.elements.alertsLog.innerHTML = '';
        this.appendAlert('🔗 Canlı bağlantı kuruldu');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          this.appendAlert(`${this.getSeverityIcon(alert.severity)} ${alert.message}`);
          
          // Anomali uyarısı geldiğinde filo verilerini yenile
          if (alert.type === 'anomaly_detected') {
            setTimeout(() => this.loadFleetData(), 1000);
          }
        } catch (e) {
          this.appendAlert(`📨 ${event.data}`);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.elements.wsStatus.textContent = 'Bağlantı kesildi';
        this.elements.wsDot.classList.add('disconnected');
        this.appendAlert('🔌 Bağlantı kesildi — yeniden bağlanıyor...');
        
        // 3 saniye sonra tekrar bağlan
        setTimeout(() => this.connectWebSocket(), 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log('WebSocket readyState:', this.ws.readyState);
        this.elements.wsStatus.textContent = 'Bağlantı hatası';
        this.elements.wsDot.classList.add('disconnected');
      };
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      console.log('Failed to connect to:', WS_BASE);
      this.elements.wsStatus.textContent = 'Bağlanamadı';
      this.elements.wsDot.classList.add('disconnected');
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
  
  getStatusText(status) {
    const texts = {
      'active': 'Aktif',
      'blocked': 'Engelli',
      'suspended': 'Askıda',
      'inactive': 'İnaktif'
    };
    return texts[status] || status;
  }
  
  appendLog(message) {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `
      <div class="log-time">${new Date().toLocaleTimeString('tr-TR')}</div>
      <div>${message}</div>
    `;
    
    this.elements.actionsLog.insertBefore(logItem, this.elements.actionsLog.firstChild);
    
    // 50 kaydı geçmesin
    while (this.elements.actionsLog.children.length > 50) {
      this.elements.actionsLog.removeChild(this.elements.actionsLog.lastChild);
    }
  }
  
  appendAlert(message) {
    const alertItem = document.createElement('div');
    alertItem.className = 'log-item';
    alertItem.innerHTML = `
      <div class="log-time">${new Date().toLocaleTimeString('tr-TR')}</div>
      <div>${message}</div>
    `;
    
    this.elements.alertsLog.insertBefore(alertItem, this.elements.alertsLog.firstChild);
    
    // 30 kaydı geçmesin
    while (this.elements.alertsLog.children.length > 30) {
      this.elements.alertsLog.removeChild(this.elements.alertsLog.lastChild);
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Dashboard'ı başlat
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new SimShieldDashboard();
});

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault();
    dashboard.loadFleetData();
  }
});