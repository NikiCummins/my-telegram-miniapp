// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.hide();

// Состояние
let currentPath = '/';
let history = [];
let searchQuery = '';
let indexData = null;
let cachedContents = new Map(); // Кэш содержимого директорий
let rootContents = null;

// Элементы
const elements = {
    totalStats: document.getElementById('totalStats'),
    currentPath: document.getElementById('currentPath'),
    breadcrumb: document.getElementById('breadcrumb'),
    fileList: document.getElementById('fileList'),
    loading: document.getElementById('loading'),
    currentStats: document.getElementById('currentStats'),
    searchInput: document.getElementById('searchInput')
};

// Загрузка данных
async function loadData() {
    showLoading(true);
    
    try {
        console.log('📥 Загрузка индекса...');
        
        // Загружаем корневую директорию сразу
        const rootResponse = await fetch('data/root.json?t=' + Date.now());
        if (!rootResponse.ok) throw new Error('Не удалось загрузить корневую директорию');
        rootContents = await rootResponse.json();
        
        // Загружаем индекс
        const indexResponse = await fetch('data/index.json?t=' + Date.now());
        if (!indexResponse.ok) throw new Error('Не удалось загрузить индекс');
        indexData = await indexResponse.json();
        
        console.log('✅ Данные загружены');
        console.log(`📊 Всего: ${indexData.total_files} файлов, ${indexData.total_dirs} папок`);
        
        // Обновляем статистику
        updateTotalStats();
        
        // Кэшируем корневую директорию
        cachedContents.set('/', rootContents);
        
        // Показываем корневую директорию
        await showDirectory('/');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showError('Не удалось загрузить данные файлового менеджера');
    }
    
    showLoading(false);
}

// Показать директорию
async function showDirectory(path) {
    console.log(`📂 Открытие директории: "${path}"`);
    
    // Обновляем текущий путь
    currentPath = path;
    
    // Обновляем отображение
    updatePathDisplay();
    updateBreadcrumb();
    
    // Загружаем содержимое
    await loadDirectoryContents(path);
    
    // Управляем кнопкой "Назад"
    updateBackButton();
}

// Загрузить содержимое директории
async function loadDirectoryContents(path) {
    showLoading(true);
    
    try {
        // Проверяем кэш
        if (cachedContents.has(path)) {
            console.log(`♻️ Используем кэш для: "${path}"`);
            displayContents(cachedContents.get(path));
            showLoading(false);
            return;
        }
        
        console.log(`📥 Загрузка содержимого: "${path}"`);
        
        let contents = null;
        
        if (path === '/') {
            // Корневая директория уже загружена
            contents = rootContents;
        } else {
            // Ищем директорию в частях
            contents = await findDirectoryInParts(path);
        }
        
        if (!contents) {
            console.log(`❌ Директория не найдена: "${path}"`);
            showEmptyState('Папка не найдена');
            showLoading(false);
            return;
        }
        
        // Кэшируем
        cachedContents.set(path, contents);
        
        // Отображаем
        displayContents(contents);
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки директории "${path}":`, error);
        showError('Ошибка загрузки содержимого');
    }
    
    showLoading(false);
}

// Поиск директории в частях
async function findDirectoryInParts(path) {
    if (!indexData || !indexData.parts) {
        return null;
    }
    
    // Проходим по всем частям
    for (const [partNum, partInfo] of Object.entries(indexData.parts)) {
        // Проверяем, есть ли этот путь в части
        if (partInfo.paths && partInfo.paths.includes(path)) {
            console.log(`🔍 Директория "${path}" найдена в части ${partNum}`);
            
            // Загружаем часть
            const partData = await loadPart(partNum);
            if (!partData) continue;
            
            // Ищем нашу директорию в части
            for (const dirData of partData) {
                if (dirData.path === path) {
                    return dirData;
                }
            }
        }
    }
    
    // Если не нашли в частях, проверяем корень
    if (path === '/' && rootContents) {
        return rootContents;
    }
    
    return null;
}

// Загрузка части
async function loadPart(partNum) {
    const paddedNum = partNum.toString().padStart(3, '0');
    const cacheKey = `part_${paddedNum}`;
    
    // Проверяем кэш
    if (cachedContents.has(cacheKey)) {
        return cachedContents.get(cacheKey);
    }
    
    try {
        const response = await fetch(`data/parts/part_${paddedNum}.json?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Кэшируем
        cachedContents.set(cacheKey, data);
        
        return data;
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки части ${partNum}:`, error);
        return null;
    }
}

// Отобразить содержимое
function displayContents(contents) {
    if (!contents) {
        showEmptyState('Ошибка загрузки данных');
        return;
    }
    
    let dirs = contents.dirs || [];
    let files = contents.files || [];
    
    console.log(`📊 Содержимое: ${dirs.length} папок, ${files.length} файлов`);
    
    // Применяем поиск
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        dirs = dirs.filter(dir => dir.n.toLowerCase().includes(query));
        files = files.filter(file => file.n.toLowerCase().includes(query));
        console.log(`🔍 После поиска: ${dirs.length} папок, ${files.length} файлов`);
    }
    
    // Сортируем
    dirs.sort((a, b) => a.n.localeCompare(b.n));
    files.sort((a, b) => a.n.localeCompare(b.n));
    
    // Отображаем
    const fileList = elements.fileList;
    
    if (dirs.length === 0 && files.length === 0) {
        const message = searchQuery 
            ? `По запросу "${searchQuery}" ничего не найдено` 
            : 'Эта папка пуста';
        
        showEmptyState(message);
        updateCurrentStats(0, 0);
        return;
    }
    
    // Очищаем список
    fileList.innerHTML = '';
    
    // Добавляем папки
    dirs.forEach(dir => {
        fileList.appendChild(createDirectoryElement(dir));
    });
    
    // Добавляем файлы
    files.forEach(file => {
        fileList.appendChild(createFileElement(file));
    });
    
    // Обновляем статистику
    updateCurrentStats(dirs.length, files.length);
}

// Создать элемент папки
function createDirectoryElement(dir) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
        <div class="file-icon">📁</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(dir.n)}</div>
            <div class="file-meta">
                <span class="file-type">Папка</span>
            </div>
        </div>
        <div class="dir-arrow">›</div>
    `;
    
    div.onclick = () => {
        // Определяем новый путь
        let newPath = '';
        if (currentPath === '/') {
            newPath = `/${dir.n}`;
        } else {
            newPath = `${currentPath}/${dir.n}`;
        }
        
        // Добавляем в историю
        history.push(currentPath);
        
        // Сбрасываем поиск
        searchQuery = '';
        elements.searchInput.value = '';
        
        // Переходим
        showDirectory(newPath);
    };
    
    return div;
}

// Создать элемент файла
function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = getFileIcon(file.n, file.e);
    const size = formatSize(file.s);
    const date = formatDate(file.m);
    
    div.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.n)}</div>
            <div class="file-meta">
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

