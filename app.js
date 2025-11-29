const tg = window.Telegram.WebApp;

// Инициализация приложения
function initApp() {
    console.log('Truck PORTAL инициализирован');
    
    // Расширяем на весь экран
    tg.expand();
    
    // Настраиваем главную кнопку
    tg.MainButton.setText("Связаться с поддержкой");
    tg.MainButton.onClick(contactSupport);
    
    // Загружаем файлы
    loadFiles();
    
    // Настраиваем поиск и фильтры
    setupSearchAndFilters();
}

// Данные файлов (в реальном приложении будут с сервера)
const filesData = [
    {
        id: 1,
        name: "ECM Firmware DDC v5.2",
        description: "Прошивка для двигателей Detroit Diesel Series 60",
        category: "firmware",
        size: "45.2 MB",
        version: "5.2.1",
        icon: "microchip",
        downloads: 1247
    },
    {
        id: 2,
        name: "Diagnostic Tool 2024",
        description: "Программа для диагностики грузовых автомобилей",
        category: "software",
        size: "128.5 MB",
        version: "3.4.0",
        icon: "laptop-code",
        downloads: 892
    },
    {
        id: 3,
        name: "Cummins INSITE Pro",
        description: "Профессиональное ПО для двигателей Cummins",
        category: "software",
        size: "256.7 MB",
        version: "8.7.2",
        icon: "laptop-code",
        downloads: 1563
    },
    {
        id: 4,
        name: "Service Manual Volvo",
        description: "Руководство по ремонту Volvo FH/FM",
        category: "manuals",
        size: "15.8 MB",
        version: "2024",
        icon: "book",
        downloads: 734
    },
    {
        id: 5,
        name: "ECM Update CAT C15",
        description: "Обновление прошивки для Caterpillar C15",
        category: "firmware",
        size: "32.1 MB",
        version: "2.1.4",
        icon: "microchip",
        downloads: 621
    },
    {
        id: 6,
        name: "Mercedes Diagnostic",
        description: "Диагностическая система Mercedes-Benz Trucks",
        category: "software",
        size: "189.3 MB",
        version: "4.2.1",
        icon: "laptop-code",
        downloads: 543
    }
];

// Загрузка файлов
function loadFiles(filteredFiles = filesData) {
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');
    
    fileCount.textContent = `(${filteredFiles.length})`;
    
    filesList.innerHTML = filteredFiles.map(file => `
        <div class="file-card" data-category="${file.category}">
            <div class="file-header">
                <div class="file-icon ${file.category}">
                    <i class="fas fa-${file.icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-description">${file.description}</div>
                </div>
            </div>
            <div class="file-meta">
                <div class="file-size">${file.size} • v${file.version}</div>
                <button class="download-btn" onclick="downloadFile(${file.id})">
                    <i class="fas fa-download"></i> Скачать
                </button>
            </div>
        </div>
    `).join('');
}

// Настройка поиска и фильтров
function setupSearchAndFilters() {
    const searchInput = document.getElementById('searchInput');
    const categories = document.querySelectorAll('.category');
    
    // Поиск
    searchInput.addEventListener('input', function(e) {
        filterFiles();
    });
    
    // Категории
    categories.forEach(category => {
        category.addEventListener('click', function() {
            categories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterFiles();
        });
    });
}

// Фильтрация файлов
function filterFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeCategory = document.querySelector('.category.active').dataset.category;
    
    let filtered = filesData.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm) || 
                            file.description.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || file.category === activeCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    loadFiles(filtered);
}

// Скачивание файла
function downloadFile(fileId) {
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) return;
    
    // Показываем загрузку
    showLoading();
    
    // Имитируем скачивание
    setTimeout(() => {
        hideLoading();
        
        // Показываем уведомление
        showDownloadInfo(`Файл "${file.name}" добавлен в загрузки`);
        
        // Отправляем данные в бота
        const downloadData = {
            action: "file_download",
            file_id: fileId,
            file_name: file.name,
            user_id: tg.initDataUnsafe.user?.id,
            timestamp: new Date().toISOString()
        };
        
        tg.sendData(JSON.stringify(downloadData));
        
    }, 2000);
}

// Связь с поддержкой
function contactSupport() {
    const user = tg.initDataUnsafe.user;
    const supportData = {
        action: "contact_support",
        user_id: user?.id,
        user_name: user?.first_name,
        username: user?.username,
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(supportData));
    tg.showAlert("Запрос отправлен в поддержку! С вами свяжутся в ближайшее время.");
}

// Вспомогательные функции
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function showDownloadInfo(message) {
    const info = document.getElementById('downloadInfo');
    const infoContent = info.querySelector('span');
    
    infoContent.textContent = message;
    info.classList.add('show');
    
    setTimeout(() => {
        info.classList.remove('show');
    }, 3000);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initApp);
