// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.hide();

// Глобальные переменные
let allFiles = [];
let currentPath = '/';
let history = [];
let searchQuery = '';

// Функция для загрузки данных
async function loadData() {
    try {
        showLoading(true);
        
        console.log('📥 Загрузка данных...');
        const response = await fetch(`data/files.json?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Данные загружены:', data.files.length, 'элементов');
        
        if (!data.files || !Array.isArray(data.files)) {
            throw new Error('Некорректная структура данных');
        }
        
        // Сохраняем все файлы
        allFiles = data.files;
        
        // Обновляем статистику
        updateStats();
        
        // Показываем текущую директорию
        showCurrentDirectory();
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showLoading(false);
        showError(`Ошибка загрузки данных: ${error.message}`);
    }
}

// Функция для отображения текущей директории
function showCurrentDirectory() {
    console.log('📂 Показ директории:', currentPath);
    
    // Получаем элементы для текущей директории
    let items = filterFilesByPath(currentPath);
    
    // Если есть поисковый запрос, фильтруем
    if (searchQuery) {
        items = searchFiles(items, searchQuery);
    }
    
    console.log('📊 Найдено элементов:', items.length);
    
    // Обновляем хлебные крошки
    updateBreadcrumb();
    
    // Отображаем файлы
    displayFiles(items);
    
    // Обновляем статистику
    updateCurrentStats(items);
    
    // Управляем кнопкой "Назад"
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Фильтрация файлов по пути
function filterFilesByPath(path) {
    if (path === '/') {
        // Корневая директория: показываем элементы с path = '.' 
        // и элементы первого уровня вложенности
        return allFiles.filter(item => {
            return item.path === '.' || 
                   (item.path.split('/').length === 1 && item.path !== '.');
        });
    }
    
    // Для вложенных директорий
    const pathParts = path.substring(1).split('/');
    const targetPath = pathParts.join('/');
    
    return allFiles.filter(item => {
        // Проверяем, что элемент находится в этой директории
        if (item.path === targetPath) {
            return true;
        }
        
        // Проверяем вложенные элементы
        const itemPathParts = item.path.split('/');
        if (itemPathParts.length === pathParts.length + 1) {
            const parentPath = itemPathParts.slice(0, -1).join('/');
            return parentPath === targetPath;
        }
        
        return false;
    });
}

// Поиск файлов
function searchFiles(items, query) {
    const searchLower = query.toLowerCase();
    return items.filter(item => 
        item.name.toLowerCase().includes(searchLower)
    );
}

// Отображение файлов
function displayFiles(items) {
    const fileList = document.getElementById('file-list');
    const currentPathElement = document.getElementById('current-path');
    
    currentPathElement.textContent = currentPath === '/' ? '/' : '/' + currentPath.substring(1);
    
    // Сортируем: сначала папки, потом файлы
    items.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });
    
    if (items.length === 0) {
        const message = searchQuery 
            ? `По запросу "${searchQuery}" ничего не найдено`
            : 'Эта папка пуста';
        
        fileList.innerHTML = `
            <div class="empty-folder">
                ${searchQuery ? '🔍' : '📂'} ${message}
            </div>
        `;
        return;
    }
    
    fileList.innerHTML = '';
    
    items.forEach(item => {
        const fileItem = document.createElement('div');
        let icon = '📄';
        let typeClass = 'file';
        
        if (item.type === 'directory') {
            icon = '📁';
            typeClass = 'directory';
        } else if (item.name.toLowerCase().endsWith('.ecfg')) {
            icon = '⚙️';
            typeClass = 'ecfg-file';
        } else if (item.name.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
            icon = '🖼️';
        } else if (item.name.match(/\.(mp3|wav|ogg)$/i)) {
            icon = '🎵';
        } else if (item.name.match(/\.(mp4|avi|mov)$/i)) {
            icon = '🎬';
        } else if (item.name.match(/\.(pdf)$/i)) {
            icon = '📕';
        } else if (item.name.match(/\.(zip|rar|7z)$/i)) {
            icon = '📦';
        }
        
        // Форматируем дату
        const modifiedDate = new Date(item.modified * 1000);
        const formattedDate = modifiedDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        fileItem.className = `file-item ${typeClass}`;
        fileItem.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(item.name)}</div>
                <div class="file-details">
                    ${item.type === 'directory' ? 
                        '<span class="file-type">Папка</span>' : 
                        `<span class="file-size">${formatFileSize(item.size)}</span>`
                    }
                    <span class="file-date">${formattedDate}</span>
                </div>
            </div>
            ${item.type === 'directory' ? '<div class="file-arrow">➡️</div>' : ''}
        `;
        
        fileItem.onclick = () => {
            if (item.type === 'directory') {
                // Сохраняем текущий путь в историю
                history.push(currentPath);
                
                // Переходим в папку
                if (currentPath === '/') {
                    currentPath = '/' + item.name;
                } else {
                    currentPath = currentPath + '/' + item.name;
                }
                
                // Сбрасываем поиск при переходе
                searchQuery = '';
                document.getElementById('search-input').value = '';
                
                showCurrentDirectory();
            } else {
                // Для файлов показываем информацию
                showFileInfo(item);
            }
        };
        
        fileList.appendChild(fileItem);
    });
}

