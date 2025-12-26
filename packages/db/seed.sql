-- Development seed data (safe for local/testing only)

INSERT INTO users (id, github_id, email, name, avatar_url, plan, quota_limit)
VALUES (
  'test-user-001',
  '12345678',
  'test@example.com',
  'Test User',
  'https://avatars.githubusercontent.com/u/12345678',
  'free',
  100
);

-- Hash of: sk_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name)
VALUES (
  'test-key-001',
  'test-user-001',
  'c72f6d852a280f0e610550870afae5cb0619f1efe6dbfe9b0ef671aa5488f3c3',
  'sk_01234567',
  'Development Key'
);

INSERT INTO request_logs (
  request_id,
  user_id,
  api_key_id,
  method,
  path,
  target_url,
  render_mode,
  status_code,
  duration_ms
)
VALUES
  ('req_sample_001', 'test-user-001', 'test-key-001', 'POST', '/api/v1/scrape', 'https://example.com', 'light', 200, 245),
  ('req_sample_002', 'test-user-001', 'test-key-001', 'POST', '/api/v1/scrape', 'https://example.org', 'heavy', 200, 3420),
  ('req_sample_003', 'test-user-001', 'test-key-001', 'POST', '/api/v1/screenshot', 'https://example.net', 'heavy', 200, 4521);

INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent)
VALUES
  ('test-user-001', 'login', '127.0.0.1', 'Mozilla/5.0 Test Browser'),
  ('test-user-001', 'key_created', '127.0.0.1', 'Mozilla/5.0 Test Browser');

