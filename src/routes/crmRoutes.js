const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard/stats', authenticateToken, crmController.getDashboardStats);
router.post('/enrollments', authenticateToken, crmController.createEnrollment);
router.get('/enrollments', authenticateToken, crmController.getEnrollments);
router.patch('/enrollments/:enrollmentId', authenticateToken, crmController.updateEnrollment);
router.patch('/enrollments/:enrollmentId/status', authenticateToken, crmController.updateEnrollmentStatus);
router.delete('/enrollments/:enrollmentId', authenticateToken, crmController.deleteEnrollment);
router.get('/courses', authenticateToken, crmController.getCourses);
router.post('/courses', authenticateToken, crmController.createCourse);
router.patch('/courses/:courseId', authenticateToken, crmController.updateCourse);
router.delete('/courses/:courseId', authenticateToken, crmController.deleteCourse);
router.post('/tasks', authenticateToken, crmController.createTask);
router.get('/tasks', authenticateToken, crmController.getTasks);
router.patch('/tasks/:taskId/status', authenticateToken, crmController.updateTaskStatus);
router.get('/calendar', authenticateToken, crmController.getCalendarTasks);
router.get('/calendar-events', authenticateToken, crmController.getCalendarEvents);

module.exports = router;
