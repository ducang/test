

// view.js - Main view class and UI management
export class View {
    constructor() {
        // Initialize main view components
        this.schedule = ScheduleView;
        this.searchbar = SearchbarView;
        this.init();
    }

    init() {
        // Initialize view state
        this.submitting = false;
        this.initializeLoadingState();
    }
    

    initializeLoadingState() {
        // Loading animation
        const loadingElement = document.getElementById("loading");
        const loadingMessages = ["Loading courses", "Loading courses.", "Loading courses..", "Loading courses..."];
        let messageIndex = 0;

        // Update loading message every 300ms (can be adjusted)
        return setInterval(() => {
            loadingElement.textContent = loadingMessages[messageIndex];
            messageIndex = (messageIndex + 1) % loadingMessages.length;
        }, 300);
    }

    coursesLoaded() {
        // Actually display UI when courses are loaded
        const loadingElement = document.getElementById("loading");
        loadingElement.textContent = "Courses loaded";
        loadingElement.hidden = true;
        document.getElementById("loaded").hidden = false;
    }

    resetCourseSpecfic() {
        // TODO: Implementation for resetting specific courses
    }

    // Function to display course information
    displayCourseInfo(courseInfo) {
        // Clear existing course information
        const tableBody = document.getElementById("courseInfoBody");
        tableBody.innerHTML = "";

        // Create cards for each course
        for (let course of courseInfo) {
            let info = course.info;
            let courseData = {
                name: info.title,
                dept: info.dept,
                number: info.number,
                units: info.units,
                prerequisites: info.prerequisites,
                description: info.description
            };

            // Create a new card for course information
            const newRow = document.createElement("div");
            newRow.className = 'card p-3 m-3';
            newRow.id = courseData.dept + ' ' + courseData.number;

            // Populate card with course information and remove button
            newRow.innerHTML = `
                <p><b>${courseData.dept || "No notes"} ${courseData.number || "No number"}</b> ${courseData.name || "No course name"} 
                <input type="button" class="remove-course-button" data-course-id="${courseData.dept + ' ' + courseData.number}"> </input></p>
                <details>
                <summary>Details</summary>
                    <p id="course-information">
                    <b>Credits: </b>${courseData.units || "No units"}<br>
                    <b>Prerequisites: </b><br>${courseData.prerequisites || "None"} <br>
                    <b>Description: </b><br>${courseData.description || "No description"} 
                    </p>
                </details>
            `;

            tableBody.appendChild(newRow);
        }
    }

    // Function to update the navigation display
    updateNavigationDisplay(currentIndex, totalSchedules) {
        // Update schedule navigation counter and display controls
        document.getElementById("scheduleNum").textContent =
            `Schedule ${currentIndex + 1} of ${totalSchedules}`;
        document.getElementById("prevNext").style.display = "inline-flex";
    }

    displayProfilePanel(username, email) {
        const profilePanel = document.getElementById('profilePanel');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const emailDisplay = document.getElementById('emailDisplay');
        const semesterDisplay = document.getElementById('intake');
        const closeButton = document.getElementById('closePanel');

        if (username === "Guest") {
            let saveButton = document.getElementById('savedCourse');

            saveButton.style.display = "none";
            let loginButton = document.getElementById('logout');
            loginButton.textContent = "Login";
            document.getElementById('savedCoursePanel').style.display = "none";
            document.getElementById('deleteAccount').style.display = "none"; 
            document.getElementById('changePassword').style.display = "none";
            document.getElementById('bottom-actions').style.display = "none";
            document.getElementById('profilePanel').style.height = "182px";
            document.getElementById('semester').style.setProperty('margin-bottom', '0px', 'important');    }

        // Make panel temporarily visible for measurements
        profilePanel.style.visibility = 'hidden';
        let isHidden =profilePanel.hidden;
        profilePanel.hidden = false;

        if (usernameDisplay) {
            usernameDisplay.textContent = username;
            this.checkAndAdjustOverlap(usernameDisplay, closeButton);
        }

        if (emailDisplay && email !== username && username != "Guest") {
            emailDisplay.textContent = email;
            emailDisplay.style.display = "block";
            this.checkAndAdjustOverlap(emailDisplay, closeButton);
        } else if (emailDisplay) {
            emailDisplay.style.display = "none";
            document.getElementById('profilePanel').style.height = "520px";
        }
        profilePanel.hidden = isHidden;

        if (semesterDisplay) {
            const selectedSemester = localStorage.getItem('selectedSemester') || 'No semester selected';
            semesterDisplay.textContent = selectedSemester;
        }

        // Restore visibility and toggle display
        profilePanel.style.visibility = '';
        profilePanel.hidden = !profilePanel.hidden;
    }

