BEGIN;

CREATE TABLE roles (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  name STRING NOT NULL UNIQUE,
  description STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  name STRING NOT NULL UNIQUE,
  description STRING
);

CREATE TABLE users (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  first_name STRING NOT NULL,
  last_name STRING NOT NULL,
  email STRING NOT NULL UNIQUE,
  password_hash STRING NOT NULL,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT8 NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role_id)
);

CREATE TABLE role_permissions (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  role_id INT8 NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT8 NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_role_permission_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE refresh_tokens (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash STRING NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  key STRING NOT NULL UNIQUE,
  value STRING NOT NULL,
  description STRING,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  entity STRING NOT NULL,
  entity_id INT8,
  filename STRING NOT NULL,
  file_path STRING NOT NULL,
  file_size INT8 NOT NULL DEFAULT 0,
  uploaded_by INT8 REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE traffic_signs (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  sign_name STRING NOT NULL UNIQUE,
  category STRING NOT NULL,
  description STRING,
  image_example STRING
);

CREATE TABLE datasets (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  name STRING NOT NULL,
  version STRING NOT NULL,
  source STRING,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT datasets_name_version_unique UNIQUE (name, version)
);

CREATE TABLE model_versions (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  model_name STRING NOT NULL,
  version STRING NOT NULL,
  accuracy FLOAT8,
  precision_score FLOAT8,
  recall_score FLOAT8,
  f1_score FLOAT8,
  trained_at TIMESTAMPTZ,
  is_active BOOL NOT NULL DEFAULT false,
  CONSTRAINT model_versions_name_version_unique UNIQUE (model_name, version)
);

CREATE TABLE training_sessions (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  dataset_id INT8 REFERENCES datasets(id) ON DELETE SET NULL,
  model_version_id INT8 REFERENCES model_versions(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status STRING NOT NULL DEFAULT 'pending',
  CONSTRAINT training_sessions_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE TABLE detection_requests (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id INT8 REFERENCES files(id) ON DELETE SET NULL,
  status STRING NOT NULL DEFAULT 'created',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT detection_requests_status_check CHECK (status IN ('created', 'uploaded', 'validating', 'processing', 'predicted', 'saved', 'notified', 'completed', 'rejected', 'failed'))
);

CREATE TABLE detection_results (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  request_id INT8 NOT NULL REFERENCES detection_requests(id) ON DELETE CASCADE,
  traffic_sign_id INT8 REFERENCES traffic_signs(id) ON DELETE SET NULL,
  model_version_id INT8 REFERENCES model_versions(id) ON DELETE SET NULL,
  confidence FLOAT8 NOT NULL DEFAULT 0,
  bounding_box STRING,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  detection_result_id INT8 NOT NULL REFERENCES detection_results(id) ON DELETE CASCADE,
  report_type STRING NOT NULL DEFAULT 'pdf',
  file_path STRING,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type STRING NOT NULL,
  title STRING NOT NULL,
  message STRING NOT NULL,
  is_read BOOL NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 REFERENCES users(id) ON DELETE SET NULL,
  action STRING NOT NULL,
  entity STRING NOT NULL,
  entity_id INT8,
  old_value JSONB,
  new_value JSONB,
  ip_address STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency STRING NOT NULL DEFAULT 'USD',
  provider STRING NOT NULL,
  status STRING NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'))
);

CREATE TABLE subscriptions (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name STRING NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_active BOOL NOT NULL DEFAULT true
);

CREATE TABLE payment_logs (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  payment_id INT8 NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type STRING NOT NULL,
  event_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_files_uploaded_by ON files (uploaded_by);
CREATE INDEX idx_detection_requests_user_id ON detection_requests (user_id);
CREATE INDEX idx_detection_requests_status ON detection_requests (status);
CREATE INDEX idx_detection_results_request_id ON detection_results (request_id);
CREATE INDEX idx_reports_detection_result_id ON reports (detection_result_id);
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_training_sessions_dataset_id ON training_sessions (dataset_id);
CREATE INDEX idx_training_sessions_model_version_id ON training_sessions (model_version_id);

COMMIT;
