// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

let currentPath = '/';
let history = [];

// Функция для загрузки структуры директории
async function loadDirectory(path = '/') {
    try {
        showLoading(true);
        
        // Загружаем JSON с данными о файлах
        const response = await fetch(`data/files.json?t=${Date.now()}`);
        const data = await response.json();
        
        // Фильтруем файлы для текущего пути
        const items = data.files.filter(item => {
            const itemPath = item.path === '.' ? '/' : item.path;
            return itemPath === path || 
                   (itemPath.startsWith(path) && 
                    itemPath.substring(path === '/' ? 1 : path.length + 1).split('/').length === 1);
        });
        
        displayFiles(items, path);
        showLoading(false);
    } catch (error) {
        console.error('Error loading directory:', error);
        showLoading(false);
        alert('Ошибка загрузки данных');
    }
}

// Функция для отображения файлов
function displayFiles(items, path) {
    const fileList = document.getElementById('file-list');
    const currentPathElement = document.getElementById('current-path');
    
    currentPathElement.textContent = path;
    currentPath = path;
    
    fileList.innerHTML = '';
    
    if (items.length === 0) {
        fileList.innerHTML = '<div class="file-item">Директория пуста</div>';
        return;
    }
    
    // Сортируем: сначала папки, потом файлы
    items.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });
    
    items.forEach(item => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        let icon = '📄';
        if (item.type === 'directory') icon = '📁';
        if (item.name.endsWith('.jpg') || item.name.endsWith('.png')) icon = '🖼️';
        if (item.name.endsWith('.mp3') || item.name.endsWith('.wav')) icon = '🎵';
        if (item.name.endsWith('.mp4') || item.name.endsWith('.avi')) icon = '🎬';
        if (item.name.endsWith('.pdf')) icon = '📕';
        if (item.name.endsWith('.zip') || item.name.endsWith('.rar')) icon = '📦';
        
        const filePath = item.path === '.' ? '/' : item.path;
        const displayName = filePath === '/' ? item.name : item.name;
        
        fileItem.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-info">
                <div class="file-name">${displayName}</div>
                ${item.type !== 'directory' ? `<div class="file-size">${formatFileSize(item.size)}</div>` : ''}
            </div>
        `;
        
        fileItem.onclick = () => {
            if (item.type === 'directory') {
                history.push(path);
                const newPath = filePath === '/' ? `/${item.name}` : `${filePath}/${item.name}`;
                loadDirectory(newPath);
            } else {
                // Для файлов можно добавить просмотр/скачивание
                tg.showAlert(`Файл: ${item.name}\nРазмер: ${formatFileSize(item.size)}`);
            }
        };
        
        fileList.appendChild(fileItem);
    });
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
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('file-list').style.display = show ? 'none' : 'block';
}

// Обработчики событий
document.getElementById('refresh-btn').onclick = () => {
    loadDirectory(currentPath);
};

document.getElementById('back-btn').onclick = () => {
    if (history.length > 0) {
        const prevPath = history.pop();
        loadDirectory(prevPath);
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadDirectory('/');
});

// Отправка данных в Telegram
tg.ready();
