const tg = window.Telegram.WebApp;
let isRunning = false;

function initApp() {
    console.log('✅ Mini App инициализирован');
    console.log('👤 User:', tg.initDataUnsafe.user);
    tg.expand();
    updateUI();
}

function toggleControl() {
    console.log('🎯 Кнопка нажата! Текущее состояние:', isRunning);
    
    isRunning = !isRunning;
    
    const controlData = {
        action: "control_toggle",
        state: isRunning ? "start" : "stop",
        user_id: tg.initDataUnsafe.user?.id,
        user_name: tg.initDataUnsafe.user?.first_name || "User",
        timestamp: new Date().toISOString()
    };
    
    console.log("📤 Отправляю данные:", controlData);
    
    // Пробуем отправить данные
    try {
        tg.sendData(JSON.stringify(controlData));
        console.log("✅ Данные отправлены через sendData");
    } catch (error) {
        console.error("❌ Ошибка sendData:", error);
    }
    
    updateUI();
    tg.showAlert(isRunning ? "✅ Запущено!" : "🛑 Остановлено!");
}

document.addEventListener('DOMContentLoaded', initApp);
