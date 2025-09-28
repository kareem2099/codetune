// Welcome Message JavaScript
const vscode = acquireVsCodeApi();

class WelcomeManager {
    constructor() {
        this.init();
    }

    init() {
        // Localize the page
        if (window.localization) {
            window.localization.localizeElements();
        }
        // Bind button events
        this.bindEvents();
    }

    bindEvents() {
        // Open Settings button
        document.querySelector('.action-btn.primary').addEventListener('click', () => {
            this.openSettings();
        });

        // Learn More button
        document.querySelector('.action-btn.secondary').addEventListener('click', () => {
            this.learnMore();
        });

        // Got it button
        document.querySelector('.action-btn.tertiary').addEventListener('click', () => {
            this.closeWelcome();
        });
    }

    openSettings() {
        // Send message to extension to open settings
        this.postMessage('openSettings');
        // Close the welcome panel
        this.closeWelcome();
    }

    learnMore() {
        // Open the GitHub repository
        this.postMessage('openExternal', {
            url: 'https://github.com/kareem2099/codetune'
        });
        // Close the welcome panel
        this.closeWelcome();
    }

    closeWelcome() {
        // Send message to extension to close the welcome panel
        this.postMessage('closeWelcome');
    }

    postMessage(type, data = {}) {
        vscode.postMessage({ type, ...data });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.welcomeManager = new WelcomeManager();
});

// Handle messages from extension
window.addEventListener('message', event => {
    if (window.welcomeManager && event.data) {
        // Handle any messages from extension if needed
        console.log('Welcome message received:', event.data);
    }
});
