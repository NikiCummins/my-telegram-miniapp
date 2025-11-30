function sendDataToBot() {
    const data = {
        action: "button_click",
        button_id: "download_btn",
        file_id: 5,
        user_id: tg.initDataUnsafe.user?.id,
        timestamp: new Date().toISOString(),
        custom_data: {
            category: "firmware",
            version: "2.1.4"
        }
    };
    
    // Отправляем данные боту
    tg.sendData(JSON.stringify(data));
    
    // Закрываем Mini App (опционально)
    // tg.close();
}
