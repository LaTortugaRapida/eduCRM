const mysql = require('mysql2/promise');
require('dotenv').config();

function readBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'required'].includes(String(value).toLowerCase());
}

function parseDatabaseUrl(value) {
    try {
        const parsedUrl = new URL(value);
        if (!['mysql:', 'mysql2:'].includes(parsedUrl.protocol)) {
            return null;
        }

        return parsedUrl;
    } catch (error) {
        return null;
    }
}

function getDatabaseUrl() {
    const urlEnvNames = ['MYSQL_URL', 'CLEARDB_DATABASE_URL', 'JAWSDB_URL', 'DATABASE_URL'];
    const name = urlEnvNames.find((envName) => parseDatabaseUrl(process.env[envName]));

    if (!name) {
        return null;
    }

    return {
        name,
        url: parseDatabaseUrl(process.env[name])
    };
}

function databaseUrlRequiresSsl(databaseUrl) {
    if (!databaseUrl) {
        return false;
    }

    const sslMode = (
        databaseUrl.url.searchParams.get('ssl-mode') ||
        databaseUrl.url.searchParams.get('sslmode') ||
        ''
    ).toLowerCase();

    return readBoolean(databaseUrl.url.searchParams.get('ssl'), false) ||
        ['required', 'verify_ca', 'verify_identity'].includes(sslMode);
}

function buildSslOptions(databaseUrl) {
    if (!readBoolean(process.env.DB_SSL, databaseUrlRequiresSsl(databaseUrl))) {
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

const activeDatabaseUrl = getDatabaseUrl();

function getMissingDbConfig() {
    if (activeDatabaseUrl) {
        return [];
    }

    return requiredDbConfig.filter((name) => !process.env[name]);
}

function buildPoolConfig() {
    const sharedConfig = {
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: 0,
        ssl: buildSslOptions(activeDatabaseUrl)
    };

    if (!activeDatabaseUrl) {
        return {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ...sharedConfig
        };
    }

    return {
        host: activeDatabaseUrl.url.hostname,
        port: Number(activeDatabaseUrl.url.port || 3306),
        user: decodeURIComponent(activeDatabaseUrl.url.username),
        password: decodeURIComponent(activeDatabaseUrl.url.password),
        database: decodeURIComponent(activeDatabaseUrl.url.pathname.replace(/^\//, '')),
        ...sharedConfig
    };
}

const pool = mysql.createPool(buildPoolConfig());

pool.getDiagnostics = async function getDiagnostics() {
    const missingConfig = getMissingDbConfig();
    const connection = {
        databaseUrlConfigured: Boolean(activeDatabaseUrl),
        databaseUrlEnv: activeDatabaseUrl ? activeDatabaseUrl.name : null,
        hostConfigured: activeDatabaseUrl ? true : Boolean(process.env.DB_HOST),
        userConfigured: activeDatabaseUrl ? true : Boolean(process.env.DB_USER),
        databaseConfigured: activeDatabaseUrl ? true : Boolean(process.env.DB_NAME),
        port: activeDatabaseUrl ? Number(activeDatabaseUrl.url.port || 3306) : Number(process.env.DB_PORT || 3306),
        sslEnabled: Boolean(buildSslOptions(activeDatabaseUrl))
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
