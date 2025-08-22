// SimShield IoT Dashboard - Tüm modüllerin dinamik olarak yüklendiği ana dosya
// Bu dosya tüm dashboard modüllerini modern JavaScript ile sırayla yükler

(async function loadDashboardModules() {
  const modules = [
    // 1. Yapılandırma ve yardımcı fonksiyonlar
    'config.js',
    'utils.js',
    
    // 2. Temel yöneticiler
    'websocket.js',
    'fleet.js',
    'sim-details.js',
    
    // 3. İşlevsel modüller
    'actions.js',
    'analysis.js',
    'usage.js',
    'filters.js',
    
    // 4. UI bileşenleri
    'modals.js',
    'panels.js',
    
    // 5. Ana dashboard başlatıcısı (en son yüklenecek)
    'main.js'
  ];

  // Base path'i al (mevcut script'in bulunduğu dizin)
  const currentScript = document.currentScript;
  const basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);

  try {
    console.log('%c🛡️ SimShield Dashboard', 'color: #4a90e2; font-size: 16px; font-weight: bold;');
    console.log('%c📦 Modüller yükleniyor...', 'color: #f39c12; font-weight: bold;');
    
    // Sırayla script dosyalarını yükle
    for (const moduleName of modules) {
      await loadScript(basePath + moduleName);
    }
    
    console.log('%c✨ Tüm modüller başarıyla yüklendi', 'color: #27ae60; font-weight: bold;');
    
    // main.js'deki initializeDashboard otomatik olarak çalışacak
    console.log('%c🎯 Dashboard initialization main.js tarafından handle ediliyor...', 'color: #9b59b6;');
    
  } catch (error) {
    console.error('%c❌ Modül yükleme hatası:', 'color: #e74c3c; font-weight: bold;', error);
  }
})();

// Script yükleme yardımcı fonksiyonu
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Sıralı yükleme için
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
