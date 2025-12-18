class TelegramFileManager {
    constructor() {
        this.currentPath = '/';
        this.currentItems = [];
        this.allItems = [];
        this.history = [];
        this.indexData = null;
        this.loadedParts = new Set();
        
        this.initElements();
        this.bindEvents();
        this.loadIndex();
    }
    
    initElements() {
        this.elements = {
            fileList: document.getElementById('fileList'),
            currentPath: document.getElementById('currentPath'),
            backButton: document.getElementById('backButton'),
            searchInput: document.getElementById('searchInput'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            emptyState: document.getElementById('emptyState'),
            errorContainer: document.getElementById('errorContainer'),
            contextMenu: document.getElementById('contextMenu')
        };
    }
    
    bindEvents() {
        this.elements.backButton.addEventListener('click', () => this.goBack());
        this.elements.searchInput.addEventListener('input', (e) => this.searchFiles(e.target.value));
        
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
            }
        });
    }
    
    async loadIndex() {
        try {
            const response = await fetch('json_output/index.json');
            this.indexData = await response.json();
            
            await this.loadAllFiles();
        } catch (error) {
            this.showError('Не удалось загрузить индексный файл');
            console.error('Error loading index:', error);
        }
    }
    
    async loadAllFiles() {
        if (!this.indexData) return;
        
        this.elements.loadingIndicator.style.display = 'block';
        this.elements.fileList.innerHTML = '';
        
        try {
            const parts = this.indexData.parts;
            
            // Загружаем все части параллельно
            const promises = parts.map(async (part) => {
                if (this.loadedParts.has(part.file)) return;
                
                try {
                    const response = await fetch(`json_output/${part.file}`);
                    const data = await response.json();
                    
                    // Добавляем все файлы в общий список
                    data.data.forEach(item => {
                        // Нормализуем путь
                        item.path = item.path.replace(/\\/g, '/');
                        if (item.path.startsWith('./')) {
                            item.path = item.path.substring(2);
                        }
                        this.allItems.push(item);
                    });
                    
                    this.loadedParts.add(part.file);
                } catch (error) {
                    console.warn(`Failed to load ${part.file}:`, error);
                }
            });
            
            await Promise.all(promises);
            
            // Сортируем все элементы
            this.allItems.sort((a, b) => {
                if (a.is_dir && !b.is_dir) return -1;
                if (!a.is_dir && b.is_dir) return 1;
                return a.name.localeCompare(b.name);
            });
            
            this.navigateTo('/');
            
        } catch (error) {
            this.showError('Ошибка при загрузке файлов');
            console.error('Error loading files:', error);
        } finally {
            this.elements.loadingIndicator.style.display = 'none';
        }
    }
    
    navigateTo(path) {
        // Сохраняем текущий путь в историю
        if (this.currentPath !== path) {
            this.history.push(this.currentPath);
            this.updateBackButton();
        }
        
        this.currentPath = path;
        this.elements.currentPath.textContent = path === '/' ? '/' : `/${path}`;
        
        // Фильтруем элементы для текущего пути
        this.currentItems = this.allItems.filter(item => {
            const itemPath = item.path;
            const dirPath = itemPath.substring(0, itemPath.lastIndexOf('/'));
            
            if (item.is_dir) {
                if (path === '/') {
                    return !item.path.includes('/');
                } else {
                    return dirPath === path;
                }
            } else {
                if (path === '/') {
                    return !item.path.includes('/');
                } else {
                    return dirPath === path;
                }
            }
        });
        
        this.renderFileList();
    }
    
    goBack() {
        if (this.history.length > 0) {
            const previousPath = this.history.pop();
            this.currentPath = previousPath;
            this.navigateTo(previousPath);
            this.updateBackButton();
        }
    }
    
    updateBackButton() {
        const hasHistory = this.history.length > 0;
        this.elements.backButton.classList.toggle('visible', hasHistory);
    }
    
    renderFileList() {
        this.elements.fileList.innerHTML = '';
        
        if (this.currentItems.length === 0) {
            this.elements.emptyState.style.display = 'block';
            return;
        }
        
        this.elements.emptyState.style.display = 'none';
        
        // Группируем: сначала папки, потом файлы
        const folders = this.currentItems.filter(item => item.is_dir);
        const files = this.currentItems.filter(item => !item.is_dir);
        
        [...folders, ...files].forEach(item => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.dataset.path = item.path;
            li.dataset.isDir = item.is_dir;
            
            const icon = item.is_dir ? 'fa-folder folder-icon' : this.getFileIcon(item.extension);
            
            li.innerHTML = `
                <div class="file-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${this.escapeHtml(item.name)}</div>
                    <div class="file-info">
                        ${item.is_dir ? 
                            `<span>${item.items_count || 0} элементов</span>` : 
                            `<span class="file-size">${this.formatFileSize(item.size)}</span>`
                        }
                        <span>${this.formatDate(item.modified)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${!item.is_dir ? 
                        `<button class="action-button" data-action="download" title="Скачать">
                            <i class="fas fa-download"></i>
                        </button>` : 
                        ''
                    }
                    <button class="action-button" data-action="more" title="Еще">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            `;
            
            // Обработка клика на элементе
            li.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="download"]')) {
                    e.stopPropagation();
                    this.downloadFile(item);
                } else if (e.target.closest('[data-action="more"]')) {
                    e.stopPropagation();
                    this.showContextMenu(e, item);
                } else if (item.is_dir) {
                    const newPath = item.path || item.name;
                    this.navigateTo(newPath);
                } else {
                    this.showFileInfo(item);
                }
            });
            
            this.elements.fileList.appendChild(li);
        });
    }
    
    searchFiles(query) {
        if (!query.trim()) {
            this.renderFileList();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = this.allItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
        
        this.elements.fileList.innerHTML = '';
        
        if (filtered.length === 0) {
            this.elements.emptyState.innerHTML = `
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Ничего не найдено</p>
            `;
            this.elements.emptyState.style.display = 'block';
            return;
        }
        
        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = 'file-item';
            
            const icon = item.is_dir ? 'fa-folder folder-icon' : this.getFileIcon(item.extension);
            const path = item.path ? `/${item.path}` : '';
            
            li.innerHTML = `
                <div class="file-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${this.escapeHtml(item.name)}</div>
                    <div class="file-info">
                        <span>${path}</span>
                        ${!item.is_dir ? 
                            `<span class="file-size">${this.formatFileSize(item.size)}</span>` : 
                            ''
                        }
                    </div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                if (item.is_dir) {
                    const dirPath = item.path.substring(0, item.path.lastIndexOf('/'));
                    this.navigateTo(dirPath);
                } else {
                    this.showFileInfo(item);
                }
            });
            
            this.elements.fileList.appendChild(li);
        });
    }
    
    showContextMenu(event, item) {
        event.preventDefault();
        
        this.elements.contextMenu.style.display = 'block';
        this.elements.contextMenu.style.left = `${event.pageX}px`;
        this.elements.contextMenu.style.top = `${event.pageY}px`;
        
        this.elements.contextMenu.dataset.selectedPath = item.path;
        this.elements.contextMenu.dataset.isDir = item.is_dir;
        
        // Удаляем старые обработчики
        const items = this.elements.contextMenu.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            item.replaceWith(item.cloneNode(true));
        });
        
        // Добавляем новые обработчики
        this.elements.contextMenu.querySelectorAll('.context-menu-item').forEach(menuItem => {
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = menuItem.dataset.action;
                const selectedItem = this.allItems.find(i => i.path === this.elements.contextMenu.dataset.selectedPath);
                
                if (selectedItem) {
                    switch(action) {
                        case 'download':
                            if (!selectedItem.is_dir) {
                                this.downloadFile(selectedItem);
                            }
                            break;
                        case 'info':
                            this.showFileInfo(selectedItem);
                            break;
                        case 'share':
                            this.shareFile(selectedItem);
                            break;
                    }
                }
                
                this.hideContextMenu();
            });
        });
    }
    
    hideContextMenu() {
        this.elements.contextMenu.style.display = 'none';
    }
    
    downloadFile(item) {
        // В реальном приложении здесь будет ссылка на скачивание
        alert(`Скачивание файла: ${item.name}\n\nВ реальном приложении здесь будет работа с Telegram API для скачивания файлов.`);
        
        // Для демо можно использовать такой подход:
        if (item.hash) {
            const url = `https://raw.githubusercontent.com/ваш-username/ваш-репозиторий/main/json_output/${item.hash}.json`;
            window.open(url, '_blank');
        }
    }
    
    showFileInfo(item) {
        const info = `
            Имя: ${item.name}
            ${item.is_dir ? 'Тип: Папка' : `Тип: Файл (${item.extension || 'без расширения'})`}
            ${!item.is_dir ? `Размер: ${this.formatFileSize(item.size)}` : ''}
            Изменен: ${this.formatDate(item.modified, true)}
            ${item.hash ? `Хэш: ${item.hash}` : ''}
        `.trim().split('\n').map(line => `<p>${line}</p>`).join('');
        
        alert(`Информация о файле:\n\n${info.replace(/<[^>]*>/g, '')}`);
    }
    
    shareFile(item) {
        if (navigator.share) {
            navigator.share({
                title: item.name,
                text: `Файл: ${item.name}`,
                url: window.location.href
            });
        } else {
            alert(`Поделиться файлом: ${item.name}\n\nСсылка для Telegram: t.me/share/url?url=${encodeURIComponent(window.location.href)}`);
        }
    }
    
    getFileIcon(extension) {
        const iconMap = {
            '.pdf': 'fa-file-pdf',
            '.doc': 'fa-file-word',
            '.docx': 'fa-file-word',
            '.xls': 'fa-file-excel',
            '.xlsx': 'fa-file-excel',
            '.ppt': 'fa-file-powerpoint',
            '.pptx': 'fa-file-powerpoint',
            '.jpg': 'fa-file-image',
            '.jpeg': 'fa-file-image',
            '.png': 'fa-file-image',
            '.gif': 'fa-file-image',
            '.mp3': 'fa-file-audio',
            '.mp4': 'fa-file-video',
            '.avi': 'fa-file-video',
            '.mov': 'fa-file-video',
            '.zip': 'fa-file-archive',
            '.rar': 'fa-file-archive',
            '.7z': 'fa-file-archive',
            '.txt': 'fa-file-alt',
            '.js': 'fa-file-code',
            '.html': 'fa-file-code',
            '.css': 'fa-file-code',
            '.py': 'fa-file-code',
            '.json': 'fa-file-code'
        };
        
        return iconMap[extension] || 'fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(timestamp, full = false) {
        const date = new Date(timestamp * 1000);
        
        if (full) {
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const now = new Date();
        const diff = now - date;
        
        // Если сегодня
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
        }
        
        // Если в этом году
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('ru-RU', {month: 'short', day: 'numeric'});
        }
        
        return date.toLocaleDateString('ru-RU', {year: 'numeric', month: 'short', day: 'numeric'});
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        this.elements.errorContainer.textContent = message;
        this.elements.errorContainer.style.display = 'block';
        
        setTimeout(() => {
            this.elements.errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.fileManager = new TelegramFileManager();
    
    // Имитация Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        // Применяем тему Telegram
        document.documentElement.style.setProperty('--tg-theme-bg-color', Telegram.WebApp.backgroundColor);
        document.documentElement.style.setProperty('--tg-theme-text-color', Telegram.WebApp.textColor);
        document.documentElement.style.setProperty('--tg-theme-hint-color', Telegram.WebApp.hintColor);
        document.documentElement.style.setProperty('--tg-theme-link-color', Telegram.WebApp.linkColor);
        document.documentElement.style.setProperty('--tg-theme-button-color', Telegram.WebApp.buttonColor);
        document.documentElement.style.setProperty('--tg-theme-button-text-color', Telegram.WebApp.buttonTextColor);
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', Telegram.WebApp.secondaryBackgroundColor);
    }
});
