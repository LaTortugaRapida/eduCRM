const mysql = require('mysql2/promise');
require('dotenv').config();

function readBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'required'].includes(String(value).toLowerCase());
}

function buildSslOptions() {
    if (!readBoolean(process.env.DB_SSL, false)) {
        return undefined;
    }

    return {
        rejectUnauthorized: readBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
    };
}

const requiredDbConfig = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const requiredSchema = {
    companies: [
        'id',
        'company_name',
        'email',
        'password',
        'company_phone',
        'owner_name',
        'owner_phone',
        'reset_token',
        'reset_token_expiry',
        'is_active'
    ],
    individuals: [
        'id',
        'name',
        'email',
        'password',
        'phone',
        'position',
        'institution_id',
        'reset_token',
        'reset_token_expiry',
        'is_active'
    ],
    enrollments: [
        'id',
        'user_id',
        'user_type',
        'client_name',
        'client_email',
        'client_phone',
        'lead_source',
        'status',
        'notes'
    ],
    tasks: [
        'id',
        'user_id',
        'user_type',
        'title',
        'description',
        'priority',
        'status',
        'due_date',
        'enrollment_id'
    ]
};

function getMissingDbConfig() {
    return requiredDbConfig.filter((name) => !process.env[name]);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    ssl: buildSslOptions()
});

pool.getDiagnostics = async function getDiagnostics() {
    const missingConfig = getMissingDbConfig();
    const connection = {
        hostConfigured: Boolean(process.env.DB_HOST),
        userConfigured: Boolean(process.env.DB_USER),
        databaseConfigured: Boolean(process.env.DB_NAME),
        port: Number(process.env.DB_PORT || 3306),
        sslEnabled: Boolean(buildSslOptions())
    };

    if (missingConfig.length) {
        return {
            ok: false,
            status: 'configuration_error',
            missingConfig,
            connection
        };
    }

    await pool.query('SELECT 1 AS ok');

    const tables = Object.keys(requiredSchema);
    const tablePlaceholders = tables.map(() => '?').join(', ');
    const [tableRows] = await pool.execute(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (${tablePlaceholders})`,
        tables
    );

    const presentTables = tableRows.map((row) => row.TABLE_NAME);
    const missingTables = tables.filter((table) => !presentTables.includes(table));
    const [columnRows] = presentTables.length
        ? await pool.execute(
            `SELECT TABLE_NAME, COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME IN (${presentTables.map(() => '?').join(', ')})`,
            presentTables
        )
        : [[]];

    const columnsByTable = columnRows.reduce((memo, row) => {
        if (!memo[row.TABLE_NAME]) {
            memo[row.TABLE_NAME] = new Set();
        }
        memo[row.TABLE_NAME].add(row.COLUMN_NAME);
        return memo;
    }, {});

    const missingColumns = [];
    presentTables.forEach((table) => {
        requiredSchema[table].forEach((column) => {
            if (!columnsByTable[table] || !columnsByTable[table].has(column)) {
                missingColumns.push(`${table}.${column}`);
            }
        });
    });

    const schemaOk = missingTables.length === 0 && missingColumns.length === 0;

    return {
        ok: schemaOk,
        status: schemaOk ? 'ok' : 'schema_error',
        connection,
        missingTables,
        missingColumns
    };
};

module.exports = pool;
