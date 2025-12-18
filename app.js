// Telegram
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние
let currentPath = '';
let history = [];
let searchQuery = '';
let allData = null;

// Загрузка данных
async function loadData() {
    showLoading(true);
    
    try {
        console.log('Загрузка данных...');
        
        // Загружаем ОДИН JSON файл
        const response = await fetch('data/files.json');
        if (!response.ok) {
            throw new Error('Не удалось загрузить файлы');
        }
        
        allData = await response.json();
        console.log('Данные загружены:', allData);
        
        // Обновляем статистику
        document.getElementById('stats').textContent = 
            `${allData.total_files} файлов, ${allData.total_folders} папок`;
        
        // Показываем корневую папку
        showFolder('');
        
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Ошибка загрузки данных');
    }
    
    showLoading(false);
}

// Показать папку
function showFolder(path) {
    currentPath = path;
    
    // Обновляем путь
    document.getElementById('path').textContent = 
        path ? '/' + path.replace(/\//g, ' / ') : '/';
    
    // Получаем папки и файлы для этого пути
    const folders = allData.folders[path] || [];
    const files = allData.files[path] || [];
    
    console.log(`Папка "${path || 'корень'}": ${folders.length} папок, ${files.length} файлов`);
    
    // Фильтруем по поиску если есть
    let showFolders = [...folders];
    let showFiles = [...files];
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        showFolders = folders.filter(name => name.toLowerCase().includes(query));
        showFiles = files.filter(file => file.n.toLowerCase().includes(query));
    }
    
    // Отображаем
    displayItems(showFolders, showFiles);
    
    // Кнопка назад
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Отобразить элементы
function displayItems(folders, files) {
    const listEl = document.getElementById('list');
    
    if (folders.length === 0 && files.length === 0) {
        const message = searchQuery 
            ? `По запросу "${searchQuery}" ничего не найдено`
            : 'Папка пуста';
        
        listEl.innerHTML = `<div class="empty">${message}</div>`;
        return;
    }
    
    let html = '';
    
    // Папки
    folders.forEach(folderName => {
        html += `
            <div class="item" onclick="enterFolder('${escape(folderName)}')">
                <div class="icon">📁</div>
                <div class="name">${escapeHtml(folderName)}</div>
                <div class="size">Папка</div>
            </div>
        `;
    });
    
    // Файлы
    files.forEach(file => {
        const icon = getIcon(file.n, file.e);
        const size = formatSize(file.s);
        
        html += `
            <div class="item" onclick="showFile(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                <div class="icon">${icon}</div>
                <div class="name">${escapeHtml(file.n)}</div>
                <div class="size">${size}</div>
            </div>
        `;
    });
    
    listEl.innerHTML = html;
}

// Войти в папку
function enterFolder(folderName) {
    // Сохраняем историю
    history.push(currentPath);
    
    // Новый путь
    let newPath = '';
    if (currentPath === '') {
        newPath = folderName;
    } else {
        newPath = currentPath + '/' + folderName;
    }
    
    // Сбрасываем поиск
    searchQuery = '';
    document.getElementById('search').value = '';
    
    // Показываем папку
    showFolder(newPath);
}

// Назад
function goBack() {
    if (history.length > 0) {
        const prevPath = history.pop();
        searchQuery = '';
        document.getElementById('search').value = '';
        showFolder(prevPath);
    }
}

// Домой
function goHome() {
    history = [];
    searchQuery = '';
    document.getElementById('search').value = '';
    showFolder('');
}

// Поиск
function doSearch() {
    searchQuery = document.getElementById('search').value.trim();
    showFolder(currentPath);
}

function searchKey(e) {
    if (e.key === 'Enter') doSearch();
}

// Показать информацию о файле
function showFile(file) {
    const size = formatSize(file.s);
    const date = file.m ? new Date(file.m * 1000).toLocaleDateString('ru-RU') : '';
    const path = currentPath ? '/' + currentPath : '/';
    
    let message = `📄 ${file.n}\n\n📦 Размер: ${size}\n📁 Путь: ${path}`;
    if (date) message += `\n📅 Изменен: ${date}`;
    if (file.e) message += `\n🔤 Расширение: .${file.e}`;
    
    tg.showAlert(message);
}

// Вспомогательные функции
function getIcon(filename, ext) {
    const name = filename.toLowerCase();
    
    if (ext === 'ecfg' || name.endsWith('.ecfg')) return '⚙️';
    if (/(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return '🖼️';
    if (/(mp3|wav|ogg|flac)$/i.test(name)) return '🎵';
    if (/(mp4|avi|mov|mkv)$/i.test(name)) return '🎬';
    if (name.endsWith('.pdf')) return '📕';
    if (/(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
    
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

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('list').style.display = show ? 'none' : 'block';
}

function showError(message) {
    document.getElementById('list').innerHTML = 
        `<div class="empty" style="color:red">❌ ${message}</div>`;
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
    loadData();
});
