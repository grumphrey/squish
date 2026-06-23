DROP TABLE IF EXISTS short_urls;
DROP TABLE IF EXISTS url_redirect_events;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(100) UNIQUE NOT NULL,
  hashed_password VARCHAR(100) NOT NULL,
  roles TEXT[] DEFAULT ARRAY['user'],
  status VARCHAR(20) DEFAULT 'active',
  last_login_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE short_urls (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000000000), -- NOTE: only works in single database instance. maybe replace with uuid
  short_url TEXT UNIQUE, -- short url is derived from id (keep in case we migrate to using uuid)
  long_url TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE url_redirect_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  short_url_id INT REFERENCES short_urls(id),
  accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  country_code CHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude float8,
  longitude float8,
  user_agent TEXT,
  os VARCHAR(50),
  browser VARCHAR(50)
);

-- Test values
-- INSERT INTO long_urls (long_url) VALUES ('http://example.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://google.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://wikipedia.org');
-- INSERT INTO long_urls (long_url) VALUES ('https://humphrey.app');
