// Telegram
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние
let currentPath = '/';
let history = [];
let searchQuery = '';
let fileData = null;
let currentDirs = [];
let currentFiles = [];

// Инициализация
async function init() {
    showLoading(true);
    
    try {
        console.log('Загрузка данных...');
        
        // Пробуем загрузить оптимизированный индекс
        let response = await fetch('data/index_opt.json');
        if (!response.ok) {
            // Если нет оптимизированного, пробуем обычный
            response = await fetch('data/index.min.json');
            if (!response.ok) throw new Error('Не удалось загрузить индекс');
        }
        
        fileData = await response.json();
        console.log('Данные загружены:', fileData);
        
        // Обновляем статистику
        updateStats();
        
        // Загружаем корневую директорию
        await loadDirectory('/');
        
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Ошибка загрузки данных');
    }
    
    showLoading(false);
}

// Загрузка директории
async function loadDirectory(path) {
    showLoading(true);
    
    try {
        console.log('Загрузка директории:', path);
        
        // Обновляем текущий путь
        currentPath = path;
        document.getElementById('currentPath').textContent = path || '/';
        
        let dirs = [];
        let files = [];
        
        if (fileData.structure) {
            // Старая структура
            const dirData = fileData.structure[path] || fileData.structure[''] || { d: [], f: [] };
            dirs = dirData.d || [];
            files = dirData.f || [];
        } else if (fileData.dirs_list) {
            // Новая оптимизированная структура
            dirs = fileData.dirs_list[path] || fileData.dirs_list[''] || [];
            
            // Загружаем файлы отдельно если нужно
            if (fileData.parts_mapping && fileData.parts_mapping[path]) {
                const filesResponse = await fetch(`data/${fileData.parts_mapping[path]}`);
                if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    files = filesData.files || [];
                }
            } else {
                files = [];
            }
        }
        
        console.log('Найдено:', dirs.length, 'папок,', files.length, 'файлов');
        
        // Сохраняем
        currentDirs = dirs;
        currentFiles = files;
        
        // Отображаем
        displayItems();
        
    } catch (error) {
        console.error('Ошибка загрузки директории:', error);
        showError('Ошибка загрузки папки');
    }
    
    showLoading(false);
}

// Отображение элементов
function displayItems() {
    const container = document.getElementById('fileList');
    
    let dirsToShow = [...currentDirs];
    let filesToShow = [...currentFiles];
    
    // Применяем поиск
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        dirsToShow = dirsToShow.filter(name => name.toLowerCase().includes(query));
        filesToShow = filesToShow.filter(file => file.n.toLowerCase().includes(query));
    }
    
    if (dirsToShow.length === 0 && filesToShow.length === 0) {
        const message = searchQuery 
            ? `"${searchQuery}" не найдено` 
            : 'Папка пуста';
        container.innerHTML = `<div class="empty">${message}</div>`;
        return;
    }
    
    // Создаем HTML
    let html = '';
    
    // Папки
    dirsToShow.forEach(dirName => {
        html += `
            <div class="file-item" onclick="enterDir('${escape(dirName)}')">
                <div class="file-icon">📁</div>
                <div class="file-name">${escapeHtml(dirName)}</div>
                <div class="dir-arrow">›</div>
            </div>
        `;
    });
    
    // Файлы
    filesToShow.forEach(file => {
        const icon = getFileIcon(file.n, file.e);
        const size = file.s ? formatSize(file.s) : '';
        
        html += `
            <div class="file-item" onclick="showFile('${escape(JSON.stringify(file))}')">
                <div class="file-icon">${icon}</div>
                <div class="file-name">${escapeHtml(file.n)}</div>
                ${size ? `<div class="file-size">${size}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Вход в директорию
function enterDir(dirName) {
    history.push(currentPath);
    
    let newPath = '';
    if (currentPath === '/') {
        newPath = `/${dirName}`;
    } else {
        newPath = `${currentPath}/${dirName}`;
    }
    
    searchQuery = '';
    document.getElementById('search').value = '';
    
    loadDirectory(newPath);
}

// Показать информацию о файле
function showFile(fileStr) {
    try {
        const file = JSON.parse(fileStr);
        const size = file.s ? formatSize(file.s) : '';
        const date = file.m ? new Date(file.m * 1000).toLocaleDateString('ru-RU') : '';
        const path = currentPath === '/' ? '/' : currentPath;
        
        let message = `📄 ${file.n}`;
        if (size) message += `\n📦 ${size}`;
        if (date) message += `\n📅 ${date}`;
        message += `\n📁 ${path}`;
        
        tg.showAlert(message);
    } catch (e) {
        console.error('Ошибка показа файла:', e);
    }
}

// Навигация
function goHome() {
    history = [];
    searchQuery = '';
    document.getElementById('search').value = '';
    loadDirectory('/');
}

function goBack() {
    if (history.length > 0) {
        const prevPath = history.pop();
        searchQuery = '';
        document.getElementById('search').value = '';
        loadDirectory(prevPath);
    }
}

function doSearch() {
    searchQuery = document.getElementById('search').value.trim();
    displayItems();
}

function searchKey(e) {
    if (e.key === 'Enter') doSearch();
}

// Вспомогательные функции
function updateStats() {
    if (!fileData) return;
    
    const statsEl = document.getElementById('stats');
    statsEl.textContent = `${fileData.total_files}ф/${fileData.total_dirs}п`;
}

function getFileIcon(filename, ext) {
    const name = filename.toLowerCase();
    
    if (ext === 'ecfg' || name.endsWith('.ecfg')) return '⚙️';
    if (/(jpg|jpeg|png|gif|webp)$/i.test(name)) return '🖼️';
    if (/(mp3|wav|ogg|flac)$/i.test(name)) return '🎵';
    if (/(mp4|avi|mov|mkv)$/i.test(name)) return '🎬';
    if (name.endsWith('.pdf')) return '📕';
    if (/(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
    
    return '📄';
}

function formatSize(bytes) {
    if (!bytes) return '';
    
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let size = bytes;
    let unit = 0;
    
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    
    return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('fileList').style.display = show ? 'none' : 'block';
}

function showError(message) {
    document.getElementById('fileList').innerHTML = `
        <div class="error">❌ ${message}</div>
    `;
}

function escapeHtml(text) {
    return text.replace(/[&<>]/g, c => 
        ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
}

function escape(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Telegram Back Button
tg.BackButton.onClick(goBack);

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    init();
});
