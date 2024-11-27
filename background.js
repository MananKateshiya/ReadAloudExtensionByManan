const defaultSettings = {
  voice: null,
  speed: 1,
  volume: 1,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ settings: defaultSettings });

  chrome.contextMenus.create({
    id: "ttsContextMenu",
    title: "Convert text to speech",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ttsContextMenu" && info.selectionText) {
    chrome.storage.sync.get("settings", ({ settings }) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text, settings) => {
          const utterance = new SpeechSynthesisUtterance(text);
   
          // Use Google voices only
          const googleVoices = voices.filter((voice) => voice.name.includes("Google"));
          console.log("Google voices:", googleVoices);

          utterance.voice = googleVoices.find((v) => v.name === settings.voice) || googleVoices[0];
          utterance.rate = settings.speed;
          utterance.volume = settings.volume;

          speechSynthesis.speak(utterance);
        },
        args: [info.selectionText, settings],
      });
    });
  }
});
