-- Run this inside the Render Postgres database used by DATABASE_URL.
-- It creates the complete schema expected by the current backend.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_phone VARCHAR(20) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    owner_phone VARCHAR(20) NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_email ON companies(email);

DROP TRIGGER IF EXISTS set_companies_updated_at ON companies;
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS individuals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    position VARCHAR(50),
    institution_id INT REFERENCES companies(id) ON DELETE SET NULL,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_individual_email ON individuals(email);
CREATE INDEX IF NOT EXISTS idx_individual_institution ON individuals(institution_id);

DROP TRIGGER IF EXISTS set_individuals_updated_at ON individuals;
CREATE TRIGGER set_individuals_updated_at
BEFORE UPDATE ON individuals
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('individual', 'company')),
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    lead_source VARCHAR(50),
    status VARCHAR(20) DEFAULT 'unaware' CHECK (status IN ('unaware', 'aware', 'interested', 'student')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

DROP TRIGGER IF EXISTS set_enrollments_updated_at ON enrollments;
CREATE TRIGGER set_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('individual', 'company')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE,
    enrollment_id INT REFERENCES enrollments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_enrollment ON tasks(enrollment_id);

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