    checkAndAdjustOverlap(textElement, closeButton) {
        const textRect = textElement.getBoundingClientRect();
        const buttonRect = closeButton.getBoundingClientRect();

        // Check if text overlaps with button
        if (textRect.right > buttonRect.left) {
            // Calculate what percentage of the original size we need
            const currentWidth = textRect.width;
            const availableWidth = buttonRect.left - textRect.left - 10; // 10px buffer
            const scale = availableWidth / currentWidth;

            // Get current font size
            const currentSize = parseFloat(window.getComputedStyle(textElement).fontSize);
            // Calculate and apply new font size
            const newSize = Math.max(currentSize * scale, 10); // Don't go smaller than 12px
            textElement.style.fontSize = `${newSize}px`;
        }
    }
    async displaySavedCoursePanel(courseList, courseTimeList) {
        const allSavedCourses = document.getElementById("allSavedCourses");

        if (!allSavedCourses) return;

        const selectedSemester = localStorage.getItem('selectedSemester');
        allSavedCourses.innerHTML = `<p>Saved ${selectedSemester} schedule</p>`;

        if (!courseList || courseList.length === 0) {
            const noCoursesMessage = document.createElement("div");
            noCoursesMessage.className = "emptyCourse-Message";
            noCoursesMessage.textContent = "No schedule saved";
            allSavedCourses.appendChild(noCoursesMessage);
            return;
        }

        courseList.forEach((course, index) => {
            // Create a container for each course
            const profileCourse = document.createElement("div");
            profileCourse.className = "course";

            // Add course title
            const courseTitle = document.createElement("p");
            courseTitle.textContent = course;
            profileCourse.appendChild(courseTitle);

            // Add course times
            const timesContainer = document.createElement("div");
            timesContainer.className = "course-times";

            // Handle the array of times for this course
            const times = courseTimeList[index];
            if (times && times.length > 0) {
                times.forEach(timeSlot => {
                    const timeSpan = document.createElement("div");
                    timeSpan.style.display = "flex";
                    timeSpan.style.justifyContent = "space-between";
                    
                    const timeElement = document.createElement("p");
                    const sectionCode = document.createElement("p");
                    
                    if (timeSlot.times.weekday === "Online") {
                        timeElement.textContent = "Online";
                    } else {
                        timeElement.textContent = `${timeSlot.times.weekday} ${timeSlot.times.startTime}-${timeSlot.times.endTime}`;
                        sectionCode.textContent = timeSlot.sectionCode;
                    }
                    
                    timeSpan.appendChild(timeElement);
                    timeSpan.appendChild(sectionCode);
                    timesContainer.appendChild(timeSpan);
                });
            }

            profileCourse.appendChild(timesContainer);
            allSavedCourses.appendChild(profileCourse);
        });

    }
}


