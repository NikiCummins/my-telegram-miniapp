// Инициализация Mini App
let tg = window.Telegram.WebApp;
tg.expand(); // Развернуть приложение на весь экран
tg.MainButton.setText("Готово").show(); // Показать главную кнопку

// Функция для показа информации о пользователе
function showUserInfo() {
    let user = tg.initDataUnsafe.user; // Получаем данные пользователя
    let div = document.getElementById('user-info');
    
    if (user) {
        div.innerHTML = `
            <p>Тебя зовут: <b>${user.first_name}</b></p>
            <p>Твой username: @${user.username}</p>
        `;
    } else {
        div.innerHTML = `<p>Не удалось получить данные.</p>`;
    }
}

// Функция для отправки данных назад в бота
function sendData() {
    let data = {
        command: 'save_data',
        text: 'Привет от Mini App!'
    };
    tg.sendData(JSON.stringify(data)); // Отправляем данные боту и закрываем приложение
    tg.close(); // Закрыть приложение
}

// Обработчик события нажатия на главную кнопку
tg.MainButton.onClick(function() {
    sendData();
});
