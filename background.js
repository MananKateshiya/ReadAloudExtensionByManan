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
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        css: `.tts-highlight { background-color: yellow !important; color: black !important; transition: background-color 0.3s ease !important; }`
      });

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['controlPlayer.js']
      }).then(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (text, settings) => {
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
              
              // Traverse up until we find the closest block-level element
              while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
                currentNode = currentNode.parentNode;
              }
            
              // Store references globally for cleanup
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
                  span.className = 'tts-word';
                  fragment.appendChild(span);
                  if (index < words.length - 1) fragment.appendChild(document.createTextNode(' '));
                }
              });

              selectionInfo.range.insertNode(fragment);
              return Array.from(document.querySelectorAll('.tts-word'));
            }

            const wordSpans = wrapWordsWithSpans(selectionInfo);
            let currentWordIndex = 0;

            const utteranceQueue = [];
            const chunkSize = 200;
            let finalUtterance = null;

            const loadVoices = () => {
              return new Promise((resolve) => {
                const voices = speechSynthesis.getVoices();
                if (voices.length) resolve(voices);
                else speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
              });
            };

            const voices = await loadVoices();
            const selectedVoice = voices.find(v => v.name === settings.voice) || voices[0];

            for (let i = 0; i < text.length; i += chunkSize) {
              const chunk = text.slice(i, i + chunkSize);
              const isLastChunk = (i + chunkSize >= text.length);
              const utterance = new SpeechSynthesisUtterance(chunk);

              utterance.voice = selectedVoice;
              utterance.rate = settings.speed;
              utterance.volume = settings.volume;
              utterance.pitch = settings.pitch;

              utterance.onboundary = (event) => {
                if (event.name === "word") {
                  if (currentWordIndex > 0) {
                    wordSpans[currentWordIndex - 1].classList.remove("tts-highlight");
                  }
                  if (currentWordIndex < wordSpans.length) {
                    wordSpans[currentWordIndex].classList.add("tts-highlight");
                    currentWordIndex++;
                  }
                }
              };

              if (isLastChunk) {
                finalUtterance = utterance;
              }

              utteranceQueue.push(utterance);
            }

            if (finalUtterance) {
              const originalOnEnd = finalUtterance.onend;
              finalUtterance.onend = () => {
                if (originalOnEnd) originalOnEnd();

                // Remove highlight from the last word
                if (currentWordIndex > 0 && wordSpans[currentWordIndex - 1]) {
                  wordSpans[currentWordIndex - 1].classList.remove("tts-highlight");
                }

                // Replace modified content with original content
                const parentElement = selectionInfo.selectedElement.parentNode;
                if (parentElement) {
                  parentElement.replaceChild(selectionInfo.originalContent, selectionInfo.selectedElement);
                }

                speechSynthesis.cancel();
              };
            }

            window.ttsControlPlayer = injectControlPlayer(text, settings);
            window.ttsControlPlayer.startSpeaking(utteranceQueue);
          },
          args: [info.selectionText, settings],
        });
      });
    });
  }
});