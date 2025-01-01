function injectControlPlayer(text, settings) {

  const style = document.createElement('style');
  style.textContent = `
  #tts-control-bar {
            filter: opacity(100%);
            transition: opacity 300ms ease;
            position: fixed;
            top: 50%;
            left: 5%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 200px;
            padding: 0px;
            background-color: #ff9800;
            border-radius: 8px;
            box-shadow: 0 0 6px 6px rgba(0, 0, 0, 0.1);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          animation: box-opacity 0.7s linear 1 forwards
        }
       #tts-control-bar:hover{
          filter: opacity(100%);
          animation: none;
        }
        @keyframes box-opacity{
          from {
          filter: opacity(100%)
          }
          to{
          filter: opacity(50%)
          }
        }
        
        #tts-control-bar button {
            background-color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            color: #ff9800;
            width: 70px;
            font-size: 0.8rem;
        }
      
        #tts-control-bar button:hover {
            background-color: #f5f5f5;
        }

        #tts-control-progress-container {
            position: relative;
            width: 80px;
            height: 80px;
        }

        .circle {
            fill: none;
            stroke-width: 8;
            transform: rotate(-90deg);
            transform-origin: 50% 50%;
        }

        .circle-bg {
            stroke: rgba(255, 255, 255, 0.3);
        }

        .circle-progress {
            stroke: white;
            stroke-dasharray: 188;
           
            stroke-dashoffset: 188;
           
            transition: stroke-dashoffset 0.3s ease;
        }

        #tts-control-time-remaining {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 14px;
        }
`;
  document.head.appendChild(style);

  const controlBar = document.createElement("div");
  controlBar.innerHTML = `
        <div id="tts-control-bar">
        <!-- Top Play/Pause Button -->
        <button id="tts-control-pause-btn">Pause</button>
  
        <!-- Middle Circular Progress Bar -->
        <div id="tts-control-progress-container">
          <svg width="80" height="80">
            <circle class="circle circle-bg" cx="40" cy="40" r="30"></circle>
            <circle class="circle circle-progress" cx="40" cy="40" r="30"></circle>
          </svg>
          <span id="tts-control-time-remaining">0:00</span>
        </div>
  
        <!-- Bottom Stop Button -->
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

    const progressCircle = document.querySelector(".circle-progress");
    if (progressCircle) {
      const circumference = 188; 
      const offset = circumference - (percentage / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
    }

    const remainingTime = Math.max(0, Math.floor(estimatedDuration - elapsedTime));
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const timeRemaining = document.getElementById("tts-control-time-remaining");
    if (timeRemaining) {
      timeRemaining.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
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
