// background.js
let recordedSteps = {};  // Using an object to store steps for multiple recordings

// Default configuration for icon states
const config = {
  icons: {
    default: {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    recording: {
      "16": "images/recording16.png",
      "48": "images/recording48.png",
      "128": "images/recording128.png"
    }
  },
  badge: {
    recording: {
      text: 'REC',
      color: '#ff0000'  // Red
    },
    default: {
      text: '',
      color: '#000000'
    }
  }
};

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'UPDATE_ICON':
      updateIcon(message.recording, tabId);
      sendResponse({ success: true });
      break;

    case 'RECORD_STEP':
      if (tabId) {
        recordedSteps[tabId] = recordedSteps[tabId] || [];
        recordedSteps[tabId].push(message.data);
        sendResponse({ success: true });
      }
      break;

    case 'RECORDING_COMPLETE':
      if (tabId) {
        console.log('Recording complete for tab', tabId, recordedSteps[tabId]);
        // Here we'll add API call to Rails later
        delete recordedSteps[tabId];  // Clear steps for this tab
        sendResponse({ success: true });
      }
      break;
  }

  return true;  // Keep message channel open for async response
});

// Update icon and badge for specific tab
function updateIcon(isRecording, tabId) {
  if (!tabId) return;

  // Update icon
  chrome.action.setIcon({
    tabId: tabId,
    path: isRecording ? config.icons.recording : config.icons.default
  });

  // Update badge
  chrome.action.setBadgeText({
    tabId: tabId,
    text: isRecording ? config.badge.recording.text : config.badge.default.text
  });

  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: isRecording ? config.badge.recording.color : config.badge.default.color
  });
}

// Clean up recorded steps when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (recordedSteps[tabId]) {
    delete recordedSteps[tabId];
  }
});

// Initialize extension icon
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setIcon({ path: config.icons.default });
  chrome.action.setBadgeText({ text: '' });
});
