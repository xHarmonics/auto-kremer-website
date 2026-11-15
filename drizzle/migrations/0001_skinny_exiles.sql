CREATE TABLE `legacy_product_redirects` (
	`old_wix_slug` text PRIMARY KEY NOT NULL,
	`target_product_slug` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`model_slug` text NOT NULL,
	`model_label` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_models_slug` ON `product_models` (`model_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_product_model` ON `product_models` (`product_id`,`model_slug`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`oem_number` text NOT NULL,
	`oem_normalized` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`condition` text DEFAULT 'new_nos' NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer NOT NULL,
	`vat_rate_percent` integer DEFAULT 19 NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`reserved_quantity` integer DEFAULT 0 NOT NULL,
	`image_url` text NOT NULL,
	`image_alt` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_oem_number_unique` ON `products` (`oem_number`);--> statement-breakpoint
CREATE INDEX `idx_products_oem_norm` ON `products` (`oem_normalized`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `idx_products_active` ON `products` (`active`,`featured`);