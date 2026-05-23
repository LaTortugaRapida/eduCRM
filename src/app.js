const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const crmRoutes = require('./routes/crmRoutes');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crm', crmRoutes);
app.use(express.static(frontendPath));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/health/db', async (req, res) => {
    try {
        const diagnostics = await pool.getDiagnostics();
        res.status(diagnostics.ok ? 200 : 500).json({
            status: diagnostics.ok ? 'OK' : 'ERROR',
            database: diagnostics
        });
    } catch (error) {
        console.error('Database health check error:', error);
        res.status(500).json({
            status: 'ERROR',
            database: {
                ok: false,
                status: 'connection_error',
                code: error.code || 'UNKNOWN'
            }
        });
    }
});

app.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'reset-password.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
    pool.initializeSchema()
        .then(() => {
            console.log('Database schema ready');
        })
        .catch((error) => {
            console.error('Database schema initialization error:', error);
        });
});

module.exports = app;
