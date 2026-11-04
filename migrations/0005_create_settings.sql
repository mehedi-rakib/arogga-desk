-- Global, dashboard-editable application settings (key/value store).
-- Not per-product data — see products/product_variants for that.
CREATE TABLE IF NOT EXISTS settings (
  `key`         VARCHAR(100)  NOT NULL PRIMARY KEY,
  `value`       TEXT          NOT NULL,
  `type`        ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  label         VARCHAR(255)  NOT NULL DEFAULT '',
  description   VARCHAR(500)  NOT NULL DEFAULT '',
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`, `type`, label, description) VALUES
  ('sync_source_url', 'https://api.arogga.com/general/v3/search', 'string', 'Sync Source URL', 'Upstream API used by the product sync job and migration scripts.'),
  ('sync_page_size', '100', 'number', 'Sync Page Size', 'Number of products fetched per page during a sync run.'),
  ('default_currency', 'BDT', 'string', 'Default Currency', 'Currency code used for price formatting across the dashboard.'),
  ('maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'When enabled, shows a maintenance banner in the dashboard.')
ON DUPLICATE KEY UPDATE `key` = `key`;
