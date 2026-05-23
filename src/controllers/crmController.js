const Enrollment = require('../models/Enrollment');
const Task = require('../models/Task');

const enrollmentStatuses = ['unaware', 'aware', 'interested', 'student'];

function isValidEnrollmentStatus(status) {
    return enrollmentStatuses.indexOf(status) >= 0;
}

exports.getDashboardStats = async (req, res) => {
    try {
        const { id, type } = req.user;
        
        const totalEnrollments = await Enrollment.getCountByUser(id, type);
        const totalTasks = await Task.findByUser(id, type);
        const pendingTasks = totalTasks.filter(t => t.status !== 'completed').length;
        const statusCounts = await Enrollment.getCountByStatus(id, type);
        
        const students = statusCounts.find(s => s.status === 'student');
        const studentCount = students ? students.count : 0;
        const profit = studentCount * 500;
        
        res.json({
            stats: {
                totalClients: totalEnrollments,
                activeTasks: pendingTasks,
                students: studentCount,
                profit: profit
            },
            statusBreakdown: statusCounts
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createEnrollment = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { client_name, client_email, client_phone, lead_source, status, notes } = req.body;
        
        if (!client_name || !client_email || !client_phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }

        if (status && !isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }
        
        const enrollment = await Enrollment.create({
            user_id: id,
            user_type: type,
            client_name,
            client_email,
            client_phone,
            lead_source: lead_source || 'Other',
            status: status || 'unaware',
            notes: notes || ''
        });
        
        res.status(201).json({ message: 'Enrollment created', enrollment });
    } catch (error) {
        console.error('Create enrollment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getEnrollments = async (req, res) => {
    try {
        const { id, type } = req.user;
        const enrollments = await Enrollment.findByUser(id, type);
        res.json({ enrollments });
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateEnrollmentStatus = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { enrollmentId } = req.params;
        const { status } = req.body;

        if (!isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }
        
        const enrollment = await Enrollment.updateStatus(enrollmentId, id, type, status);
        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        res.json({ message: 'Status updated', enrollment });
    } catch (error) {
        console.error('Update enrollment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateEnrollment = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { enrollmentId } = req.params;
        const { client_name, client_email, client_phone, lead_source, status, notes } = req.body;

        if (!client_name || !client_email || !client_phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }

        if (status && !isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }

        const enrollment = await Enrollment.update(enrollmentId, id, type, {
            client_name,
            client_email,
            client_phone,
            lead_source: lead_source || 'Other',
            status: status || 'unaware',
            notes: notes || ''
        });

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        res.json({ message: 'Enrollment updated', enrollment });
    } catch (error) {
        console.error('Update enrollment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteEnrollment = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { enrollmentId } = req.params;
        const deletedEnrollment = await Enrollment.delete(enrollmentId, id, type);

        if (!deletedEnrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        res.json({ message: 'Enrollment deleted' });
    } catch (error) {
        console.error('Delete enrollment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createTask = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { title, description, priority, due_date, enrollment_id } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Task title is required' });
        }
        
        const task = await Task.create({
            user_id: id,
            user_type: type,
            title,
            description: description || '',
            priority: priority || 'medium',
            due_date: due_date || null,
            enrollment_id: enrollment_id || null
        });
        
        res.status(201).json({ message: 'Task created', task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const { id, type } = req.user;
        const tasks = await Task.findByUser(id, type);
        res.json({ tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        
        await Task.updateStatus(taskId, status);
        res.json({ message: 'Task updated' });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getCalendarTasks = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'Date parameter required' });
        }
        
        const tasks = await Task.getByDate(id, type, date);
        res.json({ tasks });
    } catch (error) {
        console.error('Calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all tasks as calendar events
exports.getCalendarEvents = async (req, res) => {
    try {
        const { id, type } = req.user;
        const tasks = await Task.findByUser(id, type);
        
        const events = tasks.map(task => ({
            id: task.id.toString(),
            title: task.title,
            start: task.due_date || task.created_at,
            extendedProps: {
                priority: task.priority,
                status: task.status,
                description: task.description,
                client_name: task.client_name
            },
            color: task.priority === 'high' ? '#E74C3C' : task.priority === 'medium' ? '#F39C12' : '#27AE60'
        }));
        
        res.json({ events });
    } catch (error) {
        console.error('Calendar events error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
