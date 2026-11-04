-- Images attached to a product (attachedFiles_p_images) and to a specific
-- variant (attachedFiles_pv_images) in the old Mongo shape.
CREATE TABLE IF NOT EXISTS product_images (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  p_id        BIGINT UNSIGNED NOT NULL,
  src         VARCHAR(1000)   NOT NULL,
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  sort_order  INT             NOT NULL DEFAULT 0,

  KEY idx_p_id (p_id),
  CONSTRAINT fk_image_product FOREIGN KEY (p_id) REFERENCES products(p_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variant_images (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pv_id       BIGINT UNSIGNED NOT NULL,
  src         VARCHAR(1000)   NOT NULL,
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  sort_order  INT             NOT NULL DEFAULT 0,

  KEY idx_pv_id (pv_id),
  CONSTRAINT fk_variant_image_variant FOREIGN KEY (pv_id) REFERENCES product_variants(pv_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
