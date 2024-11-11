// Controller - Manages application logic and user interactions; the central component
import { firebase } from "./firebase.js";
import { alertSystem } from './alertSystem.js';

export class Controller {
    constructor(model, view) {
        // Initialize core components
        this.model = model;
        this.view = view;
        this.currentScheduleIndex = 0;
        this.loaded = false;

        // Set up event handlers and initialize UI
        this.initializeEventListeners();
        this.initializeSearchbar();
        this.resetSchedule();
    }

    // Helper function to retrieve selected semester
    getSemesterFromUser() {
        const selectedSemester = localStorage.getItem('selectedSemester');
        const [year, semester] = selectedSemester.split(" ");

        return [year, semester];
    }
    // Function to initialize course search functionality
    async initializeSearchbar() {
        const courses = await this.model.searchbar.getCourseCourses();
        this.view.coursesLoaded();
        this.loaded = true;
        this.view.searchbar.searchbarAutoComplete(
            document.getElementById("Course"),
            courses
        );
    }

    // Function to set up all event listeners for the application
    initializeEventListeners() {
        // Form submission
        const form = document.getElementById("courseForm");
        const submitButton = document.getElementById("submit");
        const courseInput = document.getElementById("Course");
        const profileButton = document.getElementById("profileButton");
        const savedCourse = document.getElementById("savedCourse");


        // Initial button state
        submitButton.disabled = !courseInput.value.trim();

        // Add input event listener to handle button enable/disable
        courseInput.addEventListener("input", (e) => {
            submitButton.disabled = !e.target.value.trim();
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (this.view.submitting) return;

            const courseName = courseInput.value.trim();
            await this.handleCourseSubmission(courseName);
        });
        
        // Add event listener for the Enter key on the input field
        courseInput.addEventListener("keydown", (event) => {
            if (event.key === 'Enter') {
                const activeItem = document.querySelector(".autocomplete-active");
                if (!activeItem && !courseInput.value.trim()) {
                    event.preventDefault(); // Prevent form submission if input is empty
                    return;
                }
                if (!activeItem) {
                    event.preventDefault();
                    // Only trigger form submission if there's a valid input
                    if (courseInput.value.trim()) {
                        this.view.searchbar.closeAllLists();
                        form.dispatchEvent(new Event("submit"));
                    }
                }
            }
        });



        // Handle navigation button functionality
        document.getElementById("previous").addEventListener("click", () => this.previousSchedule());
        document.getElementById("next").addEventListener("click", () => this.nextSchedule());

        // Handle reset functionality
        document.getElementById("reset").addEventListener("click", () => {
            this.resetSchedule();
            alertSystem.showSuccess("Schedule has been reset");
        });

        // Handle course removal buttons
        document.getElementById("courseInfoBody").addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("remove-course-button")) {
                const courseId = e.target.dataset.courseId;
                this.removeButtonEvent(courseId);
            }
        });

        // Handle closing of autocomplete dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!e.target.matches(".autocomplete-item") && !e.target.matches("#Course")) {
                this.view.searchbar.closeAllLists();
            }
        });

        //Saves courses
        document.getElementById("save").addEventListener('click', (e) => {
            if (firebase.getUid() === null) {
                alertSystem.showError("Please log in to save your schedule");
                return;
            }

            try {
                let databaseCourseList = [];
                this.model.courseList.forEach((e) => {
                    databaseCourseList.push(e);
                });
                let databaseCourseTimes = [];
                if (this.model.schedules.length > 0 && this.model.schedules[0] !== "noCourses") {
                    for (let course of this.model.schedules[this.currentScheduleIndex]) {
                        console.log("Controller ~ document.getElementById ~ course:", course)
                        let timeArray = [];
                        for (let time of course.sectionTimes) {
                            timeArray.push(time);
                        }
                        timeArray.sort((a, b) => {
                            const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                            const dayComparison = daysOfWeek.indexOf(a.times.weekday) - daysOfWeek.indexOf(b.times.weekday);
                            if (dayComparison !== 0) {
                                return dayComparison;
                            }
                            const timeComparison = parseInt(a.times.startTime.split(":").join("")) - parseInt(b.times.startTime.split(":").join(""));
                            return timeComparison;
                        });
                        console.log("Controller ~ document.getElementById ~ timeArray:", timeArray)
                        databaseCourseTimes.push(timeArray);
                    }
                        
                    firebase.writeUserData(firebase.getUid(), databaseCourseList, databaseCourseTimes, this.currentScheduleIndex);
                    alertSystem.showSuccess("Schedule saved successfully");
                } else {
                    alertSystem.showError("No courses to save");
                }
            } catch (error) {
                console.error("Error saving schedule:", error);
                alertSystem.showError("Error saving schedule. Please try again.");
            }
        });

        document.getElementById("logout").addEventListener('click', (e) => {
            const name = document.getElementById("usernameDisplay");
            if (name.textContent === "Guest") {
                window.location.href = "login.html";
            } else {
                firebase.logout();
                window.location.href = "login.html";
            }
        });

        //Profile button
        profileButton.addEventListener("click", () => this.showProfilePanel());
        closePanel.addEventListener("click", () => this.closeProfilePanel());

        //View Save Course
        savedCourse.addEventListener("click", () => this.savedCoursePanel());

        // Add semester switch button listener
        const switchSemesterBtn = document.getElementById("switchSemester");
        if (switchSemesterBtn) {
            switchSemesterBtn.addEventListener("click", () => {

                // Redirect to semester selection
                window.location.href = "semester.html";
            });
        }
        const deleteButton = document.getElementById("deleteAccount");
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
        const confirmDeleteButton = document.getElementById("confirmDeleteAccount");
        const emailLoginConfirm = document.getElementById("emailLoginConfirm");
        const deleteAccountError = document.getElementById("deleteAccountError");
        const googleLoginConfirm = document.getElementById("googleLoginConfirm");

        if (deleteButton && confirmDeleteButton) {
            // Show modal when delete button is clicked
            deleteButton.addEventListener("click", () => {
                // Clear any previous error messages and password
                if (deleteAccountError) {
                    deleteAccountError.textContent = '';
                    deleteAccountError.style.display = 'none';
                }
                const passwordInput = document.getElementById('confirmPassword');
                if (passwordInput) {
                    passwordInput.value = '';
                }

                // Check if user is Google user and hide password field if so
                const user = firebase.getCurrentUser();
                const isGoogleUser = user.providerData.some(
                    provider => provider.providerId === 'google.com'
                );

                if (isGoogleUser) {
                    googleLoginConfirm.style.display = 'block';
                    emailLoginConfirm.style.display = 'none';
                } else {
                    googleLoginConfirm.style.display = 'none';
                    emailLoginConfirm.style.display = 'block';
                }

                deleteModal.show();
            });

            // Handle the confirmation
            confirmDeleteButton.addEventListener("click", async () => {
                try {
                    const result = await firebase.deleteAccount();
                    // Only close and redirect if deletion was successful
                    if (result === true) {
                        deleteModal.hide();
                    }
                } catch (error) {
                    console.error("Error in delete confirmation:", error);
                }
            });
        }
    }


    // Function to process course submission
    async handleCourseSubmission(courseName) {
        if (!courseName) {
            alert("Please enter a course name.");
            return;
        }

        // Get submit button and disable it
        const submitButton = document.getElementById("submit");
        const courseInput = document.getElementById("Course");
        // Disable both input and button while submitting
        submitButton.disabled = true;
        courseInput.disabled = true;
        submitButton.value = "Adding..."; // Show loading state

        this.view.submitting = true;
        try {
            const success = await this.model.addCourse(courseName);
            if (success) {
                if (!await this.generateAndDisplaySchedules()) {
                    await this.model.removeCourse(courseName);

                }
                else {
                    alertSystem.showSuccess(`Successfully added ${courseName}`);
                }
            } else {
                alertSystem.showError("Course not found. Please try again.");
            }
        } catch (error) {
            alertSystem.showError("An error occurred while adding the course.");
        } finally {
            // Re-enable inputs and reset state
            submitButton.disabled = false;
            courseInput.disabled = false;
            submitButton.value = "Submit";
            this.view.submitting = false;
            courseInput.value = "";
        }
    }

    // Function to generate schedules and update display
    async generateAndDisplaySchedules(index) {
        const schedules = await this.model.generateSchedules();
        if (schedules.length === 0) {
            alertSystem.showError("No valid schedules found with this combination of courses.");
            return false;
        }
        this.currentScheduleIndex = index || 0;
        this.updateScheduleDisplay();
        await this.updateCourseInfo();
        return true;
    }

    // Function to display previous schedule
    async previousSchedule() {
        if (this.currentScheduleIndex > 0) {
            this.currentScheduleIndex--;
            this.updateScheduleDisplay();
        }
    }

    // Function to display next schedule
    async nextSchedule() {
        if (this.currentScheduleIndex < this.model.schedules.length - 1) {
            this.currentScheduleIndex++;
            this.updateScheduleDisplay();
        }
    }

    // Function to update the schedule display
    updateScheduleDisplay() {
        const schedule = this.model.schedules[this.currentScheduleIndex];
        this.view.schedule.displaySchedule(schedule);
        this.view.schedule.displayScheduleInfo(schedule);
        if (this.model.schedules[0] === "noCourses") {
            this.resetSchedule();
        }
        else {
            this.view.updateNavigationDisplay(
                this.currentScheduleIndex,
                this.model.schedules.length
            );
        }
    }

    // Function to update course information panel
    async updateCourseInfo() {
        const courseInfo = [];
        if (this.model.courseList.size === 0) { // Checks if there is no Courses in the list
            document.getElementById("courseInfoBody").innerHTML = ""; // Clear previous content
            document.getElementById("emptyCourseMessage").style.display = "flex"; // Show empty message
            return; // Exit the function early
        } else {
            document.getElementById("emptyCourseMessage").style.display = "none"; // Hide empty message
        }
        const [year, sem] = this.getSemesterFromUser();

        for (let course of this.model.courseList.values()) {
            let [dept, courseNum] = course.split(" ");
            const courseAPIData = await this.model.api.getCourseAPI(year, sem, dept, courseNum);
            let info = await this.model.api.getSectionAPI(year, sem, dept, courseNum, courseAPIData[0].value);
            courseInfo.push(info);
        }

        this.view.displayCourseInfo(courseInfo);
    }

    // Function to reset schedule and clear course list
    resetSchedule() {
        this.model.courseList.clear();
        this.model.schedules = [];
        this.currentScheduleIndex = 0;
        this.view.schedule.displaySchedule("noCourses");
        document.getElementById("courseInfoBody").innerHTML = "";
        document.getElementById("prevNext").style.display = "none";
        document.getElementById("scheduleNum").textContent = "";
        document.getElementById("schedulesInfoContainer").innerHTML = "";
        document.getElementById("emptyCourseMessage").style.display = "flex"; // Show empty message

    }


    // Function to handle course removal button event
    async removeButtonEvent(courseNameWithASpace) {

        try {
            var stringedcn = courseNameWithASpace.toString();


            if (this.model.courseList.has(stringedcn)) {

                // Remove course from UI and model
                let selectedDiv = document.getElementById(stringedcn);
                selectedDiv.parentNode.removeChild(selectedDiv);
                this.model.courseList.delete(stringedcn);
                alertSystem.showSuccess(`Successfully removed ${stringedcn}`);


                // Regenerate schedules with updated course list
                await this.generateAndDisplaySchedules();
            }
        }
        catch (error) {
            alertSystem.showError("Error removing course. Please try again.");
        }
    }

    async showProfilePanel() {
        // Get and display user info
        const username = await firebase.getDisplayName();
        const email = await firebase.getEmail();
        this.view.displayProfilePanel(username, email);

        // Show the panel

        const profilePanel = document.getElementById('profilePanel');

        // Get saved course list and show it
        const uid = firebase.getUid();
        if (uid) {
            const savedCourseList = await firebase.getCourseList(uid);
            const savedCourseTimesList = await firebase.getCourseTimeList(uid);
            this.view.displaySavedCoursePanel(savedCourseList, savedCourseTimesList);
        }

        // Remove any existing click listener before adding a new one
        if (this._documentClickListener) {
            document.removeEventListener('click', this._documentClickListener);
        }

        // Create new click listener
        this._documentClickListener = (event) => {
            const profileButton = document.getElementById('profileButton');
            if (!profileButton.contains(event.target) && !profilePanel.contains(event.target) && !event.target.closest('.alert') || event.target.closest('#savedCourse')) {
                this.closeProfilePanel();
            }
        };

        // Add listener with a slight delay to avoid immediate triggering
        setTimeout(() => {
            document.addEventListener('click', this._documentClickListener);
        }, 0);
    }

    async closeProfilePanel() {
        const profilePanel = document.getElementById('profilePanel');
        profilePanel.hidden = true;

        // Clean up click listener
        if (this._documentClickListener) {
            document.removeEventListener('click', this._documentClickListener);
            this._documentClickListener = null;
        }
    }

    async savedCoursePanel() {
        const uid = firebase.getUid();
        if (!uid) { return; }

        await firebase.readData(uid);

        const savedCoursePanel = document.getElementById('savedCoursePanel');
        savedCoursePanel.classList.remove('hidden');
    }
}