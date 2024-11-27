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
          // Ensure voices are fully loaded
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
          const chunkSize = 200; // Split text into 200-character chunks for better compatibility Max is around 216 characters based on tests
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.voice = selectedVoice;
            utterance.rate = settings.speed;
            utterance.volume = settings.volume;
            utteranceQueue.push(utterance);
          }

          // Create control bar UI
          const controlBar = document.createElement("div");
          controlBar.id = "tts-control-bar";
          controlBar.style.position = "fixed";
          controlBar.style.top = "10px";
          controlBar.style.left = "50%";
          controlBar.style.transform = "translateX(-50%)";
          controlBar.style.padding = "10px";
          controlBar.style.backgroundColor = "orange";
          controlBar.style.borderRadius = "5px";
          controlBar.style.zIndex = "10000";
          controlBar.style.display = "flex";
          controlBar.style.flexDirection = "row";
          controlBar.style.alignItems = "center";
          controlBar.style.width = "25%";
          controlBar.style.justifyContent = "space-between";

          const pauseButton = document.createElement("button");
          pauseButton.textContent = "Pause";
          pauseButton.style.marginRight = "15px";
          pauseButton.style.marginLeft = "15px";
          pauseButton.style.padding = '8px';


          const stopButton = document.createElement("button");
          stopButton.textContent = "Stop";
          stopButton.style.width = "55px";
          stopButton.style.marginRight = "15px";
          stopButton.style.marginLeft = "15px";
          stopButton.style.padding = "8px";

          const progressContainer = document.createElement("div");
          progressContainer.style.flex = "1";
          progressContainer.style.marginLeft = "10px";

          const progressBar = document.createElement("progress");
          progressBar.max = 100;
          progressBar.value = 0;
          progressBar.style.width = "100%";
          progressBar.style.height = "10px";
          progressBar.style.backgroundColor = "white";

          const timeRemaining = document.createElement("span");
          timeRemaining.style.marginLeft = "10px";
          timeRemaining.textContent = "0:00";

          progressContainer.appendChild(progressBar);
          progressContainer.appendChild(timeRemaining);

          controlBar.appendChild(pauseButton);
          controlBar.appendChild(progressContainer);
          controlBar.appendChild(stopButton);
          document.body.appendChild(controlBar);

          let elapsedTime = 0;
          const estimatedDuration = (text.length * 0.075) / settings.speed;

          // Update progress
          const updateProgress = () => {
            elapsedTime += 0.1; // Increment by 0.1 seconds
            const percentage = Math.min((elapsedTime / estimatedDuration) * 100, 100);
            progressBar.value = percentage;

            const remainingTime = Math.max(0, Math.floor(estimatedDuration - elapsedTime));
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timeRemaining.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
          };

          let isPaused = false;
          let currentUtterance = 0;

          // Start speech synthesis
          const speakNextChunk = () => {
            if (currentUtterance < utteranceQueue.length) {
              const utterance = utteranceQueue[currentUtterance++];
              utterance.onend = speakNextChunk;
              speechSynthesis.speak(utterance);
            } else {
              // Finished speaking all chunks
              document.body.removeChild(controlBar);
            }
          };

          // Pause/Unpause
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

          // Stop
          stopButton.addEventListener("click", () => {
            speechSynthesis.cancel();
            document.body.removeChild(controlBar);
          });

          // Fallback timer
          setInterval(() => {
            if (!isPaused) {
              updateProgress();
            }
          }, 100);

          // Start speaking
          speakNextChunk();
        },
        args: [info.selectionText, settings],
      });
    });
  }
});
