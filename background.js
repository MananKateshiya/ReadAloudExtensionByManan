const defaultSettings = {
  voice: null,
  speed: 1,
  volume: 1
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
        files: ['controlPlayer.js']
      }).then(() => {
        
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (text, settings) => {
            
            const loadVoices = () => {
              return new Promise((resolve) => {
                const voices = speechSynthesis.getVoices();
                if (voices.length) {
                  resolve(voices);
                } else {
                  speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
                }
              });
            };
            
            const voices = await loadVoices();
            const googleVoices = voices.filter((voice) => voice.name.includes("Google"));
            const selectedVoice = googleVoices.find((v) => v.name === settings.voice) || googleVoices[0];

            
            const utteranceQueue = [];
            const chunkSize = 200;
            for (let i = 0; i < text.length; i += chunkSize) {
              const chunk = text.slice(i, i + chunkSize);
              const utterance = new SpeechSynthesisUtterance(chunk);
              utterance.voice = selectedVoice;
              utterance.rate = settings.speed;
              utterance.volume = settings.volume;
              utteranceQueue.push(utterance);
            }

            
            const player = injectControlPlayer(text, settings);
            player.startSpeaking(utteranceQueue);
          },
          args: [info.selectionText, settings],
        });
      });
    });
  }
});