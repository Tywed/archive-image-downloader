document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('download-image');
    button.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error('Не удалось получить активную вкладку.');
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    try {
                        const scriptElement = document.querySelector('script#__NEXT_DATA__');
                        const headerText = document.querySelector('.OneDocumentHeader_MutedText__GtsoV time');
                        const pathText = document.querySelector('.OneDocumentHeader-Path');

                        if (scriptElement && headerText && pathText) {
                            console.log('Найдены необходимые элементы на странице.');
                            const baseURL = window.location.origin;
                            const jsonData = JSON.parse(scriptElement.textContent);
                            const imageID = jsonData.props.pageProps.currentNode.id;
                            const fullImageURL = `${baseURL}/archive/api/image.jpg?id=${imageID}&type=original`;

                            const dateRange = Array.from(document.querySelectorAll('.OneDocumentHeader_MutedText__GtsoV time'))
                                .map(el => el.getAttribute('datetime'))
                                .join('-');

                            const fullTitle = `Метрическая книга ${dateRange} ${pathText.textContent.trim()}`;

                            console.log(`Скачивание изображения: ${fullImageURL} с названием: ${fullTitle}.jpg`);
                            const a = document.createElement('a');
                            a.href = fullImageURL;
                            a.download = `${fullTitle}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);

                            // Скачивание текстового файла с URL страницы
                            const pageUrl = window.location.href.split('?')[0]; 
                            const textBlob = new Blob([pageUrl], { type: 'text/plain' });
                            const textLink = document.createElement('a');
                            textLink.href = URL.createObjectURL(textBlob);
                            textLink.download = `${fullTitle}.txt`;
                            document.body.appendChild(textLink);
                            textLink.click();
                            document.body.removeChild(textLink);
                        } else {
                            console.error('Не удалось найти необходимые элементы на странице.');
                        }
                    } catch (err) {
                        console.error('Ошибка при выполнении скрипта:', err);
                    }
                },
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка выполнения скрипта:', chrome.runtime.lastError.message);
                } else {
                    console.log('Скрипт выполнен успешно.', results);
                }
            });
        });
    });
});