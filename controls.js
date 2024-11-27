document.getElementById("play").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resume" });
  });
  
  document.getElementById("pause").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "pause" });
  });
  
  document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stop" });
    window.close(); // Close the control panel when stopped
  });
  