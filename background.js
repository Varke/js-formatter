// Background script for JS/JSON Formatter extension
// Handles context menu creation and background tasks

class BackgroundScript {
    constructor() {
        this.init();
    }

    init() {
        this.setupContextMenu();
        this.setupMessageListener();
    }

    setupContextMenu() {
        // Create context menu items when extension is installed
        chrome.runtime.onInstalled.addListener(() => {
            this.createContextMenus();
        });
    }

    createContextMenus() {
        // Remove existing context menus
        chrome.contextMenus.removeAll(() => {
            // Create main context menu item
            chrome.contextMenus.create({
                id: 'format-js-json',
                title: 'Форматировать JS/JSON',
                contexts: ['selection'],
                documentUrlPatterns: ['<all_urls>']
            });

            // Create submenu items
            chrome.contextMenus.create({
                id: 'format-json',
                parentId: 'format-js-json',
                title: 'Как JSON',
                contexts: ['selection']
            });

            chrome.contextMenus.create({
                id: 'format-javascript',
                parentId: 'format-js-json',
                title: 'Как JavaScript',
                contexts: ['selection']
            });
        });
    }

    setupMessageListener() {
        // Listen for messages from popup or content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getSelectedText') {
                this.getSelectedTextFromActiveTab(sendResponse);
                return true; // Keep message channel open for async response
            }
        });
    }

    getSelectedTextFromActiveTab(sendResponse) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ text: '' });
                    } else {
                        sendResponse(response || { text: '' });
                    }
                });
            } else {
                sendResponse({ text: '' });
            }
        });
    }

    // Handle context menu clicks
    handleContextMenuClick(info, tab) {
        if (info.menuItemId === 'format-json' || info.menuItemId === 'format-javascript') {
            const format = info.menuItemId === 'format-json' ? 'json' : 'javascript';
            this.openFormatterWithText(info.selectionText, format);
        }
    }

    openFormatterWithText(text, format) {
        // Сохраняем текст в storage для popup
        chrome.storage.local.set({
            'selectedText': text,
            'selectedFormat': format
        }, () => {
            // Открываем popup
            chrome.action.openPopup();
        });
    }
}

// Initialize background script
const backgroundScript = new BackgroundScript();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    backgroundScript.handleContextMenuClick(info, tab);
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Open popup (handled by manifest.json)
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openFormatter') {
        // This could be used to open the formatter with specific text
        // For now, the popup handles this directly
        sendResponse({ success: true });
    }
});
