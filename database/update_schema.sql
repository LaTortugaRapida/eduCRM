USE edu_crm;

-- Add institution_id to individuals table
ALTER TABLE individuals ADD COLUMN institution_id INT;
ALTER TABLE individuals ADD FOREIGN KEY (institution_id) REFERENCES companies(id);

-- Add enrollment_id to tasks table for client linking
ALTER TABLE tasks ADD COLUMN enrollment_id INT;
ALTER TABLE tasks ADD FOREIGN KEY (enrollment_id) REFERENCES enrollments(id);

-- Create team members view
CREATE VIEW team_members AS
SELECT 
    i.id,
    i.name,
    i.email,
    i.phone,
    i.position,
    i.created_at,
    c.company_name as institution_name
FROM individuals i
JOIN companies c ON i.institution_id = c.id;
