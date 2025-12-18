// Инициализация Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.hide();

// Глобальные переменные
let currentPath = '/';
let history = [];
let searchQuery = '';
let indexData = null;
let loadedParts = new Map();
let allItemsCache = null;

// Элементы DOM
const elements = {
    stats: document.getElementById('stats'),
    currentPath: document.getElementById('currentPath'),
    pathInfo: document.getElementById('pathInfo'),
    breadcrumb: document.getElementById('breadcrumb'),
    fileList: document.getElementById('fileList'),
    loading: document.getElementById('loading'),
    totalStats: document.getElementById('totalStats'),
    searchInput: document.getElementById('searchInput'),
    homeBtn: document.getElementById('homeBtn'),
    backBtn: document.getElementById('backBtn'),
    searchBtn: document.getElementById('searchBtn')
};

// Загрузка индекса
async function loadIndex() {
    showLoading(true);
    
    try {
        console.log('📥 Загрузка индекса...');
        const response = await fetch('data/index.json?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        indexData = await response.json();
        console.log('✅ Индекс загружен:', indexData);
        
        // Обновляем общую статистику
        updateTotalStats();
        
        // Показываем корневую директорию
        await showDirectory('/');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки индекса:', error);
        showError('Не удалось загрузить данные');
    }
    
    showLoading(false);
}

// Показать содержимое директории
async function showDirectory(path) {
    console.log(`📂 Показ директории: "${path}"`);
    
    // Обновляем текущий путь
    currentPath = path;
    
    // Обновляем отображение пути
    updatePathDisplay();
    
    // Обновляем хлебные крошки
    updateBreadcrumb();
    
    // Загружаем содержимое директории
    await loadDirectoryContents(path);
    
    // Управляем кнопкой "Назад"
    updateBackButton();
}

// Загрузить содержимое директории
async function loadDirectoryContents(path) {
    showLoading(true);
    
    try {
        // Находим часть с данной директорией
        const partNum = await findPartForDirectory(path);
        
        if (!partNum) {
            console.log(`ℹ️ Директория "${path}" не найдена`);
            showEmptyState('Папка пуста');
            showLoading(false);
            return;
        }
        
        // Загружаем часть
        const partData = await loadPart(partNum);
        
        if (!partData || partData.path !== path) {
            console.log(`❌ Некорректные данные для директории "${path}"`);
            showEmptyState('Ошибка загрузки данных');
            showLoading(false);
            return;
        }
        
        // Получаем элементы
        let dirs = partData.items.dirs || [];
        let files = partData.items.files || [];
        
        console.log(`📊 Найдено: ${dirs.length} папок, ${files.length} файлов`);
        
        // Применяем поиск если есть
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            dirs = dirs.filter(dir => dir.n.toLowerCase().includes(query));
            files = files.filter(file => file.n.toLowerCase().includes(query));
            console.log(`🔍 После поиска: ${dirs.length} папок, ${files.length} файлов`);
        }
        
        // Отображаем
        displayItems(dirs, files);
        
        // Обновляем статистику
        updateDirectoryStats(dirs.length, files.length);
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки директории "${path}":`, error);
        showError('Ошибка загрузки содержимого');
    }
    
    showLoading(false);
}

// Найти часть с директорией
async function findPartForDirectory(path) {
    if (!indexData || !indexData.structure) {
        return null;
    }
    
    // Проверяем есть ли такая директория в структуре
    if (!indexData.structure[path]) {
        console.log(`Директория "${path}" не найдена в структуре`);
        return null;
    }
    
    // Ищем часть с этой директорией
    // В нашем случае часть = директория, так что ищем по номеру
    const partsCount = indexData.parts_count || 1;
    
    // Простой поиск: загружаем все части и ищем нужную
    for (let i = 1; i <= partsCount; i++) {
        try {
            const partNum = i.toString().padStart(3, '0');
            const partData = await loadPart(partNum);
            
            if (partData && partData.path === path) {
                return partNum;
            }
        } catch (error) {
            console.log(`Ошибка при проверке части ${i}:`, error);
        }
    }
    
    return null;
}

// Загрузить часть
async function loadPart(partNum) {
    const partKey = `part_${partNum}`;
    
    // Проверяем кэш
    if (loadedParts.has(partKey)) {
        return loadedParts.get(partKey);
    }
    
    try {
        const response = await fetch(`data/parts/${partKey}.json?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Кэшируем
        loadedParts.set(partKey, data);
        
        return data;
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки части ${partKey}:`, error);
        throw error;
    }
}

// Отобразить элементы
function displayItems(dirs, files) {
    const fileList = elements.fileList;
    
    if (dirs.length === 0 && files.length === 0) {
        const message = searchQuery 
            ? `По запросу "${searchQuery}" ничего не найдено`
            : 'Эта папка пуста';
        
        showEmptyState(message);
        return;
    }
    
    // Очищаем список
    fileList.innerHTML = '';
    
    // Добавляем папки
    dirs.forEach(dir => {
        const item = createDirectoryItem(dir);
        fileList.appendChild(item);
    });
    
    // Добавляем файлы
    files.forEach(file => {
        const item = createFileItem(file);
        fileList.appendChild(item);
    });
}

// Создать элемент папки
function createDirectoryItem(dir) {
    const div = document.createElement('div');
    div.className = 'file-item directory';
    div.innerHTML = `
        <div class="file-icon">📁</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(dir.n)}</div>
            <div class="file-details">
                <span class="file-type">Папка</span>
            </div>
        </div>
        <div class="file-arrow">›</div>
    `;
    
    div.onclick = () => {
        // Переходим в папку
        const newPath = currentPath === '/' 
            ? `/${dir.n}` 
            : `${currentPath}/${dir.n}`;
        
        // Сохраняем в историю
        history.push(currentPath);
        
        // Переходим
        showDirectory(newPath);
        
        // Сбрасываем поиск
        searchQuery = '';
        elements.searchInput.value = '';
    };
    
    return div;
}

// Создать элемент файла
function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = getFileIcon(file.n, file.e);
    const size = formatFileSize(file.s);
    const date = formatDate(file.m);
    
    div.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.n)}</div>
            <div class="file-details">
                <span class="file-size">${size}</span>
                <span class="file-date">${date}</span>
            </div>
        </div>
    `;
    
    div.onclick = () => {
        showFileInfo(file);
    };
    
    return div;
}