const ScheduleView = {

    // Function to create the timetable 
    createTimetable(table, startTime, endTime) {
        // Clear existing timetable
        table.innerHTML = '';
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Create header row with days of the week
        const headerRow = this.createHeaderRow(days);
        table.appendChild(headerRow);

        // Create time slots for each 10-minute interval
        this.createTimeSlots(table, startTime, endTime, days);
    },

    // Function to create the header row of the timetable
    createHeaderRow(days) {
        // Create and populate header row with time column and days
        const headerRow = document.createElement("tr");
        const timeHeader = document.createElement("th");
        timeHeader.textContent = "";
        timeHeader.className = "time";
        headerRow.appendChild(timeHeader);

        days.forEach(day => {
            const dayHeader = document.createElement("th");
            dayHeader.textContent = day;
            headerRow.appendChild(dayHeader);
        });

        headerRow.className = "header-row";
        return headerRow;
    },

    // Function to create the time slots for the timetable
    createTimeSlots(table, startTime, endTime, days) {
        // Create rows for each time slot
        for (let time = startTime * 60; time < endTime * 60; time += 10) {
            const row = document.createElement("tr");

            // Add time label column
            addTimeColumn(row, time);

            // Add cells for each day
            addDayCells(row, time, days);

            table.appendChild(row);
        }

        // Helper functions for creating time slots
        function addDayCells(row, time, days) {
            // Create cells for each day in the row
            for (let i = 0; i < days.length; i++) {
                const cell = document.createElement("td");
                cell.dataset.time = time.toString();
                cell.dataset.day = days[i];

                // Add appropriate borders
                addCellBorders(cell, time, i);

                row.appendChild(cell);
            }
        }

        function addCellBorders(cell, time, dayIndex) {
            // Add visual separators for hours and half-hours
            const minutes = time % 60;
            if (minutes === 0) {
                cell.style.borderTop = "1px solid grey";
            } else if (minutes === 30) {
                cell.style.borderTop = "1px solid lightgrey";
            }

            // Add left border
            cell.style.borderLeft = dayIndex === 0 ? "1px solid grey" : "1px solid lightgrey";
        }
        function addTimeColumn(row, time) {
            // Create and format time label cell
            const timeCell = document.createElement("td");
            timeCell.className = "time";

            // Only show hour marks
            if (time % 60 === 0) {
                const timeSpan = document.createElement("span");
                const hours = Math.floor(time / 60);
                timeSpan.textContent = `${hours.toString().padStart(2, '0')}:00`;
                timeCell.appendChild(timeSpan);
            }

            timeCell.style.borderRight = "none";
            row.appendChild(timeCell);

        }
    },

    // Function to add a course section to the timetable
    addCourseToTable(table, course, section, color) {
        const day = section.times.weekday;
        const startTime = this.timeToMinutes(section.times.startTime);
        const endTime = this.timeToMinutes(section.times.endTime);
        const duration = endTime - startTime;

        // Find the cell for course placement
        const startCell = table.querySelector(`td[data-day="${day}"][data-time="${startTime}"]`);
        if (!startCell) {
            console.warn("Could not find cell for", course, section, ", probably an online course");
            return;
        }

        // Create and populate course card
        const card = this.createCourseCard(course, section, color, duration);
        startCell.appendChild(card);
    },

    // Helper function to convert time string to minutes
    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    },

    // Helper function to create a course card element
    createCourseCard(course, section, color, duration) {
        const card = document.createElement("div");
        card.className = "card p-1 courseCard";
        card.innerHTML = `<strong>${course.name}</strong><br>${section.sectionNum} ${section.sectionCode}`;
        card.style.backgroundColor = color;
        card.style.height = `${(duration / 10) * 4}px`;
        return card;
    },

    // Function to display the schedule on the timetable
    displaySchedule(schedule) {
        const colours = [
            "#FFCDD2", "#C8E6C9", "#FFE0B2", "#BBDEFB",
            "#FFF9C4", "#E1BEE7", "#F8BBD0"
        ];
        const timetable = document.getElementById("schedule-table");

        // Initialize timetable with standard class hours
        const startTime = 8;
        const endTime = 22;
        this.createTimetable(timetable, startTime, endTime);

        if (schedule === "noCourses") { return; }

        // Add each course to the timetable with alternating colors
        schedule.forEach((course, index) => {
            const color = colours[index % colours.length];
            course.sectionTimes.forEach(section => {
                this.addCourseToTable(timetable, course, section, color);
            });
        });
    },

    // Function to display schedule information in the sidebar
    displayScheduleInfo(schedule) {
        let info = document.getElementById("schedulesInfoContainer");
        info.innerHTML = "";

        if (schedule === "noCourses") { return; }

        schedule.forEach(course => {
            const courseInfo = this.createCourseInfoElement(course);
            info.appendChild(courseInfo);
        });
    },

    // Helper function to create course info element
    createCourseInfoElement(course) {
        const courseInfo = document.createElement("p");
        courseInfo.className = "courseInfo";

        // Create and populate course title
        const courseTitle = document.createElement("p");
        courseTitle.innerHTML = `<strong>${course.name}</strong> ${course.title}`;
        courseTitle.className = "courseTitle";

        // Create and populate course description
        const courseDescription = document.createElement("p");
        courseDescription.textContent = this.formatCourseDescription(course);
        courseDescription.className = "courseDescription";

        // Create and populate course time
        const courseTime = document.createElement("p");
        courseTime.innerHTML = this.formatTime(course).join("<br>"); courseTime.className = "courseDescription";

        // Assemble course info element
        courseInfo.appendChild(courseTitle);
        courseInfo.appendChild(courseDescription);
        courseInfo.appendChild(courseTime);
        return courseInfo;
    },

    // Helper function to format time
    formatTime(course) {
        const section = course.sectionTimes;
        const arrayTime = [];
        let processed = new Array(section.length).fill(false);

        // Process each unprocessed section
        for (let i = 0; i < section.length; i++) {
            if (processed[i]) continue;

            let weekdays = section[i].times.weekday;
            const currentCode = section[i].sectionCode;
            const currentStart = section[i].times.startTime;
            const currentEnd = section[i].times.endTime;

            // Look for other sections with same time
            for (let j = i + 1; j < section.length; j++) {
                if (processed[j]) continue;

                const sameTime = currentStart === section[j].times.startTime &&
                    currentEnd === section[j].times.endTime &&
                    currentCode === section[j].sectionCode;

                if (sameTime) {
                    weekdays += ", " + section[j].times.weekday;
                    processed[j] = true;
                }
            }

            processed[i] = true;
            if (currentCode !== "OLC") {
                arrayTime.push(`${currentCode} ${weekdays}: ${currentStart} - ${currentEnd}`);
            }
        }

        return arrayTime;
    },

    // Helper function to format course description
    formatCourseDescription(course) {
        if (course.deliveryMethod !== "Online") {
            return `${course.deliveryMethod}: ${course.locations.join(', ')} - ${course.instructor}`;
        }
        return `${course.deliveryMethod} - ${course.instructor}`;
    }
};

