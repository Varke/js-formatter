// Content script for JS/JSON Formatter extension
// Handles text selection and context menu integration

class ContentScript {
    constructor() {
        this.init();
    }

    init() {
        this.setupMessageListener();
        this.setupSelectionListener();
    }

    setupMessageListener() {
        // Listen for messages from popup or background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getSelectedText') {
                const selectedText = this.getSelectedText();
                sendResponse({ text: selectedText });
            }
        });
    }

    setupSelectionListener() {
        // Listen for text selection changes
        document.addEventListener('selectionchange', () => {
            const selectedText = this.getSelectedText();
            if (selectedText && this.isValidCode(selectedText)) {
                // Store selected text for potential use
                this.storeSelectedText(selectedText);
            }
        });
    }

    getSelectedText() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return '';
        }

        const range = selection.getRangeAt(0);
        const text = range.toString().trim();
        
        return text;
    }

    storeSelectedText(text) {
        // Store in session storage for quick access
        try {
            sessionStorage.setItem('js-formatter-selected-text', text);
        } catch (error) {
            // Handle storage errors gracefully
        }
    }

    isValidCode(text) {
        if (!text || text.length < 3) {
            return false;
        }

        // Check if it looks like JSON or JavaScript
        const trimmed = text.trim();
        
        // JSON-like patterns
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return true;
        }
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return true;
        }

        // JavaScript-like patterns
        if (trimmed.includes('function') || 
            trimmed.includes('const') || 
            trimmed.includes('let') || 
            trimmed.includes('var') ||
            trimmed.includes('=>') ||
            trimmed.includes('{') ||
            trimmed.includes('(')) {
            return true;
        }

        return false;
    }

    // Method to get stored selected text
    getStoredSelectedText() {
        try {
            return sessionStorage.getItem('js-formatter-selected-text') || '';
        } catch (error) {
            return '';
        }
    }
}

// Initialize content script
new ContentScript();