// Получить иконку файла
function getFileIcon(filename, ext) {
    const name = filename.toLowerCase();
    
    if (ext === 'ecfg' || name.endsWith('.ecfg')) return '⚙️';
    if (/(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return '🖼️';
    if (/(mp3|wav|ogg|flac)$/i.test(name)) return '🎵';
    if (/(mp4|avi|mov|mkv)$/i.test(name)) return '🎬';
    if (name.endsWith('.pdf')) return '📕';
    if (/(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
    if (/(txt|md|ini|cfg|json|xml|yml|yaml)$/i.test(name)) return '📝';
    if (/(js|ts|py|java|cpp|c|h|html|css|php)$/i.test(name)) return '📄';
    
    return '📄';
}

// Показать информацию о файле
function showFileInfo(file) {
    const size = formatFileSize(file.s);
    const date = file.m ? new Date(file.m * 1000).toLocaleString('ru-RU') : 'неизвестно';
    const path = currentPath === '/' ? '/' : currentPath;
    const ext = file.e ? `\n🔤 Расширение: .${file.e}` : '';
    
    const message = `📄 ${file.n}\n\n📦 Размер: ${size}${ext}\n📁 Путь: ${path}\n📅 Изменен: ${date}`;
    
    tg.showAlert(message);
}

// Обновить отображение пути
function updatePathDisplay() {
    elements.currentPath.textContent = currentPath;
}

// Обновить хлебные крошки
function updateBreadcrumb() {
    const breadcrumb = elements.breadcrumb;
    
    if (currentPath === '/') {
        breadcrumb.innerHTML = '<span class="breadcrumb-current">Корень</span>';
        return;
    }
    
    const parts = currentPath.substring(1).split('/');
    let html = '<span class="breadcrumb-item" data-path="/">Корень</span>';
    let current = '';
    
    parts.forEach((part, index) => {
        current += '/' + part;
        
        if (index < parts.length - 1) {
            html += `<span class="breadcrumb-separator">/</span>`;
            html += `<span class="breadcrumb-item" data-path="${current}">${part}</span>`;
        } else {
            html += `<span class="breadcrumb-separator">/</span>`;
            html += `<span class="breadcrumb-current">${part}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
    
    // Добавляем обработчики
    breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.onclick = () => {
            const path = item.getAttribute('data-path');
            
            // Находим этот путь в истории
            const pathIndex = history.indexOf(path);
            if (pathIndex !== -1) {
                // Обрезаем историю
                history = history.slice(0, pathIndex);
            } else {
                history = [];
            }
            
            // Переходим
            searchQuery = '';
            elements.searchInput.value = '';
            showDirectory(path);
        };
    });
}

// Обновить статистику директории
function updateDirectoryStats(dirsCount, filesCount) {
    const total = dirsCount + filesCount;
    elements.pathInfo.textContent = `${total} эл. (${dirsCount}п/${filesCount}ф)`;
}

// Обновить общую статистику
function updateTotalStats() {
    if (!indexData) return;
    
    elements.stats.textContent = `${indexData.total_files}ф/${indexData.total_dirs}п`;
    elements.totalStats.textContent = 
        `Всего: ${indexData.total_files} файлов, ${indexData.total_dirs} папок`;
}

// Обновить кнопку "Назад"
function updateBackButton() {
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Показать состояние загрузки
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
    elements.fileList.style.display = show ? 'none' : 'block';
}

// Показать пустое состояние
function showEmptyState(message) {
    elements.fileList.innerHTML = `
        <div class="empty-state">
            ${searchQuery ? '🔍' : '📂'} ${message}
        </div>
    `;
    elements.pathInfo.textContent = '0 эл.';
}

// Показать ошибку
function showError(message) {
    elements.fileList.innerHTML = `
        <div class="empty-state error">
            ❌ ${message}
        </div>
    `;
}

// Вспомогательные функции
function formatFileSize(bytes) {
    if (!bytes) return '0 Б';
    
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчики событий
function setupEventListeners() {
    // Домой
    elements.homeBtn.onclick = () => {
        history = [];
        searchQuery = '';
        elements.searchInput.value = '';
        showDirectory('/');
    };
    
    // Назад
    elements.backBtn.onclick = () => {
        if (history.length > 0) {
            const prevPath = history.pop();
            searchQuery = '';
            elements.searchInput.value = '';
            showDirectory(prevPath);
        }
    };
    
    // Поиск
    elements.searchBtn.onclick = () => {
        searchQuery = elements.searchInput.value.trim();
        loadDirectoryContents(currentPath);
    };
    
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = elements.searchInput.value.trim();
            loadDirectoryContents(currentPath);
        }
    });
    
    // Telegram Back Button
    tg.BackButton.onClick(() => {
        if (history.length > 0) {
            const prevPath = history.pop();
            searchQuery = '';
            elements.searchInput.value = '';
            showDirectory(prevPath);
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    
    console.log('🚀 Файловый менеджер запущен');
    
    // Настраиваем обработчики
    setupEventListeners();
    
    // Загружаем данные
    loadIndex();
});
