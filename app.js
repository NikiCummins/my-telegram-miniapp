class FileManager {
    constructor() {
        this.currentFolder = null;
        this.currentItems = [];
        this.allFolders = [];
        this.searchTerm = '';
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.history = [];
        this.dataBaseUrl = window.location.href.includes('github.io') 
            ? window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '')
            : './';
        
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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideContextMenu();
        });
    }
    
    async loadIndex() {
        try {
            this.showLoading();
            console.log('Начинаю загрузку index.json...');
            
            // Пробуем разные пути для index.json
            const pathsToTry = [
                'data/index.json',
                './data/index.json',
                'index.json',
                'telegram-file-manager/data/index.json'
            ];
            
            let response = null;
            let lastError = null;
            
            for (const path of pathsToTry) {
                try {
                    console.log(`Пробую загрузить: ${path}`);
                    response = await fetch(path);
                    if (response.ok) {
                        console.log(`Успешно загружено с: ${path}`);
                        break;
                    }
                } catch (err) {
                    lastError = err;
                    console.log(`Не удалось загрузить с ${path}:`, err);
                }
            }
            
            if (!response || !response.ok) {
                throw new Error('Не удалось загрузить index.json ни с одного пути');
            }
            
            const data = await response.json();
            console.log('Данные index.json:', data);
            
            this.allFolders = data.folders || [];
            
            if (this.allFolders.length === 0) {
                // Если folders нет, пробуем получить папки из других полей
                if (data.total_folders && data.folders_list) {
                    this.allFolders = data.folders_list;
                } else if (data.directories) {
                    this.allFolders = data.directories.map(name => ({ name, is_dir: true }));
                }
            }
            
            console.log(`Найдено папок: ${this.allFolders.length}`);
            
            this.elements.pageTitle.textContent = 'Файловый менеджер';
            this.elements.currentPath.textContent = '/';
            this.elements.stats.innerHTML = `<span>Папок: ${this.allFolders.length}</span>`;
            
            this.currentFolder = null;
            this.currentItems = this.allFolders;
            
            this.renderItems();
            this.hideLoading();
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showError(`Ошибка загрузки: ${error.message}. Проверьте консоль браузера.`);
            this.hideLoading();
        }
    }
    
    async loadFolder(folderName) {
        try {
            this.showLoading();
            console.log(`Загружаю папку: ${folderName}`);
            
            // Сохраняем текущее состояние в историю
            if (this.currentFolder !== null) {
                this.history.push({
                    folder: this.currentFolder,
                    items: this.currentItems,
                    page: this.currentPage,
                    search: this.searchTerm
                });
            }
            
            // Пробуем разные варианты имен файлов
            const safeName = this.sanitizeFileName(folderName);
            const pathsToTry = [
                `data/${safeName}.json`,
                `data/folder_${safeName}.json`,
                `data/${folderName}.json`,
                `data/${folderName.replace(/ /g, '_')}.json`,
                `./data/${safeName}.json`,
                `./data/${folderName}.json`
            ];
            
            // Если у нас есть индекс папки, пробуем его использовать
            const folderIndex = this.getFolderIndex(folderName);
            if (folderIndex > 0) {
                pathsToTry.unshift(`data/folder_${folderIndex.toString().padStart(3, '0')}_${safeName}.json`);
            }
            
            let response = null;
            let folderData = null;
            
            for (const path of pathsToTry) {
                try {
                    console.log(`Пробую загрузить папку с: ${path}`);
                    response = await fetch(path);
                    if (response.ok) {
                        folderData = await response.json();
                        console.log(`Успешно загружена папка с: ${path}`);
                        break;
                    }
                } catch (err) {
                    console.log(`Не удалось загрузить с ${path}:`, err);
                }
            }
            
            if (!folderData) {
                // Если не нашли файл, создаем демо-данные
                console.log('Создаю демо-данные для папки');
                folderData = {
                    items: [
                        { name: 'file1.txt', is_dir: false, size: 1024, extension: '.txt' },
                        { name: 'file2.jpg', is_dir: false, size: 204800, extension: '.jpg' },
                        { name: 'subfolder', is_dir: true },
                        { name: 'document.pdf', is_dir: false, size: 512000, extension: '.pdf' }
                    ]
                };
            }
            
            this.currentItems = folderData.items || [];
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
            console.error('Ошибка загрузки папки:', error);
            this.showError(`Ошибка загрузки папки: ${error.message}`);
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
                item.name && item.name.toLowerCase().includes(this.searchTerm)
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
                    <div class="item-name">${this.escapeHtml(item.name || 'Без имени')}</div>
                    <div class="item-details">
                        ${item.is_dir ? 'Папка' : `Файл${size ? ' • ' + size : ''}`}
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
                        this.showFileInfo(item);
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
        menu.style.left = `${Math.min(e.pageX, window.innerWidth - 200)}px`;
        menu.style.top = `${Math.min(e.pageY, window.innerHeight - 200)}px`;
        menu.style.display = 'block';
        
        // Обновление действий
        const openItem = menu.querySelector('[data-action="open"]');
        const downloadItem = menu.querySelector('[data-action="download"]');
        
        if (item.is_dir && this.currentFolder === null) {
            openItem.style.display = 'flex';
            openItem.onclick = () => {
                this.loadFolder(item.name);
                this.hideContextMenu();
            };
        } else {
            openItem.style.display = 'none';
        }
        
        if (!item.is_dir) {
            downloadItem.style.display = 'flex';
            downloadItem.onclick = () => {
                this.downloadFile(item);
                this.hideContextMenu();
            };
        } else {
            downloadItem.style.display = 'none';
        }
        
        // Информация
        const infoItem = menu.querySelector('[data-action="info"]');
        infoItem.onclick = () => {
            this.showFileInfo(item);
            this.hideContextMenu();
        };
        
        // Закрытие меню при клике вне
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    this.hideContextMenu();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    hideContextMenu() {
        this.elements.contextMenu.style.display = 'none';
    }
    
    showFileInfo(item) {
        let info = `<strong>${item.name || 'Без имени'}</strong>\n`;
        info += `Тип: ${item.is_dir ? '📁 Папка' : '📄 Файл'}\n`;
        
        if (!item.is_dir) {
            if (item.size) info += `Размер: ${this.formatSize(item.size)}\n`;
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
        alert(`📥 Скачивание файла:\n\nФайл: ${item.name}\nРазмер: ${this.formatSize(item.size)}\n\nВ демо-режиме скачивание не доступно.`);
    }
    
    sanitizeFileName(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 50);
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
            '.7z': 'fa-file-archive',
            '.js': 'fa-file-code',
            '.html': 'fa-file-code',
            '.css': 'fa-file-code',
            '.py': 'fa-file-code',
            '.json': 'fa-file-code'
        };
        
        return icons[extension] || 'fa-file';
    }
    
    formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    getFolderIndex(folderName) {
        return this.allFolders.findIndex(f => f.name === folderName) + 1;
    }
    
    escapeHtml(text) {
        if (!text) return '';
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
    console.log('DOM загружен, инициализирую FileManager...');
    window.fileManager = new FileManager();
    
    // Добавляем отладочную информацию
    console.log('Текущий URL:', window.location.href);
    console.log('Путь:', window.location.pathname);
    
    // Интеграция с Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram WebApp обнаружен');
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        applyTelegramTheme();
        
        Telegram.WebApp.onEvent('themeChanged', applyTelegramTheme);
    } else {
        console.log('Telegram WebApp не обнаружен, работаем в браузере');
    }
    
    function applyTelegramTheme() {
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Применяю тему Telegram');
            const colors = {
                '--tg-bg': Telegram.WebApp.backgroundColor,
                '--tg-text': Telegram.WebApp.textColor,
                '--tg-hint': Telegram.WebApp.hintColor,
                '--tg-link': Telegram.WebApp.linkColor,
                '--tg-button': Telegram.WebApp.buttonColor,
                '--tg-button-text': Telegram.WebApp.buttonTextColor,
                '--tg-secondary': Telegram.WebApp.secondaryBackgroundColor
            };
            
            Object.entries(colors).forEach(([property, value]) => {
                document.documentElement.style.setProperty(property, value);
            });
        }
    }
    
    // Добавляем кнопку для отладки
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Отладка';
    debugBtn.style.position = 'fixed';
    debugBtn.style.bottom = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.zIndex = '1000';
    debugBtn.style.padding = '5px 10px';
    debugBtn.style.background = '#007bff';
    debugBtn.style.color = 'white';
    debugBtn.style.border = 'none';
    debugBtn.style.borderRadius = '5px';
    debugBtn.style.cursor = 'pointer';
    debugBtn.onclick = () => {
        console.log('Состояние приложения:', window.fileManager);
        alert('Проверьте консоль разработчика (F12) для отладочной информации');
    };
    document.body.appendChild(debugBtn);
});
