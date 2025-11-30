const tg = window.Telegram.WebApp;

// Простая функция отправки
function sendSimpleCommand() {
    const user = tg.initDataUnsafe.user;
    
    const simpleData = {
        action: "simple_test",
        user_id: user?.id || "unknown",
        user_name: user?.first_name || "Anonymous", 
        timestamp: new Date().toISOString(),
        test_message: "Это тестовое сообщение!"
    };
    
    console.log("📤 Отправляю:", simpleData);
    
    // 🔥 ОТПРАВКА
    tg.sendData(JSON.stringify(simpleData));
    
    // Подтверждение в Mini App
    tg.showAlert("✅ Данные отправлены! Проверь терминал бота.");
}

// Простой интерфейс
document.addEventListener('DOMContentLoaded', function() {
    document.body.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial;">
            <h1>🧪 Тестовый Mini App</h1>
            <p>Нажми кнопку чтобы отправить тестовые данные боту</p>
            
            <button onclick="sendSimpleCommand()" style="
                background: #28a745;
                color: white;
                padding: 15px 25px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin: 10px;
            ">
                🚀 Отправить тест
            </button>
            
            <button onclick="sendAnotherCommand()" style="
                background: #007bff;
                color: white;
                padding: 15px 25px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin: 10px;
            ">
                📨 Другая команда
            </button>
        </div>
    `;
    
    tg.expand();
    console.log("✅ Mini App готов");
});

function sendAnotherCommand() {
    const data = {
        action: "another_command", 
        user_id: "test_123",
        message: "Второй тест!",
        timestamp: new Date().toISOString()
    };
    
    console.log("📤 Отправляю другую команду:", data);
    tg.sendData(JSON.stringify(data));
    tg.showAlert("📨 Вторая команда отправлена!");
}
