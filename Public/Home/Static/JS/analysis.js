// Anomali analizi ve raporlama
class AnalysisManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }
  
  async analyzeCurrentSim() {
    if (!this.dashboard.selectedSim) return;
    
    const btn = this.dashboard.elements.analyzeBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔄 Analiz ediliyor...';
    btn.disabled = true;
    
    try {
      const result = await apiCall(`/api/v1/analyze/${encodeURIComponent(this.dashboard.selectedSim.sim_id)}`, {
        method: 'POST'
      });
      
      this.dashboard.appendLog(this.formatAnalysisLog(result));
      
      // Anomali analizi yenile
      await this.dashboard.simDetailsManager.loadAnomalyData(this.dashboard.selectedSim.sim_id);
      
      // Fleet data'yı yenile (risk skoru güncellenmiş olabilir)
      await this.dashboard.fleetManager.loadFleetData();
      
    } catch (error) {
      this.dashboard.appendLog(`❌ Analiz hatası: ${error.message}`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
  
  async analyzeAllSims() {
    if (!this.dashboard.sims || this.dashboard.sims.length === 0) {
      this.dashboard.appendLog('❌ Analiz edilecek SIM bulunamadı');
      return;
    }
    
    const btn = this.dashboard.elements.analyzeAllBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔄 Tüm SIM\'ler analiz ediliyor...';
    btn.disabled = true;
    
    let successCount = 0;
    let errorCount = 0;
    const totalSims = this.dashboard.sims.length;
    
    this.dashboard.appendLog(`🚀 ${totalSims} SIM'in toplu analizi başlatıldı...`);
    
    try {
      // SIM'leri paralel olarak analiz et (maksimum 5'li gruplar halinde)
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < this.dashboard.sims.length; i += batchSize) {
        batches.push(this.dashboard.sims.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const promises = batch.map(async (sim) => {
          try {
            await apiCall(`/api/v1/analyze/${encodeURIComponent(sim.sim_id)}`, {
              method: 'POST'
            });
            successCount++;
            
            // Progress göster
            const progress = Math.round(((successCount + errorCount) / totalSims) * 100);
            btn.innerHTML = `🔄 İlerleme: ${progress}% (${successCount + errorCount}/${totalSims})`;
            
            return { success: true, sim_id: sim.sim_id };
          } catch (error) {
            errorCount++;
            // Sadece kritik hatalar için log
            if (error.message.includes('500')) {
              console.error(`%c❌ ${sim.sim_id} analiz hatası:`, 'color: #e74c3c;', error.message);
            }
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
        this.dashboard.appendLog(`✅ Toplu analiz tamamlandı: ${successCount} SIM başarıyla analiz edildi`);
      } else {
        this.dashboard.appendLog(`⚠️ Toplu analiz tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);
      }
      
      // Fleet data'yı yenile
      await this.dashboard.fleetManager.loadFleetData();
      
      // Seçili SIM varsa anomali analizini yenile
      if (this.dashboard.selectedSim) {
        await this.dashboard.simDetailsManager.loadAnomalyData(this.dashboard.selectedSim.sim_id);
      }
      
    } catch (error) {
      this.dashboard.appendLog(`❌ Toplu analiz hatası: ${error.message}`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
  
  formatAnalysisLog(result) {
    const sim = this.dashboard.selectedSim;
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
}
