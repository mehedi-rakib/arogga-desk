-- p_product_tags and p_product_internal_tags, flattened into one table
-- distinguished by `kind`.
CREATE TABLE IF NOT EXISTS product_tags (
  id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  p_id    BIGINT UNSIGNED NOT NULL,
  kind    ENUM('tag','internal_tag') NOT NULL DEFAULT 'tag',
  tag     VARCHAR(255) NOT NULL,

  UNIQUE KEY uniq_tag (p_id, kind, tag),
  KEY idx_p_id (p_id),
  CONSTRAINT fk_tag_product FOREIGN KEY (p_id) REFERENCES products(p_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
