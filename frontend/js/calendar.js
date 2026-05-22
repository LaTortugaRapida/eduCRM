// Check authentication
var token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
var userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');

if (!token || !userData) {
    window.location.href = 'login.html';
}

var currentUser = JSON.parse(userData);
var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var selectedDate = null;

document.getElementById('userNameDisplay').textContent = currentUser.name || currentUser.company_name || 'User';

// Initialize
renderCalendar();
loadClients();

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function renderCalendar() {
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonth').textContent = months[currentMonth] + ' ' + currentYear;
    
    var grid = document.getElementById('calendarGrid');
    var firstDay = new Date(currentYear, currentMonth, 1).getDay();
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    
    var html = '';
    
    // Previous month days
    var prevDays = new Date(currentYear, currentMonth, 0).getDate();
    for (var i = firstDay - 1; i >= 0; i--) {
        html += '<div class="calendar-day-cell other-month">';
        html += '<span class="day-num">' + (prevDays - i) + '</span>';
        html += '</div>';
    }
    
    // Current month days
    for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        var isToday = (dateStr === todayStr) ? ' today' : '';
        var isSelected = (dateStr === selectedDate) ? ' selected' : '';
        
        html += '<div class="calendar-day-cell' + isToday + isSelected + '" onclick="selectDate(\'' + dateStr + '\')" data-date="' + dateStr + '">';
        html += '<span class="day-num">' + d + '</span>';
        html += '<div class="day-dots-row" id="dots-' + dateStr + '"></div>';
        html += '</div>';
    }
    
    // Remaining cells
    var totalCells = firstDay + daysInMonth;
    var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var n = 1; n <= remaining; n++) {
        html += '<div class="calendar-day-cell other-month"><span class="day-num">' + n + '</span></div>';
    }
    
    grid.innerHTML = html;
    loadDots();
    
    if (!selectedDate) selectDate(todayStr);
}

async function loadDots() {
    try {
        var resp = await fetch(API_URL + '/crm/tasks', { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
            var data = await resp.json();
            var byDate = {};
            data.tasks.forEach(function(t) {
                if (t.due_date) {
                    var dk = t.due_date.split('T')[0];
                    if (!byDate[dk]) byDate[dk] = [];
                    byDate[dk].push(t);
                }
            });
            Object.keys(byDate).forEach(function(dk) {
                var dots = document.getElementById('dots-' + dk);
                if (dots) {
                    var colors = { high: '#E74C3C', medium: '#F39C12', low: '#27AE60' };
                    var h = '';
                    var max = Math.min(byDate[dk].length, 4);
                    for (var i = 0; i < max; i++) {
                        h += '<span class="dot-mini" style="background:' + (colors[byDate[dk][i].priority] || '#ccc') + ';"></span>';
                    }
                    if (byDate[dk].length > 4) h += '<span style="font-size:0.55rem;">+' + (byDate[dk].length-4) + '</span>';
                    dots.innerHTML = h;
                }
            });
        }
    } catch(e) { console.error(e); }
}

async function selectDate(date) {
    selectedDate = date;
    document.querySelectorAll('.calendar-day-cell').forEach(function(c) { c.classList.remove('selected'); });
    var el = document.querySelector('[data-date="' + date + '"]');
    if (el) el.classList.add('selected');
    
    var d = new Date(date + 'T00:00:00');
    document.getElementById('calDayNumber').textContent = d.getDate();
    document.getElementById('calDayName').textContent = d.toLocaleDateString('en-US', { weekday: 'long' });
    document.getElementById('selectedDate').textContent = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    document.getElementById('quickTaskDate').value = date;
    
    await loadDayTasks(date);
}

async function loadDayTasks(date) {
    var container = document.getElementById('dayTasks');
    try {
        var resp = await fetch(API_URL + '/crm/calendar?date=' + date, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
            var data = await resp.json();
            if (!data.tasks || data.tasks.length === 0) {
                container.innerHTML = '<div class="empty-day-state"><p>No tasks</p><p style="font-size:0.8rem;">Use the form to add one</p></div>';
            } else {
                var h = '';
                data.tasks.forEach(function(t) {
                    var done = t.status === 'completed' ? ' completed' : '';
                    var chk = t.status === 'completed' ? ' checked' : '';
                    var client = t.client_name ? '<span class="task-mini-meta">' + t.client_name + '</span>' : '';
                    h += '<div class="task-mini-item' + done + '">';
                    h += '<input type="checkbox" class="task-mini-check"' + chk + ' onchange="toggleTask(' + t.id + ',this.checked)">';
                    h += '<div class="task-mini-info"><span class="task-mini-title">' + t.title + '</span>' + client + '</div>';
                    h += '<span class="task-mini-priority prio-dot-' + t.priority + '">' + t.priority + '</span>';
                    h += '</div>';
                });
                container.innerHTML = h;
            }
        }
    } catch(e) { container.innerHTML = '<div class="empty-day-state"><p>Error loading tasks</p></div>'; }
}

async function toggleTask(id, done) {
    await fetch(API_URL + '/crm/tasks/' + id + '/status', {
        method: 'PATCH', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
        body: JSON.stringify({ status: done ? 'completed' : 'pending' })
    });
    if (selectedDate) { loadDayTasks(selectedDate); loadDots(); }
}

async function loadClients() {
    try {
        var resp = await fetch(API_URL + '/crm/enrollments', { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
            var data = await resp.json();
            var sel = document.getElementById('quickTaskClient');
            data.enrollments.forEach(function(e) {
                sel.innerHTML += '<option value="' + e.id + '">' + e.client_name + '</option>';
            });
        }
    } catch(e) {}
}

document.getElementById('quickTaskForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var title = document.getElementById('quickTaskTitle').value.trim();
    var priority = document.getElementById('quickTaskPriority').value;
    var date = document.getElementById('quickTaskDate').value;
    var clientId = document.getElementById('quickTaskClient').value || null;
    
    if (!title) { showToast('Enter a task title', 'error'); return; }
    if (!date) { showToast('Select a date first', 'error'); return; }
    
    try {
        var resp = await fetch(API_URL + '/crm/tasks', {
            method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
            body: JSON.stringify({ title:title, priority:priority, due_date:date, enrollment_id:clientId })
        });
        if (resp.ok) {
            showToast('Task added!', 'success');
            document.getElementById('quickTaskForm').reset();
            document.getElementById('quickTaskDate').value = date;
            loadDayTasks(date);
            loadDots();
        } else {
            var r = await resp.json();
            showToast(r.error || 'Failed', 'error');
        }
    } catch(err) { showToast('Connection error', 'error'); }
});

function logout() {
    localStorage.clear(); sessionStorage.clear();
    window.location.href = 'login.html';
}
