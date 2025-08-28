class JSJSONFormatter {
    constructor() {
        this.currentFormat = 'json';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromClipboard();
        this.setupMessageListener();
        this.updateStatus('Готов к форматированию');
    }

    setupMessageListener() {
        // Проверяем storage на наличие выделенного текста
        chrome.storage.local.get(['selectedText', 'selectedFormat'], (result) => {
            if (result.selectedText) {
                const inputTextarea = document.getElementById('input-text');
                inputTextarea.value = result.selectedText;
                
                // Автоматически определяем тип кода
                const detectedFormat = this.detectCodeFormat(result.selectedText);
                this.setFormat(detectedFormat, false);
                this.formatCode();
                
                // Очищаем storage
                chrome.storage.local.remove(['selectedText', 'selectedFormat']);
            }
        });
    }

    bindEvents() {
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

        inputTextarea.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.autoFormat();
            }, 50);
        });

        // Автоматическое форматирование при вводе
        inputTextarea.addEventListener('input', (e) => {
            this.hideError();
            const text = e.target.value.trim();
            if (text.length > 10) { // Форматируем только если достаточно текста
                this.updateStatus('Автоопределение типа кода...');
                const detectedFormat = this.detectCodeFormat(text);
                if (detectedFormat !== this.currentFormat) {
                    this.setFormat(detectedFormat, false);
                }
            }
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

    setFormat(format, shouldReformat = true) {
        this.currentFormat = format;
        
        // Update placeholder text
        const inputTextarea = document.getElementById('input-text');
        inputTextarea.placeholder = `Вставьте код для автоматического форматирования...`;

        // Re-format if there's content and shouldReformat is true
        if (shouldReformat && inputTextarea.value.trim()) {
            this.formatCode();
        }

        this.updateStatus(`Определен тип: ${format.toUpperCase()}`);
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
            // Автоматически определяем тип и форматируем
            const detectedFormat = this.detectCodeFormat(input);
            this.setFormat(detectedFormat, false);
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
            // Автоматическое определение типа кода
            const detectedFormat = this.detectCodeFormat(input);
            if (detectedFormat !== this.currentFormat) {
                this.setFormat(detectedFormat, false); // false = не переформатировать
            }

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

    detectCodeFormat(input) {
        const trimmed = input.trim();
        
        // Проверяем, является ли это валидным JSON
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch (e) {
            // Не JSON, проверяем на JavaScript
        }

        // Проверяем JavaScript-подобные паттерны
        if (trimmed.includes('function') || 
            trimmed.includes('const ') || 
            trimmed.includes('let ') || 
            trimmed.includes('var ') ||
            trimmed.includes('=>') ||
            trimmed.includes('console.') ||
            trimmed.includes('return ') ||
            trimmed.includes('if (') ||
            trimmed.includes('for (') ||
            trimmed.includes('while (') ||
            trimmed.includes('class ') ||
            trimmed.includes('import ') ||
            trimmed.includes('export ') ||
            trimmed.includes(';') ||
            trimmed.includes('(') ||
            trimmed.includes(')')) {
            return 'javascript';
        }

        // Если начинается с { или [ и заканчивается } или ], но не валидный JSON
        // то это скорее всего JavaScript объект
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            return 'javascript';
        }

        // По умолчанию считаем JavaScript
        return 'javascript';
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
        // Enhanced JavaScript formatting
        let formatted = input
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, '    ');

        // Add proper indentation and spacing
        formatted = this.addJavaScriptIndentation(formatted);
        
        // Add spaces around operators
        formatted = this.addOperatorSpacing(formatted);
        
        // Add spaces after keywords
        formatted = this.addKeywordSpacing(formatted);

        return formatted;
    }

    addOperatorSpacing(code) {
        // Add spaces around operators
        return code
            .replace(/([^=!<>])=([^=])/g, '$1 = $2')
            .replace(/([^=!<>])==([^=])/g, '$1 == $2')
            .replace(/([^=!<>])===([^=])/g, '$1 === $2')
            .replace(/([^=!<>])!=([^=])/g, '$1 != $2')
            .replace(/([^=!<>])!==([^=])/g, '$1 !== $2')
            .replace(/([^=!<>])<([^=])/g, '$1 < $2')
            .replace(/([^=!<>])<=([^=])/g, '$1 <= $2')
            .replace(/([^=!<>])>([^=])/g, '$1 > $2')
            .replace(/([^=!<>])>=([^=])/g, '$1 >= $2')
            .replace(/([^=!<>])\+([^=+])/g, '$1 + $2')
            .replace(/([^=!<>])-([^=-])/g, '$1 - $2')
            .replace(/([^=!<>])\*([^=*])/g, '$1 * $2')
            .replace(/([^=!<>])\/([^=\/])/g, '$1 / $2')
            .replace(/([^=!<>])%([^=%])/g, '$1 % $2')
            .replace(/([^=!<>])&&([^=&])/g, '$1 && $2')
            .replace(/([^=!<>])\|\|([^=|])/g, '$1 || $2');
    }

    addKeywordSpacing(code) {
        // Add spaces after keywords
        return code
            .replace(/\bif\s*\(/g, 'if (')
            .replace(/\bfor\s*\(/g, 'for (')
            .replace(/\bwhile\s*\(/g, 'while (')
            .replace(/\bswitch\s*\(/g, 'switch (')
            .replace(/\bcatch\s*\(/g, 'catch (')
            .replace(/\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, 'function $1(')
            .replace(/\breturn\s+/g, 'return ')
            .replace(/\bconst\s+/g, 'const ')
            .replace(/\blet\s+/g, 'let ')
            .replace(/\bvar\s+/g, 'var ')
            .replace(/\bclass\s+/g, 'class ');
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
            
            // Force re-highlighting
            setTimeout(() => {
                Prism.highlightElement(outputCode);
            }, 10);
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
