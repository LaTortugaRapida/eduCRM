const pool = require('../config/database');

class Task {
    static async create({ user_id, user_type, title, description, priority, due_date, enrollment_id }) {
        const [result] = await pool.execute(
            'INSERT INTO tasks (user_id, user_type, title, description, priority, due_date, enrollment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, user_type, title, description, priority, due_date, enrollment_id || null]
        );
        return { id: result.insertId, title, status: 'pending' };
    }

    static async findByUser(user_id, user_type) {
        const [rows] = await pool.execute(
            `SELECT t.*, e.client_name, e.client_email 
             FROM tasks t 
             LEFT JOIN enrollments e ON t.enrollment_id = e.id 
             WHERE t.user_id = ? AND t.user_type = ? 
             ORDER BY t.due_date ASC, t.created_at DESC`,
            [user_id, user_type]
        );
        return rows;
    }

    static async getByDate(user_id, user_type, date) {
        const [rows] = await pool.execute(
            `SELECT t.*, e.client_name 
             FROM tasks t 
             LEFT JOIN enrollments e ON t.enrollment_id = e.id 
             WHERE t.user_id = ? AND t.user_type = ? AND DATE(t.due_date) = ?`,
            [user_id, user_type, date]
        );
        return rows;
    }

    static async updateStatus(id, status) {
        await pool.execute(
            'UPDATE tasks SET status = ? WHERE id = ?',
            [status, id]
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
    }
}

module.exports = Task;