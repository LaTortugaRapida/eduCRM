const pool = require('../config/database');

class Enrollment {
    static async create({ user_id, user_type, client_name, client_email, client_phone, lead_source, status, notes }) {
        const [rows] = await pool.execute(
            'INSERT INTO enrollments (user_id, user_type, client_name, client_email, client_phone, lead_source, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
            [user_id, user_type, client_name, client_email, client_phone, lead_source, status, notes]
        );
        return { id: rows[0].id, client_name, client_email, status };
    }

    static async findByUser(user_id, user_type) {
        const [rows] = await pool.execute(
            'SELECT * FROM enrollments WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC',
            [user_id, user_type]
        );
        return rows;
    }

    static async getCountByUser(user_id, user_type) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = ? AND user_type = ?',
            [user_id, user_type]
        );
        return rows[0].total;
    }

    static async getCountByStatus(user_id, user_type) {
        const [rows] = await pool.execute(
            'SELECT status, COUNT(*)::int as count FROM enrollments WHERE user_id = ? AND user_type = ? GROUP BY status',
            [user_id, user_type]
        );
        return rows;
    }

    static async updateStatus(id, status) {
        await pool.execute(
            'UPDATE enrollments SET status = ? WHERE id = ?',
            [status, id]
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM enrollments WHERE id = ?', [id]);
    }
}

module.exports = Enrollment;
