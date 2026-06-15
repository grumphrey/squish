DROP TABLE IF EXISTS long_urls;
DROP TABLE IF EXISTS url_redirect_events;

CREATE TABLE long_urls ( -- TODO: confusing - maybe rename to short urls...
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000000000), -- NOTE: only works in single database instance. maybe replace with uuid
  long_url TEXT NOT NULL,
  -- TODO: short url is calculated based on id, so maybe no need to insert short url. since its a derived value. but convenient to view?
  short_url TEXT UNIQUE, -- each short_url should only have 1 long_url matched
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE url_redirect_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  short_url_id INT REFERENCES long_urls(id),
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
)

-- Test values
-- INSERT INTO long_urls (long_url) VALUES ('http://example.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://google.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://wikipedia.org');
-- INSERT INTO long_urls (long_url) VALUES ('https://humphrey.app');
