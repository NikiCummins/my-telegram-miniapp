class FileManager {
    constructor() {
        this.currentFolder = null;
        this.currentItems = [];
        this.allFolders = [];
        this.searchTerm = '';
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.history = [];
        
        this.initElements();
        this.bindEvents();
        this.loadIndex();
    }
    
    initElements() {
        this.elements = {
            backBtn: document.getElementById('backBtn'),
            pageTitle: document.getElementById('pageTitle'),
            currentPath: document.getElementById('currentPath'),
            searchInput: document.getElementById('searchInput'),
            searchContainer: document.getElementById('searchContainer'),
            loading: document.getElementById('loading'),
            itemsList: document.getElementById('itemsList'),
            emptyState: document.getElementById('emptyState'),
            error: document.getElementById('error'),
            contextMenu: document.getElementById('contextMenu'),
            pagination: document.getElementById('pagination'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            pageInfo: document.getElementById('pageInfo'),
            stats: document.getElementById('stats')
        };
    }
    
    bindEvents() {
        // Кнопка назад
        this.elements.backBtn.addEventListener('click', () => this.goBack());
        
        // Поиск
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.currentPage = 1;
            this.renderItems();
        });
        
        // Пагинация
        this.elements.prevPage.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderItems();
            }
        });
        
        this.elements.nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(this.currentItems.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderItems();
            }
        });
        
        // Контекстное меню
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideContextMenu();
        });
        
        // Закрытие контекстного меню при клике вне
        document.addEventListener('click', (e) => {
            if (!this.elements.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });
    }
    
    async loadIndex() {
        try {
            this.showLoading();
            
            // Загружаем основной индекс
            const response = await fetch('data/index.json');
            if (!response.ok) throw new Error('Не удалось загрузить индекс');
            
            const data = await response.json();
            this.allFolders = data.folders || [];
            
            this.elements.pageTitle.textContent = 'Файловый менеджер';
            this.elements.currentPath.textContent = '/';
            this.elements.stats.innerHTML = `<span>Папок: ${this.allFolders.length}</span>`;
            
            this.currentFolder = null;
            this.currentItems = this.allFolders;
            
            this.renderItems();
            this.hideLoading();
            
        } catch (error) {
            this.showError(`Ошибка загрузки: ${error.message}`);
            console.error('Error loading index:', error);
        }
    }
    
    async loadFolder(folderName) {
        try {
            this.showLoading();
            
            // Сохраняем текущее состояние в историю
            if (this.currentFolder !== null) {
                this.history.push({
                    folder: this.currentFolder,
                    items: this.currentItems,
                    page: this.currentPage,
                    search: this.searchTerm
                });
            }
            
            // Загружаем данные папки
            const safeName = folderName.replace(/ /g, '_').replace(/\//g, '_');
            const response = await fetch(`data/${safeName}.json`);
            
            if (!response.ok) {
                // Пробуем альтернативное имя файла
                const altResponse = await fetch(`data/folder_${this.getFolderIndex(folderName)}_${safeName}.json`);
                if (!altResponse.ok) throw new Error('Папка не найдена');
                
                const altData = await altResponse.json();
                this.currentItems = altData.items || [];
            } else {
                const data = await response.json();
                this.currentItems = data.items || [];
            }
            
            this.currentFolder = folderName;
            this.currentPage = 1;
            this.searchTerm = '';
            this.elements.searchInput.value = '';
            
            this.elements.pageTitle.textContent = folderName;
            this.elements.currentPath.textContent = `/${folderName}`;
            this.elements.stats.innerHTML = `<span>Элементов: ${this.currentItems.length}</span>`;
            
            this.elements.backBtn.classList.add('visible');
            
            this.renderItems();
            this.hideLoading();
            
        } catch (error) {
            this.showError(`Ошибка загрузки папки: ${error.message}`);
            console.error('Error loading folder:', error);
            this.goBack();
        }
    }
    
    goBack() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.currentFolder = prevState.folder;
            this.currentItems = prevState.items;
            this.currentPage = prevState.page;
            this.searchTerm = prevState.search;
            
            if (this.currentFolder === null) {
                this.elements.pageTitle.textContent = 'Файловый менеджер';
                this.elements.currentPath.textContent = '/';
                this.elements.stats.innerHTML = `<span>Папок: ${this.allFolders.length}</span>`;
                this.elements.backBtn.classList.remove('visible');
            } else {
                this.elements.pageTitle.textContent = this.currentFolder;
                this.elements.currentPath.textContent = `/${this.currentFolder}`;
                this.elements.stats.innerHTML = `<span>Элементов: ${this.currentItems.length}</span>`;
            }
            
            this.elements.searchInput.value = this.searchTerm;
            this.renderItems();
        } else {
            // Возврат к корневой папке
            this.currentFolder = null;
            this.currentItems = this.allFolders;
            this.currentPage = 1;
            this.searchTerm = '';
            
            this.elements.pageTitle.textContent = 'Файловый менеджер';
            this.elements.currentPath.textContent = '/';
            this.elements.stats.innerHTML = `<span>Папок: ${this.allFolders.length}</span>`;
            this.elements.searchInput.value = '';
            this.elements.backBtn.classList.remove('visible');
            
            this.renderItems();
        }
    }
    
    renderItems() {
        this.elements.itemsList.innerHTML = '';
        this.elements.emptyState.style.display = 'none';
        this.elements.error.style.display = 'none';
        
        // Фильтрация по поиску
        let filteredItems = this.currentItems;
        if (this.searchTerm) {
            filteredItems = this.currentItems.filter(item =>
                item.name.toLowerCase().includes(this.searchTerm)
            );
        }
        
        if (filteredItems.length === 0) {
            this.elements.emptyState.style.display = 'block';
            this.elements.pagination.style.display = 'none';
            return;
        }
        
        // Пагинация
        const totalPages = Math.ceil(filteredItems.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Отображение пагинации
        if (totalPages > 1) {
            this.elements.pagination.style.display = 'flex';
            this.elements.pageInfo.textContent = `Страница ${this.currentPage} из ${totalPages}`;
            this.elements.prevPage.disabled = this.currentPage === 1;
            this.elements.nextPage.disabled = this.currentPage === totalPages;
        } else {
            this.elements.pagination.style.display = 'none';
        }
        
        // Отображение элементов
        pageItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'item';
            li.dataset.name = item.name;
            li.dataset.isDir = item.is_dir;
            
            const icon = item.is_dir ? 'fa-folder folder-icon' : this.getFileIcon(item.extension);
            const size = item.size ? this.formatSize(item.size) : '';
            const count = item.is_dir && item.items_count ? 
                `<span class="item-count">${item.items_count}</span>` : '';
            
            li.innerHTML = `
                <div class="item-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="item-info">
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-details">
                        ${item.is_dir ? 'Папка' : `Файл • ${size}`}
                        ${count}
                    </div>
                </div>
            `;
            
            // Обработчики событий
            li.addEventListener('click', (e) => {
                if (e.target.closest('.item-count')) return;
                
                if (item.is_dir) {
                    if (this.currentFolder === null) {
                        this.loadFolder(item.name);
                    } else {
                        // Для вложенных папок можно добавить рекурсивную загрузку
                        alert(`Папка: ${item.name}\n\nДля полной рекурсивной навигации нужна полная структура JSON.`);
                    }
                } else {
                    this.showFileInfo(item);
                }
            });
            
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item);
            });
            
            this.elements.itemsList.appendChild(li);
        });
    }
    
    showContextMenu(e, item) {
        const menu = this.elements.contextMenu;
        
        // Позиционирование
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.style.display = 'block';
        
        // Обновление действий
        const openItem = menu.querySelector('[data-action="open"]');
        const downloadItem = menu.querySelector('[data-action="download"]');
        
        if (item.is_dir) {
            openItem.style.display = 'block';
            openItem.onclick = () => {
                if (this.currentFolder === null) {
                    this.loadFolder(item.name);
                }
                this.hideContextMenu();
            };
            
            downloadItem.style.display = 'none';
        } else {
            openItem.style.display = 'none';
            downloadItem.style.display = 'block';
            downloadItem.onclick = () => {
                this.downloadFile(item);
                this.hideContextMenu();
            };
        }
        
        // Информация
        menu.querySelector('[data-action="info"]').onclick = () => {
            this.showFileInfo(item);
            this.hideContextMenu();
        };
    }
    
    hideContextMenu() {
        this.elements.contextMenu.style.display = 'none';
    }
    
    showFileInfo(item) {
        let info = `<strong>${item.name}</strong>\n`;
        info += `Тип: ${item.is_dir ? 'Папка' : 'Файл'}\n`;
        
        if (!item.is_dir) {
            info += `Размер: ${this.formatSize(item.size)}\n`;
            if (item.extension) info += `Расширение: ${item.extension}\n`;
            if (item.modified) {
                const date = new Date(item.modified * 1000);
                info += `Изменен: ${date.toLocaleDateString('ru-RU')}\n`;
            }
        }
        
        if (item.is_dir && item.items_count) {
            info += `Элементов: ${item.items_count}\n`;
        }
        
        if (item.path) {
            info += `Путь: ${item.path}\n`;
        }
        
        alert(info);
    }
    
    downloadFile(item) {
        if (this.currentFolder && !item.is_dir) {
            // В реальном приложении здесь будет ссылка на файл
            alert(`Скачивание файла: ${item.name}\n\nИз папки: ${this.currentFolder}\n\nВ реальном приложении здесь будет работа с Telegram API.`);
            
            // Демо: открываем в новой вкладке (если есть URL)
            if (item.url) {
                window.open(item.url, '_blank');
            }
        }
    }
    
    getFileIcon(extension) {
        const icons = {
            '.txt': 'fa-file-alt',
            '.pdf': 'fa-file-pdf',
            '.doc': 'fa-file-word',
            '.docx': 'fa-file-word',
            '.xls': 'fa-file-excel',
            '.xlsx': 'fa-file-excel',
            '.jpg': 'fa-file-image',
            '.jpeg': 'fa-file-image',
            '.png': 'fa-file-image',
            '.gif': 'fa-file-image',
            '.mp3': 'fa-file-audio',
            '.mp4': 'fa-file-video',
            '.zip': 'fa-file-archive',
            '.rar': 'fa-file-archive',
            '.js': 'fa-file-code',
            '.html': 'fa-file-code',
            '.css': 'fa-file-code',
            '.py': 'fa-file-code',
            '.json': 'fa-file-code'
        };
        
        return icons[extension] || 'fa-file';
    }
    
    formatSize(bytes) {
        if (!bytes) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    getFolderIndex(folderName) {
        return this.allFolders.findIndex(f => f.name === folderName) + 1;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        this.elements.loading.style.display = 'block';
        this.elements.itemsList.innerHTML = '';
        this.elements.emptyState.style.display = 'none';
        this.elements.error.style.display = 'none';
    }
    
    hideLoading() {
        this.elements.loading.style.display = 'none';
    }
    
    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.style.display = 'block';
        this.elements.loading.style.display = 'none';
        
        setTimeout(() => {
            this.elements.error.style.display = 'none';
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.fileManager = new FileManager();
    
    // Интеграция с Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        // Применяем тему Telegram
        applyTelegramTheme();
        
        // Слушаем изменения темы
        Telegram.WebApp.onEvent('themeChanged', applyTelegramTheme);
    }
    
    function applyTelegramTheme() {
        if (window.Telegram && window.Telegram.WebApp) {
            document.documentElement.style.setProperty('--tg-bg', Telegram.WebApp.backgroundColor);
            document.documentElement.style.setProperty('--tg-text', Telegram.WebApp.textColor);
            document.documentElement.style.setProperty('--tg-hint', Telegram.WebApp.hintColor);
            document.documentElement.style.setProperty('--tg-link', Telegram.WebApp.linkColor);
            document.documentElement.style.setProperty('--tg-button', Telegram.WebApp.buttonColor);
            document.documentElement.style.setProperty('--tg-button-text', Telegram.WebApp.buttonTextColor);
            document.documentElement.style.setProperty('--tg-secondary', Telegram.WebApp.secondaryBackgroundColor);
        }
    }
});
