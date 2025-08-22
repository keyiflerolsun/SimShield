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
    this.activeStatFilter = null; // Aktif stat filtresini takip et
    this.lastActionSimId = null; // Son manuel aksiyon SIM ID'si
    
    this.initElements();
    this.initEventListeners();
    this.connectWebSocket();
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
  
  initEventListeners() {
    this.elements.refreshBtn.addEventListener('click', () => this.loadFleetData());
    this.elements.analyzeBtn.addEventListener('click', () => this.analyzeCurrentSim());
    this.elements.analyzeAllBtn.addEventListener('click', () => this.analyzeAllSims());
    this.elements.freezeBtn.addEventListener('click', () => this.executeAction('freeze_24h'));
    this.elements.throttleBtn.addEventListener('click', () => this.executeAction('throttle'));
    this.elements.notifyBtn.addEventListener('click', () => this.executeAction('notify'));
    this.elements.bestOptionsBtn.addEventListener('click', () => this.loadBestOptions());
    this.elements.whatifBtn.addEventListener('click', () => this.showWhatIfModal());
    
    // Filtreler
    this.elements.searchInput.addEventListener('input', () => {
      this.clearStatFilter(); // Manuel arama yapıldığında stat filtresini temizle
      this.filterAndRender();
    });
    this.elements.riskFilter.addEventListener('change', () => {
      this.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterAndRender();
    });
    this.elements.statusFilter.addEventListener('change', () => {
      this.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterAndRender();
    });
    this.elements.cityFilter.addEventListener('change', () => {
      this.clearStatFilter(); // Manuel filtre değişikliğinde stat filtresini temizle
      this.filterAndRender();
    });
    
    // Tıklanabilir istatistik kartları
    document.querySelectorAll('.clickable-stat').forEach(stat => {
      stat.addEventListener('click', (e) => {
        const filterType = e.currentTarget.getAttribute('data-filter');
        this.applyStatFilter(filterType, e.currentTarget);
      });
    });
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
      this.elements.apiStatus.textContent = 'bağlanıyor...';
      this.elements.apiStatus.style.color = 'var(--muted)';
      this.elements.apiDot.classList.remove('connected');
      this.elements.apiDot.classList.add('disconnected');
      
      const data = await this.apiCall('/api/v1/fleet');
      this.sims = Array.isArray(data) ? data : (data.sims || []);
      
      this.updateStatistics();
      this.populateCityFilter();
      this.filterAndRender();
      
      this.elements.apiStatus.textContent = 'bağlı ✓';
      this.elements.apiStatus.style.color = 'var(--accent)';
      this.elements.apiDot.classList.remove('disconnected');
      this.elements.apiDot.classList.add('connected');
      
      // İlk yükleme ise log'a bilgi ver
      if (this.sims.length > 0) {
        this.appendLog(`📊 ${this.sims.length} SIM kartı yüklendi - Filo verileri güncellendi`);
      }
      
    } catch (error) {
      console.error('Fleet data load error:', error);
      this.elements.fleetList.innerHTML = `<div class="muted">❌ Filo yüklenemedi: ${error.message}</div>`;
      this.elements.apiStatus.textContent = 'bağlantı yok ✗';
      this.elements.apiStatus.style.color = 'var(--danger)';
      this.elements.apiDot.classList.remove('connected');
      this.elements.apiDot.classList.add('disconnected');
      this.appendLog(`❌ Filo verileri yüklenemedi: ${error.message}`);
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
  
  clearStatFilter() {
    // Stat filtresini temizle
    this.activeStatFilter = null;
    
    // Aktif stat kartı görselini temizle
    document.querySelectorAll('.clickable-stat').forEach(stat => {
      stat.classList.remove('active');
    });
  }
  
  filterAndRender() {
    const searchTerm = this.elements.searchInput.value.toLowerCase();
    const riskFilter = this.elements.riskFilter.value;
    const statusFilter = this.elements.statusFilter.value;
    const cityFilter = this.elements.cityFilter.value;
    
    let filtered = [...this.sims];
    
    // Önce stat filtresini uygula (varsa)
    if (this.activeStatFilter) {
      switch (this.activeStatFilter) {
        case 'active':
          filtered = filtered.filter(sim => sim.status === 'active');
          break;
        case 'high-risk':
          filtered = filtered.filter(sim => (sim.risk_score || 0) >= 70);
          break;
        case 'anomaly':
          filtered = filtered.filter(sim => (sim.anomaly_count || 0) > 0);
          break;
        // 'all' durumunda tüm SIM'ler gösterilir, ek filtre gerekmez
      }
    }
    
    // Sonra diğer filtreleri uygula
    filtered = filtered.filter(sim => {
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
  
  applyStatFilter(filterType, clickedElement) {
    // Önceki aktif istatistik kartını temizle
    document.querySelectorAll('.clickable-stat').forEach(stat => {
      stat.classList.remove('active');
    });
    
    // Tıklanan kartı aktif yap
    clickedElement.classList.add('active');
    
    // Aktif stat filtresini kaydet
    this.activeStatFilter = filterType;
    
    // Manuel filtreleri temizle (sadece stat filtresi aktif olacak)
    this.elements.searchInput.value = '';
    this.elements.riskFilter.value = '';
    this.elements.statusFilter.value = '';
    this.elements.cityFilter.value = '';
    
    let filtered = [...this.sims];
    let logMessage = '';
    
    switch (filterType) {
      case 'all':
        this.activeStatFilter = null; // 'all' seçildiğinde filtreyi temizle
        // Hiçbir filtre uygulamaya gerek yok
        logMessage = '📊 Tüm SIM\'ler gösteriliyor';
        break;
        
      case 'active':
        filtered = this.sims.filter(sim => sim.status === 'active');
        logMessage = `🟢 ${filtered.length} aktif SIM gösteriliyor`;
        break;
        
      case 'high-risk':
        filtered = this.sims.filter(sim => (sim.risk_score || 0) >= 70);
        logMessage = `🔴 ${filtered.length} yüksek riskli SIM gösteriliyor`;
        break;
        
      case 'anomaly':
        filtered = this.sims.filter(sim => (sim.anomaly_count || 0) > 0);
        logMessage = `⚠️ ${filtered.length} anomalili SIM gösteriliyor`;
        break;
    }
    
    this.renderFleet(filtered);
    this.appendLog(logMessage);
    
    // Eğer 'all' seçildiyse visual aktif durumu da kaldır
    if (filterType === 'all') {
      setTimeout(() => {
        clickedElement.classList.remove('active');
      }, 3000);
    }
    // Diğer durumlarda stat filtresi aktif kaldıkça visual gösterge de kalacak
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
    
    el.addEventListener('click', () => this.selectSimObject(sim));
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
  
  async selectSimObject(sim) {
    this.selectedSim = sim;
    
    // Önce anomaly alert'i gizle
    this.hideAnomalyAlert();
    
    // UI güncellemelerini yap
    this.elements.selectedName.textContent = sim.sim_id;
    this.elements.selectedMeta.textContent = `${sim.device_type || '—'} • Plan: ${sim.plan_name || sim.plan || '—'} • Durum: ${this.getStatusText(sim.status)}`;
    
    // SIM detaylarını göster
    this.renderSimDetails(sim);
    
    // Butonları aktifleştir
    this.elements.analyzeBtn.disabled = false;
    this.elements.freezeBtn.disabled = false;
    this.elements.throttleBtn.disabled = false;
    this.elements.notifyBtn.disabled = false;
    this.elements.bestOptionsBtn.disabled = false;
    this.elements.whatifBtn.disabled = false;
    
    // Seçili SIM'i görsel olarak göster
    this.filterAndRender();
    
    // Verileri yükle
    await this.loadSimData(sim.sim_id);
  }

  selectSimById(simId) {
    const sim = this.sims ? this.sims.find(s => s.sim_id === simId) : null;
    if (sim) {
      this.selectSimObject(sim);
      this.appendLog(`🎯 ${simId} SIM'i otomatik olarak seçildi`);
      
      // SIM'i görünür hale getir (scroll)
      setTimeout(() => {
        const simElement = document.querySelector(`.sim-item.selected`);
        if (simElement) {
          simElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      this.appendLog(`❌ ${simId} SIM'i bulunamadı`);
    }
  }

  renderSimDetails(sim) {
    // Tarihleri kullanım verilerinden hesapla
    this.elements.simDetails.innerHTML = `
      <div class="sim-details-grid">
        <div class="sim-detail-item">
          <div class="detail-label">📱 SIM ID</div>
          <div class="detail-value">${this.escapeHtml(sim.sim_id)}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">📊 Plan</div>
          <div class="detail-value">${this.escapeHtml(sim.plan_name || sim.plan || 'Bilinmiyor')}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">🏷️ Durum</div>
          <div class="detail-value">
            <span class="status-badge ${sim.status}">${this.getStatusText(sim.status)}</span>
          </div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">${this.getDeviceIcon(sim.device_type)} Cihaz</div>
          <div class="detail-value">${this.escapeHtml(sim.device_type || 'Bilinmiyor')}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">📍 Konum</div>
          <div class="detail-value">${this.escapeHtml(sim.city || 'Bilinmiyor')}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">📅 Aktivasyon</div>
          <div class="detail-value"><span class="loading-text">📡 Yükleniyor...</span></div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">🕒 Son Aktivite</div>
          <div class="detail-value"><span class="loading-text">📡 Yükleniyor...</span></div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">⚡ Risk Skoru</div>
          <div class="detail-value">
            <span class="badge ${sim.risk_level || this.calculateRiskLevel(sim.risk_score || 0)}">${sim.risk_score || 0}</span>
          </div>
        </div>
      </div>
    `;
    
    // Tarihleri async olarak yükle
    this.loadSimDates(sim.sim_id);
  }
  
  async loadSimData(simId) {
    try {
      // Kullanım verileri yükle
      await this.loadUsageData(simId);
      
      // Anomali analizi yükle ve proaktif olarak göster
      await this.loadAnomalyData(simId);
      
    } catch (error) {
      console.error('SIM data load error:', error);
      this.appendLog(`❌ ${simId} verileri yüklenirken hata: ${error.message}`);
    }
  }
  
  async loadSimDates(simId) {
    try {
      // Kullanım verilerinden tarih bilgilerini al
      const data = await this.apiCall(`/api/v1/usage/${encodeURIComponent(simId)}?days=90`); // 1 yıllık veri
      
      if (data && (Array.isArray(data) ? data.length > 0 : data.usage && data.usage.length > 0)) {
        const usage = Array.isArray(data) ? data : data.usage || [];
        
        if (usage.length > 0) {
          // En eski ve en yeni tarihleri bul
          const sortedUsage = usage.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          const firstDate = new Date(sortedUsage[0].timestamp);
          const lastDate = new Date(sortedUsage[sortedUsage.length - 1].timestamp);
          
          // Tarihleri güncelle
          this.updateSimDetailDate('📅 Aktivasyon', firstDate.toLocaleDateString('tr-TR'));
          this.updateSimDetailDate('🕒 Son Aktivite', lastDate.toLocaleDateString('tr-TR'));
        } else {
          this.updateSimDetailDate('📅 Aktivasyon', 'Veri yok');
          this.updateSimDetailDate('🕒 Son Aktivite', 'Veri yok');
        }
      } else {
        this.updateSimDetailDate('📅 Aktivasyon', 'Veri yok');
        this.updateSimDetailDate('🕒 Son Aktivite', 'Veri yok');
      }
      
    } catch (error) {
      console.error('SIM dates load error:', error);
      this.updateSimDetailDate('📅 Aktivasyon', 'Hata');
      this.updateSimDetailDate('🕒 Son Aktivite', 'Hata');
    }
  }
  
  updateSimDetailDate(labelText, dateValue) {
    // Label'a göre ilgili detail-value'yu bul ve güncelle
    const detailItems = document.querySelectorAll('.sim-detail-item');
    detailItems.forEach(item => {
      const label = item.querySelector('.detail-label');
      if (label && label.textContent.includes(labelText.split(' ')[1])) { // İkon olmadan kontrol et
        const valueElement = item.querySelector('.detail-value');
        if (valueElement) {
          valueElement.textContent = dateValue;
        }
      }
    });
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
    const totalUsage = last30.reduce((sum, u) => sum + (u.mb_used || 0), 0);
    const avgUsage = totalUsage / last30.length;
    
    // Peak kullanım günlerini belirle
    const peakDays = last30.filter(u => (u.mb_used || 0) > avgUsage * 2);
    
    const barsHtml = last30.map((u, index) => {
      const height = Math.max(2, ((u.mb_used || 0) / maxUsage) * 100);
      const isHigh = height > 60;
      const isPeak = (u.mb_used || 0) > avgUsage * 2;
      const date = new Date(u.timestamp).toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit'
      });
      const tooltipText = `${date}: ${(u.mb_used || 0).toFixed(1)} MB`;
      
      return `<div class="usage-bar ${isHigh ? 'high' : ''} ${isPeak ? 'peak' : ''}" 
                   style="height:${height}%" 
                   data-tooltip="${tooltipText}"></div>`;
    }).join('');
    
    this.elements.usageChart.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column">
        <div class="usage-stats">
          <div class="usage-stat">
            <div class="stat-value">${totalUsage.toFixed(1)} MB</div>
            <div class="stat-label">Toplam</div>
          </div>
          <div class="usage-stat">
            <div class="stat-value">${avgUsage.toFixed(1)} MB</div>
            <div class="stat-label">Ortalama</div>
          </div>
          <div class="usage-stat">
            <div class="stat-value">${Math.max(...last30.map(u => u.mb_used || 0)).toFixed(1)} MB</div>
            <div class="stat-label">Maksimum</div>
          </div>
        </div>
        <div class="usage-bars">${barsHtml}</div>
        <div class="usage-footer">
          <span>Son 30 Gün</span>
          ${peakDays.length > 0 ? `<span class="peak-indicator">⚡ ${peakDays.length} aşırı kullanım günü</span>` : ''}
        </div>
      </div>
    `;
  }
  
  async loadAnomalyData(simId) {
    try {
      const analysis = await this.apiCall(`/api/v1/analyze/${encodeURIComponent(simId)}/latest`);
      this.displayAnomalyAlert(analysis);
      
    } catch (error) {
      this.hideAnomalyAlert();
    }
  }
  
  displayAnomalyAlert(analysis) {
    const alertSection = document.getElementById('anomaly-alert-section');
    const alertContent = document.getElementById('anomaly-alert-content');
    const countBadge = document.getElementById('anomaly-count-badge');
    
    if (!analysis || !analysis.anomalies || analysis.anomalies.length === 0) {
      this.hideAnomalyAlert();
      return;
    }
    
    // Show the alert section
    alertSection.style.display = 'block';
    
    // Update count badge
    countBadge.textContent = analysis.anomalies.length;
    
    // Generate anomaly content
    const anomalyItems = analysis.anomalies.map(anomaly => {
      const type = this.getAnomalyType(anomaly.type);
      const evidence = anomaly.evidence ? this.formatEvidence(anomaly.evidence) : '';
      
      return `
        <div class="anomaly-item">
          <div class="anomaly-type">${type.icon} ${type.title}</div>
          <div class="anomaly-reason">${this.escapeHtml(anomaly.reason || anomaly.description || 'Detay bilgi yok')}</div>
          ${evidence ? `<div class="anomaly-evidence">${evidence}</div>` : ''}
        </div>
      `;
    }).join('');
    
    alertContent.innerHTML = anomalyItems;
  }
  
  hideAnomalyAlert() {
    const alertSection = document.getElementById('anomaly-alert-section');
    if (alertSection) {
      alertSection.style.display = 'none';
    }
  }
  
  formatEvidence(evidence) {
    if (!evidence) return '';
    
    let formatted = [];
    if (evidence.current_usage) formatted.push(`Mevcut: ${Math.round(evidence.current_usage * 10) / 10}MB`);
    if (evidence.threshold) formatted.push(`Eşik: ${Math.round(evidence.threshold * 10) / 10}MB`);
    if (evidence.baseline_average) formatted.push(`Ortalama: ${Math.round(evidence.baseline_average * 10) / 10}MB`);
    if (evidence.days_count) formatted.push(`${evidence.days_count} gün`);
    
    return formatted.join(' • ');
  }
  
  renderAnomalyAnalysis(analysis) {
    if (!analysis || !analysis.anomalies || analysis.anomalies.length === 0) {
      this.elements.anomalyAnalysis.innerHTML = '<div class="analysis-item success">✅ Anomali tespit edilmedi</div>';
      return;
    }
    
    const riskLevel = analysis.risk_level || 'warning';
    const riskScore = analysis.risk_score || 0;
    
    // Risk seviyesi açıklaması
    const riskDescription = this.getRiskDescription(riskScore, riskLevel);
    
    const anomalyItems = analysis.anomalies.map(anomaly => {
      const type = this.getAnomalyType(anomaly.type);
      const severity = anomaly.severity || this.getSeverityFromScore(riskScore);
      const detectedAt = anomaly.detected_at ? new Date(anomaly.detected_at).toLocaleString('tr-TR') : 'Tarih belirsiz';
      
      return `
        <div class="analysis-item ${severity}">
          <div class="anomaly-header">
            <span class="anomaly-title">${type.icon} ${type.title}</span>
            <span class="anomaly-time">${detectedAt}</span>
          </div>
          <div class="anomaly-description">
            ${this.escapeHtml(anomaly.reason || anomaly.description || 'Detay bilgi yok')}
          </div>
          ${anomaly.impact ? `<div class="anomaly-impact">💥 Etki: ${this.escapeHtml(anomaly.impact)}</div>` : ''}
        </div>
      `;
    }).join('');
    
    this.elements.anomalyAnalysis.innerHTML = this.formatRiskSummary({
      anomalies: analysis.anomalies,
      risk_level: riskLevel,
      risk_score: riskScore,
      summary: analysis.summary
    });
  }

  getRiskDescription(score, level) {
    if (score >= 80) return '🚨 Kritik seviye - Acil müdahale gerekli';
    if (score >= 60) return '⚠️ Yüksek risk - Yakın takip öneriliyor';
    if (score >= 40) return '🔶 Orta seviye - İzleme devam etsin';
    if (score >= 20) return '🟡 Düşük risk - Normal aktivite';
    return '✅ Güvenli seviye - Sorun yok';
  }

  getSeverityFromScore(score) {
    if (score >= 70) return 'danger';
    if (score >= 40) return 'warning';
    return 'success';
  }
  
  getAnomalyType(type) {
    const types = {
      'sudden_spike': { icon: '⬆️', title: 'Ani Artış' },
      'sustained_drain': { icon: '🔋', title: 'Sürekli Yüksek Kullanım' },
      'inactivity': { icon: '😴', title: 'İnaktivite' },
      'unexpected_roaming': { icon: '🌍', title: 'Beklenmeyen Roaming' }
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
      
      this.appendLog(this.formatAnalysisLog(result));
      
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
  
  async analyzeAllSims() {
    if (!this.sims || this.sims.length === 0) {
      this.appendLog('❌ Analiz edilecek SIM bulunamadı');
      return;
    }
    
    const btn = this.elements.analyzeAllBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔄 Tüm SIM\'ler analiz ediliyor...';
    btn.disabled = true;
    
    let successCount = 0;
    let errorCount = 0;
    const totalSims = this.sims.length;
    
    this.appendLog(`🚀 ${totalSims} SIM'in toplu analizi başlatıldı...`);
    
    try {
      // SIM'leri paralel olarak analiz et (maksimum 5'li gruplar halinde)
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < this.sims.length; i += batchSize) {
        batches.push(this.sims.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const promises = batch.map(async (sim) => {
          try {
            await this.apiCall(`/api/v1/analyze/${encodeURIComponent(sim.sim_id)}`, {
              method: 'POST'
            });
            successCount++;
            
            // Progress göster
            const progress = Math.round(((successCount + errorCount) / totalSims) * 100);
            btn.innerHTML = `🔄 İlerleme: ${progress}% (${successCount + errorCount}/${totalSims})`;
            
            return { success: true, sim_id: sim.sim_id };
          } catch (error) {
            errorCount++;
            console.error(`Analysis failed for ${sim.sim_id}:`, error);
            return { success: false, sim_id: sim.sim_id, error: error.message };
          }
        });
        
        await Promise.all(promises);
        
        // Her batch arasında kısa bir bekleme
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Sonuç mesajı
      if (errorCount === 0) {
        this.appendLog(`✅ Toplu analiz tamamlandı: ${successCount} SIM başarıyla analiz edildi`);
      } else {
        this.appendLog(`⚠️ Toplu analiz tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);
      }
      
      // Fleet data'yı yenile
      await this.loadFleetData();
      
      // Seçili SIM varsa anomali analizini yenile
      if (this.selectedSim) {
        await this.loadAnomalyData(this.selectedSim.sim_id);
      }
      
    } catch (error) {
      this.appendLog(`❌ Toplu analiz hatası: ${error.message}`);
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
    
    const simId = this.selectedSim.sim_id;
    this.lastActionSimId = simId; // Son aksiyon SIM ID'sini kaydet
    
    try {
      this.appendLog(`⏳ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} işlemi başlatıldı...`);
      
      const result = await this.apiCall('/api/v1/actions', {
        method: 'POST',
        body: JSON.stringify({
          sim_ids: [simId],
          action: action,
          reason: `Manuel ${action} eylemi`
        })
      });
      
      // API'den dönen mesajı görmezden gel ve kendi mesajımızı oluştur
      const successMessage = `✅ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} başarıyla uygulandı`;
      this.appendLog(successMessage);
      
    } catch (error) {
      this.appendLog(`❌ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} hatası: ${error.message}`);
    }
  }
  
  async loadBestOptions() {
    if (!this.selectedSim) return;
    
    try {
      this.appendLog(`💡 ${this.selectedSim.sim_id} için en iyi seçenekler araştırılıyor...`);
      
      const options = await this.apiCall(`/api/v1/best-options/${encodeURIComponent(this.selectedSim.sim_id)}`);
      
      if (options && options.length > 0) {
        // En iyi 3 seçeneği detaylı göster
        this.showBestOptionsModal(options.slice(0, 3));
      } else {
        this.appendLog(`ℹ️ Şu an için daha iyi bir seçenek bulunamadı`);
      }
      
    } catch (error) {
      this.appendLog(`❌ Seçenek analizi hatası: ${error.message}`);
    }
  }

  showBestOptionsModal(options) {
    // Modal HTML'i oluştur
    const modalHtml = `
      <div class="modal-overlay" id="options-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>💡 ${this.selectedSim.sim_id} için En İyi Seçenekler</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
          </div>
          <div class="modal-body">
            ${options.map((option, index) => `
              <div class="option-card ${index === 0 ? 'best-option' : ''}">
                <div class="option-header">
                  <div class="option-title">
                    ${index === 0 ? '🏆 ' : ''}${option.description}
                    ${index === 0 ? '<span class="best-badge">EN İYİ</span>' : ''}
                  </div>
                  <div class="option-saving ${option.saving > 0 ? 'positive' : 'negative'}">
                    ${option.saving > 0 ? '💰 ₺' + option.saving.toFixed(2) + ' tasarruf' : '⚠️ ₺' + Math.abs(option.saving).toFixed(2) + ' artış'}
                  </div>
                </div>
                <div class="option-details">
                  <div class="cost-comparison">
                    <div class="cost-item">
                      <span class="cost-label">Mevcut Toplam:</span>
                      <span class="cost-value current">₺${option.current_total.toFixed(2)}</span>
                    </div>
                    <div class="cost-item">
                      <span class="cost-label">Yeni Toplam:</span>
                      <span class="cost-value new">₺${option.candidate_total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div class="cost-breakdown">
                    <div class="breakdown-title">Maliyet Detayı:</div>
                    <div class="breakdown-item">
                      <span>Plan Ücreti:</span>
                      <span>₺${option.breakdown.base_cost.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-item">
                      <span>Aşım Ücreti:</span>
                      <span>₺${option.breakdown.overage_cost.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-item">
                      <span>Ek Paket:</span>
                      <span>₺${option.breakdown.addon_cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
            <div class="modal-note">
              💡 Bu öneriler son 30 günlük kullanım verilerine dayanmaktadır.
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="this.closest('.modal-overlay').remove()">Kapat</button>
          </div>
        </div>
      </div>
    `;
    
    // Modal'ı sayfaya ekle
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Log'a da kısa özet ekle
    const topOption = options[0];
    this.appendLog(`💰 En iyi seçenek: ${topOption.description} (₺${topOption.saving.toFixed(2)} tasarruf)`);
  }

  showWhatIfModal() {
    if (!this.selectedSim) return;
    
    const modalHtml = `
      <div class="modal-overlay" id="whatif-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔮 ${this.selectedSim.sim_id} için Simülasyon</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="whatif-scenarios">
              <div class="scenario-card" onclick="dashboard.runWhatIfScenario('increase_20')">
                <div class="scenario-title">📈 %20 Kullanım Artışı</div>
                <div class="scenario-desc">Gelecek ay kullanım %20 artarsa ne olur?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.runWhatIfScenario('decrease_30')">
                <div class="scenario-title">📉 %30 Kullanım Azalışı</div>
                <div class="scenario-desc">Kullanım optimize edilirse nasıl değişir?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.runWhatIfScenario('spike_day')">
                <div class="scenario-title">⚡ Günlük Ani Artış</div>
                <div class="scenario-desc">Bir günde 10x kullanım olursa?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.runWhatIfScenario('roaming_week')">
                <div class="scenario-title">🌍 Haftalık Roaming</div>
                <div class="scenario-desc">7 gün roaming kullanımı simüle et</div>
              </div>
            </div>
            <div class="simulation-results" id="simulation-results" style="display:none">
              <div class="results-title">📊 Simülasyon Sonuçları</div>
              <div id="results-content"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="this.closest('.modal-overlay').remove()">Kapat</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async runWhatIfScenario(scenario) {
    if (!this.selectedSim) return;
    
    try {
      const resultsDiv = document.getElementById('simulation-results');
      const contentDiv = document.getElementById('results-content');
      
      resultsDiv.style.display = 'block';
      contentDiv.innerHTML = '<div class="muted">🔄 Simülasyon çalışıyor...</div>';
      
      const result = await this.apiCall(`/api/v1/whatif/${encodeURIComponent(this.selectedSim.sim_id)}`, {
        method: 'POST',
        body: JSON.stringify({
          scenario: scenario,
          parameters: {
            duration_days: scenario.includes('week') ? 7 : 30
          }
        })
      });
      
      if (result) {
        contentDiv.innerHTML = `
          <div class="simulation-result">
            <div class="result-summary">
              <strong>💰 Maliyet Değişimi:</strong> 
              <span class="${result.cost_change > 0 ? 'cost-increase' : 'cost-decrease'}">
                ${result.cost_change > 0 ? '+' : ''}₺${result.cost_change.toFixed(2)}
              </span>
            </div>
            <div class="result-details">
              <div class="result-item">
                <span>Mevcut Aylık:</span>
                <span>₺${result.current_monthly.toFixed(2)}</span>
              </div>
              <div class="result-item">
                <span>Simülasyon Sonrası:</span>
                <span>₺${result.projected_monthly.toFixed(2)}</span>
              </div>
              <div class="result-item">
                <span>Risk Değişimi:</span>
                <span class="risk-change">${result.risk_change > 0 ? '+' : ''}${result.risk_change}</span>
              </div>
            </div>
            ${result.recommendations ? `
              <div class="simulation-recommendations">
                <strong>💡 Öneriler:</strong><br>
                ${result.recommendations}
              </div>
            ` : ''}
          </div>
        `;
        
        this.appendLog(`🔮 Simülasyon tamamlandı: ${result.summary || 'Sonuçlar hazır'}`);
      }
      
    } catch (error) {
      document.getElementById('results-content').innerHTML = `<div class="muted">❌ Simülasyon hatası: ${error.message}</div>`;
      this.appendLog(`❌ Simülasyon hatası: ${error.message}`);
    }
  }
  
  connectWebSocket() {
    try {
      console.log('Attempting WebSocket connection to:', WS_BASE);
      this.ws = new WebSocket(WS_BASE);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.elements.wsStatus.textContent = 'bağlı ✓';
        this.elements.wsStatus.style.color = 'var(--accent)';
        this.elements.wsDot.classList.remove('disconnected');
        this.elements.wsDot.classList.add('connected');
        
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
        try {
          const alert = JSON.parse(event.data);
          
          // Ses bildirimini çal
          playNotificationSound();
          
          // Anomali uyarısı için detaylı mesaj oluştur
          if (alert.type === 'anomaly_detected') {
            const detailedMessage = this.formatAnomalyAlert(alert);
            
            // Mini panele ekle (alert verisini de gönder)
            this.appendMiniAlert(detailedMessage, alert);
            
            // Popup göster
            this.showAlertPopup(alert);
            
            // Fleet data'yı yenile
            setTimeout(() => this.loadFleetData(), 1000);
          } else {
            // Bulk action veya diğer alert türleri için
            if (alert.type === 'bulk_action') {
              // Bulk action için özel alert formatı
              this.appendMiniAlert(alert.message, alert);
              // Bulk action sonrası lastActionSimId'yi sıfırla
              this.lastActionSimId = null;
            } else {
              const message = `${this.getSeverityIcon(alert.severity)} ${alert.message}`;
              this.appendMiniAlert(message);
            }
            this.showAlertPopup(alert);
          }
        } catch (e) {
          console.log(e);
          this.appendMiniAlert(`📨 ${event.data}`);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.elements.wsStatus.textContent = 'bağlantı yok ✗';
        this.elements.wsStatus.style.color = 'var(--danger)';
        this.elements.wsDot.classList.add('disconnected');
        this.appendMiniAlert('🔌 Canlı uyarı sistemi kesildi — yeniden bağlanıyor...');
        
        // 3 saniye sonra tekrar bağlan
        setTimeout(() => this.connectWebSocket(), 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log('WebSocket readyState:', this.ws.readyState);
        this.elements.wsStatus.textContent = 'bağlantı hatası ⚠️';
        this.elements.wsStatus.style.color = 'var(--warning)';
        this.elements.wsDot.classList.add('disconnected');
      };
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      console.log('Failed to connect to:', WS_BASE);
      this.elements.wsStatus.textContent = 'bağlanamadı ✗';
      this.elements.wsStatus.style.color = 'var(--danger)';
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
      this.getAnomalyTypeText(alert.latest_anomaly.type) : 'Genel Anomali';
    
    return `${riskIcon} ${clickableSimId}'de ${latestAnomalyType} tespit edildi (Risk: ${riskScore})`;
  }

  formatAnalysisLog(result) {
    const sim = this.selectedSim;
    if (!sim || !result) return 'Analiz sonucu alınamadı';
    
    const anomalyCount = result.anomalies ? result.anomalies.length : 0;
    const riskLevel = result.risk_level || 'bilinmiyor';
    
    let message = `🔍 ${sim.sim_id} analizi tamamlandı`;
    
    if (anomalyCount === 0) {
      message += ' - Anomali tespit edilmedi ✅';
    } else {
      const isNew = result.summary && result.summary.includes('yeni anomali');
      if (isNew) {
        message += ` - ${anomalyCount} yeni anomali tespit edildi 🚨`;
      } else {
        message += ` - ${anomalyCount} mevcut anomali devam ediyor ⚠️`;
      }
    }
    
    return message;
  }

  formatRiskSummary(result) {
    if (!result || !result.anomalies) return '';
    
    const anomalies = result.anomalies;
    const riskLevel = result.risk_level || 'green';
    const riskScore = result.risk_score || 0;
    
    if (anomalies.length === 0) {
      return `
        <div class="risk-summary low">
          <div class="risk-header">
            ✅ Güvenli Durum
          </div>
          SIM kartı normal parametrelerde çalışıyor. Herhangi bir risk tespit edilmedi.
        </div>
      `;
    }
    
    const problemTypes = [...new Set(anomalies.map(a => a.type))];
    const problemDescriptions = {
      'sudden_spike': 'Ani Kullanım Artışı',
      'sustained_drain': 'Sürekli Yüksek Kullanım', 
      'inactivity': 'Uzun Süreli İnaktiflik',
      'unexpected_roaming': 'Beklenmedik Roaming'
    };
    
    const problemList = problemTypes.map(type => problemDescriptions[type] || type).join(', ');
    
    const riskClass = riskLevel === 'red' ? 'high' : riskLevel === 'orange' ? 'medium' : 'low';
    const riskIcon = riskLevel === 'red' ? '🔴' : riskLevel === 'orange' ? '🟠' : '🟡';
    const actionText = riskLevel === 'red' ? 'Acil müdahale gerekiyor!' : 
                      riskLevel === 'orange' ? 'Yakın takip öneriliyor' : 'İzleme devam ediyor';
    
    return `
      <div class="risk-summary ${riskClass}">
        <div class="risk-header">
          ${riskIcon} ${anomalies.length} Anomali Tespit Edildi (Risk: ${riskScore})
        </div>
        <div>Tespit edilen sorunlar: ${problemList}</div>
        <div class="risk-problems">${actionText}</div>
      </div>
    `;
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
            location = lastActionSim.city || this.getSimLocation(this.lastActionSimId) || 'Bilinmiyor';
          }
        } else if (this.selectedSim) {
          deviceType = this.selectedSim.device_type || 'Device';
          location = this.selectedSim.city || this.getSimLocation(this.selectedSim.sim_id) || 'Bilinmiyor';
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
        
        const location = alertData.location || this.getSimLocation(alertData.sim_id) || 'Bilinmiyor';
        const anomalyType = alertData.latest_anomaly?.type ? 
          this.getAnomalyTypeText(alertData.latest_anomaly.type) : 'Anomali';
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

  selectSim(simId) {
    // SIM kartını seç ve detay paneline yükle
    const sim = this.sims.find(s => s.sim_id === simId);
    if (sim) {
      this.updateSimDetails(sim);
      // Flash efekti ekle
      const detailsPanel = document.getElementById('floating-sim-details-panel');
      if (detailsPanel && !detailsPanel.style.display !== 'none') {
        detailsPanel.style.background = 'rgba(74, 144, 226, 0.3)';
        setTimeout(() => {
          detailsPanel.style.background = '';
        }, 1000);
      }
    }
  }

  updateSimDetails(sim) {
    // renderSimDetails ile aynı işlevi görür
    this.renderSimDetails(sim);
    
    // SIM Details panelini açık hale getir
    const detailsPanel = document.getElementById('floating-sim-details-panel');
    if (detailsPanel && detailsPanel.style.display === 'none') {
      detailsPanel.style.display = 'block';
    }
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getAnomalyTypeText(type) {
    const typeMap = {
      // Enum'larda tanımlı anomali türleri
      'sudden_spike': 'Ani Kullanım Artışı',
      'sustained_drain': 'Sürekli Yüksek Kullanım',
      'inactivity': 'Uzun Süreli İnaktivite',
      'unexpected_roaming': 'Beklenmeyen Roaming'
    };
    
    return typeMap[type] || type;
  }

  getSimLocation(simId) {
    const sim = this.sims ? this.sims.find(s => s.sim_id === simId) : null;
    return sim ? sim.city : null;
  }
}

// Dashboard'ı başlat
let dashboard;
let soundEnabled = true;
let audioContext = null;

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

// Panel yönetimi
class PanelManager {
  constructor() {
    this.panels = {
      alerts: document.getElementById('alerts-panel'),
      actions: document.getElementById('actions-panel')
    };
    this.setupEventListeners();
    this.makePanelsDraggable();
  }

  setupEventListeners() {
    // Panel açma butonları
    document.getElementById('open-alerts-panel')?.addEventListener('click', () => {
      this.openPanel('alerts');
    });
    
    document.getElementById('open-actions-panel')?.addEventListener('click', () => {
      this.openPanel('actions');
    });

    // Panel kontrolleri
    document.getElementById('close-alerts')?.addEventListener('click', () => {
      this.closePanel('alerts');
    });
    
    document.getElementById('close-actions')?.addEventListener('click', () => {
      this.closePanel('actions');
    });

    // Ses kontrolleri
    document.getElementById('toggle-sound')?.addEventListener('click', () => {
      this.toggleSound();
    });
    
    document.getElementById('toggle-sound-panel')?.addEventListener('click', () => {
      this.toggleSound();
    });

    // Temizleme butonları
    document.getElementById('clear-alerts-panel')?.addEventListener('click', () => {
      this.clearAlerts();
    });
    
    document.getElementById('clear-actions-panel')?.addEventListener('click', () => {
      this.clearActions();
    });

    // Dışa aktarma butonları
    document.getElementById('export-alerts')?.addEventListener('click', () => {
      this.exportAlerts();
    });
    
    document.getElementById('export-actions')?.addEventListener('click', () => {
      this.exportActions();
    });
  }

  openPanel(panelName) {
    const panel = this.panels[panelName];
    if (panel) {
      panel.classList.add('show');
      
      // İçeriği senkronize et
      if (panelName === 'alerts') {
        this.syncAlertsContent();
      } else if (panelName === 'actions') {
        this.syncActionsContent();
      }
    }
  }

  showPanel(panelId) {
    // panelId'den panelName'i çıkar (alerts-panel -> alerts)
    const panelName = panelId.replace('-panel', '');
    this.openPanel(panelName);
  }

  closePanel(panelName) {
    const panel = this.panels[panelName];
    if (panel) {
      panel.classList.remove('show');
    }
  }

  toggleSound() {
    soundEnabled = !soundEnabled;
    const soundButtons = [
      document.getElementById('toggle-sound'),
      document.getElementById('toggle-sound-panel')
    ];
    
    soundButtons.forEach(btn => {
      if (btn) {
        btn.textContent = soundEnabled ? '🔊' : '🔇';
        btn.title = soundEnabled ? 'Sesi kapat' : 'Sesi aç';
      }
    });
    
    // Test sesi çal
    if (soundEnabled) {
      playNotificationSound();
    }
  }

  syncAlertsContent() {
    const sourceContainer = document.getElementById('alerts-mini');
    const targetContainer = document.getElementById('alerts-list-panel');
    
    if (sourceContainer && targetContainer) {
      targetContainer.innerHTML = sourceContainer.innerHTML;
      
      // Event listener'ları yeniden ekle
      const clickableElements = targetContainer.querySelectorAll('.clickable-sim-id');
      clickableElements.forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const simId = el.dataset.simId;
          if (simId && dashboard) {
            dashboard.selectSim(simId);
          }
        });
      });
    }
  }

  syncActionsContent() {
    const sourceContainer = document.getElementById('actions-log');
    const targetContainer = document.getElementById('actions-log-panel');
    
    if (sourceContainer && targetContainer) {
      targetContainer.innerHTML = sourceContainer.innerHTML;
    }
  }

  clearAlerts() {
    const containers = [
      document.getElementById('alerts-mini'),
      document.getElementById('alerts-list-panel')
    ];
    
    containers.forEach(container => {
      if (container) {
        container.innerHTML = `
          <div class="alert-placeholder">
            <div class="alert-placeholder-icon">✨</div>
            <div class="alert-placeholder-text">Tüm uyarılar temizlendi</div>
          </div>
        `;
      }
    });
    
    // Sayacları sıfırla
    const counters = [
      document.getElementById('alerts-count'),
      document.getElementById('alerts-count-panel')
    ];
    
    counters.forEach(counter => {
      if (counter) {
        counter.textContent = '0';
      }
    });
  }

  clearActions() {
    const containers = [
      document.getElementById('actions-log'),
      document.getElementById('actions-log-panel')
    ];
    
    containers.forEach(container => {
      if (container) {
        container.innerHTML = '<div class="muted">Oturum geçmişi temizlendi...</div>';
      }
    });
  }

  exportAlerts() {
    const alertsContainer = document.getElementById('alerts-mini');
    const alerts = alertsContainer.querySelectorAll('.alert-mini-item');
    
    let content = 'SimShield Canlı Uyarılar Raporu\n';
    content += '=' + '='.repeat(40) + '\n';
    content += `Tarih: ${new Date().toLocaleString('tr-TR')}\n\n`;
    
    alerts.forEach((alert, index) => {
      const mainText = alert.querySelector('.alert-mini-main')?.textContent || '';
      const details = alert.querySelector('.alert-mini-details')?.textContent || '';
      const time = alert.querySelector('.alert-mini-time')?.textContent || '';
      
      content += `${index + 1}. ${mainText}\n`;
      if (details) content += `   ${details.replace(/\n/g, '\n   ')}\n`;
      if (time) content += `   Zaman: ${time}\n`;
      content += '\n';
    });
    
    this.downloadText(content, 'simshield-uyarilar.txt');
  }

  exportActions() {
    const actionsContainer = document.getElementById('actions-log');
    const actions = actionsContainer.querySelectorAll('.log-entry');
    
    let content = 'SimShield Oturum İşlem Geçmişi\n';
    content += '=' + '='.repeat(40) + '\n';
    content += `Tarih: ${new Date().toLocaleString('tr-TR')}\n\n`;
    
    actions.forEach((action, index) => {
      content += `${index + 1}. ${action.textContent}\n`;
    });
    
    this.downloadText(content, 'simshield-oturum-gecmisi.txt');
  }

  downloadText(text, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  makePanelsDraggable() {
    Object.values(this.panels).forEach(panel => {
      const header = panel.querySelector('.floating-panel-header');
      if (header) {
        this.makeDraggable(panel, header);
      }
    });
  }

  makeDraggable(panel, handle) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('close-btn') ||
          e.target.classList.contains('toggle-sound-btn-panel')) {
        return;
      }
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === handle || handle.contains(e.target)) {
        isDragging = true;
        panel.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.cursor = 'default';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  dashboard = new SimShieldDashboard();
  const panelManager = new PanelManager();
  
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
});

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault();
    dashboard.loadFleetData();
  }
});