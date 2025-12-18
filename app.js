// app.js - СТРУКТУРНЫЙ ВАРИАНТ
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.hide();

let currentPath = '';  // Текущий путь, например: 'folder/subfolder'
let history = [];
let allItems = [];
let searchText = '';
let cachedItems = new Map(); // Кэш для ускорения

async function loadData() {
    showLoading(true);
    
    try {
        console.log('📥 Загрузка индекса...');
        const indexRes = await fetch('data/files_index.json?t=' + Date.now());
        const index = await indexRes.json();
        
        // Обновляем статистику
        document.getElementById('stats').textContent = 
            `${index.tf} файлов, ${index.td} папок`;
        
        console.log('📦 Загрузка частей...');
        // Загружаем ВСЕ части в память
        allItems = [];
        for (const part of index.p) {
            const partNum = part.n.toString().padStart(3, '0');
            const partRes = await fetch(`data/parts/part_${partNum}.json?t=${Date.now()}`);
            const partData = await partRes.json();
            allItems.push(...partData);
            
            // Выводим прогресс
            console.log(`Часть ${partNum}: ${partData.length} записей`);
        }
        
        console.log(`✅ Загружено ${allItems.length} элементов`);
        showCurrentDirectory();
        
    } catch (e) {
        console.error('❌ Ошибка загрузки:', e);
        document.getElementById('fileList').innerHTML = 
            `<div class="empty">Ошибка загрузки данных</div>`;
    }
    
    showLoading(false);
}

