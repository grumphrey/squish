DROP TABLE IF EXISTS long_urls;

CREATE TABLE long_urls (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000000000), -- NOTE: only works in single database instance. maybe replace with uuid
  long_url TEXT NOT NULL,
  -- TODO: short url is calculated based on id, so maybe no need to insert short url. since its a derived value. but convenient to view?
  short_url TEXT UNIQUE, -- each short_url should only have 1 long_url matched
  click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0), -- make clicks table if want to extend to clicks per day, clicks per user
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test values
-- INSERT INTO long_urls (long_url) VALUES ('http://example.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://google.com');
-- INSERT INTO long_urls (long_url) VALUES ('https://wikipedia.org');
-- INSERT INTO long_urls (long_url) VALUES ('https://humphrey.app');
