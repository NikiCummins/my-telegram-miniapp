// Функция для загрузки структуры директории
async function loadDirectory(path = '/') {
    try {
        showLoading(true);
        
        console.log('Загрузка данных для пути:', path);
        
        // Загружаем JSON с данными о файлах
        const response = await fetch(`data/files.json?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Все данные загружены:', data.files.length, 'элементов');
        
        if (!data.files || !Array.isArray(data.files)) {
            throw new Error('Некорректная структура данных');
        }
        
        // Фильтруем файлы для текущего пути
        const items = data.files.filter(item => {
            // Нормализуем путь элемента
            const itemPath = item.path === '.' ? '/' : '/' + item.path;
            const normalizedCurrentPath = path === '/' ? '/' : path;
            
            console.log('Проверка элемента:', {
                name: item.name,
                itemPath: itemPath,
                currentPath: normalizedCurrentPath,
                type: item.type
            });
            
            // Если элемент находится в текущей директории
            if (itemPath === normalizedCurrentPath) {
                console.log('Элемент в текущей директории:', item.name);
                return true;
            }
            
            // Если текущий путь - корень
            if (normalizedCurrentPath === '/') {
                // В корне показываем только элементы с path = '.' или '/'
                return itemPath === '/' || item.path === '.';
            }
            
            // Для вложенных папок: элемент должен начинаться с текущего пути + '/'
            // и быть непосредственно внутри (не глубже)
            if (itemPath.startsWith(normalizedCurrentPath + '/')) {
                const remainingPath = itemPath.substring(normalizedCurrentPath.length + 1);
                // Проверяем, что элемент находится непосредственно внутри (нет дополнительных '/')
                if (!remainingPath.includes('/')) {
                    console.log('Элемент непосредственно внутри:', item.name);
                    return true;
                }
            }
            
            return false;
        });
        
        console.log('Найдено элементов для отображения:', items.length);
        displayFiles(items, path);
        showLoading(false);
        
    } catch (error) {
        console.error('Ошибка загрузки директории:', error);
        showLoading(false);
        showError(`Ошибка: ${error.message}`);
    }
}
