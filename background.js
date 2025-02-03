// background.js

const RAILS_API = 'http://localhost:3000/api';

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

async function sendToRails(endpoint, data) {
  try {
    const response = await fetch(`${RAILS_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers if needed
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('API request failed');

    return await response.json();
  } catch (error) {
    console.error('Rails API error:', error);
    throw error;
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  // Using IIFE to handle async operations
  (async () => {
    try {
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
            const workflowData = {
              workflow: {
                name: `Recording ${new Date().toLocaleString()}`,
                url: sender.tab.url,
                interval_minutes: 5 // default interval
              }
            };

            // Create workflow
            const workflow = await sendToRails('/workflows', workflowData);

            // Send recorded steps
            await sendToRails(`/workflows/${workflow.id}/record_steps`, {
              steps: recordedSteps[tabId]
            });

            delete recordedSteps[tabId];
            sendResponse({ success: true });
          }
          break;
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

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
