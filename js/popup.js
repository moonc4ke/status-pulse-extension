// js/popup.js
document.addEventListener('DOMContentLoaded', function () {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');

  // Check current recording state
  chrome.storage.local.get(['isRecording'], function (result) {
    updateUI(result.isRecording);
  });

  startBtn.addEventListener('click', async function () {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Set recording state
    await chrome.storage.local.set({ isRecording: true });

    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, { action: 'START_RECORDING' });

    updateUI(true);
  });

  stopBtn.addEventListener('click', async function () {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Set recording state
    await chrome.storage.local.set({ isRecording: false });

    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, { action: 'STOP_RECORDING' });

    updateUI(false);
  });

  function updateUI(isRecording) {
    if (isRecording) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      status.textContent = 'Recording...';
      status.style.color = '#ff4444';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      status.textContent = 'Not Recording';
      status.style.color = 'black';
    }
  }
});
