BEGIN;

CREATE TABLE user_preferences (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key STRING NOT NULL,
  value STRING NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_unique UNIQUE (user_id, key)
);

CREATE TABLE detection_feedback (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  detection_result_id INT8 NOT NULL REFERENCES detection_results(id) ON DELETE CASCADE,
  rating INT2 NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name STRING NOT NULL,
  key_hash STRING NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rate_limit_logs (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  user_id INT8 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name STRING NOT NULL,
  limit_reached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detections_used INT4 NOT NULL,
  month STRING NOT NULL
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences (user_id);
CREATE INDEX idx_detection_feedback_user_id ON detection_feedback (user_id);
CREATE INDEX idx_detection_feedback_result_id ON detection_feedback (detection_result_id);
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_rate_limit_logs_user_id ON rate_limit_logs (user_id);

COMMIT;
