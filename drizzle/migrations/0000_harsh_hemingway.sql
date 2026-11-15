CREATE TABLE `vehicle_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text NOT NULL,
	`width` integer DEFAULT 1280 NOT NULL,
	`height` integer DEFAULT 854 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vehicle_images_vehicle` ON `vehicle_images` (`vehicle_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`year` integer NOT NULL,
	`mileage_km` integer,
	`power_ps` integer,
	`power_kw` integer,
	`displacement_cc` integer,
	`engine_type` text,
	`transmission` text NOT NULL,
	`drivetrain` text,
	`fuel_type` text DEFAULT 'Benzin' NOT NULL,
	`exterior_color` text,
	`interior_color` text,
	`price_cents` integer,
	`price_on_request` integer DEFAULT false NOT NULL,
	`vat_deductible` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`highlights_json` text DEFAULT '[]' NOT NULL,
	`mobile_de_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_slug_unique` ON `vehicles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_vehicles_status_sort` ON `vehicles` (`status`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_vehicles_brand` ON `vehicles` (`brand`);