CREATE TABLE IF NOT EXISTS workout_logs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  member_id CHAR(36) NOT NULL,
  workout_plan_id CHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  exercise_index INT NOT NULL,
  exercise_name VARCHAR(150) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_member_plan_date_exercise UNIQUE (member_id, workout_plan_id, log_date, exercise_index),
  CONSTRAINT fk_workout_logs_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_workout_logs_plan FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_workout_logs_gym_date ON workout_logs (gym_id, log_date);
CREATE INDEX idx_workout_logs_member_date ON workout_logs (member_id, log_date);