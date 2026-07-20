ALTER TABLE repurposes
  ADD COLUMN user_workflow_status text
    CHECK (user_workflow_status IN ('copied', 'posted'))
    DEFAULT NULL;
