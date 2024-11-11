
// model.js - Manages application data and business logic
export class Model {
    constructor(firebase) {
        // Initialize core model components
        this.api = APIModel;
        this.searchbar = SearchbarModel;
        this.schedule = ScheduleModel;
        this.firebase = firebase;

        this.courseList = new Set();  // Stores selected courses
        this.schedules = [];          // Stores generated schedules
        this.courseInfo = [];         // Stores detailed course information

    }

  
    // Function to add a course to the selected course list
    async addCourse(courseName) {
        const [year,sem] = this.searchbar.getSemesterFromUser();
        const courses = await this.searchbar.getCourseCourses(year,sem);
        if (courses.includes(courseName.toUpperCase())) {
            this.courseList.add(courseName);
            return true;
        }
        return false;
    }

    // Function to remove a course and regenerate schedules
    async removeCourse(courseName) {
        this.courseList.delete(courseName);
        await this.generateSchedules();
    }

    // Function to generate all possible valid schedules from selected courses
    async generateSchedules() {
        if (this.courseList.size === 0) {
            this.schedules = ["noCourses"];
            return this.schedules;
        }
        const [year,sem] = this.searchbar.getSemesterFromUser();
        const formattedCourses = [];
        for (let course of Array.from(this.courseList)) {
            const [dept, courseNum] = course.split(" ");
            const formattedCourse = await this.api.formatForScheduling(year, sem, dept, courseNum);
            if (formattedCourse === null) {
                return [];
            }
            formattedCourses.push(formattedCourse);
        }
        this.schedules = this.schedule.getValidSchedules(formattedCourses).map(schedule => this.schedule.formatForDisplay(schedule));
        return this.schedules;
    }
}