// Вспомогательные функции
function getFileIcon(filename, ext) {
    const name = filename.toLowerCase();
    
    if (ext === 'ecfg' || name.endsWith('.ecfg')) return '⚙️';
    if (/(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return '🖼️';
    if (/(mp3|wav|ogg|flac|m4a)$/i.test(name)) return '🎵';
    if (/(mp4|avi|mov|mkv|wmv|flv)$/i.test(name)) return '🎬';
    if (name.endsWith('.pdf')) return '📕';
    if (/(zip|rar|7z|tar|gz|bz2|xz)$/i.test(name)) return '📦';
    if (/(txt|md|ini|cfg|json|xml|yml|yaml|log)$/i.test(name)) return '📝';
    if (/(js|ts|py|java|cpp|c|h|html|css|php|rb|go|rs)$/i.test(name)) return '📄';
    if (/(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name)) return '📎';
    
    return '📄';
}

function formatSize(bytes) {
    if (!bytes) return '0 Б';
    
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let size = bytes;
    let unit = 0;
    
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    
    return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
    
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

// Обновление UI
function updatePathDisplay() {
    elements.currentPath.textContent = currentPath;
}

function updateBreadcrumb() {
    const breadcrumb = elements.breadcrumb;
    
    if (currentPath === '/') {
        breadcrumb.innerHTML = '<span class="breadcrumb-item" onclick="goHome()">Корень</span>';
        return;
    }
    
    const parts = currentPath.substring(1).split('/');
    let html = '<span class="breadcrumb-item" onclick="goHome()">Корень</span>';
    let current = '';
    
    parts.forEach((part, index) => {
        current += '/' + part;
        
        if (index < parts.length - 1) {
            html += '<span class="breadcrumb-sep"> / </span>';
            html += `<span class="breadcrumb-item" onclick="navigateTo('${current}')">${escapeHtml(part)}</span>`;
        } else {
            html += '<span class="breadcrumb-sep"> / </span>';
            html += `<span class="breadcrumb-current">${escapeHtml(part)}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
}

function navigateTo(path) {
    // Находим путь в истории
    const pathIndex = history.indexOf(path);
    if (pathIndex !== -1) {
        history = history.slice(0, pathIndex);
    } else {
        history = [currentPath];
    }
    
    searchQuery = '';
    elements.searchInput.value = '';
    showDirectory(path);
}

function updateTotalStats() {
    if (!indexData) return;
    
    elements.totalStats.textContent = 
        `${indexData.total_files.toLocaleString()} файлов, ${indexData.total_dirs.toLocaleString()} папок`;
}

function updateCurrentStats(dirs, files) {
    const total = dirs + files;
    elements.currentStats.textContent = 
        `${total} элементов (${dirs} папок, ${files} файлов)`;
}

function updateBackButton() {
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

function showFileInfo(file) {
    const size = formatSize(file.s);
    const date = formatDate(file.m);
    const path = currentPath === '/' ? '/' : currentPath;
    const ext = file.e ? `\n🔤 Расширение: .${file.e}` : '';
    
    const message = `📄 ${file.n}\n\n📦 Размер: ${size}${ext}\n📁 Путь: ${path}\n📅 Изменен: ${date}`;
    
    tg.showAlert(message);
}

function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
    elements.fileList.style.display = show ? 'none' : 'block';
}

function showEmptyState(message) {
    elements.fileList.innerHTML = `
        <div class="empty-state">
            ${searchQuery ? '🔍' : '📂'} ${message}
        </div>
    `;
}

function showError(message) {
    elements.fileList.innerHTML = `
        <div class="error">
            ❌ ${message}
        </div>
    `;
}

// Навигация
function goHome() {
    history = [];
    searchQuery = '';
    elements.searchInput.value = '';
    showDirectory('/');
}

function goBack() {
    if (history.length > 0) {
        const prevPath = history.pop();
        searchQuery = '';
        elements.searchInput.value = '';
        showDirectory(prevPath);
    }
}

function doSearch() {
    searchQuery = elements.searchInput.value.trim();
    loadDirectoryContents(currentPath);
}

function handleSearchKey(event) {
    if (event.key === 'Enter') {
        doSearch();
    }
}

// Telegram Back Button
tg.BackButton.onClick(goBack);

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    console.log('🚀 Файловый менеджер запущен');
    loadData();
    
    // Экспортируем функции для HTML
    window.goHome = goHome;
    window.goBack = goBack;
    window.doSearch = doSearch;
    window.navigateTo = navigateTo;
    window.handleSearchKey = handleSearchKey;
});
