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
      simDetails: document.getElementById('sim-details'),
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
      whatifBtn: document.getElementById('whatif-btn'),
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
    this.elements.whatifBtn.addEventListener('click', () => this.showWhatIfModal());
    
    // Filtreler
    this.elements.searchInput.addEventListener('input', () => this.filterAndRender());
    this.elements.riskFilter.addEventListener('change', () => this.filterAndRender());
    this.elements.statusFilter.addEventListener('change', () => this.filterAndRender());
    this.elements.cityFilter.addEventListener('change', () => this.filterAndRender());
    
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
  
  applyStatFilter(filterType, clickedElement) {
    // Önceki aktif istatistik kartını temizle
    document.querySelectorAll('.clickable-stat').forEach(stat => {
      stat.classList.remove('active');
    });
    
    // Tıklanan kartı aktif yap
    clickedElement.classList.add('active');
    
    // Filtreleri temizle
    this.elements.searchInput.value = '';
    this.elements.riskFilter.value = '';
    this.elements.statusFilter.value = '';
    this.elements.cityFilter.value = '';
    
    let filtered = [...this.sims];
    let logMessage = '';
    
    switch (filterType) {
      case 'all':
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
    
    // 3 saniye sonra aktif durumu kaldır
    setTimeout(() => {
      clickedElement.classList.remove('active');
    }, 3000);
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
      this.selectSim(sim);
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
      
      // Anomali analizi yükle
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
        this.elements.wsStatus.textContent = 'Bağlı';
        this.elements.wsDot.classList.remove('disconnected');
        
        // İlk bağlantıda placeholder mesajı temizle
        this.elements.alertsLog.innerHTML = '';
        this.appendAlert('🔗 Canlı bağlantı kuruldu');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          
          // Anomali uyarısı için detaylı mesaj oluştur
          if (alert.type === 'anomaly_detected') {
            const detailedMessage = this.formatAnomalyAlert(alert);
            this.appendAlert(detailedMessage, 'log-item alert-item');
            setTimeout(() => this.loadFleetData(), 1000);
          } else {
            this.appendAlert(`${this.getSeverityIcon(alert.severity)} ${alert.message}`, 'log-item alert-item');
          }
        } catch (e) {
          console.log(e);
          this.appendAlert(`📨 ${event.data}`, 'log-item alert-item');
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
  
  formatAnomalyAlert(alert) {
    const sim = this.sims ? this.sims.find(s => s.sim_id === alert.sim_id) : null;
    const simInfo = sim ? `${sim.sim_id} (${sim.device_type})` : alert.sim_id;
    
    // Tıklanabilir SIM ID oluştur
    const clickableSimId = `<span class="clickable-sim-id" data-sim-id="${alert.sim_id}" title="SIM'i seçmek için tıklayın">${simInfo}</span>`;
    
    return `🚨 ${clickableSimId}'de anomali tespit edildi`;
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
    
    this.elements.actionsLog.insertBefore(logItem, this.elements.actionsLog.firstChild);
    
    // 50 kaydı geçmesin
    while (this.elements.actionsLog.children.length > 50) {
      this.elements.actionsLog.removeChild(this.elements.actionsLog.lastChild);
    }
  }
  
  appendAlert(message, cssClass = 'log-item alert-item') {
    const alertItem = document.createElement('div');
    alertItem.className = cssClass;
    
    // Güvenli HTML oluşturma
    const timeDiv = document.createElement('div');
    timeDiv.className = 'log-time';
    timeDiv.textContent = new Date().toLocaleTimeString('tr-TR');
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'log-content';
    contentDiv.innerHTML = message; // HTML içerik için innerHTML kullan
    
    alertItem.appendChild(timeDiv);
    alertItem.appendChild(contentDiv);
    
    // Tıklanabilir SIM ID'ler için event listener ekle
    const clickableSimIds = contentDiv.querySelectorAll('.clickable-sim-id');
    clickableSimIds.forEach(element => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        const simId = element.getAttribute('data-sim-id');
        this.selectSimById(simId);
      });
    });
    
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