CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inquiry_number` text NOT NULL,
	`type` text NOT NULL,
	`topic` text NOT NULL,
	`sender_name` text NOT NULL,
	`sender_email` text NOT NULL,
	`sender_phone` text,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`media_keys_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_inquiry_number_unique` ON `inquiries` (`inquiry_number`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_type_created` ON `inquiries` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_status` ON `inquiries` (`status`);