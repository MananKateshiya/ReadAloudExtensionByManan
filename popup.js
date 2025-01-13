document.addEventListener("DOMContentLoaded", () => {
  const voiceSelect = document.getElementById("voice");
  const speedSlider = document.getElementById("speed");
  const speedValue = document.getElementById("speed-value");
  const volumeSlider = document.getElementById("volume");
  const volumeValue = document.getElementById("volume-value");
  const pitchSlider = document.getElementById("pitch");
  const pitchValue = document.getElementById("pitch-value");
  const saveButton = document.getElementById("save");

  const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceSelect.innerHTML = "<optgroup label='System Voices'></optgroup><optgroup label='Google Voices (Beta)'></optgroup>";
      
      const systemGroup = voiceSelect.querySelector("optgroup[label='System Voices']");
      const googleGroup = voiceSelect.querySelector("optgroup[label='Google Voices (Beta)']");
      
      if (!voices.length) {
          voiceSelect.innerHTML = `<option disabled>Not Supported by Browser</option>`;
          return;
      }

      const googleVoices = voices.filter(voice => voice.voiceURI.includes('Google'));
      if (!googleVoices.length) {
          googleGroup.innerHTML = `<option disabled>Google Voices Not Supported by Browser</option>`;
      }

      voices.forEach((voice) => {
          const option = document.createElement("option");
          option.value = voice.name;
          option.textContent = `${voice.name} (${voice.lang})`;
          
          if (voice.voiceURI.includes('Google')) {
            //   option.textContent += " - Highlighting not supported";
              googleGroup.appendChild(option);
            } else {
              systemGroup.appendChild(option);
          }
      });

      
      chrome.storage.sync.get("settings", ({ settings }) => {
          if (settings) {
              voiceSelect.value = settings.voice || voices[0].name;
              speedSlider.value = settings.speed || 1;
              speedValue.textContent = (settings.speed || 1).toFixed(1);
              volumeSlider.value = settings.volume || 1;
              volumeValue.textContent = (settings.volume || 1).toFixed(1);
              pitchSlider.value = settings.pitch || 1;
              pitchValue.textContent = (settings.pitch || 1).toFixed(1);
          }
      });
  };

  
  if (window.speechSynthesis.getVoices().length) {
      populateVoices();
  }
  window.speechSynthesis.onvoiceschanged = populateVoices;

  
  [
      [speedSlider, speedValue],
      [volumeSlider, volumeValue],
      [pitchSlider, pitchValue]
  ].forEach(([slider, value]) => {
      slider.addEventListener("input", () => {
          value.textContent = parseFloat(slider.value).toFixed(1);
      });
  });

  
  saveButton.addEventListener("click", () => {
      const settings = {
          voice: voiceSelect.value,
          speed: parseFloat(speedSlider.value),
          volume: parseFloat(volumeSlider.value),
          pitch: parseFloat(pitchSlider.value)
      };

      chrome.storage.sync.set({ settings }, () => {
          const toast = document.getElementById('toast');
          toast.textContent = "Your preferences have been saved";
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
      });
  });
});