// SearchbarView - Handles search interface and autocomplete functionality
const SearchbarView = {

    // Function to initialize autocomplete functionality for the search input
    searchbarAutoComplete(input, array) {
        var currentFocus = -1;

        // Pre-normalize all courses once during initialization
        const normalizedCourses = array.map(item => ({
            original: item,
            normalized: item.split(" ").join("").toUpperCase()
        }));

        input.addEventListener("input", function () {
            var dropdownContainer, suggestionItem, index, val = this.value.split(" ").join("").toUpperCase();
            SearchbarView.closeAllLists(); // Close any already opened lists

            if (!val) {
                return false; // If input is empty, return and keep the list closed
            }

            currentFocus = -1;
            dropdownContainer = document.createElement("DIV");
            dropdownContainer.setAttribute("id", this.id + "autocomplete-list");
            dropdownContainer.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(dropdownContainer);

            // Use pre-normalized courses for faster filtering and sorting
            const sortedMatches = normalizedCourses
                .filter(({ normalized }) => normalized.includes(val))
                .sort((a, b) => {
                    const aStartsWithVal = a.normalized.startsWith(val);
                    const bStartsWithVal = b.normalized.startsWith(val);
                    if (aStartsWithVal && !bStartsWithVal) { return -1; }
                    if (!aStartsWithVal && bStartsWithVal) { return 1; }
                    return a.original.localeCompare(b.original);
                })
                .map(({ original }) => original);

            for (index = 0; index < sortedMatches.length; index++) {
                //creates a div that shows the autosuggestion items and bolds the letters that match
                suggestionItem = document.createElement("div");

                // Map the index back to the original string for correct highlighting
                let startIndex = 0;
                let charsCount = 0;
                for (let j = 0; j < sortedMatches[index].length; j++) {
                    if (sortedMatches[index][j] !== ' ') {
                        if (charsCount === sortedMatches[index].split(" ").join("").toUpperCase().indexOf(val)) {
                            startIndex = j;
                            break;
                        }
                        charsCount++;
                    }
                }

                // Find if the search term is supposed to have a space in it
                let length = val.length;
                for (let i = startIndex; i < startIndex + length; i++) {
                    if (sortedMatches[index][i] === ' ') {
                        length++;
                        break;
                    }
                }


                suggestionItem.innerHTML = sortedMatches[index].substr(0, startIndex) +
                    "<strong>" + sortedMatches[index].substr(startIndex, length) + "</strong>" +
                    sortedMatches[index].substr(startIndex + length);

                // Add the hidden input with the full value
                suggestionItem.innerHTML += "<input type='hidden' value='" + sortedMatches[index] + "'>";

                // Clicking the item will fill it in the text bar
                suggestionItem.addEventListener("click", function () {
                    input.value = this.getElementsByTagName("input")[0].value;
                    SearchbarView.closeAllLists();

                    // Trigger form submission when clicked
                    const form = document.getElementById("courseForm");
                    if (form) {
                        form.dispatchEvent(new Event("submit")); // Programmatically trigger the form submit event
                    }
                });

                // Append the div to the autocomplete list
                dropdownContainer.appendChild(suggestionItem);
            }

            // Hide top and bottom borders if no elements are found, to make it look nicer
            if (dropdownContainer.childElementCount === 0) {
                dropdownContainer.style.borderTop = "none";
                dropdownContainer.style.borderBottom = "none";
            }
        });

        // Handle keyboard navigation in the autocomplete list
        input.addEventListener("keydown", function (e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");

            if (e.keyCode == 40) { // Down arrow key
                currentFocus++;
                if (currentFocus >= x.length) currentFocus = x.length - 1; // Ensure currentFocus is not out of range
                SearchbarView.addActive(x, currentFocus);
            } else if (e.keyCode == 38) { // Up arrow key
                currentFocus--;
                if (currentFocus < 0) currentFocus = 0; // Ensure currentFocus is not out of range
                SearchbarView.addActive(x, currentFocus);
            } else if (e.keyCode == 13) { // Enter key
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) {
                        document.getElementById("Course").value = x[currentFocus].getElementsByTagName("input")[0].value;
                        x[currentFocus].click();
                    }
                }
            }
        });
    },

    // Helper function to add active state to selected suggestion
    // Makes the currently selected suggestion visible by scrolling if necessary
    addActive(x, currentFocus) {
        if (!x) return false;
        SearchbarView.removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
        // Scroll the active element into view
        x[currentFocus].scrollIntoView({ block: "nearest" });
    },

    // Helper function to remove active state from all suggestions
    removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    },

    // Helper function to close all autocomplete lists except for the current input element
    closeAllLists(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            // Ensure input is being passed properly to compare with the elmnt
            if (elmnt != x[i] && elmnt != document.activeElement) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
};
