class JSJSONFormatter {
    constructor() {
        this.currentFormat = 'json';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromClipboard();
        this.updateStatus('Готов к форматированию');
    }

    bindEvents() {
        // Format selector buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFormat(e.target.dataset.format);
            });
        });

        // Action buttons
        document.getElementById('format-btn').addEventListener('click', () => {
            this.formatCode();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
            this.copyToClipboard();
        });

        // Input textarea
        const inputTextarea = document.getElementById('input-text');
        inputTextarea.addEventListener('input', () => {
            this.hideError();
            this.updateStatus('Введите код для форматирования');
        });

        inputTextarea.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.autoFormat();
            }, 100);
        });

        // Keyboard shortcuts
        inputTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.formatCode();
                } else if (e.key === 'l') {
                    e.preventDefault();
                    this.clearAll();
                }
            }
        });
    }

    setFormat(format) {
        this.currentFormat = format;
        
        // Update button states
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });

        // Update placeholder text
        const inputTextarea = document.getElementById('input-text');
        inputTextarea.placeholder = `Вставьте ${format.toUpperCase()} код здесь...`;

        // Re-format if there's content
        if (inputTextarea.value.trim()) {
            this.formatCode();
        }

        this.updateStatus(`Режим: ${format.toUpperCase()}`);
    }

    async loadFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && this.isValidCode(text)) {
                document.getElementById('input-text').value = text;
                this.updateStatus('Код загружен из буфера обмена');
            }
        } catch (error) {
            // Clipboard access denied or empty
        }
    }

    autoFormat() {
        const input = document.getElementById('input-text').value.trim();
        if (input) {
            this.formatCode();
        }
    }

    formatCode() {
        const input = document.getElementById('input-text').value.trim();
        
        if (!input) {
            this.showError('Введите код для форматирования');
            return;
        }

        this.updateStatus('Форматирование...');
        this.hideError();

        try {
            let formattedCode;
            
            if (this.currentFormat === 'json') {
                formattedCode = this.formatJSON(input);
            } else {
                formattedCode = this.formatJavaScript(input);
            }

            this.displayFormattedCode(formattedCode);
            this.updateStatus('Код успешно отформатирован');
            
        } catch (error) {
            this.showError(`Ошибка форматирования: ${error.message}`);
            this.updateStatus('Ошибка при форматировании');
        }
    }

    formatJSON(input) {
        // Try to parse as JSON first
        let parsed;
        try {
            parsed = JSON.parse(input);
        } catch (error) {
            // If it's not valid JSON, try to evaluate as JavaScript object
            try {
                parsed = eval(`(${input})`);
            } catch (evalError) {
                throw new Error('Невалидный JSON. Проверьте синтаксис.');
            }
        }

        return JSON.stringify(parsed, null, 2);
    }

    formatJavaScript(input) {
        // Basic JavaScript formatting
        // This is a simplified formatter - for production use consider a proper JS formatter library
        
        // Remove extra whitespace and normalize line endings
        let formatted = input
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, '    ');

        // Add proper indentation for common structures
        formatted = this.addJavaScriptIndentation(formatted);

        return formatted;
    }

    addJavaScriptIndentation(code) {
        const lines = code.split('\n');
        const result = [];
        let indentLevel = 0;
        const indentSize = 2;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                result.push('');
                continue;
            }

            // Decrease indent for closing braces
            if (line.match(/^[})\]]/)) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            // Add current line with proper indentation
            result.push(' '.repeat(indentLevel * indentSize) + line);

            // Increase indent for opening braces
            if (line.match(/[{([]$/)) {
                indentLevel++;
            }
        }

        return result.join('\n');
    }

    displayFormattedCode(code) {
        const outputCode = document.getElementById('output-code');
        const outputPlaceholder = document.getElementById('output-placeholder');
        const outputContainer = document.getElementById('output-container');

        // Hide placeholder and show code
        outputPlaceholder.classList.add('hidden');
        outputCode.classList.remove('hidden');

        // Set the formatted code
        outputCode.textContent = code;

        // Apply syntax highlighting
        if (typeof Prism !== 'undefined') {
            const language = this.currentFormat === 'json' ? 'json' : 'javascript';
            outputCode.className = `output-code language-${language}`;
            Prism.highlightElement(outputCode);
        }

        // Show copy button
        document.getElementById('copy-btn').style.display = 'flex';
    }

    async copyToClipboard() {
        const outputCode = document.getElementById('output-code');
        const formattedText = outputCode.textContent;

        if (!formattedText) {
            this.showError('Нет отформатированного кода для копирования');
            return;
        }

        try {
            await navigator.clipboard.writeText(formattedText);
            this.showCopySuccess();
            this.updateStatus('Код скопирован в буфер обмена');
        } catch (error) {
            this.showError('Не удалось скопировать код');
        }
    }

    showCopySuccess() {
        const copyBtn = document.getElementById('copy-btn');
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            Скопировано!
        `;

        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Копировать
            `;
        }, 2000);
    }

    clearAll() {
        document.getElementById('input-text').value = '';
        document.getElementById('output-code').classList.add('hidden');
        document.getElementById('output-placeholder').classList.remove('hidden');
        document.getElementById('copy-btn').style.display = 'none';
        this.hideError();
        this.updateStatus('Готов к форматированию');
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        errorText.textContent = message;
        errorElement.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error-message').classList.add('hidden');
    }

    updateStatus(message) {
        document.getElementById('status-text').textContent = message;
    }

    isValidCode(input) {
        if (this.currentFormat === 'json') {
            try {
                JSON.parse(input);
                return true;
            } catch {
                try {
                    eval(`(${input})`);
                    return true;
                } catch {
                    return false;
                }
            }
        } else {
            // Basic JavaScript validation
            try {
                new Function(input);
                return true;
            } catch {
                return input.trim().length > 0;
            }
        }
    }
}

// Initialize the formatter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JSJSONFormatter();
});
