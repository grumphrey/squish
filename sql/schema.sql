-- db init script
-- mount into docker

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(100) UNIQUE NOT NULL,
  hashed_password VARCHAR(100) NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  last_login_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE short_urls (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, -- NOTE: only works in single database instance. maybe replace with uuid
  short_url TEXT UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  encoded_qr_code TEXT,

  user_id UUID REFERENCES users(id) -- possibly guest user with no user_id
);

CREATE TABLE url_redirect_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  short_url_id INT NOT NULL REFERENCES short_urls(id),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  ip_address INET,
  country_code CHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude float8,
  longitude float8,
  user_agent TEXT,
  os VARCHAR(50),
  browser VARCHAR(50),
  device VARCHAR(50),
  device_type VARCHAR(50) CHECK (device_type IN ('bot', 'desktop', 'mobile', 'tablet', 'unknown'))
);

CREATE VIEW short_url_metrics AS 
SELECT s.id AS short_url_id, s.short_url, s.long_url, s.created_at AS url_created_at, 
  u.id AS user_id, u.email, e.accessed_at, e.ip_address, e.country_code, e.os, e.browser, e.device, e.device_type, 
  COUNT(e.id) OVER (PARTITION BY s.id) AS total_clicks
FROM short_urls s 
JOIN users u               ON s.user_id=u.id 
JOIN url_redirect_events e ON e.short_url_id=s.id;

-- Test values
-- INSERT INTO users (email, hashed_password) 
-- INSERT INTO long_urls (long_url) VALUES ('http://example.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://google.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://wikipedia.org');
-- INSERT INTO long_urls (long_url) VALUES ('https://humphrey.app');
