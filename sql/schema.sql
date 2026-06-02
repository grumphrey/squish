DROP TABLE IF EXISTS long_urls;

CREATE TABLE long_urls (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 7777), -- NOTE: only works in single database instance. maybe replace with uuid
  long_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test values
INSERT INTO long_urls (long_url) VALUES ('hello.com');
INSERT INTO long_urls (long_url) VALUES ('bye.com');
INSERT INTO long_urls (long_url) VALUES ('wiki.net');
INSERT INTO long_urls (long_url) VALUES ('alien.mars');
