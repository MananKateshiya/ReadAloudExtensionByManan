const defaultSettings = {
  voice: null,
  speed: 1,
  volume: 1,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ settings: defaultSettings });

  chrome.contextMenus.create({
    id: "ttsContextMenu",
    title: "Read Aloud Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ttsContextMenu" && info.selectionText) {
    chrome.storage.sync.get("settings", ({ settings }) => {
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

          // Add CSS link
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = chrome.runtime.getURL("tts-style.css");
          document.head.appendChild(link);

          // Create control bar UI
          const controlBar = document.createElement("div");
          controlBar.id = "tts-control-bar";

          controlBar.innerHTML = `
            <button id="pause-btn">Pause</button>
            <div style="flex: 1; margin-left: 10px;">
              <progress id="progress-bar" max="100" value="0"></progress>
              <span id="time-remaining">0:00</span>
            </div>
            <button id="stop-btn">Stop</button>
          `;
          document.body.appendChild(controlBar);

          const pauseButton = document.getElementById("pause-btn");
          const stopButton = document.getElementById("stop-btn");
          const progressBar = document.getElementById("progress-bar");
          const timeRemaining = document.getElementById("time-remaining");

          let elapsedTime = 0;
          const estimatedDuration = (text.length * 0.075) / settings.speed;

          const updateProgress = () => {
            elapsedTime += 0.1;
            const percentage = Math.min((elapsedTime / estimatedDuration) * 100, 100);
            progressBar.value = percentage;

            const remainingTime = Math.max(0, Math.floor(estimatedDuration - elapsedTime));
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timeRemaining.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
          };

          let isPaused = false;
          let currentUtterance = 0;

          const speakNextChunk = () => {
            if (currentUtterance < utteranceQueue.length) {
              const utterance = utteranceQueue[currentUtterance++];
              utterance.onend = speakNextChunk;
              speechSynthesis.speak(utterance);
            } else {
              document.body.removeChild(controlBar);
            }
          };

          pauseButton.addEventListener("click", () => {
            if (isPaused) {
              speechSynthesis.resume();
              pauseButton.textContent = "Pause";
              isPaused = false;
            } else {
              speechSynthesis.pause();
              pauseButton.textContent = "Unpause";
              isPaused = true;
            }
          });

          stopButton.addEventListener("click", () => {
            speechSynthesis.cancel();
            document.body.removeChild(controlBar);
          });

          setInterval(() => {
            if (!isPaused) {
              updateProgress();
            }
          }, 100);

          speakNextChunk();
        },
        args: [info.selectionText, settings],
      });
    });
  }
});
