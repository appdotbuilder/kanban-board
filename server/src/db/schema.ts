import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// Define the task status enum for the database
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'completed']);

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default, matches Zod schema
  color: text('color').notNull(),
  status: taskStatusEnum('status').notNull().default('todo'),
  position: integer('position').notNull().default(0), // For ordering tasks within columns
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type Task = typeof tasksTable.$inferSelect; // For SELECT operations
export type NewTask = typeof tasksTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { tasks: tasksTable };