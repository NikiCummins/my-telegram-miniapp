class VDFEditor {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.userId = this.tg.initDataUnsafe?.user?.id || 'test_user';
        this.currentFile = null;
        this.currentFileId = null;
        this.currentSection = null;
        this.fileContent = {};
        this.originalContent = {};
        this.sections = [];
        this.modified = false;
        
        this.init();
    }

    init() {
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        this.loadFileList();
    }

    async loadFileList() {
        try {
            const response = await fetch(`/api/files/${this.userId}`);
            const files = await response.json();
            this.displayFileList(files);
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    displayFileList(files) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (Object.keys(files).length === 0) {
            fileList.innerHTML = '<p>No files found. Create a new file to get started.</p>';
            return;
        }

        for (const [fileId, file] of Object.entries(files)) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <strong>${file.filename}</strong>
                <div>Sections: ${file.sections.length}</div>
            `;
            fileItem.onclick = () => this.loadFile(fileId, file);
            fileList.appendChild(fileItem);
        }
    }

    async loadFile(fileId, file) {
        this.currentFileId = fileId;
        this.currentFile = file;
        this.fileContent = { ...file.content };
        this.originalContent = { ...file.content };
        this.sections = [...file.sections];
        this.modified = false;

        this.showEditor();
        this.updateSectionsList();
        this.updateFileInfo();
        this.updateModifiedIndicator();
    }

    showEditor() {
        document.getElementById('sectionsPanel').style.display = 'grid';
        document.getElementById('tablePanel').style.display = 'block';
    }

    updateSectionsList() {
        const sectionsList = document.getElementById('sectionsList');
        sectionsList.innerHTML = '';

        this.sections.forEach(section => {
            const sectionItem = document.createElement('div');
            sectionItem.className = 'section-item';
            if (section === this.currentSection) {
                sectionItem.classList.add('active');
            }
            sectionItem.textContent = section;
            sectionItem.onclick = () => this.selectSection(section);
            sectionsList.appendChild(sectionItem);
        });
    }

    selectSection(section) {
        this.currentSection = section;
        this.updateSectionsList();
        this.updateTableContent();
        document.getElementById('currentSectionLabel').textContent = `Editing: ${section}`;
    }

    updateTableContent() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';

        if (!this.currentSection || !this.fileContent[this.currentSection]) {
            return;
        }

        const content = this.fileContent[this.currentSection];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line || !line.includes('=')) return;

            const [key, value] = line.split('=').map(s => s.trim());
            const isModified = this.isValueModified(key, value);
            const status = isModified ? '🔴' : '🟢';
            const actionText = isModified ? 'Restore' : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${key}</td>
                <td>${value}</td>
                <td class="status-indicator">${status}</td>
                <td>
                    ${actionText ? `<button class="btn" onclick="editor.restoreParameter('${key}')">${actionText}</button>` : ''}
                    <button class="btn" onclick="editor.editParameter('${key}', '${value}')">Edit</button>
                </td>
            `;
            
            if (isModified) {
                row.style.color = '#e74c3c';
            }

            tableBody.appendChild(row);
        });
    }

    isValueModified(key, currentValue) {
        if (!this.currentSection || !this.originalContent[this.currentSection]) {
            return false;
        }

        const originalContent = this.originalContent[this.currentSection];
        const lines = originalContent.split('\n');

        for (const line of lines) {
            if (line.includes('=')) {
                const [origKey, origValue] = line.split('=').map(s => s.trim());
                if (origKey === key) {
                    return origValue !== currentValue;
                }
            }
        }
        return false;
    }

    async createNewFile() {
        const filename = document.getElementById('filename').value;
        const initialContent = document.getElementById('initialContent').value;

        if (!filename) {
            alert('Please enter a filename');
            return;
        }

        // Parse initial content
        const { content, sections } = this.parseVDFContent(initialContent);

        const fileData = {
            filename: filename,
            content: content,
            sections: sections
        };

        try {
            const response = await fetch(`/api/files/${this.userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fileData),
            });

            if (response.ok) {
                this.hideModal('newFileModal');
                this.loadFileList();
                this.tg.showPopup({ title: 'Success', message: 'File created successfully' });
            }
        } catch (error) {
            console.error('Error creating file:', error);
        }
    }

    parseVDFContent(content) {
        const result = {};
        const sections = [];
        const lines = content.split('\n');
        let currentSection = null;
        let sectionContent = [];

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Section header
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                if (currentSection !== null) {
                    result[currentSection] = sectionContent.join('\n');
                    sections.push(currentSection);
                }
                currentSection = trimmed.slice(1, -1).trim();
                sectionContent = [];
            } else if (currentSection !== null && trimmed) {
                sectionContent.push(trimmed);
            }
        }

        // Add final section
        if (currentSection !== null) {
            result[currentSection] = sectionContent.join('\n');
            sections.push(currentSection);
        }

        return { content: result, sections: sections };
    }

    async saveFile() {
        if (!this.currentFileId) return;

        try {
            // Update content
            await fetch(`/api/files/${this.userId}/${this.currentFileId}/content`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.fileContent),
            });

            // Update sections
            await fetch(`/api/files/${this.userId}/${this.currentFileId}/sections`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.sections),
            });

            this.originalContent = { ...this.fileContent };
            this.modified = false;
            this.updateModifiedIndicator();
            this.updateTableContent();
            
            this.tg.showPopup({ title: 'Success', message: 'File saved successfully' });
        } catch (error) {
            console.error('Error saving file:', error);
        }
    }

    addParameter() {
        if (!this.currentSection) {
            alert('Please select a section first');
            return;
        }

        const key = prompt('Enter parameter name:');
        if (!key) return;

        const value = prompt('Enter parameter value:');
        if (value === null) return;

        this.updateSectionContent(key, value);
    }

    editParameter(key, currentValue) {
        document.getElementById('editKey').value = key;
        document.getElementById('editValue').value = currentValue;
        this.showModal('editParamModal');
    }

    saveParameter() {
        const key = document.getElementById('editKey').value;
        const value = document.getElementById('editValue').value;

        if (!key) {
            alert('Parameter name cannot be empty');
            return;
        }

        this.updateSectionContent(key, value);
        this.hideModal('editParamModal');
    }

    updateSectionContent(key, value) {
        if (!this.currentSection) return;

        let content = this.fileContent[this.currentSection] || '';
        const lines = content.split('\n');
        let found = false;
        const newLines = [];

        // Update existing parameter or add new one
        for (const line of lines) {
            if (line.includes('=')) {
                const [currentKey] = line.split('=').map(s => s.trim());
                if (currentKey === key) {
                    newLines.push(`${key}=${value}`);
                    found = true;
                } else {
                    newLines.push(line);
                }
            } else if (line.trim()) {
                newLines.push(line);
            }
        }

        if (!found) {
            newLines.push(`${key}=${value}`);
        }

        this.fileContent[this.currentSection] = newLines.join('\n');
        this.modified = true;
        this.updateModifiedIndicator();
        this.updateTableContent();
    }

    deleteParameter() {
        if (!this.currentSection) {
            alert('Please select a section first');
            return;
        }

        const key = prompt('Enter parameter name to delete:');
        if (!key) return;

        if (!confirm(`Are you sure you want to delete parameter "${key}"?`)) {
            return;
        }

        this.removeParameter(key);
    }

    removeParameter(key) {
        if (!this.currentSection) return;

        let content = this.fileContent[this.currentSection] || '';
        const lines = content.split('\n');
        const newLines = [];

        for (const line of lines) {
            if (line.includes('=')) {
                const [currentKey] = line.split('=').map(s => s.trim());
                if (currentKey !== key) {
                    newLines.push(line);
                }
            } else if (line.trim()) {
                newLines.push(line);
            }
        }

        this.fileContent[this.currentSection] = newLines.join('\n');
        this.modified = true;
        this.updateModifiedIndicator();
        this.updateTableContent();
    }

    restoreParameter(key) {
        if (!this.currentSection || !this.originalContent[this.currentSection]) {
            return;
        }

        const originalContent = this.originalContent[this.currentSection];
        const lines = originalContent.split('\n');

        for (const line of lines) {
            if (line.includes('=')) {
                const [origKey, origValue] = line.split('=').map(s => s.trim());
                if (origKey === key) {
                    this.updateSectionContent(key, origValue);
                    break;
                }
            }
        }
    }

    addNewSection() {
        const sectionName = document.getElementById('sectionName').value;
        if (!sectionName) {
            alert('Please enter section name');
            return;
        }

        if (this.sections.includes(sectionName)) {
            alert('Section already exists');
            return;
        }

        this.sections.push(sectionName);
        this.fileContent[sectionName] = '';
        this.modified = true;
        this.updateModifiedIndicator();
        this.updateSectionsList();
        this.hideModal('newSectionModal');
    }

    deleteSection() {
        if (!this.currentSection) {
            alert('Please select a section to delete');
            return;
        }

        if (!confirm(`Are you sure you want to delete section "${this.currentSection}"?`)) {
            return;
        }

        const index = this.sections.indexOf(this.currentSection);
        if (index > -1) {
            this.sections.splice(index, 1);
            delete this.fileContent[this.currentSection];
            this.currentSection = null;
            this.modified = true;
            this.updateModifiedIndicator();
            this.updateSectionsList();
            document.getElementById('currentSectionLabel').textContent = 'No section selected';
            document.getElementById('tableBody').innerHTML = '';
        }
    }

    updateFileInfo() {
        const fileInfo = document.getElementById('fileInfo');
        if (this.currentFile) {
            fileInfo.textContent = `${this.currentFile.filename} | ${this.sections.length} sections`;
        } else {
            fileInfo.textContent = 'No file loaded';
        }
    }

    updateModifiedIndicator() {
        const indicator = document.getElementById('modifiedIndicator');
        if (this.modified) {
            indicator.style.display = 'inline';
        } else {
            indicator.style.display = 'none';
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Global functions for HTML onclick handlers
function showNewFileModal() {
    editor.showModal('newFileModal');
}

function showNewSectionModal() {
    editor.showModal('newSectionModal');
}

function hideModal(modalId) {
    editor.hideModal(modalId);
}

function createNewFile() {
    editor.createNewFile();
}

function addNewSection() {
    editor.addNewSection();
}

function addParameter() {
    editor.addParameter();
}

function deleteParameter() {
    editor.deleteParameter();
}

// Initialize editor when page loads
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new VDFEditor();
});
