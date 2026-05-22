const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Company {
    static async create({ company_name, email, password, company_phone, owner_name, owner_phone }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO companies (company_name, email, password, company_phone, owner_name, owner_phone) VALUES (?, ?, ?, ?, ?, ?)',
            [company_name, email, hashedPassword, company_phone, owner_name, owner_phone]
        );
        
        return { id: result.insertId, company_name, email, company_phone, owner_name, owner_phone };
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM companies WHERE email = ? AND is_active = TRUE',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT c.*, 
             (SELECT COUNT(*) FROM individuals WHERE institution_id = c.id) as team_size
             FROM companies c WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async searchByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT id, company_name, email FROM companies WHERE email LIKE ? AND is_active = TRUE',
            ['%' + email + '%']
        );
        return rows;
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE companies SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, id]
        );
    }

    static async setResetToken(email, token, expiry) {
        await pool.execute(
            'UPDATE companies SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );
    }

    static async findByResetToken(token) {
        const [rows] = await pool.execute(
            'SELECT * FROM companies WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token]
        );
        return rows[0];
    }
}

module.exports = Company;