// Показать информацию о файле
function showFileInfo(item) {
    const modifiedDate = new Date(item.modified * 1000);
    const createdDate = new Date(item.created * 1000);
    
    const info = `
📄 <b>${escapeHtml(item.name)}</b>

📦 Размер: ${formatFileSize(item.size)}
📁 Путь: ${item.path || '.'}

📅 Создан: ${createdDate.toLocaleString('ru-RU')}
✏️ Изменен: ${modifiedDate.toLocaleString('ru-RU')}

${item.extension ? `🔤 Расширение: ${item.extension}` : ''}
    `.trim();
    
    tg.showAlert(info);
}

// Обновление хлебных крошек
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (currentPath === '/') {
        breadcrumb.innerHTML = '<span>Корень</span>';
        return;
    }
    
    const parts = currentPath.substring(1).split('/');
    let html = '<a href="#" data-path="/">Корень</a>';
    let current = '';
    
    parts.forEach((part, index) => {
        current += '/' + part;
        if (index < parts.length - 1) {
            html += ` <span>/</span> <a href="#" data-path="${current}">${part}</a>`;
        } else {
            html += ` <span>/</span> <span>${part}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
    
    // Добавляем обработчики для ссылок
    breadcrumb.querySelectorAll('a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const path = link.getAttribute('data-path');
            
            // Находим индекс этого пути в истории
            const pathIndex = history.findIndex(h => h === path);
            if (pathIndex !== -1) {
                // Обрезаем историю
                history = history.slice(0, pathIndex);
            }
            
            currentPath = path;
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        };
    });
}

// Обновление статистики
function updateStats() {
    const totalFiles = allFiles.filter(f => f.type === 'file').length;
    const totalDirs = allFiles.filter(f => f.type === 'directory').length;
    
    document.getElementById('total-items').textContent = allFiles.length;
    document.getElementById('files-count').textContent = `${totalFiles} файлов`;
    document.getElementById('folders-count').textContent = `${totalDirs} папок`;
}

// Обновление текущей статистики
function updateCurrentStats(items) {
    const filesCount = items.filter(f => f.type === 'file').length;
    const dirsCount = items.filter(f => f.type === 'directory').length;
    
    document.getElementById('current-path').nextElementSibling.innerHTML = `
        <span>${dirsCount} папок, ${filesCount} файлов</span>
    `;
}

// Вспомогательные функции
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
    document.getElementById('file-list').style.display = show ? 'none' : 'block';
}

function showError(message) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = `<div class="empty-folder" style="color: #dc3545;">❌ ${message}</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем данные
    loadData();
    
    // Инициализируем Telegram Web App
    tg.ready();
    
    // Назад
    document.getElementById('back-btn').onclick = () => {
        if (history.length > 0) {
            currentPath = history.pop();
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        }
    };
    
    // В корень
    document.getElementById('home-btn').onclick = () => {
        history = [];
        currentPath = '/';
        searchQuery = '';
        document.getElementById('search-input').value = '';
        showCurrentDirectory();
    };
    
    // Обновить
    document.getElementById('refresh-btn').onclick = () => {
        loadData();
    };
    
    // Поиск
    document.getElementById('search-btn').onclick = () => {
        searchQuery = document.getElementById('search-input').value.trim();
        showCurrentDirectory();
    };
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = e.target.value.trim();
            showCurrentDirectory();
        }
    });
    
    // Обработчик кнопки "Назад" в Telegram
    tg.BackButton.onClick(() => {
        if (history.length > 0) {
            currentPath = history.pop();
            searchQuery = '';
            document.getElementById('search-input').value = '';
            showCurrentDirectory();
        }
    });
});

// Глобальные функции для отладки
window.debug = {
    getAllFiles: () => allFiles,
    getCurrentPath: () => currentPath,
    getHistory: () => history,
    reloadData: () => loadData()
};
