// Modal pencereler (what-if, best-options)
class ModalsManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }
  
  async loadBestOptions() {
    if (!this.dashboard.selectedSim) return;
    
    try {
      this.dashboard.appendLog(`💡 ${this.dashboard.selectedSim.sim_id} için en iyi seçenekler araştırılıyor...`);
      
      const options = await apiCall(`/api/v1/best-options/${encodeURIComponent(this.dashboard.selectedSim.sim_id)}`);
      
      if (options && options.length > 0) {
        // En iyi 3 seçeneği detaylı göster
        this.showBestOptionsModal(options.slice(0, 3));
      } else {
        this.dashboard.appendLog(`ℹ️ Şu an için daha iyi bir seçenek bulunamadı`);
      }
      
    } catch (error) {
      this.dashboard.appendLog(`❌ Seçenek analizi hatası: ${error.message}`);
    }
  }

  showBestOptionsModal(options) {
    // Modal HTML'i oluştur
    const modalHtml = `
      <div class="modal-overlay" id="options-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>💡 ${this.dashboard.selectedSim.sim_id} için En İyi Seçenekler</h3>
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
    this.dashboard.appendLog(`💰 En iyi seçenek: ${topOption.description} (₺${topOption.saving.toFixed(2)} tasarruf)`);
  }

  showWhatIfModal() {
    if (!this.dashboard.selectedSim) return;
    
    const modalHtml = `
      <div class="modal-overlay" id="whatif-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔮 ${this.dashboard.selectedSim.sim_id} için Simülasyon</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="whatif-scenarios">
              <div class="scenario-card" onclick="dashboard.modalsManager.runWhatIfScenario('increase_20')">
                <div class="scenario-title">📈 %20 Kullanım Artışı</div>
                <div class="scenario-desc">Gelecek ay kullanım %20 artarsa ne olur?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.modalsManager.runWhatIfScenario('decrease_30')">
                <div class="scenario-title">📉 %30 Kullanım Azalışı</div>
                <div class="scenario-desc">Kullanım optimize edilirse nasıl değişir?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.modalsManager.runWhatIfScenario('spike_day')">
                <div class="scenario-title">⚡ Günlük Ani Artış</div>
                <div class="scenario-desc">Bir günde 10x kullanım olursa?</div>
              </div>
              <div class="scenario-card" onclick="dashboard.modalsManager.runWhatIfScenario('roaming_week')">
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
    if (!this.dashboard.selectedSim) return;
    
    try {
      const resultsDiv = document.getElementById('simulation-results');
      const contentDiv = document.getElementById('results-content');
      
      resultsDiv.style.display = 'block';
      contentDiv.innerHTML = '<div class="muted">🔄 Simülasyon çalışıyor...</div>';
      
      const result = await apiCall(`/api/v1/whatif/${encodeURIComponent(this.dashboard.selectedSim.sim_id)}`, {
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
        
        this.dashboard.appendLog(`🔮 Simülasyon tamamlandı: ${result.summary || 'Sonuçlar hazır'}`);
      }
      
    } catch (error) {
      document.getElementById('results-content').innerHTML = `<div class="muted">❌ Simülasyon hatası: ${error.message}</div>`;
      this.dashboard.appendLog(`❌ Simülasyon hatası: ${error.message}`);
    }
  }
}
