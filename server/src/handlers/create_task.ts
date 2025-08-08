import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq, max } from 'drizzle-orm';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Calculate the next position by finding the highest position in the target status column
    const maxPositionResult = await db
      .select({ maxPosition: max(tasksTable.position) })
      .from(tasksTable)
      .where(eq(tasksTable.status, input.status || 'todo'))
      .execute();

    const nextPosition = (maxPositionResult[0]?.maxPosition || 0) + 1;

    // Insert the new task
    const result = await db
      .insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        color: input.color,
        status: input.status || 'todo',
        position: nextPosition
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};