const tg = window.Telegram.WebApp;
let isRunning = false;

// Инициализация приложения
function initApp() {
    console.log('Simple Control App инициализирован');
    tg.expand(); // Расширяем на весь экран
    updateUI();
}

// Переключение состояния Start/Stop
function toggleControl() {
    isRunning = !isRunning;
    
    // Подготавливаем данные для отправки
    const controlData = {
        action: "control_toggle",
        state: isRunning ? "start" : "stop",
        user_id: tg.initDataUnsafe.user?.id,
        user_name: tg.initDataUnsafe.user?.first_name || "User",
        timestamp: new Date().toISOString()
    };
    
    console.log("📤 Отправка данных в бота:", controlData);
    
    // Отправляем данные в бота
    tg.sendData(JSON.stringify(controlData));
    
    // Обновляем интерфейс
    updateUI();
    
    // Показываем уведомление
    tg.showAlert(isRunning ? "✅ Система запущена!" : "🛑 Система остановлена!");
}

// Обновление интерфейса
function updateUI() {
    const statusElement = document.getElementById('status');
    const buttonElement = document.getElementById('controlBtn');
    
    if (isRunning) {
        statusElement.textContent = "Статус: Запущена 🟢";
        statusElement.style.color = "#28a745";
        buttonElement.textContent = "🛑 Stop";
        buttonElement.classList.add('stop');
    } else {
        statusElement.textContent = "Статус: Остановлена 🔴";
        statusElement.style.color = "#dc3545";
        buttonElement.textContent = "🚀 Start";
        buttonElement.classList.remove('stop');
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initApp);
