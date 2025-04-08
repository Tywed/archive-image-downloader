document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('download-image');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const downloadTextCheckbox = document.getElementById('download-text');

    // Загрузка сохраненных настроек
    chrome.storage.sync.get(['downloadText'], (result) => {
        if (result.downloadText !== undefined) {
            downloadTextCheckbox.checked = result.downloadText;
        }
    });

    // Сохранение настроек при изменении
    downloadTextCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ downloadText: downloadTextCheckbox.checked });
    });

    // Функция для обновления состояния UI
    const updateUI = (isValid, message) => {
        statusDot.className = `status-dot ${isValid ? 'valid' : 'invalid'}`;
        statusText.textContent = message;
        button.disabled = !isValid;
    };

    // Проверка текущей вкладки
    const checkCurrentTab = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                updateUI(false, 'Не удалось получить активную вкладку');
                return;
            }

            const currentTab = tabs[0];
            if (!currentTab.url.includes('yandex.ru')) {
                updateUI(false, 'Откройте страницу Яндекс Архива');
                return;
            }

            // Проверка наличия необходимых элементов на странице
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: () => {
                    const scriptElement = document.querySelector('script#__NEXT_DATA__');
                    const headerText = document.querySelector('.OneDocumentHeader_MutedText___AMqy');
                    const pathText = document.querySelector('.OneDocumentHeader-Path');
                    const markupText = document.querySelector('.MarkupLayout_TextAreasWrapper__XEHcA');
                    return {
                        isValid: !!(scriptElement && headerText && pathText && markupText),
                        message: scriptElement && headerText && pathText && markupText 
                            ? 'Страница готова к скачиванию' 
                            : 'Откройте страницу с нужным изображением из Яндекс Архива'
                    };
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    updateUI(false, 'Ошибка проверки страницы');
                    return;
                }
                const { isValid, message } = results[0].result;
                updateUI(isValid, message);
            });
        });
    };

    // Проверяем состояние при открытии popup
    checkCurrentTab();

    // Обработчик нажатия на кнопку
    button.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                updateUI(false, 'Не удалось получить активную вкладку');
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (shouldDownloadText) => {
                    try {
                        const scriptElement = document.querySelector('script#__NEXT_DATA__');
                        const headerText = document.querySelector('.OneDocumentHeader_MutedText___AMqy');
                        const pathText = document.querySelector('.OneDocumentHeader-Path');
                        const markupText = document.querySelector('.MarkupLayout_TextAreasWrapper__XEHcA');

                        if (scriptElement && headerText && pathText && markupText) {
                            const baseURL = window.location.origin;
                            const jsonData = JSON.parse(scriptElement.textContent);
                            const imageID = jsonData.props.pageProps.currentNode.id;
                            
                            const fullImageURL = `${baseURL}/archive/api/image?id=${imageID}&type=original`;

                            const dateRange = Array.from(headerText.querySelectorAll('time'))
                                .map(el => el.getAttribute('datetime'))
                                .join('-');

                            const fullTitle = `Метрическая книга ${dateRange} ${pathText.textContent.trim()}`;

                            const a = document.createElement('a');
                            a.href = fullImageURL;
                            a.download = `${fullTitle}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);

                            if (shouldDownloadText) {
                                const pageUrl = window.location.href.split('?')[0];
                                
                                // Извлекаем распознанный текст
                                const recognizedText = Array.from(markupText.querySelectorAll('.MarkupTextsViewer_RegionsListItem_Readonly__g3lYR'))
                                    .map(el => el.textContent.trim())
                                    .filter(text => text.length > 0)
                                    .join('\n');

                                // Формируем содержимое текстового файла
                                const textContent = `${pageUrl}\n\nРаспознанный текст:\n${recognizedText}`;
                                
                                const textBlob = new Blob([textContent], { type: 'text/plain' });
                                const textLink = document.createElement('a');
                                textLink.href = URL.createObjectURL(textBlob);
                                textLink.download = `${fullTitle}.txt`;
                                document.body.appendChild(textLink);
                                textLink.click();
                                document.body.removeChild(textLink);
                            }
                            return true;
                        }
                        return false;
                    } catch (err) {
                        console.error('Ошибка при выполнении скрипта:', err);
                        return false;
                    }
                },
                args: [downloadTextCheckbox.checked]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    updateUI(false, 'Ошибка скачивания');
                } else {
                    const success = results[0].result;
                    if (success) {
                        updateUI(true, 'Изображение скачано');
                        setTimeout(checkCurrentTab, 2000);
                    } else {
                        updateUI(false, 'Ошибка скачивания');
                    }
                }
            });
        });
    });
});