function showCurrentDirectory() {
    const pathEl = document.getElementById('path');
    const listEl = document.getElementById('fileList');
    
    // Обновляем отображение пути
    const displayPath = currentPath ? '/' + currentPath : '/';
    pathEl.textContent = displayPath;
    
    // Получаем элементы для текущей директории
    let items = getItemsForCurrentPath();
    
    console.log(`📂 Текущий путь: "${currentPath}"`);
    console.log(`📊 Найдено элементов: ${items.length}`);
    
    // Применяем поиск если есть
    if (searchText) {
        const query = searchText.toLowerCase();
        items = items.filter(item => 
            item.n.toLowerCase().includes(query)
        );
        console.log(`🔍 После поиска "${searchText}": ${items.length} элементов`);
    }
    
    // Сортируем: папки → файлы → по имени
    items.sort((a, b) => {
        if (a.t === 'd' && b.t !== 'd') return -1;
        if (a.t !== 'd' && b.t === 'd') return 1;
        return a.n.localeCompare(b.n);
    });
    
    // Отображаем
    if (items.length === 0) {
        const message = searchText 
            ? `По запросу "${searchText}" ничего не найдено` 
            : 'Эта папка пуста';
        listEl.innerHTML = `<div class="empty">${message}</div>`;
    } else {
        listEl.innerHTML = items.map(item => createItemHTML(item)).join('');
    }
    
    // Обновляем счетчик
    document.getElementById('counter').textContent = 
        `${items.length} элементов`;
    
    // Управляем кнопкой "Назад" в Telegram
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

function getItemsForCurrentPath() {
    // Используем кэш если есть
    const cacheKey = currentPath || 'root';
    if (cachedItems.has(cacheKey)) {
        return cachedItems.get(cacheKey);
    }
    
    const items = [];
    
    for (const item of allItems) {
        const itemPath = item.p || '';  // Путь элемента
        
        // Проверяем, находится ли элемент в текущей директории
        if (isItemInCurrentDirectory(itemPath, item.n)) {
            items.push(item);
        }
    }
    
    // Кэшируем результат
    cachedItems.set(cacheKey, items);
    return items;
}

function isItemInCurrentDirectory(itemPath, itemName) {
    if (!currentPath) {
        // Мы в корне
        // В корне показываем:
        // 1. Элементы с пустым путем (лежат прямо в корне)
        // 2. Элементы, которые находятся на первом уровне вложенности
        if (itemPath === '') {
            // Элемент в корне
            return true;
        }
        
        // Проверяем, что элемент на первом уровне (не содержит '/')
        // и его путь не пустой (это подпапка корня)
        if (!itemPath.includes('/')) {
            // Это элемент в подпапке корня - показываем только папку
            // Проверяем, что это сама папка, а не ее содержимое
            // Для этого проверяем, что путь содержит только имя папки
            const pathParts = itemPath.split('/');
            if (pathParts.length === 1) {
                // Это папка в корне - показываем
                return true;
            }
        }
        
        return false;
    }
    
    // Мы во вложенной директории
    // Элемент должен находиться непосредственно в currentPath
    
    // Пример: currentPath = "folder/subfolder"
    // Допустимые itemPath:
    // 1. "folder/subfolder" - элемент внутри этой папки
    // 2. "folder/subfolder/item" - НЕ показывать (это вложенная папка)
    
    // Проверяем, что itemPath совпадает с currentPath
    // (элемент находится прямо в этой папке)
    if (itemPath === currentPath) {
        return true;
    }
    
    // Проверяем, является ли элемент вложенной папкой
    // currentPath = "folder", itemPath = "folder/subfolder"
    // Нужно показать только саму папку "subfolder", а не ее содержимое
    if (itemPath.startsWith(currentPath + '/')) {
        // Получаем остаток пути после currentPath
        const remainingPath = itemPath.substring(currentPath.length + 1);
        
        // Проверяем, что это первый уровень вложенности
        // (не содержит '/')
        if (!remainingPath.includes('/')) {
            // Это папка внутри текущей директории - показываем
            return true;
        }
    }
    
    return false;
}

function createItemHTML(item) {
    const isDir = item.t === 'd';
    const icon = getIcon(item);
    const size = isDir ? '' : formatSize(item.s);
    const date = item.m ? formatDate(item.m) : '';
    
    return `
        <div class="file-item" onclick="clickItem('${escapeStr(item.n)}', '${item.t}', ${item.s || 0}, '${escapeStr(itemPathDisplay(item))}')">
            <div class="file-icon">${icon}</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(item.n)}</div>
                ${size || date ? `
                <div class="file-meta">
                    ${size ? `<span class="file-size">${size}</span>` : ''}
                    ${date ? `<span class="file-date">${date}</span>` : ''}
                </div>
                ` : ''}
            </div>
            ${isDir ? '<div class="dir-arrow">›</div>' : ''}
        </div>
    `;
}

function itemPathDisplay(item) {
    return item.p ? item.p + '/' + item.n : item.n;
}

function clickItem(name, type, size, fullPath) {
    if (type === 'd') {
        // Переход в папку
        history.push(currentPath);
        
        // Обновляем текущий путь
        if (!currentPath) {
            currentPath = name;  // Переход из корня
        } else {
            currentPath = currentPath + '/' + name;
        }
        
        console.log(`📂 Переход в: "${currentPath}"`);
        
        // Сбрасываем поиск
        searchText = '';
        document.getElementById('search').value = '';
        
        // Показываем новую директорию
        showCurrentDirectory();
    } else {
        // Информация о файле
        const path = fullPath ? `\n📁 Путь: ${fullPath}` : '';
        const date = '';
        tg.showAlert(`📄 ${name}${path}\n📦 Размер: ${formatSize(size)}${date}`);
    }
}

function goHome() {
    history = [];
    currentPath = '';
    searchText = '';
    document.getElementById('search').value = '';
    cachedItems.clear();
    showCurrentDirectory();
}

function goBack() {
    if (history.length > 0) {
        currentPath = history.pop();
        searchText = '';
        document.getElementById('search').value = '';
        showCurrentDirectory();
    }
}

function doSearch() {
    searchText = document.getElementById('search').value.trim();
    showCurrentDirectory();
}

function searchKeyPress(e) {
    if (e.key === 'Enter') doSearch();
}

function getIcon(item) {
    if (item.t === 'd') return '📁';
    
    const name = item.n.toLowerCase();
    if (name.endsWith('.ecfg')) return '⚙️';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return '🖼️';
    if (/\.(mp3|wav|ogg|flac)$/.test(name)) return '🎵';
    if (/\.(mp4|avi|mov|mkv)$/.test(name)) return '🎬';
    if (/\.(pdf)$/.test(name)) return '📕';
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return '📦';
    if (/\.(txt|md|ini|cfg|json|xml)$/.test(name)) return '📝';
    if (/\.(js|ts|py|java|cpp|html|css)$/.test(name)) return '📄';
    
    return '📄';
}

function formatSize(bytes) {
    if (!bytes) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let i = 0;
    while (bytes >= 1024 && i < 3) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
    });
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('fileList').style.display = show ? 'none' : 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeStr(text) {
    return text.replace(/'/g, "\\'")
               .replace(/"/g, '\\"')
               .replace(/\n/g, '\\n');
}

// Telegram Back Button
tg.BackButton.onClick(goBack);

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    loadData();
    
    // Дебаг информация
    console.log('🚀 Файловый менеджер загружен');
});
