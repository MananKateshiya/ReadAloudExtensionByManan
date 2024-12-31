document.addEventListener("DOMContentLoaded", () => {
  const voiceSelect = document.getElementById("voice");
  const speedSlider = document.getElementById("speed");
  const speedValue = document.getElementById("speed-value");
  const volumeSlider = document.getElementById("volume");
  const volumeValue = document.getElementById("volume-value");
  const saveButton = document.getElementById("save");



  const populateVoices = () => {
    const voices = speechSynthesis.getVoices();

    voiceSelect.innerHTML = "";

    if (voices.length === 0) {
      voiceSelect.innerHTML = `<option disabled>No voices available</option>`;
      return;
    }

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });
  };


  speechSynthesis.onvoiceschanged = populateVoices;


  if (speechSynthesis.getVoices().length > 0) {
    populateVoices();
  } else {
    speechSynthesis.onvoiceschanged = populateVoices;
  }


  chrome.storage.sync.get("settings", ({ settings }) => {
    if (settings) {
      voiceSelect.value = settings.voice || "";
      speedSlider.value = settings.speed || 1;
      speedValue.textContent = settings.speed.toFixed(1) || "1.0";
      volumeSlider.value = settings.volume || 1;
      volumeValue.textContent = settings.volume.toFixed(1) || "1.0";
    }
  });


  speedSlider.addEventListener("input", () => {
    speedValue.textContent = parseFloat(speedSlider.value).toFixed(1);
  });
  volumeSlider.addEventListener("input", () => {
    volumeValue.textContent = parseFloat(volumeSlider.value).toFixed(1);
  });


  saveButton.addEventListener("click", () => {
    const settings = {
      voice: voiceSelect.value,
      speed: parseFloat(speedSlider.value),
      volume: parseFloat(volumeSlider.value),
    };

    chrome.storage.sync.set({ settings }, () => {
      alert("Settings saved!");
    });
  });
});