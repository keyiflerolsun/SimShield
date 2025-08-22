// Manuel aksiyonlar (freeze, throttle, notify)
class ActionsManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }
  
  async executeAction(action) {
    if (!this.dashboard.selectedSim) return;
    
    const actionNames = {
      'freeze_24h': '❄️ 24 Saat Dondurma',
      'throttle': '🐌 Hız Düşürme', 
      'notify': '📢 Uyarı Gönderme'
    };
    
    const simId = this.dashboard.selectedSim.sim_id;
    this.dashboard.lastActionSimId = simId; // Son aksiyon SIM ID'sini kaydet
    
    try {
      this.dashboard.appendLog(`⏳ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} işlemi başlatıldı...`);
      
      const result = await apiCall('/api/v1/actions', {
        method: 'POST',
        body: JSON.stringify({
          sim_ids: [simId],
          action: action,
          reason: `Manuel ${action} eylemi`
        })
      });
      
      // API'den dönen mesajı görmezden gel ve kendi mesajımızı oluştur
      const successMessage = `✅ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} başarıyla uygulandı`;
      this.dashboard.appendLog(successMessage);
      
    } catch (error) {
      this.dashboard.appendLog(`❌ <span class="clickable-sim-id" data-sim-id="${simId}">${simId}</span> için ${actionNames[action]} hatası: ${error.message}`);
    }
  }
}
