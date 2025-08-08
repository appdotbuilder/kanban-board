import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type MoveTaskInput, type Task } from '../schema';
import { eq, gte, and, sql } from 'drizzle-orm';

export const moveTask = async (input: MoveTaskInput): Promise<Task> => {
  try {
    // Start a database transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // First, get the current task to know its current status and position
      const currentTask = await tx.select()
        .from(tasksTable)
        .where(eq(tasksTable.id, input.id))
        .limit(1)
        .execute();

      if (currentTask.length === 0) {
        throw new Error(`Task with id ${input.id} not found`);
      }

      const task = currentTask[0];
      const oldStatus = task.status;
      const oldPosition = task.position;
      const newStatus = input.status;
      const newPosition = input.position;

      // If moving to a different column (status change)
      if (oldStatus !== newStatus) {
        // Make room in the destination column by incrementing positions of tasks at or after the new position
        await tx.update(tasksTable)
          .set({
            position: sql`${tasksTable.position} + 1`,
            updated_at: sql`now()`
          })
          .where(
            and(
              eq(tasksTable.status, newStatus),
              gte(tasksTable.position, newPosition)
            )
          )
          .execute();

        // Close the gap in the source column by decrementing positions of tasks after the old position
        await tx.update(tasksTable)
          .set({
            position: sql`${tasksTable.position} - 1`,
            updated_at: sql`now()`
          })
          .where(
            and(
              eq(tasksTable.status, oldStatus),
              gte(tasksTable.position, oldPosition + 1)
            )
          )
          .execute();
      } else {
        // Moving within the same column
        if (newPosition !== oldPosition) {
          if (newPosition > oldPosition) {
            // Moving down: decrement positions of tasks between old and new position
            await tx.update(tasksTable)
              .set({
                position: sql`${tasksTable.position} - 1`,
                updated_at: sql`now()`
              })
              .where(
                and(
                  eq(tasksTable.status, newStatus),
                  gte(tasksTable.position, oldPosition + 1),
                  sql`${tasksTable.position} <= ${newPosition}`
                )
              )
              .execute();
          } else {
            // Moving up: increment positions of tasks between new and old position
            await tx.update(tasksTable)
              .set({
                position: sql`${tasksTable.position} + 1`,
                updated_at: sql`now()`
              })
              .where(
                and(
                  eq(tasksTable.status, newStatus),
                  gte(tasksTable.position, newPosition),
                  sql`${tasksTable.position} < ${oldPosition}`
                )
              )
              .execute();
          }
        }
      }

      // Finally, update the moved task with its new status and position
      const updatedTasks = await tx.update(tasksTable)
        .set({
          status: newStatus,
          position: newPosition,
          updated_at: sql`now()`
        })
        .where(eq(tasksTable.id, input.id))
        .returning()
        .execute();

      return updatedTasks[0];
    });

    return result;
  } catch (error) {
    console.error('Task move failed:', error);
    throw error;
  }
};