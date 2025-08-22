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
            dashboard.simDetailsManager.selectSim(simId);
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
