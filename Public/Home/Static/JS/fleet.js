// Filo yönetimi ve listeleme
class FleetManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }
  
  async loadFleetData() {
    try {
      this.dashboard.elements.fleetList.innerHTML = '<div class="muted">📡 Filo verileri yükleniyor...</div>';
      this.dashboard.elements.apiStatus.textContent = 'bağlanıyor...';
      this.dashboard.elements.apiStatus.style.color = 'var(--muted)';
      this.dashboard.elements.apiDot.classList.remove('connected');
      this.dashboard.elements.apiDot.classList.add('disconnected');
      
      const data = await apiCall('/api/v1/fleet');
      this.dashboard.sims = Array.isArray(data) ? data : (data.sims || []);
      
      this.updateStatistics();
      this.populateCityFilter();
      this.dashboard.filterManager.filterAndRender();
      
      this.dashboard.elements.apiStatus.textContent = 'bağlı ✓';
      this.dashboard.elements.apiStatus.style.color = 'var(--accent)';
      this.dashboard.elements.apiDot.classList.remove('disconnected');
      this.dashboard.elements.apiDot.classList.add('connected');
      
      // İlk yükleme ise log'a bilgi ver
      if (this.dashboard.sims.length > 0) {
        console.log(`%c📊 ${this.dashboard.sims.length} SIM kartı yüklendi`, 'color: #27ae60;');
        this.dashboard.appendLog(`📊 ${this.dashboard.sims.length} SIM kartı yüklendi - Filo verileri güncellendi`);
      }
      
    } catch (error) {
      console.error('%c❌ Filo verilerinde hata:', 'color: #e74c3c; font-weight: bold;', error);
      this.dashboard.elements.fleetList.innerHTML = `<div class="muted">❌ Filo yüklenemedi: ${error.message}</div>`;
      this.dashboard.elements.apiStatus.textContent = 'bağlantı yok ✗';
      this.dashboard.elements.apiStatus.style.color = 'var(--danger)';
      this.dashboard.elements.apiDot.classList.remove('connected');
      this.dashboard.elements.apiDot.classList.add('disconnected');
      this.dashboard.appendLog(`❌ Filo verileri yüklenemedi: ${error.message}`);
    }
  }
  
  updateStatistics() {
    const total = this.dashboard.sims.length;
    const active = this.dashboard.sims.filter(s => s.status === 'active').length;
    const highRisk = this.dashboard.sims.filter(s => (s.risk_level === 'red' || s.risk_score >= 70)).length;
    const anomalies = this.dashboard.sims.reduce((sum, s) => sum + (s.anomaly_count || 0), 0);
    
    document.getElementById('total-sims').textContent = total;
    document.getElementById('active-sims').textContent = active;
    document.getElementById('high-risk-sims').textContent = highRisk;
    document.getElementById('anomaly-count').textContent = anomalies;
  }
  
  populateCityFilter() {
    const cities = [...new Set(this.dashboard.sims.map(s => s.city).filter(Boolean))].sort();
    const cityFilter = this.dashboard.elements.cityFilter;
    
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
  
  renderFleet(simsToRender = this.dashboard.sims) {
    if (!simsToRender || simsToRender.length === 0) {
      this.dashboard.elements.fleetList.innerHTML = '<div class="muted">📭 Kriterlere uygun SIM bulunamadı.</div>';
      return;
    }
    
    this.dashboard.elements.fleetList.innerHTML = '';
    simsToRender.forEach(sim => {
      const element = this.createSimElement(sim);
      this.dashboard.elements.fleetList.appendChild(element);
    });
  }
  
  createSimElement(sim) {
    const el = document.createElement('div');
    el.className = 'sim-item';
    if (this.dashboard.selectedSim && this.dashboard.selectedSim.sim_id === sim.sim_id) {
      el.classList.add('selected');
    }
    
    const riskScore = sim.risk_score || 0;
    const riskLevel = sim.risk_level || this.calculateRiskLevel(riskScore);
    const hasAnomalies = (sim.anomaly_count || 0) > 0;
    
    el.innerHTML = `
      <div class="sim-info">
        <div class="sim-id">
          ${hasAnomalies ? '<span class="anomaly-indicator"></span>' : ''}
          ${escapeHtml(sim.sim_id)}
        </div>
        <div class="sim-meta">
          <span>${this.getDeviceIcon(sim.device_type)} ${escapeHtml(sim.device_type || 'Bilinmiyor')}</span>
          <span>📍 ${escapeHtml(sim.city || '—')}</span>
          <span>📊 ${escapeHtml(sim.plan_name || sim.plan || '—')}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${riskLevel}">${riskScore}</span>
      </div>
    `;
    
    el.addEventListener('click', () => this.dashboard.simDetailsManager.selectSimObject(sim));
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
  
  getStatusText(status) {
    const texts = {
      'active': 'Aktif',
      'blocked': 'Engelli',
      'suspended': 'Askıda',
      'inactive': 'İnaktif'
    };
    return texts[status] || status;
  }
}
