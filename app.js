// Основной объект Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализация приложения
function initApp() {
    console.log('Mini App инициализирован');
    
    // Расширяем на весь экран
    tg.expand();
    
    // Настраиваем главную кнопку
    tg.MainButton.setText("Отправить данные");
    tg.MainButton.onClick(sendDataToBot);
    
    // Показываем данные пользователя
    displayUserInfo();
    
    // Настраиваем обработчик формы
    setupFormHandler();
}

// Показываем информацию о пользователе
function displayUserInfo() {
    const user = tg.initDataUnsafe.user;
    const userInfoDiv = document.getElementById('user-info');
    
    if (user) {
        userInfoDiv.innerHTML = `
            <h3>👋 Привет, ${user.first_name}!</h3>
            <div class="user-info">
                <p><strong>ID:</strong> ${user.id}</p>
                ${user.username ? `<p><strong>Username:</strong> @${user.username}</p>` : ''}
                ${user.language_code ? `<p><strong>Язык:</strong> ${user.language_code}</p>` : ''}
            </div>
        `;
    } else {
        userInfoDiv.innerHTML = '<p>Данные пользователя недоступны</p>';
    }
}

// Настройка обработчика формы
function setupFormHandler() {
    const form = document.getElementById('test-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            color: document.getElementById('color').value,
            timestamp: new Date().toISOString()
        };
        
        submitForm(formData);
    });
}

// Отправка формы на сервер
async function submitForm(formData) {
    try {
        const response = await fetch('https://your-server.com/webapp-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submit_form',
                form_data: formData,
                user_id: tg.initDataUnsafe.user?.id
            })
        });
        
        const result = await response.json();
        showResult(result.message, 'success');
        
    } catch (error) {
        console.error('Ошибка:', error);
        showResult('Ошибка при отправке формы', 'error');
    }
}

// Функции для кнопок
function showAlert() {
    tg.showPopup({
        title: 'Уведомление',
        message: 'Это тестовое уведомление из Mini App!',
        buttons: [{ type: 'ok' }]
    });
}

function getUserData() {
    const user = tg.initDataUnsafe.user;
    if (user) {
        const message = `
            Ваши данные:
            👤 Имя: ${user.first_name}
            📧 Username: @${user.username || 'не указан'}
            🆔 ID: ${user.id}
        `;
        tg.showAlert(message);
    } else {
        tg.showAlert("Данные пользователя не доступны");
    }
}

function sendToBot() {
    const data = {
        action: 'button_click',
        button: 'send_to_bot',
        timestamp: new Date().toISOString(),
        user: tg.initDataUnsafe.user?.id
    };
    
    tg.sendData(JSON.stringify(data));
    tg.showAlert('Данные отправлены боту!');
}

function closeApp() {
    tg.close();
}

// Отправка данных через главную кнопку
function sendDataToBot() {
    const formData = {
        name: document.getElementById('name').value || 'Не указано',
        email: document.getElementById('email').value || 'Не указано',
        color: document.getElementById('color').value || 'Не указано'
    };
    
    const data = {
        action: 'main_button_click',
        form_data: formData,
        timestamp: new Date().toISOString(),
        user: tg.initDataUnsafe.user
    };
    
    tg.sendData(JSON.stringify(data));
    tg.close();
}

// Показать результат операции
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = `result ${type}`;
    
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 5000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);
