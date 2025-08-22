// SIM detayları ve seçimi
class SimDetailsManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }
  
  async selectSimObject(sim) {
    this.dashboard.selectedSim = sim;
    
    // Önce anomaly alert'i gizle
    this.hideAnomalyAlert();
    
    // UI güncellemelerini yap
    this.dashboard.elements.selectedName.textContent = sim.sim_id;
    this.dashboard.elements.selectedMeta.textContent = `${sim.device_type || '—'} • Plan: ${sim.plan_name || sim.plan || '—'} • Durum: ${this.dashboard.fleetManager.getStatusText(sim.status)}`;
    
    // SIM detaylarını göster
    this.renderSimDetails(sim);
    
    // Butonları aktifleştir
    this.dashboard.elements.analyzeBtn.disabled = false;
    this.dashboard.elements.freezeBtn.disabled = false;
    this.dashboard.elements.throttleBtn.disabled = false;
    this.dashboard.elements.notifyBtn.disabled = false;
    this.dashboard.elements.bestOptionsBtn.disabled = false;
    this.dashboard.elements.whatifBtn.disabled = false;
    
    // Seçili SIM'i görsel olarak göster
    this.dashboard.filterManager.filterAndRender();
    
    // Verileri yükle
    await this.loadSimData(sim.sim_id);
  }

  selectSimById(simId) {
    const sim = this.dashboard.sims ? this.dashboard.sims.find(s => s.sim_id === simId) : null;
    if (sim) {
      this.selectSimObject(sim);
      this.dashboard.appendLog(`🎯 ${simId} SIM'i otomatik olarak seçildi`);
      
      // SIM'i görünür hale getir (scroll)
      setTimeout(() => {
        const simElement = document.querySelector(`.sim-item.selected`);
        if (simElement) {
          simElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      this.dashboard.appendLog(`❌ ${simId} SIM'i bulunamadı`);
    }
  }

  renderSimDetails(sim) {
    // Tarihleri kullanım verilerinden hesapla
    this.dashboard.elements.simDetails.innerHTML = `
      <div class="sim-details-grid">
        <div class="sim-detail-item">
          <div class="detail-label">📱 SIM ID</div>
          <div class="detail-value">${escapeHtml(sim.sim_id)}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">📊 Plan</div>
          <div class="detail-value">${escapeHtml(sim.plan_name || sim.plan || 'Bilinmiyor')}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">🏷️ Durum</div>
          <div class="detail-value">
            <span class="status-badge ${sim.status}">${this.dashboard.fleetManager.getStatusText(sim.status)}</span>
          </div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">${this.dashboard.fleetManager.getDeviceIcon(sim.device_type)} Cihaz</div>
          <div class="detail-value">${escapeHtml(sim.device_type || 'Bilinmiyor')}</div>
        </div>
        <div class="sim-detail-item">
          <div class="detail-label">📍 Konum</div>
          <div class="detail-value">${escapeHtml(sim.city || 'Bilinmiyor')}</div>
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
            <span class="badge ${sim.risk_level || this.dashboard.fleetManager.calculateRiskLevel(sim.risk_score || 0)}">${sim.risk_score || 0}</span>
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
      await this.dashboard.usageManager.loadUsageData(simId);
      
      // Anomali analizi yükle ve proaktif olarak göster
      await this.loadAnomalyData(simId);
      
    } catch (error) {
      console.error('%c❌ SIM verileri yüklenirken hata:', 'color: #e74c3c;', error);
      this.dashboard.appendLog(`❌ ${simId} verileri yüklenirken hata: ${error.message}`);
    }
  }
  
  async loadSimDates(simId) {
    try {
      // Kullanım verilerinden tarih bilgilerini al
      const data = await apiCall(`/api/v1/usage/${encodeURIComponent(simId)}?days=90`); // 90 günlük veri
      
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
      // Sadece ciddi hatalar için log
      if (error.message.includes('500') || error.message.includes('404')) {
        console.error('%c❌ SIM tarihlerinde hata:', 'color: #e74c3c;', error);
      }
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
  
  async loadAnomalyData(simId) {
    try {
      const analysis = await apiCall(`/api/v1/analyze/${encodeURIComponent(simId)}/latest`);
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
          <div class="anomaly-reason">${escapeHtml(anomaly.reason || anomaly.description || 'Detay bilgi yok')}</div>
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
  
  getAnomalyType(type) {
    const types = {
      'sudden_spike': { icon: '⬆️', title: 'Ani Artış' },
      'sustained_drain': { icon: '🔋', title: 'Sürekli Yüksek Kullanım' },
      'inactivity': { icon: '😴', title: 'İnaktivite' },
      'unexpected_roaming': { icon: '🌍', title: 'Beklenmeyen Roaming' }
    };
    return types[type] || { icon: '⚠️', title: 'Bilinmeyen Anomali' };
  }
  
  selectSim(simId) {
    // SIM kartını seç ve detay paneline yükle
    const sim = this.dashboard.sims.find(s => s.sim_id === simId);
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
}
