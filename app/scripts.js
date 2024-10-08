

document.addEventListener('DOMContentLoaded', function() {
    let tasks = [];
    let calendarEvents = [];
    let calendar; 
    let db; 

    const firebaseConfig = {
        apiKey: "AIzaSyChTGhYEr5eOoJXlMmjz5-pQdVZdsObfuA",
        authDomain: "study-turtles-9ec95.firebaseapp.com",
        projectId: "study-turtles-9ec95",
        storageBucket: "study-turtles-9ec95.appspot.com",
        messagingSenderId: "457875965283",
        appId: "1:457875965283:web:30133a5652b85d0be7bf56"
      };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    const calendarEl = document.getElementById('calendarView');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: calendarEvents,
        selectable: true,
        editable: true,
        eventDrop: function(info) {
            updateEvent(info.event);
        },
        eventResize: function(info) {
            updateEvent(info.event);
        }
    });

    calendar.render();
    calendar.updateSize();

    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginButton').textContent = 'Logout';
            document.getElementById('loginButton').onclick = logout;
            loadUserData(user);
            showSection('input');
        } else {
            document.getElementById('loginButton').textContent = 'Login';
            document.getElementById('loginButton').onclick = () => showSection('login');
            showSection('login');
        }
    });

    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                alert('Login Successful!');
                showSection('input');
            })
            .catch(error => {
                alert('Login Failed: ' + error.message);
            });
    });

    document.getElementById('signupForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('emailSignup').value;
        const password = document.getElementById('passwordSignup').value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                alert('Signup Successful! Please log in.');
                showSection('login');
            })
            .catch(error => {
                alert('Signup Failed: ' + error.message);
            });
    });

    document.getElementById('taskForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskTime = parseInt(document.getElementById('taskTime').value);
        const taskType = document.getElementById('taskType').value;
        const taskDate = document.getElementById('taskDate').value;

        const task = {
            id: generateId(),
            name: taskName,
            time: taskTime,
            type: taskType,
            date: taskDate
        };
        if (taskType === 'assignment') {
            scheduleAssignment(task);
        } else if (taskType === 'test') {
            scheduleTest(task);
        }
        addTaskToList(task);
        saveTasks();
        alert('Task Scheduled!');
        document.getElementById('taskForm').reset();
    });

    document.getElementById('settingsForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const sidebarColor = document.getElementById('sidebarColor').value;
        const contentColor = document.getElementById('contentColor').value;
        const textColor = document.getElementById('textColor').value;

        document.querySelector('.sidebar').style.backgroundColor = sidebarColor;
        document.querySelector('.content').style.backgroundColor = contentColor;
        document.documentElement.style.setProperty('--text-color', textColor);

        saveSettings();
        alert('Settings Saved!');
    });

    // fun ctions
    window.showSection = function showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
        document.getElementById(sectionId).classList.add('active');
        if (sectionId === 'calendar') {
            calendar.render();
            calendar.updateSize();
        }
    }

    window.logout = function logout() {
        auth.signOut().then(() => {
            document.getElementById('loginButton').textContent = 'Login';
            showSection('login');
        });
    }

    function generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    function addTaskToList(task) {
        tasks.push(task);
        renderTaskList();
    }

    function renderTaskList() {
        const taskListView = document.getElementById('taskListView');
        taskListView.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <label>Task Name:</label>
                <input type="text" value="${task.name}" data-id="${task.id}" data-field="name" onchange="updateTask(this)">
                <label>Estimated Time (hours):</label>
                <input type="number" value="${task.time}" data-id="${task.id}" data-field="time" onchange="updateTask(this)">
                <label>Task Type:</label>
                <select data-id="${task.id}" data-field="type" onchange="updateTask(this)">
                    <option value="assignment" ${task.type === 'assignment' ? 'selected' : ''}>Assignment</option>
                    <option value="test" ${task.type === 'test' ? 'selected' : ''}>Test</option>
                </select>
                <label>Due Date/Test Date (YYYY-MM-DDTHH:MM):</label>
                <input type="datetime-local" value="${task.date}" data-id="${task.id}" data-field="date" onchange="updateTask(this)">
                <button onclick="deleteTask('${task.id}')">Delete Task</button>
            `;
            taskListView.appendChild(taskItem);
        });
    }

    function updateTask(element) {
        const taskId = element.getAttribute('data-id');
        const field = element.getAttribute('data-field');
        const value = field === 'time' ? parseInt(element.value) : element.value;

        const task = tasks.find(task => task.id === taskId);
        task[field] = value;

        calendar.getEvents().forEach(event => {
            if (event.id === taskId) {
                event.remove();
            }
        });
        if (task.type === 'assignment') {
            scheduleAssignment(task);
        } else if (task.type === 'test') {
            scheduleTest(task);
        }
        saveTasks();
    }

    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        calendar.getEvents().forEach(event => {
            if (event.id === taskId) {
                event.remove();
            }
        });
        renderTaskList();
        saveTasks();
    }

    function saveTasks() {
        const user = auth.currentUser;
        if (user) {
            db.collection('users').doc(user.uid).set({
                tasks: tasks
            }, { merge: true });
    
            const calendarEvents = calendar.getEvents().map(event => ({
                id: event.id,
                title: event.title,
                start: event.start.toISOString(),
                end: event.end.toISOString(),
                color: event.backgroundColor
            }));
    
            db.collection('users').doc(user.uid).set({
                events: calendarEvents
            }, { merge: true });
        }
    }

    function loadUserData(user) {
        db.collection('users').doc(user.uid).get().then((docSnapshot) => {
            if (docSnapshot.exists) {
                const data = docSnapshot.data();
    
                tasks = data.tasks || [];
                renderTaskList();
    
                calendar.getEvents().forEach(event => event.remove());
    
                const calendarEvents = data.events || [];
                calendarEvents.forEach(eventData => {
                    calendar.addEvent({
                        id: eventData.id,
                        title: eventData.title,
                        start: eventData.start,
                        end: eventData.end,
                        color: eventData.color
                    });
                });
    
                const settings = data.settings || {};
                document.getElementById('sidebarColor').value = settings.sidebarColor || '#cfecec';
                document.getElementById('contentColor').value = settings.contentColor || '#e0f7fa';
                document.getElementById('textColor').value = settings.textColor || '#000000';
                document.querySelector('.sidebar').style.backgroundColor = settings.sidebarColor || '#cfecec';
                document.querySelector('.content').style.backgroundColor = settings.contentColor || '#e0f7fa';
                document.documentElement.style.setProperty('--text-color', settings.textColor || '#000000');
            }
        });
    }
    function addTaskToCalendar(task) {
        let eventColor = task.type === 'assignment' ? '#4db6ac' : '#ffcc80'; 
    
        calendar.addEvent({
            id: task.id,
            title: task.name,
            start: new Date(task.date),
            end: new Date(new Date(task.date).getTime() + task.time * 60 * 60 * 1000), 
            color: eventColor
        });
    }
    
    function saveSettings() {
        const user = auth.currentUser;
        if (user) {
            const settings = {
                sidebarColor: document.getElementById('sidebarColor').value,
                contentColor: document.getElementById('contentColor').value,
                textColor: document.getElementById('textColor').value
            };
            db.collection('users').doc(user.uid).set({
                settings: settings
            }, { merge: true });
        }
    }

    function scheduleAssignment(task) {
        let totalHours = task.time;
        const dueDate = new Date(task.date);
        let currentDate = new Date();

        while (totalHours > 0 && currentDate < dueDate) {
            const startOfDay = new Date(currentDate);
            startOfDay.setHours(9, 0, 0, 0);
            const endOfDay = new Date(currentDate);
            endOfDay.setHours(17, 0, 0, 0);

            for (let hour = 9; hour < 17 && totalHours > 0; hour++) {
                const startDate = new Date(currentDate);
                startDate.setHours(hour, 0, 0, 0);
                const endDate = new Date(startDate.getTime());
                endDate.setHours(startDate.getHours() + 1);

                if (!hasEventConflict(startDate, endDate)) {
                    const event = {
                        id: task.id,
                        title: task.name,
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        color: '#4db6ac'
                    };
                    calendar.addEvent(event);
                    calendarEvents.push(event);
                    totalHours -= 1;
                    if (totalHours > 2) break; 
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    function scheduleTest(task) {
        const totalHours = task.time;
        const dueDate = new Date(task.date);
        const learningHours = Math.floor(totalHours * 0.3);
        const studyHours = Math.floor(totalHours * 0.5);
        const practiceHours = totalHours - learningHours - studyHours;

        const sessions = [
            { title: `${task.name} - Learning`, hours: learningHours, color: '#ffcc80' },
            { title: `${task.name} - Study`, hours: studyHours, color: '#ffab40' },
            { title: `${task.name} - Practice Test`, hours: practiceHours, color: '#ff9100' }
        ];

        let currentDate = new Date();
        const practiceTestStartDate = new Date(dueDate);
        practiceTestStartDate.setDate(practiceTestStartDate.getDate() - 3);

        sessions.forEach(session => {
            let hoursLeft = session.hours;
            let startDate = currentDate;

            while (hoursLeft > 0 && currentDate < dueDate) {
                const startOfDay = new Date(startDate);
                startOfDay.setHours(9, 0, 0, 0);
                const endOfDay = new Date(startDate);
                endOfDay.setHours(17, 0, 0, 0);

                for (let hour = 9; hour < 17 && hoursLeft > 0; hour++) {
                    const startDateTime = new Date(startDate);
                    startDateTime.setHours(hour, 0, 0, 0);
                    const endDateTime = new Date(startDateTime.getTime());
                    endDateTime.setHours(startDateTime.getHours() + 1);

                    if (!hasEventConflict(startDateTime, endDateTime)) {
                        const event = {
                            id: task.id,
                            title: session.title,
                            start: startDateTime.toISOString(),
                            end: endDateTime.toISOString(),
                            color: session.color
                        };
                        calendar.addEvent(event);
                        calendarEvents.push(event);
                        hoursLeft -= 1;
                        if (session.title.includes('Study') && hoursLeft > 1) break; 
                    }
                }
                if (session.title.includes('Practice Test')) {
                    startDate.setDate(startDate.getDate() + 1); 
                } else {
                    startDate.setDate(startDate.getDate() + 2); 
                }
            }
        });
    }

    function hasEventConflict(startDate, endDate) {
        return calendar.getEvents().some(event => {
            return (startDate < new Date(event.end) && endDate > new Date(event.start));
        });
    }

    function updateEvent(event) {
        const updatedEvent = calendarEvents.find(e => e.id === event.id);
        if (updatedEvent) {
            updatedEvent.start = event.start.toISOString();
            updatedEvent.end = event.end.toISOString();
        }
    }
});