// Check authentication
var token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
var userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');

if (!token || !userData) {
    window.location.href = 'login.html';
}

var currentUser = JSON.parse(userData);
var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var draggedEnrollmentId = null;
var enrollmentsById = {};
var coursesCache = [];
var coursesById = {};
var tasksCache = [];
var tasksById = {};
var taskCacheLoaded = false;
var calendarTaskCounts = {};

var statusLabels = {
    unaware: 'Unaware',
    aware: 'Aware',
    interested: 'Interested',
    student: 'Student'
};

var iconPaths = {
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-10 7L2 7"></path>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.57 2.61a2 2 0 0 1-.45 2.11L8 9.67a16 16 0 0 0 6.33 6.33l1.23-1.23a2 2 0 0 1 2.11-.45c.84.25 1.72.45 2.61.57A2 2 0 0 1 22 16.92Z"></path>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>',
    note: '<path d="M4 4h16v16H4z"></path><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h5"></path>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M2 12h20"></path>',
    building: '<path d="M3 21h18"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path><path d="M9 8h1"></path><path d="M14 8h1"></path><path d="M9 12h1"></path><path d="M14 12h1"></path><path d="M9 16h1"></path><path d="M14 16h1"></path>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path>',
    tag: '<path d="M20.6 13.2 13.2 20.6a2 2 0 0 1-2.8 0L3 13.2V3h10.2l7.4 7.4a2 2 0 0 1 0 2.8Z"></path><circle cx="7.5" cy="7.5" r=".5"></circle>',
    grip: '<circle cx="9" cy="7" r="1"></circle><circle cx="15" cy="7" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="9" cy="17" r="1"></circle><circle cx="15" cy="17" r="1"></circle>',
    pencil: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    trash: '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>'
};

function iconSvg(name, extraClass) {
    var className = 'icon' + (extraClass ? ' ' + extraClass : '');
    return '<svg viewBox="0 0 24 24" class="' + className + '" aria-hidden="true">' + (iconPaths[name] || '') + '</svg>';
}

function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function getStatusClass(status) {
    return statusLabels[status] ? status : 'unaware';
}

function getPriorityClass(priority) {
    return ['low', 'medium', 'high'].indexOf(priority) >= 0 ? priority : 'medium';
}

