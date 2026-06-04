DROP TABLE IF EXISTS long_urls;

CREATE TABLE long_urls (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000000000), -- NOTE: only works in single database instance. maybe replace with uuid
  long_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test values
INSERT INTO long_urls (long_url) VALUES ('http://example.com');
INSERT INTO long_urls (long_url) VALUES ('https://google.com');
INSERT INTO long_urls (long_url) VALUES ('https://wikipedia.org');
INSERT INTO long_urls (long_url) VALUES ('https://humphrey.app');
