import { z } from 'zod';

// Task status enum
export const taskStatusEnum = z.enum(['todo', 'in_progress', 'completed']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  status: taskStatusEnum,
  position: z.number().int(), // For ordering tasks within columns
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  color: z.string().min(1, 'Color is required'),
  status: taskStatusEnum.default('todo')
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional(),
  color: z.string().min(1, 'Color is required').optional(),
  status: taskStatusEnum.optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Input schema for moving tasks (drag and drop)
export const moveTaskInputSchema = z.object({
  id: z.number(),
  status: taskStatusEnum,
  position: z.number().int().nonnegative()
});

export type MoveTaskInput = z.infer<typeof moveTaskInputSchema>;

// Input schema for reordering tasks within the same column
export const reorderTasksInputSchema = z.object({
  tasks: z.array(z.object({
    id: z.number(),
    position: z.number().int().nonnegative()
  }))
});

export type ReorderTasksInput = z.infer<typeof reorderTasksInputSchema>;