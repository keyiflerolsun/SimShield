// Filtreleme ve arama
class FilterManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.activeStatFilter = null; // Aktif stat filtresini takip et
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
    const searchTerm = this.dashboard.elements.searchInput.value.toLowerCase();
    const riskFilter = this.dashboard.elements.riskFilter.value;
    const statusFilter = this.dashboard.elements.statusFilter.value;
    const cityFilter = this.dashboard.elements.cityFilter.value;
    
    let filtered = [...this.dashboard.sims];
    
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
    
    this.dashboard.fleetManager.renderFleet(filtered);
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
    this.dashboard.elements.searchInput.value = '';
    this.dashboard.elements.riskFilter.value = '';
    this.dashboard.elements.statusFilter.value = '';
    this.dashboard.elements.cityFilter.value = '';
    
    let filtered = [...this.dashboard.sims];
    let logMessage = '';
    
    switch (filterType) {
      case 'all':
        this.activeStatFilter = null; // 'all' seçildiğinde filtreyi temizle
        // Hiçbir filtre uygulamaya gerek yok
        logMessage = '📊 Tüm SIM\'ler gösteriliyor';
        break;
        
      case 'active':
        filtered = this.dashboard.sims.filter(sim => sim.status === 'active');
        logMessage = `🟢 ${filtered.length} aktif SIM gösteriliyor`;
        break;
        
      case 'high-risk':
        filtered = this.dashboard.sims.filter(sim => (sim.risk_score || 0) >= 70);
        logMessage = `🔴 ${filtered.length} yüksek riskli SIM gösteriliyor`;
        break;
        
      case 'anomaly':
        filtered = this.dashboard.sims.filter(sim => (sim.anomaly_count || 0) > 0);
        logMessage = `⚠️ ${filtered.length} anomalili SIM gösteriliyor`;
        break;
    }
    
    this.dashboard.fleetManager.renderFleet(filtered);
    this.dashboard.appendLog(logMessage);
    
    // Eğer 'all' seçildiyse visual aktif durumu da kaldır
    if (filterType === 'all') {
      setTimeout(() => {
        clickedElement.classList.remove('active');
      }, 3000);
    }
    // Diğer durumlarda stat filtresi aktif kaldıkça visual gösterge de kalacak
  }
}
