const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

function readBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'required'].includes(String(value).toLowerCase());
}

function getDatabaseUrl() {
    return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function buildSslOptions() {
    if (!readBoolean(process.env.DB_SSL, false)) {
        return undefined;
    }

    return {
        rejectUnauthorized: readBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
    };
}

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
        'course_id',
        'notes'
    ],
    courses: [
        'id',
        'name',
        'price'
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
    if (getDatabaseUrl()) {
        return [];
    }

    return ['PGHOST', 'PGUSER', 'PGDATABASE'].filter((name) => !process.env[name]);
}

function buildPoolConfig() {
    const databaseUrl = getDatabaseUrl();
    const sharedConfig = {
        max: Number(process.env.DB_CONNECTION_LIMIT || 10),
        ssl: buildSslOptions()
    };

    if (databaseUrl) {
        return {
            connectionString: databaseUrl,
            ...sharedConfig
        };
    }

    return {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ...sharedConfig
    };
}

function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

const pgPool = new Pool(buildPoolConfig());

const db = {
    async execute(sql, params) {
        const result = await pgPool.query(convertPlaceholders(sql), params || []);
        return [result.rows, result];
    },

    async query(sql, params) {
        return pgPool.query(convertPlaceholders(sql), params || []);
    },

    async getDiagnostics() {
        const missingConfig = getMissingDbConfig();
        const connection = {
            databaseUrlConfigured: Boolean(getDatabaseUrl()),
            hostConfigured: Boolean(process.env.PGHOST || getDatabaseUrl()),
            userConfigured: Boolean(process.env.PGUSER || getDatabaseUrl()),
            databaseConfigured: Boolean(process.env.PGDATABASE || getDatabaseUrl()),
            port: Number(process.env.PGPORT || 5432),
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

        await pgPool.query('SELECT 1 AS ok');

        const tables = Object.keys(requiredSchema);
        const tableResult = await pgPool.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = ANY($1::text[])`,
            [tables]
        );

        const presentTables = tableResult.rows.map((row) => row.table_name);
        const missingTables = tables.filter((table) => !presentTables.includes(table));
        const columnResult = presentTables.length
            ? await pgPool.query(
                `SELECT table_name, column_name
                 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = ANY($1::text[])`,
                [presentTables]
            )
            : { rows: [] };

        const columnsByTable = columnResult.rows.reduce((memo, row) => {
            if (!memo[row.table_name]) {
                memo[row.table_name] = new Set();
            }
            memo[row.table_name].add(row.column_name);
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
    },

    async initializeSchema() {
        const schemaPath = path.join(__dirname, '..', '..', 'database', 'production_schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        await pgPool.query(schemaSql);
    },

    end() {
        return pgPool.end();
    }
};

module.exports = db;
