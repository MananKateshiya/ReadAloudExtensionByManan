// Remove any existing popup first
document.getElementById("tts-popup")?.remove();

// Create the popup container
const popup = document.createElement("div");
popup.id = "tts-popup";
popup.style.position = "fixed";
popup.style.bottom = "20px";
popup.style.right = "20px";
popup.style.padding = "15px";
popup.style.borderRadius = "8px";
popup.style.backgroundColor = "#333";
popup.style.color = "orange";
popup.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
popup.style.zIndex = "9999";
popup.style.fontFamily = "Arial, sans-serif";
popup.style.textAlign = "center";

popup.innerHTML = `
  <button id="tts-play" style="margin: 5px; padding: 10px; background: orange; color: black; border: none; cursor: pointer; border-radius: 5px;">Play</button>
  <button id="tts-pause" style="margin: 5px; padding: 10px; background: gray; color: white; border: none; cursor: pointer; border-radius: 5px;">Pause</button>
  <button id="tts-stop" style="margin: 5px; padding: 10px; background: black; color: orange; border: none; cursor: pointer; border-radius: 5px;">Stop</button>
`;

document.body.appendChild(popup);

// Button functionality
document.getElementById("tts-play").addEventListener("click", () => {
  speechSynthesis.resume();
});

document.getElementById("tts-pause").addEventListener("click", () => {
  speechSynthesis.pause();
});

document.getElementById("tts-stop").addEventListener("click", () => {
  speechSynthesis.cancel();
  popup.remove();
});
