// semSelect.js
import { Model } from './model.js';
import { firebase } from './firebase.js';

class SemesterSelector {
    constructor() {
        this.model = new Model();
        this.selectedSemester = localStorage.getItem('selectedSemester') || '';
        this.currentFocusIndex = -1;
        this.init();
    }

    async init() {
        try {
            const semesters = await this.model.api.getSemesterAndYear();
            this.setupEventListeners();
            this.displaySemesters(semesters);
            this.goBackToLoginPage();

            // Update button text if semester was previously selected
            if (this.selectedSemester) {
                const button = document.getElementById('semesterButton');
                button.textContent = this.selectedSemester;
            }
        } catch (error) {
            console.error('Failed to initialize semester selector:', error);
        }
    }

    setupEventListeners() {
        const button = document.getElementById('semesterButton');
        const dropdown = document.getElementById('semesterDropdown');

        // Toggle dropdown on button click
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                this.currentFocusIndex = -1;
                this.updateFocus();

            } else {
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
                this.currentFocusIndex = -1;
            }
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!dropdown.classList.contains('show')) {
                if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === button) {
                    e.preventDefault();
                    dropdown.classList.add('show');
                    this.currentFocusIndex = 0;
                    this.updateFocus();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.currentFocusIndex = Math.min(
                        this.currentFocusIndex + 1,
                        dropdown.children.length - 1
                    );
                    if (this.currentFocusIndex === -1) this.currentFocusIndex = 0;
                    this.updateFocus();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    this.currentFocusIndex = Math.max(this.currentFocusIndex - 1, 0);
                    this.updateFocus();
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (this.currentFocusIndex >= 0) {
                        const focusedOption = dropdown.children[this.currentFocusIndex];
                        this.selectSemester(focusedOption.textContent);
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    dropdown.classList.remove('show');
                    this.currentFocusIndex = -1;
                    button.focus();
                    break;

                case 'Tab':
                    dropdown.classList.remove('show');
                    this.currentFocusIndex = -1;
                    break;
            }
        });
    }

    updateFocus() {
        const dropdown = document.getElementById('semesterDropdown');
        const options = dropdown.children;

        Array.from(options).forEach(option => {
            option.classList.remove('semester-focus');
        });

        if (this.currentFocusIndex >= 0 && this.currentFocusIndex < options.length) {
            const currentOption = options[this.currentFocusIndex];
            currentOption.classList.add('semester-focus');

            // Ensure the focused option is visible in the scrollable area
            const dropdownRect = dropdown.getBoundingClientRect();
            const optionRect = currentOption.getBoundingClientRect();

            if (optionRect.bottom > dropdownRect.bottom) {
                currentOption.scrollIntoView({ block: 'end', behavior: 'smooth' });
            } else if (optionRect.top < dropdownRect.top) {
                currentOption.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
        }
    }

    displaySemesters(yearData) {
        const dropdown = document.getElementById('semesterDropdown');
        dropdown.innerHTML = '';

        // Add ARIA attributes
        dropdown.setAttribute('role', 'listbox');
        dropdown.setAttribute('aria-label', 'Select a semester');

        let sortedKeys = Object.keys(yearData).sort((a, b) => {
            return b - a;
        });

        sortedKeys.forEach(year => {
            yearData[year].sort((a, b) => {
                const order = ['fall', 'summer', 'spring'];
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);

                if (indexA === -1 && indexB === -1) {
                    return a.localeCompare(b);
                } else if (indexA === -1) {
                    return 1;
                } else if (indexB === -1) {
                    return -1;
                } else {
                    return indexA - indexB;
                }
            });
        });

        sortedKeys.forEach(year => {
            yearData[year].forEach(semester => {
                const option = document.createElement('a');
                option.href = '#';
                option.className = 'semester-option';

                const formattedSemester = semester.charAt(0).toUpperCase() + semester.slice(1);
                const semesterText = `${year} ${formattedSemester}`;
                option.textContent = semesterText;

                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectSemester(semesterText);
                });

                dropdown.appendChild(option);
            });
        });
    }

    selectSemester(semester) {
        this.selectedSemester = semester;
        localStorage.setItem('selectedSemester', semester);

        // Update button text
        const button = document.getElementById('semesterButton');
        button.textContent = semester;

        // Close dropdown
        const dropdown = document.getElementById('semesterDropdown');
        dropdown.classList.remove('show');
        button.setAttribute('aria-expanded', 'false');

        // Redirect to index page
        window.location.href = 'index.html';
    }

    goBackToLoginPage() {
        const usermode = localStorage.getItem("UserMode");
        localStorage.removeItem("UserMode");
        console.log(usermode);
        const button = document.getElementById('goBackButton');
        if (usermode == "Guest" || usermode == null) {
            button.textContent = "Login";
            button.addEventListener('click', function () {
                window.location.href = 'login.html';
            });
        } else {
            button.textContent = "Logout";
            button.addEventListener('click', function () {
                firebase.logout();
                window.location.href = "login.html";
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SemesterSelector();
});