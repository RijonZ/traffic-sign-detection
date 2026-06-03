BEGIN;

-- Seed roles (safe re-run)
INSERT INTO roles (name, description) VALUES
  ('Administrator', 'Full system access'),
  ('Manager', 'Analytics and data export access'),
  ('User', 'Standard user access')
ON CONFLICT (name) DO NOTHING;

-- Seed permissions
INSERT INTO permissions (name, description) VALUES
  ('view_admin_dashboard',  'View administrator dashboard and summary'),
  ('manage_users',          'Create, update and delete user accounts'),
  ('view_reports',          'View detection reports'),
  ('download_reports',      'Download PDF detection reports'),
  ('export_reports',        'Export reports as CSV'),
  ('view_audit_logs',       'View system audit logs'),
  ('view_model_monitoring', 'View model monitoring and performance data'),
  ('view_admin_detections', 'View all user detections system-wide'),
  ('manage_settings',       'View and update system settings'),
  ('view_feedbacks',        'View user feedback submissions'),
  ('view_analytics',        'View dashboard analytics and statistics'),
  ('export_data',           'Export detection data')
ON CONFLICT (name) DO NOTHING;

-- Administrator gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets analytics and export permissions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.name IN ('view_analytics', 'export_data')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
