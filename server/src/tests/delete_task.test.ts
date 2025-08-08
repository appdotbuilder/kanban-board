import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestTask = async (title: string, status: 'todo' | 'in_progress' | 'completed' = 'todo', position: number = 0) => {
    const result = await db.insert(tasksTable)
      .values({
        title,
        color: '#ff0000',
        status,
        position,
        description: 'Test description'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should delete a task successfully', async () => {
    // Create a test task
    const task = await createTestTask('Task to delete');

    // Delete the task
    const result = await deleteTask(task.id);

    // Verify return value
    expect(result.success).toBe(true);

    // Verify task is deleted from database
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should reorder remaining tasks in the same column after deletion', async () => {
    // Create multiple tasks in todo column with different positions
    const task1 = await createTestTask('Task 1', 'todo', 0);
    const task2 = await createTestTask('Task 2', 'todo', 1);
    const task3 = await createTestTask('Task 3', 'todo', 2);
    const task4 = await createTestTask('Task 4', 'todo', 3);

    // Delete the task in position 1 (task2)
    await deleteTask(task2.id);

    // Verify remaining tasks are reordered
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(tasksTable.position)
      .execute();

    expect(remainingTasks).toHaveLength(3);
    expect(remainingTasks[0].id).toBe(task1.id);
    expect(remainingTasks[0].position).toBe(0);
    expect(remainingTasks[1].id).toBe(task3.id);
    expect(remainingTasks[1].position).toBe(1); // Was 2, now moved up
    expect(remainingTasks[2].id).toBe(task4.id);
    expect(remainingTasks[2].position).toBe(2); // Was 3, now moved up
  });

  it('should only reorder tasks in the same column', async () => {
    // Create tasks in different columns
    const todoTask1 = await createTestTask('Todo 1', 'todo', 0);
    const todoTask2 = await createTestTask('Todo 2', 'todo', 1);
    const inProgressTask1 = await createTestTask('In Progress 1', 'in_progress', 0);
    const inProgressTask2 = await createTestTask('In Progress 2', 'in_progress', 1);

    // Delete a task from todo column
    await deleteTask(todoTask1.id);

    // Verify only todo tasks are reordered
    const todoTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(tasksTable.position)
      .execute();

    const inProgressTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'in_progress'))
      .orderBy(tasksTable.position)
      .execute();

    // Todo column should have one task with position 0
    expect(todoTasks).toHaveLength(1);
    expect(todoTasks[0].id).toBe(todoTask2.id);
    expect(todoTasks[0].position).toBe(0); // Was 1, now moved up

    // In-progress column should remain unchanged
    expect(inProgressTasks).toHaveLength(2);
    expect(inProgressTasks[0].position).toBe(0);
    expect(inProgressTasks[1].position).toBe(1);
  });

  it('should handle deleting the last task in a column', async () => {
    // Create tasks where one is the last in its column
    const task1 = await createTestTask('Task 1', 'todo', 0);
    const task2 = await createTestTask('Task 2', 'todo', 1);
    const lastTask = await createTestTask('Last Task', 'todo', 2);

    // Delete the last task
    await deleteTask(lastTask.id);

    // Verify other tasks are unchanged
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(tasksTable.position)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    expect(remainingTasks[0].id).toBe(task1.id);
    expect(remainingTasks[0].position).toBe(0);
    expect(remainingTasks[1].id).toBe(task2.id);
    expect(remainingTasks[1].position).toBe(1);
  });

  it('should handle deleting the first task in a column', async () => {
    // Create tasks where one is the first in its column
    const firstTask = await createTestTask('First Task', 'todo', 0);
    const task2 = await createTestTask('Task 2', 'todo', 1);
    const task3 = await createTestTask('Task 3', 'todo', 2);

    // Delete the first task
    await deleteTask(firstTask.id);

    // Verify other tasks are moved up
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(tasksTable.position)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    expect(remainingTasks[0].id).toBe(task2.id);
    expect(remainingTasks[0].position).toBe(0); // Was 1, now moved up
    expect(remainingTasks[1].id).toBe(task3.id);
    expect(remainingTasks[1].position).toBe(1); // Was 2, now moved up
  });

  it('should throw error when task not found', async () => {
    // Try to delete a non-existent task
    await expect(deleteTask(99999)).rejects.toThrow(/not found/i);
  });

  it('should update timestamps on reordered tasks', async () => {
    // Create tasks
    const task1 = await createTestTask('Task 1', 'todo', 0);
    const task2 = await createTestTask('Task 2', 'todo', 1);
    const task3 = await createTestTask('Task 3', 'todo', 2);

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete first task
    await deleteTask(task1.id);

    // Check that remaining tasks have updated timestamps
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(tasksTable.position)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    // Updated tasks should have newer updated_at timestamps
    remainingTasks.forEach(task => {
      expect(task.updated_at).toBeInstanceOf(Date);
      expect(task.updated_at.getTime()).toBeGreaterThan(task.created_at.getTime());
    });
  });
});