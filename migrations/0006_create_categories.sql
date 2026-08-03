-- Categories (taxonomy) from the Arogga menu API.
-- mi_cat_id is the upstream category ID and serves as the primary key.
CREATE TABLE IF NOT EXISTS categories (
  mi_cat_id     BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  mi_id         INT             NOT NULL DEFAULT 0,
  mi_name       VARCHAR(500)    NOT NULL DEFAULT '',
  mi_url        VARCHAR(500)    NOT NULL DEFAULT '',
  mi_has_child  TINYINT         NOT NULL DEFAULT 0,
  mi_weight     INT             NOT NULL DEFAULT 0,
  logo_s3key    VARCHAR(500)    NOT NULL DEFAULT '',
  logo_src      TEXT,
  logo_title    VARCHAR(500)    NOT NULL DEFAULT '',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_mi_id      (mi_id),
  KEY idx_has_child  (mi_has_child),
  KEY idx_weight     (mi_weight),
  FULLTEXT KEY ft_name (mi_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
