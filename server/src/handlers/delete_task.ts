import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq, gt, and, sql } from 'drizzle-orm';

export const deleteTask = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First, get the task to find out which column (status) and position it's in
    const taskToDelete = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();

    if (taskToDelete.length === 0) {
      throw new Error(`Task with id ${id} not found`);
    }

    const task = taskToDelete[0];
    const { status, position } = task;

    // Delete the task
    await db.delete(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();

    // Reorder remaining tasks in the same column to fill the gap
    // Move all tasks with position > deleted task's position up by 1
    await db.update(tasksTable)
      .set({
        position: sql`${tasksTable.position} - 1`,
        updated_at: new Date()
      })
      .where(and(
        eq(tasksTable.status, status),
        gt(tasksTable.position, position)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};