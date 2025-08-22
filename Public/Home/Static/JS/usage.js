// Kullanım grafikleri ve verileri
class UsageManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.chartData = null;
  }
  
  async loadUsageData(simId) {
    try {
      this.dashboard.elements.usageChart.innerHTML = '<div class="muted">📊 Kullanım verileri yükleniyor...</div>';
      
      const data = await apiCall(`/api/v1/usage/${encodeURIComponent(simId)}?days=30`);
      this.chartData = data;
      this.renderUsageChart(data);
      
    } catch (error) {
      this.dashboard.elements.usageChart.innerHTML = `<div class="muted">❌ Kullanım verileri alınamadı: ${error.message}</div>`;
    }
  }
  
  renderUsageChart(data) {
    if (!data || (!Array.isArray(data) && !data.usage)) {
      this.dashboard.elements.usageChart.innerHTML = '<div class="muted">📈 Kullanım verisi bulunamadı</div>';
      return;
    }
    
    const usage = Array.isArray(data) ? data : data.usage || [];
    if (usage.length === 0) {
      this.dashboard.elements.usageChart.innerHTML = '<div class="muted">📈 30 günlük kullanım verisi bulunamadı</div>';
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
    
    this.dashboard.elements.usageChart.innerHTML = `
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
}
