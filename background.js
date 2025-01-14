const defaultSettings = {
    voice: null,
    speed: 1,
    volume: 1,
    pitch: 1
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ settings: defaultSettings });
    chrome.contextMenus.create({
        id: "ttsContextMenuMK",
        title: "Read Aloud Selected Text",
        contexts: ["selection"],
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ttsContextMenuMK" && info.selectionText) {
        chrome.storage.sync.get("settings", ({ settings }) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return window.speechSynthesis.getVoices();
                }
            }).then((voices) => {
                const voiceResults = voices[0].result;
                const selectedVoice = voiceResults.find(v => v.name === settings.voice);
                const isGoogleVoice = selectedVoice?.voiceURI.includes('Google') ?? false;

                
                if (isGoogleVoice) {
                    chrome.scripting.insertCSS({
                        target: { tabId: tab.id },
                        css: `
                            .tts-highlight { 
                                background-color: transparent !important;
                                color: inherit !important;
                            }
                            .tts-word {
                                background-color: transparent !important;
                                color: inherit !important;
                            }
                        `
                    });
                } else {
                    
                    chrome.scripting.insertCSS({
                        target: { tabId: tab.id },
                        css: `.tts-highlight { background-color: orange !important; color: black !important;}`
                    });
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['controlPlayer.js']
                }).then(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: async (text, settings) => {
                            let selectedVoice = null;
                            
                            function initializeVoice() {
                                const voices = speechSynthesis.getVoices();
                                if (voices.length) {
                                    selectedVoice = voices.find(v => v.name === settings.voice) || voices[0];
                                    return selectedVoice;
                                }
                                return null;
                            }

                            selectedVoice = initializeVoice();
                            if (!selectedVoice) {
                                await new Promise(resolve => {
                                    speechSynthesis.onvoiceschanged = () => {
                                        selectedVoice = initializeVoice();
                                        resolve();
                                    };
                                });
                            }

                            const isGoogleVoice = selectedVoice?.voiceURI.includes('Google') ?? false;

                            function cleanupExisting() {
                                speechSynthesis.cancel();
                                const existingSpans = document.querySelectorAll('.tts-word');
                                existingSpans.forEach(span => {
                                    span.classList.remove('tts-highlight');
                                    const textNode = document.createTextNode(span.textContent);
                                    if (span.parentNode) {
                                        span.parentNode.replaceChild(textNode, span);
                                    }
                                });
                                document.normalize();
                            }

                            cleanupExisting();

                            function findSelectedNode() {
                                const selection = window.getSelection();
                                if (!selection.rangeCount) return null;

                                const range = selection.getRangeAt(0);
                                let currentNode = range.startContainer;

                                while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
                                    currentNode = currentNode.parentNode;
                                }

                                window.ttsOriginalElement = currentNode.cloneNode(true);
                                window.ttsModifiedElement = currentNode;

                                return { range, selectedElement: currentNode };
                            }

                            const selectionInfo = findSelectedNode();
                            if (!selectionInfo) return;

                            function wrapWordsWithSpans(selectionInfo) {
                                const content = selectionInfo.range.extractContents();
                                const words = content.textContent.split(/\s+/);
                                const fragment = document.createDocumentFragment();

                                words.forEach((word, index) => {
                                    if (word) {
                                        const span = document.createElement('span');
                                        span.textContent = word;
                                        
                                        span.className = isGoogleVoice ? 'tts-word-no-highlight' : 'tts-word';
                                        fragment.appendChild(span);
                                        if (index < words.length - 1) fragment.appendChild(document.createTextNode(' '));
                                    }
                                });

                                selectionInfo.range.insertNode(fragment);
                                return Array.from(document.querySelectorAll(isGoogleVoice ? '.tts-word-no-highlight' : '.tts-word'));
                            }

                            const wordSpans = wrapWordsWithSpans(selectionInfo);
                            let currentWordIndex = 0;

                            const utteranceQueue = [];
                            const chunkSize = 200;
                            let finalUtterance = null;

                            for (let i = 0; i < text.length; i += chunkSize) {
                                const chunk = text.slice(i, i + chunkSize);
                                const isLastChunk = (i + chunkSize >= text.length);
                                const utterance = new SpeechSynthesisUtterance(chunk);

                                utterance.voice = selectedVoice;
                                utterance.rate = settings.speed;
                                utterance.volume = settings.volume;
                                utterance.pitch = settings.pitch;

                                
                                if (!isGoogleVoice) {
                                    utterance.onboundary = (event) => {
                                        if (event.name === "word") {
                                            wordSpans[currentWordIndex - 1]?.classList.remove("tts-highlight");
                                            wordSpans[currentWordIndex]?.classList.add("tts-highlight");
                                            currentWordIndex++;
                                        }
                                    };
                                }

                                if (isLastChunk) {
                                    finalUtterance = utterance;
                                }

                                utteranceQueue.push(utterance);
                            }

                            if (finalUtterance) {
                                const originalOnEnd = finalUtterance.onend;
                                finalUtterance.onend = () => {
                                    if (originalOnEnd) originalOnEnd();
                                    cleanupExisting();
                                };
                            }

                            window.ttsControlPlayer = injectControlPlayer(text, settings);
                            window.ttsControlPlayer.startSpeaking(utteranceQueue);
                        },
                        args: [info.selectionText, settings],
                    });
                }).catch(error => console.error("Script execution error:", error));
            });
        });
    }
});