import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ReorderTasksInput } from '../schema';
import { eq } from 'drizzle-orm';

export const reorderTasks = async (input: ReorderTasksInput): Promise<{ success: boolean }> => {
  try {
    // Use a transaction to ensure all position updates happen atomically
    await db.transaction(async (tx) => {
      // Update each task's position and verify it exists
      for (const task of input.tasks) {
        const result = await tx.update(tasksTable)
          .set({
            position: task.position,
            updated_at: new Date()
          })
          .where(eq(tasksTable.id, task.id))
          .execute();

        // Check if any rows were affected (task exists)
        if (result.rowCount === 0) {
          throw new Error(`Task with id ${task.id} not found`);
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Task reordering failed:', error);
    throw error;
  }
};