// app.js - УЛЬТРА-КОМПАКТНЫЙ
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.hide();

let currentPath = '';
let history = [];
let allItems = [];
let searchText = '';

async function loadData() {
    showLoading(true);
    
    try {
        // Загружаем индекс
        const indexRes = await fetch('data/files_index.json?t=' + Date.now());
        const index = await indexRes.json();
        
        // Обновляем статистику
        document.getElementById('stats').textContent = 
            `${index.tf}ф ${index.td}п`;
        
        // Загружаем ВСЕ части
        allItems = [];
        for (const part of index.p) {
            const partRes = await fetch(`data/parts/part_${part.n.toString().padStart(3, '0')}.json?t=${Date.now()}`);
            const partData = await partRes.json();
            allItems.push(...partData);
        }
        
        console.log(`✅ Загружено ${allItems.length} элементов`);
        showCurrent();
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        document.getElementById('fileList').innerHTML = 
            `<div class="empty">Ошибка загрузки: ${e.message}</div>`;
    }
    
    showLoading(false);
}

function showCurrent() {
    const pathEl = document.getElementById('path');
    const listEl = document.getElementById('fileList');
    
    // Обновляем путь
    pathEl.textContent = currentPath || '/';
    
    // Фильтруем элементы для текущего пути
    let items = allItems.filter(item => {
        const itemPath = item.p || '';
        
        if (!currentPath) {
            // Корень: показываем элементы без пути или на первом уровне
            return itemPath === '' || !itemPath.includes('/');
        }
        
        // Для вложенных путей
        return itemPath === currentPath;
    });
    
    // Применяем поиск
    if (searchText) {
        const query = searchText.toLowerCase();
        items = items.filter(item => 
            item.n.toLowerCase().includes(query)
        );
    }
    
    // Сортируем: папки → файлы → по имени
    items.sort((a, b) => {
        if (a.t === 'd' && b.t !== 'd') return -1;
        if (a.t !== 'd' && b.t === 'd') return 1;
        return a.n.localeCompare(b.n);
    });
    
    // Отображаем
    if (items.length === 0) {
        listEl.innerHTML = `<div class="empty">${
            searchText ? `"${searchText}" не найдено` : 'Пусто'
        }</div>`;
    } else {
        listEl.innerHTML = items.map(item => `
            <div class="file-item" onclick="clickItem('${escapeStr(item.n)}', '${item.t}', ${item.s || 0})">
                <div class="file-icon">${getIcon(item)}</div>
                <div class="file-name">${escapeHtml(item.n)}</div>
                <div class="file-size">${item.t === 'f' ? formatSize(item.s) : ''}</div>
                ${item.t === 'd' ? '<div class="dir-arrow">›</div>' : ''}
            </div>
        `).join('');
    }
    
    // Обновляем счетчик
    document.getElementById('counter').textContent = 
        `${items.length} элементов`;
    
    // Кнопка назад
    if (history.length > 0) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

function getIcon(item) {
    if (item.t === 'd') return '📁';
    const ext = (item.e || '').toLowerCase();
    if (ext === 'ecfg') return '⚙️';
    if (['jpg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
    if (['mp4', 'avi', 'mov'].includes(ext)) return '🎬';
    if (ext === 'pdf') return '📕';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📄';
}

function clickItem(name, type, size) {
    if (type === 'd') {
        // Переход в папку
        history.push(currentPath);
        currentPath = currentPath ? `${currentPath}/${name}` : name;
        searchText = '';
        document.getElementById('search').value = '';
        showCurrent();
    } else {
        // Информация о файле
        tg.showAlert(`📄 ${name}\n📦 ${formatSize(size)}`);
    }
}

function goHome() {
    history = [];
    currentPath = '';
    searchText = '';
    document.getElementById('search').value = '';
    showCurrent();
}

function goBack() {
    if (history.length > 0) {
        currentPath = history.pop();
        showCurrent();
    }
}

function doSearch() {
    searchText = document.getElementById('search').value.trim();
    showCurrent();
}

function searchKeyPress(e) {
    if (e.key === 'Enter') doSearch();
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

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('fileList').style.display = show ? 'none' : 'block';
}

function escapeHtml(text) {
    return text.replace(/[&<>]/g, c => 
        ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
}

function escapeStr(text) {
    return text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

// Telegram Back Button
tg.BackButton.onClick(goBack);

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    loadData();
});
