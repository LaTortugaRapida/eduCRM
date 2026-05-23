const pool = require('../config/database');

class Course {
    static async findAll() {
        const [rows] = await pool.execute(
            'SELECT id, name, price::float AS price, created_at, updated_at FROM courses ORDER BY name ASC'
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, name, price::float AS price FROM courses WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async create({ name, price }) {
        const [rows] = await pool.execute(
            'INSERT INTO courses (name, price) VALUES (?, ?) RETURNING id, name, price::float AS price',
            [name, price]
        );
        return rows[0];
    }

    static async update(id, { name, price }) {
        const [rows] = await pool.execute(
            'UPDATE courses SET name = ?, price = ? WHERE id = ? RETURNING id, name, price::float AS price',
            [name, price, id]
        );
        return rows[0];
    }

    static async delete(id) {
        const [rows] = await pool.execute(
            'DELETE FROM courses WHERE id = ? RETURNING id',
            [id]
        );
        return rows[0];
    }
}

module.exports = Course;
