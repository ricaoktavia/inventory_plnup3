import { mysqlTable, serial, int, varchar, text, mysqlEnum, timestamp, boolean } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// --- ULPs Table ---
export const ulps = mysqlTable('ulps', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull()
});

// --- Users Table ---
export const users = mysqlTable('users', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	role: mysqlEnum('role', ['ADMIN_UP3', 'ADMIN_ULP']).notNull(),
	ulpId: int('ulp_id').references(() => ulps.id) // Null for Admin UP3
});

// --- Materials Table ---
export const materials = mysqlTable('materials', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	unit: varchar('unit', { length: 50 }).notNull(),
	description: text('description')
});

// --- Stocks Table ---
export const stocks = mysqlTable('stocks', {
	id: serial('id').primaryKey(),
	materialId: int('material_id').notNull().references(() => materials.id),
	ulpId: int('ulp_id').references(() => ulps.id), // Null means UP3 central stock
	quantity: int('quantity').notNull().default(0)
});

// --- Transactions Table ---
export const transactions = mysqlTable('transactions', {
	id: serial('id').primaryKey(),
	referenceNumber: varchar('reference_number', { length: 100 }).notNull().unique(),
	type: mysqlEnum('type', ['DISTRIBUTION', 'USAGE', 'INCOMING']).notNull(),
	status: mysqlEnum('status', ['REQUESTED', 'DRAFT', 'APPROVED_ULP', 'COMPLETED']).notNull().default('DRAFT'),
	createdBy: int('created_by').notNull().references(() => users.id),
	targetUlpId: int('target_ulp_id').references(() => ulps.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	approvedAt: timestamp('approved_at'),
	takerName: varchar('taker_name', { length: 255 }),
	usagePurpose: varchar('usage_purpose', { length: 255 }),
	
	// Storing image and QR directly via Base64 in LONGTEXT 
	requestLetterBase64: text('request_letter_base64'),
	photoBase64: text('photo_base64'), 
	qrCodeBase64: text('qr_code_base64')
});

// --- Transaction Details Table ---
export const transactionDetails = mysqlTable('transaction_details', {
	id: serial('id').primaryKey(),
	transactionId: int('transaction_id').notNull().references(() => transactions.id),
	materialId: int('material_id').notNull().references(() => materials.id),
	quantity: int('quantity').notNull(),
	description: text('description')
});

// --- Notifications Table ---
export const notifications = mysqlTable('notifications', {
	id: serial('id').primaryKey(),
	senderId: int('sender_id').notNull().references(() => users.id),
	recipientRole: mysqlEnum('recipient_role', ['ADMIN_UP3', 'ADMIN_ULP']),
	recipientUlpId: int('recipient_ulp_id').references(() => ulps.id),
	message: text('message').notNull(),
	isRead: boolean('is_read').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
