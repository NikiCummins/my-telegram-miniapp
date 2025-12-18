// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Глобальные переменные
let currentPath = '/';
let history = [];
let searchQuery = '';
let loadedParts = new Map(); // Кэшированные части
let currentPage = 1;
const ITEMS_PER_PAGE = 100;

// Функция для загрузки индекса
async function loadIndex() {
    try {
        showLoading(true);
        
        console.log('📥 Загрузка индекса...');
        const response = await fetch(`data/files_index.json?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const indexData = await response.json();
        console.log('✅ Индекс загружен');
        
        // Сохраняем индекс в localStorage для быстрого доступа
        localStorage.setItem('file_index', JSON.stringify(indexData));
        localStorage.setItem('index_timestamp', Date.now());
        
        // Показываем корневую директорию
        showCurrentDirectory();
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки индекса:', error);
        showLoading(false);
        showError(`Ошибка: ${error.message}`);
    }
}

// Загрузка конкретной части
async function loadPart(partNum) {
    if (loadedParts.has(partNum)) {
        return loadedParts.get(partNum);
    }
    
    try {
        const response = await fetch(`data/parts/part_${partNum.toString().padStart(3, '0')}.json`);
        const data = await response.json();
        loadedParts.set(partNum, data);
        return data;
    } catch (error) {
        console.error(`Ошибка загрузки части ${partNum}:`, error);
        return [];
    }
}

// Получить файлы для текущего пути
async function getFilesForCurrentPath() {
    const indexData = JSON.parse(localStorage.getItem('file_index') || '{}');
    const files = [];
    
    // Загружаем все части, содержащие нужные файлы
    for (const part of indexData.parts || []) {
        const partData = await loadPart(part.num);
        
        // Фильтруем файлы по текущему пути
        for (const item of partData) {
            if (isItemInCurrentPath(item)) {
                files.push(item);
            }
        }
    }
    
    return files;
}

// Проверка, находится ли элемент в текущей директории
function isItemInCurrentPath(item) {
    const itemPath = item.p || '';
    
    if (currentPath === '/') {
        // В корне: показываем элементы с пустым путем или первой директорией
        return itemPath === '' || !itemPath.includes('/');
    }
    
    // Для вложенных путей
    const targetPath = currentPath.substring(1);
    return itemPath === targetPath;
}

// Отображение файлов с пагинацией
async function displayFilesWithPagination(files) {
    const fileList = document.getElementById('file-list');
    const totalItems = files.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Рассчитываем элементы для текущей страницы
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const pageItems = files.slice(startIndex, endIndex);
    
    // Обновляем статистику
    updateCurrentStats(files);
    
    // Отображаем элементы
    if (pageItems.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                ${searchQuery ? '🔍' : '📂'} 
                ${searchQuery ? `По запросу "${searchQuery}" ничего не найдено` : 'Папка пуста'}
            </div>
        `;
    } else {
        fileList.innerHTML = pageItems.map(item => createFileItemHTML(item)).join('');
        
        // Добавляем обработчики клика
        pageItems.forEach((item, index) => {
            const element = fileList.children[index];
            if (element) {
                element.onclick = () => handleItemClick(item);
            }
        });
    }
    
    // Обновляем пагинацию
    updatePagination(totalPages, totalItems);
}

// Создание HTML для элемента файла/папки
function createFileItemHTML(item) {
    const isDir = item.t === 'd';
    const icon = getIconForItem(item);
    const size = isDir ? '' : formatSize(item.s);
    const date = item.m ? formatDate(item.m) : '';
    
    return `
        <div class="file-item ${isDir ? 'directory' : 'file'}" data-id="${item.id}">
            <div class="file-icon">${icon}</div>
            <div class="file-content">
                <div class="file-name">${escapeHtml(item.n)}</div>
                <div class="file-meta">
                    ${size ? `<span class="file-size">${size}</span>` : ''}
                    ${date ? `<span class="file-date">${date}</span>` : ''}
                </div>
            </div>
            ${isDir ? '<div class="file-arrow">›</div>' : ''}
        </div>
    `;
}

// Обработка клика по элементу
function handleItemClick(item) {
    if (item.t === 'd') {
        // Переход в папку
        history.push(currentPath);
        currentPath = currentPath === '/' ? `/${item.n}` : `${currentPath}/${item.n}`;
        currentPage = 1;
        searchQuery = '';
        document.getElementById('search-input').value = '';
        showCurrentDirectory();
    } else {
        // Показать информацию о файле
        showFileInfo(item);
    }
}

// Получить иконку для элемента
function getIconForItem(item) {
    if (item.t === 'd') return '📁';
    
    const name = item.n.toLowerCase();
    if (name.endsWith('.ecfg')) return '⚙️';
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/.test(name)) return '🖼️';
    if (/\.(mp3|wav|ogg|flac)$/.test(name)) return '🎵';
    if (/\.(mp4|avi|mov|mkv)$/.test(name)) return '🎬';
    if (/\.(pdf)$/.test(name)) return '📕';
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return '📦';
    if (/\.(txt|md|ini|cfg|json)$/.test(name)) return '📝';
    if (/\.(js|ts|py|java|cpp|html|css)$/.test(name)) return '📄';
    
    return '📄';
}