// APIModel - Handles all API interactions and data formatting
const APIModel = {
    APIdata: new Map(),      // Cache for API responses to prevent redundant fetches

    // Function to fetch course data from the API
    async getCourseAPI(year, semester, dept, course) {
        let courseKey = year + "/" + semester + "/" + dept + "/" + course;
        if (this.APIdata.has(courseKey)) {
            return this.APIdata.get(courseKey);
        }
        try {
            const response = await fetch(`https://www.sfu.ca/bin/wcm/course-outlines?${year}/${semester}/${dept}/${course}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Course not found');
                }
                throw new Error('Network response was not ok');
            }
            const content = await response.json();
            this.APIdata.set(courseKey, content);
            return content;
        } catch (error) {
            console.warn('Error fetching course data, probably not found:', error);
            return [];
        }
    },

    // Function to fetch section-specific data from the API
    async getSectionAPI(year, semester, dept, course, section) {
        let sectionKey = year + "/" + semester + "/" + dept + "/" + course + "/" + section;
        if (this.APIdata.has(sectionKey)) {
            return this.APIdata.get(sectionKey);
        }
        const response = await fetch(`https://www.sfu.ca/bin/wcm/course-outlines?${year}/${semester}/${dept}/${course}/${section}`);
        const content = await response.json();
        this.APIdata.set(sectionKey, content);
        return content;
    },

    // Function to convert two-character day code to numeric day value
    convert2DigitDayToNumber(day) {
        const days = {
            "su": 0, "mo": 1, "tu": 2, "we": 3,
            "th": 4, "fr": 5, "sa": 6
        };
        return days[day.toLowerCase()] || -1;
    },

    // Function to prepare course data for schedule generation
    async formatForScheduling(year, semester, dept, course) {
        // Fetch course and section data
        const courseAPIData = await this.getCourseAPI(year, semester, dept, course);
        if (courseAPIData.length === 0) { return null; }

        // Fetch detailed section information
        let sectionArray = [];
        for (let courseSection of courseAPIData) {
            let sectionAPIData = await this.getSectionAPI(year, semester, dept, course, courseSection.value);
            sectionAPIData.instructor = sectionAPIData.instructor || [{ name: "TBA" }];
            sectionArray.push(sectionAPIData);
        }

        var formattedCourseData = {};

        try {
            formattedCourseData = {
                course: [dept, course],
                title: courseAPIData[0].title,
                sections: sectionArray.map((section, index) => {
                    // Skip sections without schedule information
                    if (!section.courseSchedule) {
                        return null;
                    }

                    // Filter out online-only sections
                    const filteredSchedule = section.courseSchedule.filter(timeSlot =>
                        timeSlot.sectionCode !== "OPL"
                    );

                    if (filteredSchedule.length === 0) {
                        return null;
                    }

                    // Format section data
                    return {
                        sectionNum: section.info.section,
                        associatedClass: courseAPIData[index]?.associatedClass,
                        title: courseAPIData[0].title,
                        specialTopic: section.info.specialTopic,
                        deliveryMethod: section.info.deliveryMethod,
                        professor: section.instructor.map(prof => prof.name).join(", "),
                        sectionCode: courseAPIData[index]?.sectionCode,
                        times: filteredSchedule.flatMap(timeSlot =>
                            timeSlot.days !== "" ? timeSlot.days.split(", ").map(day => [
                                this.convert2DigitDayToNumber(day),
                                ...timeSlot.startTime.split(":").map(Number),
                                ...timeSlot.endTime.split(":").map(Number),
                                timeSlot.campus,
                                timeSlot.startDate,
                                timeSlot.endDate
                            ]) : [[7, 0, 0, 0, 0, "Online", timeSlot.startDate,
                                timeSlot.endDate]]
                        ),
                    };
                }).filter(section => section !== null) // Remove null entries
            };
        } catch (error) {
            console.error("Error in formatting course data:", error);
        }

        return formattedCourseData;
    },
    // Function to get the 2 lastest years with semesters
    async getSemesterAndYear(){
        const response = await fetch('https://www.sfu.ca/bin/wcm/course-outlines?');
        const content = await response.json();
        const lastTwoYears = content.slice(-2);
        const yearData = {};
        for(let i = 0; i < lastTwoYears.length; i++){
            const temp = lastTwoYears[i].text;
            const res = await fetch(`https://www.sfu.ca/bin/wcm/course-outlines?${temp}`);
            const cont = await res.json();
            // console.log(cont);
            const seasons = cont.map(season => season.value); // ['fall', 'spring', 'summer']
            if(!this.APIdata.has(temp)){
                this.APIdata.set(temp, seasons); // Store the year and the array of seasons
            }
            yearData[temp] = seasons;
        }
        return yearData;
    },
};

// SearchbarModel - Handles course search functionality
const SearchbarModel = {
    // Helper function to retrieve selected semester
    getSemesterFromUser(){
        const selectedSemester = localStorage.getItem('selectedSemester');
        const [year,semester] = selectedSemester.split(" ");
        return [year,semester];
    },

    courses: [],
    async getAllCourseDeptasArray() {
        const [year,sem] = this.getSemesterFromUser();
        const response = await fetch(`https://www.sfu.ca/bin/wcm/course-outlines?${year}/${sem}/`);
        const content = await response.json();
        return Object.keys(content).map(key => content[key].text);
    },

    async getCourseCourses() {
        const [year,sem] = this.getSemesterFromUser();
        // Fetch course data if it doesn't exist yet
        if (this.courses.length === 0) {
            const deptarr = await this.getAllCourseDeptasArray(year,sem);
            const urlbase = `https://www.sfu.ca/bin/wcm/course-outlines?${year}/${sem}/`;

            // Array of fetch promises for all departments
            const fetchPromises = deptarr.map(dept =>
                fetch(urlbase.concat(dept)).then(response => response.json())
            );

            // Wait for all fetches to complete
            const results = await Promise.all(fetchPromises);

            // Loop through results and gather courses for each department
            results.forEach((content, index) => {
                for (let key in content) {
                    if (content[key].text) {
                        this.courses.push(deptarr[index].concat(" ", content[key].text));
                    }
                }
            });
        }
        return this.courses;
    },
};

// ScheduleModel: Handles schedule generation and validation
const ScheduleModel = {

    // Function to format the schedule for display
    formatForDisplay(schedule) {
        let courses = [];

        for (let course of schedule) {
            let name = course[course.length - 1].course.join(' ');

            // Check if course already exists in the array
            let courseExists = courses.some(existingCourse => existingCourse.name === name);

            if (!courseExists) {
                // Create new course entry
                let courseData = {
                    name: name,
                    title: course[course.length - 1].title,
                    deliveryMethod: course[course.length - 1].deliveryMethod,
                    locations: [course[course.length - 1].location],
                    instructor: course[course.length - 1].professor,
                    sectionTimes: []
                };
                courses.push(courseData);
            }

            // Add section times to existing course
            let courseData = courses.find(existingCourse => existingCourse.name === name);

            // Add location if it's not already included
            if (course[course.length - 1].location !== "Unknown" &&
                !courseData.locations.includes(course[course.length - 1].location)) {
                courseData.locations.push(course[course.length - 1].location);
            }

            // Add section times
            for (let time of course.slice(0, course.length - 1)) {
                courseData.sectionTimes.push({
                    sectionNum: course[course.length - 1].sectionNum,
                    sectionCode: course[course.length - 1].sectionCode,
                    times: convertTime(time)
                });
            }
        }

        return courses;

        // Helper function that converts day number to day name
        function getDay(number) {
            const dayMap = {
                0: "Sunday",
                1: "Monday",
                2: "Tuesday",
                3: "Wednesday",
                4: "Thursday",
                5: "Friday",
                6: "Saturday",
            };
            return dayMap[number] || "Online";
        }

        // Helper function that adds the day/time keys to the data as an object
        function convertTime(time) {
            return {
                weekday: getDay(time[0]),
                startTime: `${time[1]}:${time[2]}`,
                endTime: `${time[3]}:${time[4]}`
            };
        }
    },

    // Recursive function to generate all valid schedules
    findValidSchedules(schedules, courses, idx) {
        if (idx >= courses.length) {
            return schedules;
        }

        let newSchedules = [];
        let course = courses[idx];

        // Group sections by their type
        let primarySections = course.sections.filter(s => isPrimarySection(s));
        let secondarySections = course.sections.filter(s => isSecondarySection(s));
        let totalAssociatedSections = [];

        // Filter out OLC sections if there is already a LEC section with the same section code (In this case the OLC section is considered secondary)
        if (primarySections.some(section => section.sectionCode === "LEC")) {
            primarySections = primarySections.filter(section => section.sectionCode !== "OLC" && section.sectionCode !== "STD");
        }
        else {
            secondarySections = secondarySections.filter(section => section.sectionCode !== "OLC" && section.sectionCode !== "STD");
        }

        if (primarySections.length > 0) {

            // Handle courses with primary sections (LEC or OLC)
            for (let primarySection of primarySections) {
                for (let schedule of schedules) {

                    // Find associated secondary sections, and add them to the total associated sections list
                    let associatedSections = secondarySections.filter(section =>
                        section.associatedClass === primarySection.associatedClass
                    );
                    totalAssociatedSections.push(...associatedSections);

                    // Add primary section to the schedule if it fits
                    if (sectionFits(primarySection, schedule)) {
                        let newSchedule = addToSchedule(schedule, primarySection, course.course);

                        // Add associated sections to the schedule
                        let schedulesWithAssociated = addAssociatedSections(newSchedule, associatedSections, course);
                        newSchedules.push(...schedulesWithAssociated);
                    }
                }
            }
        }

        // Handle courses with only secondary sections. This is checked by comparing the total number of associated secondary sections with a primary component to the total number of secondary sections
        if (totalAssociatedSections.length !== secondarySections.length) {
            let remainingSecondaries = secondarySections.filter(section => !totalAssociatedSections.includes(section));

            // Group remaining secondaries by associatedClass, I haven't seen a course with multiple secondary sections but no primary yet, but this should work for that case
            let secondaryGroups = remainingSecondaries.reduce((groups, section) => {
                if (!groups[section.associatedClass]) {
                    groups[section.associatedClass] = [];
                }
                groups[section.associatedClass].push(section);
                return groups;
            }, {});

            // Add each groups's sections to each schedule
            for (let schedule of schedules) {
                for (let groupKey in secondaryGroups) {
                    let groupSections = secondaryGroups[groupKey];
                    let schedulesWithAssociated = addAssociatedSections(schedule, groupSections, course);
                    newSchedules.push(...schedulesWithAssociated);
                }
            }
        }
        // No valid schedules found, return empty array
        if (newSchedules.length === 0) {
            return [];
        }

        // Recurse with the next course
        return this.findValidSchedules(newSchedules, courses, idx + 1);

        // Helper function to convert hour:min format to just minutes for easier comparison
        function convertTimeToMinutes(hours, min) {
            return hours * 60 + min;
        }

        // Helper function that checks if a section can fit inside the given schedule
        function sectionFits(section, schedule) {
            for (let timeSlot of section.times) {

                // Split time for easier readability
                let day = timeSlot[0];
                let startMinutes = convertTimeToMinutes(timeSlot[1], timeSlot[2]);
                let endMinutes = convertTimeToMinutes(timeSlot[3], timeSlot[4]);

                for (let existingCourse of schedule) {
                    for (let existingTime of existingCourse.slice(0, -1)) { // Ignore the course data element (just times)
                        // Skip if days don't match; this removes unnecessary loops
                        if (existingTime[0] > day) {
                            break;
                        }
                        if (existingTime[0] < day) {
                            continue;
                        }

                        let existingStartMinutes = convertTimeToMinutes(existingTime[1], existingTime[2]);
                        let existingEndMinutes = convertTimeToMinutes(existingTime[3], existingTime[4]);

                        // Conflict found
                        if ((existingStartMinutes < endMinutes && existingEndMinutes > startMinutes)) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        // Helper function to add a section to a schedule
        function addToSchedule(schedule, section, course) {
            let newSchedule = [...schedule]; // Copy old schedule
            let sectionInfo = [...section.times]; // Add section times
            let courseData = { // Add course data
                course: course,
                sectionNum: section.sectionNum,
                title: section.title + ((section.specialTopic !== "") ? ` - ${section.specialTopic}` : ""),
                professor: section.professor,
                associatedClass: section.associatedClass,
                sectionCode: section.sectionCode,
                deliveryMethod: section.deliveryMethod,
                location: (section.times.find(timeSlot => timeSlot[5] !== undefined) || [])[5] || "Unknown" // Gets the first location found, or "Unknown" if none
            };
            sectionInfo.push(courseData);
            newSchedule.push(sectionInfo);
            return newSchedule;
        }

        // Helper function to try to add all given sections to a schedule
        function addSection(schedules, sections, course) {
            if (sections.length === 0) {
                // If there are no sections, this means that the course does not have any of this associated section type, therefore return the original schedules
                return schedules;
            }
            let newSchedules = [];
            for (let schedule of schedules) {
                for (let section of sections) {
                    if (sectionFits(section, schedule)) {
                        newSchedules.push(addToSchedule(schedule, section, course.course));
                    }
                }
            }
            return newSchedules; // Return all schedules with the new section added
        }

        // Helper functions to determine if a section is primary or secondary. Note: OLC is considered both primary and secondary as it can be part of a blended course (secondary), purely online (primary), or a online class with in-person tutorials (primary)
        // I'm guessing the function of half of these as they are quite obscure - Coleman. In particular, I'm assuming STD (studio) can be primary or secondary and the rest that aren't the normal ones are all secondary
        // Source: https://www.sfu.ca/students/schedules/terminology/
        function isPrimarySection(section) {
            return ["LEC", "OLC", "STD"].includes(section.sectionCode);
        }
        function isSecondarySection(section) {
            return ["TUT", "LAB", "SEM", "OLC", "FLD", "STD", "SEC", "WKS", "INS", "RQL", "PRA", "STL"].includes(section.sectionCode);
        }

        // Helper function to add associated sections to a schedule
        function addAssociatedSections(schedule, associatedSections, course) {
            let scheduleWithAssociated = [schedule];

            // Add each type of secondary sections to the schedule
            for (let sectionType of ["TUT", "LAB", "SEM", "OLC", "FLD", "STD", "SEC", "WKS", "INS", "RQL", "PRA", "STL"]) {
                let sections = associatedSections.filter(s => s.sectionCode === sectionType);
                if (sections.length > 0) {
                    scheduleWithAssociated = addSection(scheduleWithAssociated, sections, course);
                }
            }

            return scheduleWithAssociated;
        }
    },

    // Function to remove duplicate sections and special cases mostly due to holidays
    removeAnomalies(courses) {
        for (let course of courses) {

            // Remove sections where startDate equals endDate (where a day is moved due to a holiday, etc when Monday courses are moved to Tuesdays for Thanksgiving)
            for (let section of course.sections) {
                section.times = section.times.filter(timeSlot => timeSlot[6] !== timeSlot[7]);
            }

            // Remove duplicate sections with the same start and end times
            for (let section of course.sections) {
                let uniqueTimes = [];
                let seenTimes = new Set();

                for (let time of section.times) {
                    let timeString = time.slice(0, 6).join(",");
                    if (!seenTimes.has(timeString)) {
                        seenTimes.add(timeString);
                        uniqueTimes.push(time);
                    }
                }
                section.times = uniqueTimes;
            }

        }
        return courses;
    },

    // Top-level function to generate valid schedules
    getValidSchedules(courses) {
        if (courses.length === 0) {
            return;
        }
        let cleanedCourses = this.removeAnomalies(courses);
        let initialSchedule = [[]];  // Start with an empty schedule
        let validSchedules = this.findValidSchedules(initialSchedule, cleanedCourses, 0);  // Start finding valid schedules

        // Return all valid schedules
        return validSchedules;
    }
};