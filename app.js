// В начале app.js добавь:
let allData = null;  // Будет хранить ВСЕ данные

// Измени функцию loadApp:
async function loadApp() {
    showLoading(true);
    
    try {
        console.log("Загружаю структуру...");
        
        // Пробуем загрузить сжатый файл
        let response = await fetch("data/structure.json.gz");
        if (!response.ok) {
            // Если нет сжатого, пробуем обычный
            response = await fetch("data/structure.json");
            if (!response.ok) throw new Error("Не удалось загрузить данные");
        }
        
        // Если это gzip, распаковываем
        if (response.url.endsWith('.gz')) {
            const buffer = await response.arrayBuffer();
            const decompressed = await decompressGzip(buffer);
            allData = JSON.parse(decompressed);
        } else {
            allData = await response.json();
        }
        
        console.log("Данные загружены");
        
        // Обновляем статистику
        document.getElementById("stats").textContent = 
            `${allData.total_files} файлов, ${allData.total_folders} папок`;
        
        // Показываем корневую папку
        showFolder("");
        
    } catch (error) {
        console.error("Ошибка:", error);
        showError("Не удалось загрузить данные");
    }
    
    showLoading(false);
}

// Функция для распаковки gzip в браузере
async function decompressGzip(arrayBuffer) {
    if ('DecompressionStream' in window) {
        const stream = new Response(arrayBuffer).body;
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        return new Response(decompressedStream).text();
    }
    throw new Error("Браузер не поддерживает декомпрессию");
}

// Измени функцию showFolder:
async function showFolder(path) {
    showLoading(true);
    
    try {
        console.log("Показываю папку:", path || "Корень");
        
        currentPath = path;
        updatePathDisplay();
        
        // Берем данные из уже загруженной структуры
        const folderData = allData.data[path] || { folders: [], files: [] };
        currentData = folderData;
        
        displayFolderContents();
        updateBackButton();
        
    } catch (error) {
        console.error("Ошибка:", error);
        showError("Ошибка загрузки папки");
    }
    
    showLoading(false);
}