// Форматирование размера
function formatSize(bytes) {
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

// Форматирование даты
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'сегодня';
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
    });
}

// Обновление текущей статистики
function updateCurrentStats(files) {
    const dirs = files.filter(f => f.t === 'd').length;
    const fileCount = files.filter(f => f.t === 'f').length;
    const currentStats = document.getElementById('current-stats');
    
    if (currentStats) {
        currentStats.textContent = `${dirs}/${fileCount}`;
    }
    
    // Обновляем общее количество
    const totalItems = document.getElementById('total-items');
    if (totalItems) {
        totalItems.textContent = files.length;
    }
}

// Обновление пагинации
function updatePagination(totalPages, totalItems) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (currentPage > 1) {
        html += `<button class="page-btn" data-page="${currentPage - 1}">‹</button>`;
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) html += '<span class="page-dots">…</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn active">${i}</span>`;
        } else {
            html += `<button class="page-btn" data-page="${i}">${i}</button>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span class="page-dots">…</span>';
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    if (currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${currentPage + 1}">›</button>`;
    }
    
    pagination.innerHTML = html;
    
    // Добавляем обработчики для кнопок пагинации
    pagination.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.onclick = () => {
            currentPage = parseInt(btn.getAttribute('data-page'));
            showCurrentDirectory();
        };
    });
}

// Показать текущую директорию
async function showCurrentDirectory() {
    showLoading(true);
    
    try {
        // Получаем файлы для текущего пути
        let files = await getFilesForCurrentPath();
        
        // Применяем поиск, если есть запрос
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            files = files.filter(item => 
                item.n.toLowerCase().includes(query)
            );
        }
        
        // Обновляем хлебные крошки
        updateBreadcrumb();
        
        // Отображаем файлы с пагинацией
        await displayFilesWithPagination(files);
        
        // Управляем кнопкой "Назад"
        if (history.length > 0) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
        
    } catch (error) {
        console.error('Ошибка при показе директории:', error);
        showError('Ошибка загрузки файлов');
    }
    
    showLoading(false);
}

// Обновление хлебных крошек
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (currentPath === '/') {
        breadcrumb.innerHTML = '<span class="crumb active">Корень</span>';
        return;
    }
    
    const parts = currentPath.substring(1).split('/');
    let html = '<span class="crumb" data-path="/">Корень</span>';
    let current = '';
    
    parts.forEach((part, index) => {
        current += '/' + part;
        if (index < parts.length - 1) {
            html += ` <span class="sep">/</span> <span class="crumb" data-path="${current}">${part}</span>`;
        } else {
            html += ` <span class="sep">/</span> <span class="crumb active">${part}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
    
    // Добавляем обработчики
    breadcrumb.querySelectorAll('.crumb[data-path]').forEach(crumb => {
        crumb.onclick = () => {
            const path = crumb.getAttribute('data-path');
            
            // Обрезаем историю
            const pathIndex = history.indexOf(path);
            if (pathIndex !== -1) {
                history = history.slice(0, pathIndex);
            } else {
                history = [];
            }
            
            currentPath = path;
            currentPage = 1;
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        };
    });
}

// Вспомогательные функции
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
    document.getElementById('file-list').style.display = show ? 'none' : 'block';
}

function showError(message) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = `<div class="empty-state error">❌ ${message}</div>`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Показать информацию о файле
function showFileInfo(item) {
    const modified = item.m ? new Date(item.m * 1000).toLocaleString('ru-RU') : 'неизвестно';
    const size = formatSize(item.s);
    
    tg.showAlert(`
📄 ${escapeHtml(item.n)}

📦 Размер: ${size}
📁 Путь: ${item.p || '.'}
✏️ Изменен: ${modified}
${item.e ? `🔤 Тип: ${item.e}` : ''}
    `);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    
    // Загружаем индекс
    loadIndex();
    
    // Обработчики кнопок
    document.getElementById('home-btn').onclick = () => {
        history = [];
        currentPath = '/';
        currentPage = 1;
        searchQuery = '';
        document.getElementById('search-input').value = '';
        showCurrentDirectory();
    };
    
    document.getElementById('back-btn').onclick = () => {
        if (history.length > 0) {
            currentPath = history.pop();
            currentPage = 1;
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        }
    };
    
    document.getElementById('refresh-btn').onclick = () => {
        loadedParts.clear();
        localStorage.removeItem('file_index');
        loadIndex();
    };
    
    document.getElementById('search-btn').onclick = () => {
        searchQuery = document.getElementById('search-input').value.trim();
        currentPage = 1;
        showCurrentDirectory();
    };
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = e.target.value.trim();
            currentPage = 1;
            showCurrentDirectory();
        }
    });
    
    // Telegram Back Button
    tg.BackButton.onClick(() => {
        if (history.length > 0) {
            currentPath = history.pop();
            currentPage = 1;
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        }
    });
});
