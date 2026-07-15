-- ---------------------------------------------------------------------------
-- Migration 001: add the `is_deep_linkable` toggle to the menu master table.
--
-- This lets the admin panel (/erp/index.php/admin/menus) control which routes
-- are exposed as deep links without shipping an app update.
--
-- The default is 1 (deep-linkable) so existing routes keep working; set it to
-- 0 in the admin panel to exclude a screen from deep linking.
--
-- Adjust the table name below if your ERP uses something other than
-- `menu_master` (see DB_MENU_TABLE in .env).
-- ---------------------------------------------------------------------------

ALTER TABLE `menu_master`
  ADD COLUMN `is_deep_linkable` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'If 1, this route can be opened via an app deep link';

-- Optional: index it if you filter on it heavily.
-- CREATE INDEX `idx_menu_master_deeplink` ON `menu_master` (`is_deep_linkable`);
