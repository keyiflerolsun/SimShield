// SimShield IoT Dashboard - Tüm modüllerin dinamik olarak yüklendiği ana dosya
// Bu dosya tüm dashboard modüllerini modern JavaScript ile sırayla yükler

(async function loadDashboardModules() {
  const modules = [
    // 1. Yapılandırma ve yardımcı fonksiyonlar
    'JS/config.js',
    'JS/utils.js',
    
    // 2. Temel yöneticiler
    'JS/websocket.js',
    'JS/fleet.js',
    'JS/sim-details.js',
    
    // 3. İşlevsel modüller
    'JS/actions.js',
    'JS/analysis.js',
    'JS/usage.js',
    'JS/filters.js',
    
    // 4. UI bileşenleri
    'JS/modals.js',
    'JS/panels.js',
    
    // 5. Ana dashboard başlatıcısı (en son yüklenecek)
    'JS/main.js'
  ];

  // Sırayla script dosyalarını yükle
  for (const modulePath of modules) {
    await loadScript(modulePath);
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
