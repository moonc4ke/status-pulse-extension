// js/content.js
class StatusPulseRecorder {
  constructor() {
    this.recording = false;
    this.steps = [];
    this.setupNavigationHandling();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    // Check initial recording state
    chrome.storage.local.get(['isRecording'], (result) => {
      if (result.isRecording) {
        this.startRecording();
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'START_RECORDING') {
        this.startRecording();
      } else if (message.action === 'STOP_RECORDING') {
        this.stopRecording();
      }
    });
  }

  setupNavigationHandling() {
    // Handle regular navigation
    window.addEventListener('beforeunload', () => {
      if (this.recording) {
        this.recordStep({
          action: 'navigation',
          value: window.location.href
        });
      }
    });

    // Handle History API navigation (SPAs)
    const originalPushState = window.history.pushState;
    window.history.pushState = function () {
      originalPushState.apply(this, arguments);
      if (window.statusPulseRecorder?.recording) {
        window.statusPulseRecorder.handleNavigation();
      }
    };

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      if (this.recording) {
        this.handleNavigation();
      }
    });
  }

  handleNavigation() {
    setTimeout(() => {
      this.recordStep({
        action: 'navigation',
        value: window.location.href
      });
    }, 100);
  }

  startRecording() {
    this.recording = true;
    this.recordInitialNavigation();
    this.attachEventListeners();
    chrome.runtime.sendMessage({ type: 'UPDATE_ICON', recording: true });
  }

  stopRecording() {
    this.recording = false;
    this.detachEventListeners();
    this.sendStepsToBackground();
    chrome.runtime.sendMessage({ type: 'UPDATE_ICON', recording: false });
  }

  recordInitialNavigation() {
    this.recordStep({
      action: 'goto',
      value: window.location.href
    });
  }

  attachEventListeners() {
    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);

    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('input', this.handleInput, true);
  }

  detachEventListeners() {
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('input', this.handleInput, true);
  }

  handleClick(event) {
    if (!this.recording) return;

    const target = event.target;
    this.recordStep({
      action: 'click',
      selector: this.generateSelector(target),
      text: target.textContent.trim()
    });
  }

  handleInput(event) {
    if (!this.recording) return;

    const target = event.target;
    this.recordStep({
      action: 'fill',
      selector: this.generateSelector(target),
      value: target.value
    });
  }

  generateSelector(element) {
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }

    if (element.id) {
      return `#${element.id}`;
    }

    let path = [];
    let currentElement = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      let selector = currentElement.nodeName.toLowerCase();

      if (currentElement.id) {
        path.unshift(`#${currentElement.id}`);
        break;
      } else {
        let siblings = Array.from(currentElement.parentNode?.children || [])
          .filter(e => e.nodeName === currentElement.nodeName);

        if (siblings.length > 1) {
          let index = siblings.indexOf(currentElement) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      currentElement = currentElement.parentNode;
    }

    return path.join(' > ');
  }

  recordStep(step) {
    step.timestamp = Date.now();
    this.steps.push(step);

    try {
      chrome.runtime.sendMessage({
        type: 'RECORD_STEP',
        data: step
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Step will be sent later:', step);
        }
      });
    } catch (error) {
      console.debug('Failed to send step:', error);
    }
  }

  sendStepsToBackground() {
    try {
      chrome.runtime.sendMessage({
        type: 'RECORDING_COMPLETE',
        data: this.steps
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Failed to send complete recording:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.debug('Failed to send recording:', error);
    }
  }
}

try {
  if (!window.statusPulseRecorder) {
    window.statusPulseRecorder = new StatusPulseRecorder();
  }
} catch (error) {
  console.error('StatusPulse initialization error:', error);
}
