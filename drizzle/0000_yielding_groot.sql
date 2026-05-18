CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`description` text,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sender_id` int NOT NULL,
	`recipient_role` enum('ADMIN_UP3','ADMIN_ULP'),
	`recipient_ulp_id` int,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_id` int NOT NULL,
	`ulp_id` int,
	`quantity` int NOT NULL DEFAULT 0,
	CONSTRAINT `stocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transaction_id` int NOT NULL,
	`material_id` int NOT NULL,
	`quantity` int NOT NULL,
	`description` text,
	CONSTRAINT `transaction_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference_number` varchar(100) NOT NULL,
	`type` enum('DISTRIBUTION','USAGE','INCOMING') NOT NULL,
	`status` enum('REQUESTED','DRAFT','APPROVED_ULP','COMPLETED') NOT NULL DEFAULT 'DRAFT',
	`created_by` int NOT NULL,
	`target_ulp_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`approved_at` datetime,
	`taker_name` varchar(255),
	`usage_purpose` varchar(255),
	`request_letter_base64` text,
	`photo_base64` text,
	`qr_code_base64` text,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_reference_number_unique` UNIQUE(`reference_number`)
);
--> statement-breakpoint
CREATE TABLE `ulps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `ulps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('ADMIN_UP3','ADMIN_ULP') NOT NULL,
	`ulp_id` int,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_ulp_id_ulps_id_fk` FOREIGN KEY (`recipient_ulp_id`) REFERENCES `ulps`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ulp_id_ulps_id_fk` FOREIGN KEY (`ulp_id`) REFERENCES `ulps`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_details` ADD CONSTRAINT `transaction_details_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_details` ADD CONSTRAINT `transaction_details_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_target_ulp_id_ulps_id_fk` FOREIGN KEY (`target_ulp_id`) REFERENCES `ulps`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_ulp_id_ulps_id_fk` FOREIGN KEY (`ulp_id`) REFERENCES `ulps`(`id`) ON DELETE no action ON UPDATE no action;