function truncateText(value, maxLength) {
    var text = value == null ? '' : String(value);
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

function getDateKey(value) {
    if (!value) return '';
    var raw = String(value);
    var directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) return directMatch[1];
    
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function formatDateValue(value) {
    var key = getDateKey(value);
    if (!key) return 'No due date';
    
    return new Date(key + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function setTaskCache(tasks) {
    tasksCache = Array.isArray(tasks) ? tasks : [];
    tasksById = {};
    calendarTaskCounts = {};
    
    tasksCache.forEach(function(task) {
        tasksById[String(task.id)] = task;
        var dateKey = getDateKey(task.due_date);
        if (dateKey) {
            calendarTaskCounts[dateKey] = (calendarTaskCounts[dateKey] || 0) + 1;
        }
    });
    
    taskCacheLoaded = true;
}

function setEnrollmentCache(enrollments) {
    enrollmentsById = {};
    (Array.isArray(enrollments) ? enrollments : []).forEach(function(enrollment) {
        enrollmentsById[String(enrollment.id)] = enrollment;
    });
}

function setCourseCache(courses) {
    coursesCache = Array.isArray(courses) ? courses : [];
    coursesById = {};
    coursesCache.forEach(function(course) {
        coursesById[String(course.id)] = course;
    });
}

function formatCurrency(value) {
    return '$' + Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

async function refreshTaskCache() {
    const response = await fetch(API_URL + '/crm/tasks', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!response.ok) {
        throw new Error('Could not load tasks');
    }
    
    const data = await response.json();
    setTaskCache(data.tasks);
    return tasksCache;
}

function infoRow(iconName, label, value) {
    return '<div class="info-row">' +
        iconSvg(iconName, 'info-icon') +
        '<div><span class="info-label">' + label + '</span><strong>' + escapeHtml(value || 'N/A') + '</strong></div>' +
        '</div>';
}

function profileField(label, value) {
    return '<div class="profile-row"><span>' + label + '</span><strong>' + escapeHtml(value || 'N/A') + '</strong></div>';
}

function renderClientInfoCard(enrollment, options) {
    options = options || {};
    var status = getStatusClass(enrollment.status);
    var cardClass = 'client-info-card ' + (options.pipeline ? 'pipeline-card' : 'enrollment-card');
    var html = '<article class="' + cardClass + '"';
    
    if (options.pipeline) {
        html += ' draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)" id="enrollment-' + enrollment.id + '" data-id="' + enrollment.id + '" data-status="' + status + '"';
    }
    
    html += '>';
    html += '<div class="client-card-head">';
    html += '<div><span class="card-kicker">Client</span><h4>' + escapeHtml(enrollment.client_name) + '</h4></div>';
    html += '<div class="client-card-head-actions">';
    html += '<span class="status-badge st-' + status + '">' + statusLabels[status] + '</span>';
    html += '<div class="client-card-actions">';
    html += '<button type="button" class="card-icon-btn" onclick="openEditEnrollmentModal(event, ' + enrollment.id + ')" aria-label="Edit client">' + iconSvg('pencil') + '</button>';
    html += '<button type="button" class="card-icon-btn danger" onclick="deleteEnrollment(event, ' + enrollment.id + ')" aria-label="Delete client">' + iconSvg('trash') + '</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="info-list">';
    html += infoRow('mail', 'Email', enrollment.client_email);
    html += infoRow('phone', 'Phone', enrollment.client_phone);
    html += infoRow('pin', 'Source', enrollment.lead_source || 'N/A');
    if (enrollment.status === 'student' && enrollment.course_name) {
        html += infoRow('book', 'Course', enrollment.course_name + ' - ' + formatCurrency(enrollment.course_price));
    }
    if (enrollment.notes) {
        html += infoRow('note', 'Notes', truncateText(enrollment.notes, 80));
    }
    html += '</div>';
    
    if (options.pipeline) {
        html += '<div class="drag-hint">' + iconSvg('grip') + '<span>Drag to update status</span></div>';
    } else {
        html += '<select class="status-select-mini" onchange="updateEnrollmentStatusFromSelect(event, ' + enrollment.id + ')">';
        html += '<option value="unaware"' + (status === 'unaware' ? ' selected' : '') + '>Unaware</option>';
        html += '<option value="aware"' + (status === 'aware' ? ' selected' : '') + '>Aware</option>';
        html += '<option value="interested"' + (status === 'interested' ? ' selected' : '') + '>Interested</option>';
        html += '<option value="student"' + (status === 'student' ? ' selected' : '') + '>Student</option>';
        html += '</select>';
    }
    
    html += '</article>';
    return html;
}

// Display user name
document.getElementById('userNameDisplay').textContent = 
    (currentUser.name || currentUser.company_name || 'User');

// Load initial data
loadDashboardData();
loadCourses();
loadEnrollments();
loadTasks();
loadEnrollmentOptions();

// ============ HEADER NAVIGATION ============
document.querySelectorAll('.nav-page-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
        if (!this.dataset.page) return;
        e.preventDefault();
        
        // Update active link
        document.querySelectorAll('.nav-page-link').forEach(function(l) {
            l.classList.remove('active');
        });
        this.classList.add('active');
        
        // Show corresponding page
        var pageName = this.dataset.page;
        document.querySelectorAll('.dash-page').forEach(function(p) {
            p.classList.remove('active');
        });
        
        var pageEl = document.getElementById(pageName + 'Page');
        if (pageEl) {
            pageEl.classList.add('active');
        }
        
        // Load page-specific data
        if (pageName === 'pipeline') {
            loadPipeline();
        } else if (pageName === 'calendar') {
            renderCalendar();
        } else if (pageName === 'profile') {
            loadProfile();
        }
    });
});

// ============ DASHBOARD DATA ============
async function loadDashboardData() {
    try {
        const response = await fetch(API_URL + '/crm/dashboard/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalClients').textContent = data.stats.totalClients;
            document.getElementById('activeTasks').textContent = data.stats.activeTasks;
            document.getElementById('totalStudents').textContent = data.stats.students;
            document.getElementById('totalProfit').textContent = formatCurrency(data.stats.profit);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============ ENROLLMENTS ============
async function loadCourses() {
    try {
        const response = await fetch(API_URL + '/crm/courses', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.ok) {
            const data = await response.json();
            setCourseCache(data.courses);
            displayCourses(data.courses);
            populateCourseSelects();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function populateCourseSelects() {
    const select = document.getElementById('enrollmentCourse');
    if (!select) return;

    const selectedValue = select.value;
    let html = '<option value="">Select course</option>';
    coursesCache.forEach(function(course) {
        html += '<option value="' + course.id + '">' + escapeHtml(course.name) + ' - ' + formatCurrency(course.price) + '</option>';
    });
    select.innerHTML = html;
    select.value = selectedValue;
}

function displayCourses(courses) {
    const list = document.getElementById('coursesList');
    if (!list) return;

    if (!courses || courses.length === 0) {
        list.innerHTML = '<div class="empty-state">No courses yet. Add one before moving clients to Student.</div>';
        return;
    }

    let html = '';
    courses.forEach(function(course) {
        html += '<div class="course-row">';
        html += '<div class="course-row-main">' + iconSvg('book', 'meta-icon') + '<div><strong>' + escapeHtml(course.name) + '</strong><span>' + formatCurrency(course.price) + '</span></div></div>';
        html += '<div class="course-actions">';
        html += '<button type="button" class="card-icon-btn" onclick="editCourse(' + course.id + ')" aria-label="Edit course">' + iconSvg('pencil') + '</button>';
        html += '<button type="button" class="card-icon-btn danger" onclick="deleteCourse(' + course.id + ')" aria-label="Delete course">' + iconSvg('trash') + '</button>';
        html += '</div>';
        html += '</div>';
    });
    list.innerHTML = html;
}

function resetCourseForm() {
    document.getElementById('courseId').value = '';
    document.getElementById('courseName').value = '';
    document.getElementById('coursePrice').value = '';
    document.getElementById('courseSubmitBtn').textContent = 'Save Course';
}

function editCourse(id) {
    const course = coursesById[String(id)];
    if (!course) return;

    document.getElementById('courseId').value = course.id;
    document.getElementById('courseName').value = course.name;
    document.getElementById('coursePrice').value = course.price;
    document.getElementById('courseSubmitBtn').textContent = 'Save Changes';
    document.getElementById('courseName').focus();
}

async function deleteCourse(id) {
    if (!confirm('Delete this course? Students assigned to it will keep Student status but lose the course price.')) {
        return;
    }

    try {
        const response = await fetch(API_URL + '/crm/courses/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Delete failed');
        }

        showToast('Course deleted', 'success');
        await loadCourses();
        await refreshEnrollmentViews();
    } catch (error) {
        showToast(error.message || 'Error deleting course', 'error');
    }
}

document.getElementById('courseForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const courseId = document.getElementById('courseId').value;
    const data = {
        name: document.getElementById('courseName').value.trim(),
        price: document.getElementById('coursePrice').value
    };

    try {
        const response = await fetch(API_URL + '/crm/courses' + (courseId ? '/' + courseId : ''), {
            method: courseId ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast(courseId ? 'Course updated' : 'Course added', 'success');
            resetCourseForm();
            await loadCourses();
            await refreshEnrollmentViews();
        } else {
            const result = await response.json();
            showToast(result.error || 'Failed to save course', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

async function loadEnrollments() {
    try {
        const response = await fetch(API_URL + '/crm/enrollments', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            setEnrollmentCache(data.enrollments);
            displayEnrollments(data.enrollments);
        }
    } catch (error) {
        console.error('Error loading enrollments:', error);
    }
}

function displayEnrollments(enrollments) {
    const track = document.getElementById('enrollmentsTrack');
    
    if (!enrollments || enrollments.length === 0) {
        track.innerHTML = '<div class="empty-state">No enrollments yet. Click Add Enrollment to create one.</div>';
        return;
    }
    
    let html = '';
    enrollments.forEach(function(e) {
        html += renderClientInfoCard(e);
    });
    track.innerHTML = html;
}

function scrollEnrollments(direction) {
    const track = document.getElementById('enrollmentsTrack');
    if (!track) return;
    const scrollAmount = Math.min(380, Math.max(280, track.clientWidth * 0.75));
    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

async function updateEnrollmentStatus(id, status, options) {
    options = options || {};
    try {
        const response = await fetch(API_URL + '/crm/enrollments/' + id + '/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                status: status,
                course_id: options.course_id || null
            })
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Status update failed');
        }
        showToast('Status updated!', 'success');
        if (!options.skipReload) {
            await refreshEnrollmentViews();
        }
    } catch (error) {
        showToast(error.message || 'Error updating status', 'error');
    }
}

function updateEnrollmentStatusFromSelect(event, id) {
    const select = event.target;
    const status = select.value;
    const enrollment = enrollmentsById[String(id)];
    const courseId = enrollment ? enrollment.course_id : null;

    if (status === 'student' && !courseId) {
        if (enrollment) {
            openEnrollmentModal(Object.assign({}, enrollment, { status: 'student' }));
            select.value = getStatusClass(enrollment.status);
        }
        showToast('Select a course for this student', 'error');
        return;
    }

    updateEnrollmentStatus(id, status, { course_id: courseId });
}

function resetEnrollmentForm() {
    document.getElementById('enrollmentId').value = '';
    document.getElementById('enrollmentForm').reset();
    document.getElementById('enrollmentModalTitle').textContent = 'New Enrollment';
    document.getElementById('enrollmentSubmitBtn').textContent = 'Save Enrollment';
    toggleEnrollmentCourseField();
}

function openEnrollmentModal(enrollment) {
    resetEnrollmentForm();
    populateCourseSelects();

    if (enrollment) {
        document.getElementById('enrollmentId').value = enrollment.id;
        document.getElementById('clientName').value = enrollment.client_name || '';
        document.getElementById('clientEmail').value = enrollment.client_email || '';
        document.getElementById('clientPhone').value = enrollment.client_phone || '';
        document.getElementById('leadSource').value = enrollment.lead_source || '';
        document.getElementById('enrollmentStatus').value = getStatusClass(enrollment.status);
        document.getElementById('enrollmentCourse').value = enrollment.course_id || '';
        document.getElementById('clientNotes').value = enrollment.notes || '';
        document.getElementById('enrollmentModalTitle').textContent = 'Edit Enrollment';
        document.getElementById('enrollmentSubmitBtn').textContent = 'Save Changes';
        toggleEnrollmentCourseField();
    }

    document.getElementById('enrollmentModal').style.display = 'block';
}

function toggleEnrollmentCourseField() {
    const group = document.getElementById('enrollmentCourseGroup');
    const status = document.getElementById('enrollmentStatus').value;
    if (!group) return;

    group.style.display = status === 'student' ? 'block' : 'none';
    document.getElementById('enrollmentCourse').required = status === 'student';
}

function closeEnrollmentModal() {
    document.getElementById('enrollmentModal').style.display = 'none';
    resetEnrollmentForm();
}

function openEditEnrollmentModal(event, id) {
    event.stopPropagation();
    const enrollment = enrollmentsById[String(id)];
    if (!enrollment) {
        showToast('Client details are still loading', 'error');
        return;
    }

    openEnrollmentModal(enrollment);
}

async function refreshEnrollmentViews() {
    loadDashboardData();
    await loadEnrollments();
    loadEnrollmentOptions();
    if (document.getElementById('pipelinePage').classList.contains('active')) {
        await loadPipeline();
    }
}

async function deleteEnrollment(event, id) {
    event.stopPropagation();
    if (!confirm('Delete this client card? Linked tasks will stay, but the client link will be removed.')) {
        return;
    }

    try {
        const response = await fetch(API_URL + '/crm/enrollments/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Delete failed');
        }

        showToast('Client deleted', 'success');
        await refreshEnrollmentViews();
        if (taskCacheLoaded) {
            await loadTasks();
            if (document.getElementById('calendarPage').classList.contains('active')) {
                await renderCalendar();
            }
        }
    } catch (error) {
        showToast(error.message || 'Error deleting client', 'error');
    }
}

document.getElementById('enrollmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const enrollmentId = document.getElementById('enrollmentId').value;
    
    const data = {
        client_name: document.getElementById('clientName').value.trim(),
        client_email: document.getElementById('clientEmail').value.trim(),
        client_phone: document.getElementById('clientPhone').value.trim(),
        lead_source: document.getElementById('leadSource').value,
        status: document.getElementById('enrollmentStatus').value,
        course_id: document.getElementById('enrollmentCourse').value || null,
        notes: document.getElementById('clientNotes').value.trim()
    };
    
    try {
        const response = await fetch(API_URL + '/crm/enrollments' + (enrollmentId ? '/' + enrollmentId : ''), {
            method: enrollmentId ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(enrollmentId ? 'Client updated!' : 'Enrollment added!', 'success');
            closeEnrollmentModal();
            await refreshEnrollmentViews();
        } else {
            const result = await response.json();
            showToast(result.error || 'Failed to save enrollment', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

// ============ TASKS ============
async function loadTasks() {
    try {
        const tasks = await refreshTaskCache();
        displayTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function renderTaskRow(task, options) {
    options = options || {};
    tasksById[String(task.id)] = Object.assign({}, tasksById[String(task.id)] || {}, task);
    
    const checked = task.status === 'completed' ? ' checked' : '';
    const completedClass = task.status === 'completed' ? ' task-done' : '';
    const priority = getPriorityClass(task.priority);
    let dueDateHtml = '';
    if (task.due_date && !options.hideDate) {
        dueDateHtml = '<span class="task-date">' + iconSvg('calendar', 'meta-icon') + formatDateValue(task.due_date) + '</span>';
    }
    let clientHtml = '';
    if (task.client_name) {
        clientHtml = '<span class="task-client-tag">' + iconSvg('user', 'meta-icon') + escapeHtml(task.client_name) + '</span>';
    }
    
    let html = '<div class="task-row' + completedClass + '" role="button" tabindex="0" onclick="openTaskDetail(' + task.id + ')" onkeydown="openTaskDetailFromKey(event, ' + task.id + ')">';
    if (!options.noCheckbox) {
        html += '<div class="task-check-wrap" onclick="event.stopPropagation()"><input class="task-checkbox-round" type="checkbox"' + checked + ' onclick="event.stopPropagation()" onchange="toggleTask(' + task.id + ', this.checked)"></div>';
    }
    html += '<span class="task-prio-strip prio-strip-' + priority + '"></span>';
    html += '<div class="task-info">';
    html += '<span class="task-row-title">' + escapeHtml(task.title) + '</span>';
    html += '<div class="task-row-meta">';
    html += dueDateHtml;
    html += clientHtml;
    html += '<span class="task-prio-tag prio-' + priority + '">' + priority + '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
}

function displayTasks(tasks) {
    const todoList = document.getElementById('todoList');
    
    if (!tasks || tasks.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No tasks yet. Add your first task!</div>';
        return;
    }
    
    let html = '';
    tasks.forEach(function(task) {
        html += renderTaskRow(task);
    });
    todoList.innerHTML = html;
}

function openTaskDetailFromKey(event, id) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTaskDetail(id);
    }
}

function detailRow(iconName, label, value) {
    return '<div class="task-detail-row">' +
        iconSvg(iconName, 'task-detail-icon') +
        '<div><span>' + label + '</span><strong>' + escapeHtml(value || 'N/A') + '</strong></div>' +
        '</div>';
}

function openTaskDetail(id) {
    const task = tasksById[String(id)];
    if (!task) {
        showToast('Task details are still loading', 'error');
        return;
    }
    
    const priority = getPriorityClass(task.priority);
    const status = task.status || 'pending';
    const statusClass = status === 'completed' ? 'completed' : 'pending';
    const description = task.description && String(task.description).trim()
        ? escapeHtml(task.description)
        : 'No description added.';
    
    let html = '<div class="task-detail-summary">';
    html += '<div class="task-detail-badges">';
    html += '<span class="task-prio-tag prio-' + priority + '">' + priority + '</span>';
    html += '<span class="task-status-chip task-status-' + statusClass + '">' + escapeHtml(status) + '</span>';
    html += '</div>';
    html += '<h4>' + escapeHtml(task.title) + '</h4>';
    html += '</div>';
    
    html += '<div class="task-detail-grid">';
    html += detailRow('calendar', 'Due date', formatDateValue(task.due_date));
    html += detailRow('user', 'Client', task.client_name || 'Not linked');
    html += detailRow('mail', 'Client email', task.client_email || 'N/A');
    html += detailRow('note', 'Created', task.created_at ? formatDateValue(task.created_at) : 'N/A');
    html += '</div>';
    
    html += '<div class="task-detail-notes">';
    html += '<span>Description</span>';
    html += '<p>' + description + '</p>';
    html += '</div>';
    
    document.getElementById('taskDetailBody').innerHTML = html;
    document.getElementById('taskDetailModal').style.display = 'block';
}

function closeTaskDetailModal() {
    document.getElementById('taskDetailModal').style.display = 'none';
}

async function toggleTask(id, completed) {
    try {
        await fetch(API_URL + '/crm/tasks/' + id + '/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ status: completed ? 'completed' : 'pending' })
        });
        loadDashboardData();
        await loadTasks();
        if (document.getElementById('calendarPage').classList.contains('active')) {
            await renderCalendar();
        }
    } catch (error) {
        showToast('Error updating task', 'error');
    }
}

async function loadEnrollmentOptions() {
    try {
        const response = await fetch(API_URL + '/crm/enrollments', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('taskEnrollment');
            select.innerHTML = '<option value="">No client linked</option>';
            data.enrollments.forEach(function(e) {
                select.innerHTML += '<option value="' + e.id + '">' + escapeHtml(e.client_name) + ' (' + escapeHtml(e.client_email) + ')</option>';
            });
        }
    } catch (error) {
        console.error('Error loading enrollment options:', error);
    }
}

function openTaskModal() {
    loadEnrollmentOptions();
    document.getElementById('taskModal').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        due_date: document.getElementById('taskDueDate').value,
        enrollment_id: document.getElementById('taskEnrollment').value || null
    };
    
    try {
        const response = await fetch(API_URL + '/crm/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Task added!', 'success');
            closeTaskModal();
            document.getElementById('taskForm').reset();
            loadDashboardData();
            await loadTasks();
            if (document.getElementById('calendarPage').classList.contains('active')) {
                await renderCalendar();
            }
        } else {
            const result = await response.json();
            showToast(result.error || 'Failed to add task', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

// ============ PIPELINE WITH DRAG & DROP ============
async function loadPipeline() {
    try {
        const response = await fetch(API_URL + '/crm/enrollments', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            setEnrollmentCache(data.enrollments);
            displayPipeline(data.enrollments);
        }
    } catch (error) {
        console.error('Error loading pipeline:', error);
    }
}

function displayPipeline(enrollments) {
    const statuses = ['unaware', 'aware', 'interested', 'student'];
    
    statuses.forEach(function(status) {
        const column = document.getElementById(status + 'Cards');
        const filtered = enrollments.filter(function(e) { return e.status === status; });
        const count = document.getElementById(status + 'Count');
        if (count) {
            count.textContent = filtered.length;
        }
        
        let html = '';
        if (filtered.length === 0) {
            html = '<div class="pipeline-empty">No clients in this stage</div>';
        } else {
            filtered.forEach(function(e) {
                html += renderClientInfoCard(e, { pipeline: true });
            });
        }
        column.innerHTML = html;
    });
}

function allowDrop(event) {
    event.preventDefault();
    const column = event.currentTarget || event.target.closest('.pipe-col');
    if (column) {
        column.classList.add('drag-over');
    }
}

function clearDropTarget(event) {
    const column = event.currentTarget || event.target.closest('.pipe-col');
    if (column && (!event.relatedTarget || !column.contains(event.relatedTarget))) {
        column.classList.remove('drag-over');
    }
}

function drag(event) {
    const card = event.target.closest('.pipeline-card');
    draggedEnrollmentId = card.dataset.id;
    event.dataTransfer.setData("text", draggedEnrollmentId);
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
}

function dragEnd(event) {
    const card = event.target.closest('.pipeline-card');
    if (card) {
        card.classList.remove('is-dragging');
    }
    document.querySelectorAll('.pipe-col.drag-over').forEach(function(column) {
        column.classList.remove('drag-over');
    });
}

async function drop(event) {
    event.preventDefault();
    const column = event.currentTarget || event.target.closest('.pipe-col');
    if (!column) return;
    column.classList.remove('drag-over');
    
    const newStatus = column.dataset.status;
    const enrollmentId = event.dataTransfer.getData("text") || draggedEnrollmentId;
    
    if (enrollmentId && newStatus) {
        const enrollment = enrollmentsById[String(enrollmentId)];
        const courseId = enrollment ? enrollment.course_id : null;
        if (newStatus === 'student' && !courseId) {
            if (enrollment) {
                openEnrollmentModal(Object.assign({}, enrollment, { status: 'student' }));
            }
            showToast('Select a course for this student', 'error');
            return;
        }

        await updateEnrollmentStatus(enrollmentId, newStatus, { skipReload: true, course_id: courseId });
        loadDashboardData();
        loadPipeline();
        loadEnrollments();
    }
}

// ============ CALENDAR ============
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

async function renderCalendar() {
    if (!taskCacheLoaded) {
        try {
            await refreshTaskCache();
        } catch (error) {
            console.error('Error loading calendar task counts:', error);
        }
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonth').textContent = monthNames[currentMonth] + ' ' + currentYear;
    
    const grid = document.getElementById('calendarGrid');
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let html = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(function(day) {
        html += '<div class="calendar-day-header">' + day + '</div>';
    });
    
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const selectedDateValue = document.getElementById('quickTaskDate').value || todayStr;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const selectedClass = dateStr === selectedDateValue ? ' selected' : '';
        const todayClass = dateStr === todayStr ? ' today' : '';
        const taskCount = calendarTaskCounts[dateStr] || 0;
        const countClass = taskCount > 0 ? ' has-tasks' : '';
        const taskLabel = taskCount === 1 ? '1 task' : taskCount + ' tasks';
        html += '<button type="button" class="calendar-day' + selectedClass + todayClass + countClass + '" data-date="' + dateStr + '" aria-label="' + day + ', ' + taskLabel + '" onclick="selectDate(\'' + dateStr + '\')">';
        html += '<span class="calendar-day-number">' + day + '</span>';
        if (taskCount > 0) {
            html += '<span class="calendar-task-count">' + taskCount + '</span>';
        }
        html += '</button>';
    }
    
    grid.innerHTML = html;
    await selectDate(selectedDateValue);
}

async function selectDate(date) {
    const parsedDate = new Date(date + 'T00:00:00');
    document.getElementById('selectedDate').textContent = parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    document.getElementById('quickTaskDate').value = date;
    
    document.querySelectorAll('.calendar-day').forEach(function(day) {
        day.classList.remove('selected');
    });
    const selectedDay = document.querySelector('[data-date="' + date + '"]');
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    try {
        const response = await fetch(API_URL + '/crm/calendar?date=' + date, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayDayTasks(data.tasks);
        }
    } catch (error) {
        console.error('Error loading calendar tasks:', error);
    }
}

function displayDayTasks(tasks) {
    const container = document.getElementById('dayTasks');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks for this day</div>';
        return;
    }
    
    let html = '';
    tasks.forEach(function(task) {
        html += renderTaskRow(task, { noCheckbox: true, hideDate: true });
    });
    container.innerHTML = html;
}

document.getElementById('quickTaskForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectedDate = document.getElementById('quickTaskDate').value;
    const data = {
        title: document.getElementById('quickTaskTitle').value.trim(),
        description: document.getElementById('quickTaskDescription').value.trim(),
        priority: document.getElementById('quickTaskPriority').value,
        due_date: selectedDate,
        enrollment_id: null
    };
    
    if (!data.title) {
        showToast('Enter a task title', 'error');
        return;
    }
    
    if (!selectedDate) {
        showToast('Select a date first', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/crm/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Task added!', 'success');
            document.getElementById('quickTaskForm').reset();
            document.getElementById('quickTaskDate').value = selectedDate;
            loadDashboardData();
            await loadTasks();
            await renderCalendar();
        } else {
            const result = await response.json();
            showToast(result.error || 'Failed to add task', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

// ============ PROFILE ============
async function loadProfile() {
    try {
        const response = await fetch(API_URL + '/users/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayProfile(data.user);
            displayTeamMembers(data.teamMembers);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function displayProfile(user) {
    const profileDiv = document.getElementById('profileInfo');
    
    if (user.position !== undefined) {
        profileDiv.innerHTML = '<div class="profile-summary">' +
            '<div class="profile-avatar">' + iconSvg('user') + '</div>' +
            '<div><span>Individual Account</span><h3>' + escapeHtml(user.name) + '</h3><p>' + escapeHtml(user.position || 'Staff') + '</p></div>' +
            '</div>' +
            '<div class="profile-details">' +
            profileField('Email', user.email) +
            profileField('Phone', user.phone) +
            profileField('Institution', user.institution_name || 'Not linked') +
            profileField('Member since', new Date(user.created_at).toLocaleDateString()) +
            '</div>';
    } else {
        profileDiv.innerHTML = '<div class="profile-summary">' +
            '<div class="profile-avatar">' + iconSvg('building') + '</div>' +
            '<div><span>Company Account</span><h3>' + escapeHtml(user.company_name) + '</h3><p>' + escapeHtml(user.owner_name || 'Account owner') + '</p></div>' +
            '</div>' +
            '<div class="profile-details">' +
            profileField('Email', user.email) +
            profileField('Company phone', user.company_phone) +
            profileField('Owner phone', user.owner_phone) +
            profileField('Team size', (user.team_size || 0) + ' members') +
            profileField('Member since', new Date(user.created_at).toLocaleDateString()) +
            '</div>';
    }
}

function displayTeamMembers(members) {
    const teamDiv = document.getElementById('teamMembers');
    
    if (!members || members.length === 0) {
        teamDiv.innerHTML = '<div class="empty-state">No team members yet</div>';
        return;
    }
    
    let html = '';
    members.forEach(function(member) {
        html += '<div class="team-card">';
        html += '<h4>' + escapeHtml(member.name) + '</h4>';
        html += '<p>' + iconSvg('mail', 'meta-icon') + escapeHtml(member.email) + '</p>';
        html += '<p>' + iconSvg('phone', 'meta-icon') + escapeHtml(member.phone) + '</p>';
        html += '<p>' + iconSvg('briefcase', 'meta-icon') + escapeHtml(member.position || 'Staff') + '</p>';
        html += '</div>';
    });
    teamDiv.innerHTML = html;
}

// Change Password
document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value
    };
    
    try {
        const response = await fetch(API_URL + '/users/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showToast(result.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}
