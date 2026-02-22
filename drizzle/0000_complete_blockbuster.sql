CREATE TABLE `config` (
	`user_email` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_email`, `key`),
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_config_user_email` ON `config` (`user_email`);--> statement-breakpoint
CREATE TABLE `file_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`file_id` integer,
	`path` text NOT NULL,
	`hash` text,
	`event_type` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_file_history_user_email` ON `file_history` (`user_email`);--> statement-breakpoint
CREATE INDEX `idx_file_history_file_id` ON `file_history` (`file_id`);--> statement-breakpoint
CREATE INDEX `idx_file_history_timestamp` ON `file_history` (`timestamp`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_file_history_user_file_hash` ON `file_history` (`user_email`,`file_id`,`hash`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`path` text NOT NULL,
	`current_hash` text,
	`submitted` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_files_user_path_unique` ON `files` (`user_email`,`path`);--> statement-breakpoint
CREATE INDEX `idx_files_user_email` ON `files` (`user_email`);--> statement-breakpoint
CREATE INDEX `idx_files_path` ON `files` (`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_files_user_hash` ON `files` (`user_email`,`current_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`token` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watched_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`mark_id` text NOT NULL,
	`folder_path` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watched_folders_user_mark_folder` ON `watched_folders` (`user_email`,`mark_id`,`folder_path`);--> statement-breakpoint
CREATE INDEX `idx_watched_folders_user_email` ON `watched_folders` (`user_email`);--> statement-breakpoint
CREATE INDEX `idx_watched_folders_mark_id` ON `watched_folders` (`mark_id`);