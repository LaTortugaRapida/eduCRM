const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Individual {
    static async create({ name, email, password, phone, position, institution_id }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO individuals (name, email, password, phone, position, institution_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, position, institution_id]
        );
        
        return { id: result.insertId, name, email, phone, position };
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM individuals WHERE email = ? AND is_active = TRUE',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT i.*, c.company_name as institution_name 
             FROM individuals i 
             LEFT JOIN companies c ON i.institution_id = c.id 
             WHERE i.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getTeamMembers(institution_id) {
        const [rows] = await pool.execute(
            `SELECT id, name, email, phone, position, created_at 
             FROM individuals 
             WHERE institution_id = ? AND is_active = TRUE`,
            [institution_id]
        );
        return rows;
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE individuals SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, id]
        );
    }

    static async setResetToken(email, token, expiry) {
        await pool.execute(
            'UPDATE individuals SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );
    }

    static async findByResetToken(token) {
        const [rows] = await pool.execute(
            'SELECT * FROM individuals WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token]
        );
        return rows[0];
    }
}

module.exports = Individual;