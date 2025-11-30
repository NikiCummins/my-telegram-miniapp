const tg = window.Telegram.WebApp;

function initApp() {
    console.log('✅ Mini App загружен');
    tg.expand();
    
    // Показываем информацию о пользователе
    const user = tg.initDataUnsafe.user;
    console.log('👤 User data:', user);
}

function sendTestCommand() {
    const user = tg.initDataUnsafe.user;
    
    const testData = {
        action: "test_button_click",
        button_id: "test_btn_1",
        user_id: user?.id,
        user_name: user?.first_name || "Anonymous",
        timestamp: new Date().toISOString(),
        message: "Привет от Mini App! 🚀"
    };
    
    console.log("📤 Отправляю данные:", testData);
    
    // 🔥 ОТПРАВКА ДАННЫХ БОТУ
    tg.sendData(JSON.stringify(testData));
    
    tg.showAlert("✅ Команда отправлена боту!");
}

// Простая HTML структура для теста
document.addEventListener('DOMContentLoaded', function() {
    document.body.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h1>🧪 Test Mini App</h1>
            <p>Нажми кнопку чтобы отправить команду боту</p>
            <button onclick="sendTestCommand()" style="
                background: #007bff; 
                color: white; 
                padding: 15px 30px; 
                border: none; 
                border-radius: 10px;
                font-size: 18px;
                cursor: pointer;
            ">
                🚀 Отправить команду
            </button>
        </div>
    `;
    
    initApp();
});
