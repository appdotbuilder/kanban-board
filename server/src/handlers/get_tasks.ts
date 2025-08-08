import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { asc } from 'drizzle-orm';

export const getTasks = async (): Promise<Task[]> => {
  try {
    // Fetch all tasks ordered by status and position for proper Kanban display
    const results = await db.select()
      .from(tasksTable)
      .orderBy(asc(tasksTable.status), asc(tasksTable.position))
      .execute();

    // Return results - no numeric conversions needed as all fields are already proper types
    return results;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
};