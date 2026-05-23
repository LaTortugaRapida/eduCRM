const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Task = require('../models/Task');

const enrollmentStatuses = ['unaware', 'aware', 'interested', 'student'];

function isValidEnrollmentStatus(status) {
    return enrollmentStatuses.indexOf(status) >= 0;
}

function normalizePrice(price) {
    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
        return null;
    }
    return Math.round(normalizedPrice * 100) / 100;
}

async function resolveCourseId(status, courseId) {
    if (status !== 'student') {
        return { courseId: null };
    }

    const normalizedCourseId = Number(courseId);
    if (!Number.isInteger(normalizedCourseId) || normalizedCourseId <= 0) {
        return { error: 'Select a course before setting this client as a student' };
    }

    const course = await Course.findById(normalizedCourseId);
    if (!course) {
        return { error: 'Selected course was not found' };
    }

    return { courseId: normalizedCourseId };
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
        const profit = await Enrollment.getRevenue();

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
        const { client_name, client_email, client_phone, lead_source, status, course_id, notes } = req.body;

        if (!client_name || !client_email || !client_phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }

        if (status && !isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }

        const normalizedStatus = status || 'unaware';
        const courseResult = await resolveCourseId(normalizedStatus, course_id);
        if (courseResult.error) {
            return res.status(400).json({ error: courseResult.error });
        }

        const enrollment = await Enrollment.create({
            user_id: id,
            user_type: type,
            client_name,
            client_email,
            client_phone,
            lead_source: lead_source || 'Other',
            status: normalizedStatus,
            course_id: courseResult.courseId,
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
        const { status, course_id } = req.body;

        if (!isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }

        const courseResult = await resolveCourseId(status, course_id);
        if (courseResult.error) {
            return res.status(400).json({ error: courseResult.error });
        }

        const enrollment = await Enrollment.updateStatus(enrollmentId, id, type, status, courseResult.courseId);
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
        const { client_name, client_email, client_phone, lead_source, status, course_id, notes } = req.body;

        if (!client_name || !client_email || !client_phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }

        if (status && !isValidEnrollmentStatus(status)) {
            return res.status(400).json({ error: 'Invalid enrollment status' });
        }

        const normalizedStatus = status || 'unaware';
        const courseResult = await resolveCourseId(normalizedStatus, course_id);
        if (courseResult.error) {
            return res.status(400).json({ error: courseResult.error });
        }

        const enrollment = await Enrollment.update(enrollmentId, id, type, {
            client_name,
            client_email,
            client_phone,
            lead_source: lead_source || 'Other',
            status: normalizedStatus,
            course_id: courseResult.courseId,
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

exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.findAll();
        res.json({ courses });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const price = normalizePrice(req.body.price);

        if (!name) {
            return res.status(400).json({ error: 'Course name is required' });
        }

        if (price === null) {
            return res.status(400).json({ error: 'Course price must be zero or higher' });
        }

        const course = await Course.create({ name, price });
        res.status(201).json({ message: 'Course created', course });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const name = (req.body.name || '').trim();
        const price = normalizePrice(req.body.price);

        if (!name) {
            return res.status(400).json({ error: 'Course name is required' });
        }

        if (price === null) {
            return res.status(400).json({ error: 'Course price must be zero or higher' });
        }

        const course = await Course.update(courseId, { name, price });
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: 'Course updated', course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const deletedCourse = await Course.delete(courseId);

        if (!deletedCourse) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: 'Course deleted' });
    } catch (error) {
        console.error('Delete course error:', error);
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
