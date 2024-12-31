
function injectControlPlayer(text, settings) {
  
  const style = document.createElement('style');
  style.textContent = `
    #tts-control-bar {
      position: fixed !important;
      bottom: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 400px !important;
      min-height: 60px !important;
      padding: 15px !important;
      background-color: #ff9800 !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }

    #tts-control-bar button {
      background-color: white !important;
      border: none !important;
      padding: 8px 16px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      font-weight: bold !important;
      color: #ff9800 !important;
      min-width: 80px !important;
      margin: 0 5px !important;
    }

    #tts-control-bar button:hover {
      background-color: #f5f5f5 !important;
    }

    #tts-control-progress-container {
      flex: 1 !important;
      margin: 0 15px !important;
      display: flex !important;
      flex-direction: column !important;
    }

    #tts-control-progress-bar {
      width: 100% !important;
      height: 8px !important;
      border-radius: 4px !important;
      background-color: rgba(255, 255, 255, 0.3) !important;
      margin-bottom: 5px !important;
    }

    #tts-control-progress-bar::-webkit-progress-bar {
      background-color: rgba(255, 255, 255, 0.3) !important;
      border-radius: 4px !important;
    }

    #tts-control-progress-bar::-webkit-progress-value {
      background-color: white !important;
      border-radius: 4px !important;
    }

    #tts-control-time-remaining {
      color: white !important;
      font-size: 12px !important;
      text-align: right !important;
    }
  `;
  document.head.appendChild(style);

  
  const controlBar = document.createElement("div");
  controlBar.innerHTML = `
    <div id="tts-control-bar">
      <button id="tts-control-pause-btn">Pause</button>
      <div id="tts-control-progress-container">
        <progress id="tts-control-progress-bar" max="100" value="0"></progress>
        <span id="tts-control-time-remaining">0:00</span>
      </div>
      <button id="tts-control-stop-btn">Stop</button>
    </div>
  `;
  document.body.appendChild(controlBar);

  
  let elapsedTime = 0;
  const estimatedDuration = (text.length * 0.075) / settings.speed;
  let progressInterval;

  const updateProgress = () => {
    elapsedTime += 0.1;
    const percentage = Math.min((elapsedTime / estimatedDuration) * 100, 100);
    const progressBar = document.getElementById("tts-control-progress-bar");
    if (progressBar) {
      progressBar.value = percentage;

      const remainingTime = Math.max(0, Math.floor(estimatedDuration - elapsedTime));
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      const timeRemaining = document.getElementById("tts-control-time-remaining");
      if (timeRemaining) {
        timeRemaining.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
      }
    }
  };

  
  let isPaused = false;
  let currentUtterance = 0;

  const speakNextChunk = (utteranceQueue) => {
    if (currentUtterance < utteranceQueue.length) {
      const utterance = utteranceQueue[currentUtterance];
      utterance.onend = () => {
        currentUtterance++;
        speakNextChunk(utteranceQueue);
      };
      speechSynthesis.speak(utterance);
    } else {
      cleanup();
    }
  };

  const cleanup = () => {
    clearInterval(progressInterval);
    const controls = document.querySelector('#tts-control-bar');
    if (controls) {
      controls.parentElement.remove();
    }
    const injectedStyle = document.head.querySelector('style:last-of-type');
    if (injectedStyle) {
      injectedStyle.remove();
    }
  };

  
  document.getElementById("tts-control-pause-btn").addEventListener("click", () => {
    if (isPaused) {
      speechSynthesis.resume();
      document.getElementById("tts-control-pause-btn").textContent = "Pause";
      isPaused = false;
    } else {
      speechSynthesis.pause();
      document.getElementById("tts-control-pause-btn").textContent = "Resume";
      isPaused = true;
    }
  });

  document.getElementById("tts-control-stop-btn").addEventListener("click", () => {
    speechSynthesis.cancel();
    cleanup();
  });

  
  progressInterval = setInterval(() => {
    if (!isPaused) {
      updateProgress();
    }
  }, 100);

  return {
    startSpeaking: (utteranceQueue) => speakNextChunk(utteranceQueue),
    cleanup: cleanup
  };
}