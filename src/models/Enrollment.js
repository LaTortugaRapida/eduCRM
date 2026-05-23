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
            'SELECT * FROM enrollments ORDER BY created_at DESC'
        );
        return rows;
    }

    static async getCountByUser(user_id, user_type) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*)::int as total FROM enrollments'
        );
        return rows[0].total;
    }

    static async getCountByStatus(user_id, user_type) {
        const [rows] = await pool.execute(
            'SELECT status, COUNT(*)::int as count FROM enrollments GROUP BY status'
        );
        return rows;
    }

    static async updateStatus(id, user_id, user_type, status) {
        const [rows] = await pool.execute(
            'UPDATE enrollments SET status = ? WHERE id = ? RETURNING *',
            [status, id]
        );
        return rows[0];
    }

    static async update(id, user_id, user_type, data) {
        const [rows] = await pool.execute(
            `UPDATE enrollments
             SET client_name = ?,
                 client_email = ?,
                 client_phone = ?,
                 lead_source = ?,
                 status = ?,
                 notes = ?
             WHERE id = ?
             RETURNING *`,
            [
                data.client_name,
                data.client_email,
                data.client_phone,
                data.lead_source,
                data.status,
                data.notes,
                id
            ]
        );
        return rows[0];
    }

    static async delete(id, user_id, user_type) {
        const [rows] = await pool.execute(
            'DELETE FROM enrollments WHERE id = ? RETURNING id',
            [id]
        );
        return rows[0];
    }
}

module.exports = Enrollment;
