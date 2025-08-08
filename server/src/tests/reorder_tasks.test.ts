import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ReorderTasksInput } from '../schema';
import { reorderTasks } from '../handlers/reorder_tasks';
import { eq, asc } from 'drizzle-orm';

describe('reorderTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should reorder multiple tasks successfully', async () => {
    // Create test tasks with initial positions
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        color: '#ff0000',
        status: 'todo',
        position: 0
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        color: '#00ff00',
        status: 'todo',
        position: 1
      })
      .returning()
      .execute();

    const task3 = await db.insert(tasksTable)
      .values({
        title: 'Task 3',
        description: 'Third task',
        color: '#0000ff',
        status: 'todo',
        position: 2
      })
      .returning()
      .execute();

    // Reorder tasks: swap positions
    const input: ReorderTasksInput = {
      tasks: [
        { id: task1[0].id, position: 2 }, // Move task 1 to end
        { id: task2[0].id, position: 0 }, // Move task 2 to start
        { id: task3[0].id, position: 1 }  // Move task 3 to middle
      ]
    };

    const result = await reorderTasks(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify tasks are reordered in database
    const reorderedTasks = await db.select()
      .from(tasksTable)
      .orderBy(asc(tasksTable.position))
      .execute();

    expect(reorderedTasks).toHaveLength(3);
    expect(reorderedTasks[0].id).toBe(task2[0].id); // Task 2 should be first
    expect(reorderedTasks[0].position).toBe(0);
    expect(reorderedTasks[1].id).toBe(task3[0].id); // Task 3 should be second
    expect(reorderedTasks[1].position).toBe(1);
    expect(reorderedTasks[2].id).toBe(task1[0].id); // Task 1 should be last
    expect(reorderedTasks[2].position).toBe(2);
  });

  it('should update timestamps when reordering tasks', async () => {
    // Create a test task
    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        color: '#ffffff',
        status: 'todo',
        position: 0
      })
      .returning()
      .execute();

    const originalUpdatedAt = task[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Reorder the task (change position)
    const input: ReorderTasksInput = {
      tasks: [
        { id: task[0].id, position: 5 }
      ]
    };

    await reorderTasks(input);

    // Verify updated_at was changed
    const updatedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task[0].id))
      .execute();

    expect(updatedTask[0].updated_at).not.toEqual(originalUpdatedAt);
    expect(updatedTask[0].updated_at > originalUpdatedAt).toBe(true);
    expect(updatedTask[0].position).toBe(5);
  });

  it('should handle single task reordering', async () => {
    // Create one task
    const task = await db.insert(tasksTable)
      .values({
        title: 'Single Task',
        description: 'Only task to reorder',
        color: '#purple',
        status: 'in_progress',
        position: 1
      })
      .returning()
      .execute();

    const input: ReorderTasksInput = {
      tasks: [
        { id: task[0].id, position: 10 }
      ]
    };

    const result = await reorderTasks(input);

    expect(result.success).toBe(true);

    // Verify position was updated
    const updatedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task[0].id))
      .execute();

    expect(updatedTask[0].position).toBe(10);
  });

  it('should handle empty tasks array', async () => {
    const input: ReorderTasksInput = {
      tasks: []
    };

    const result = await reorderTasks(input);
    expect(result.success).toBe(true);
  });

  it('should handle reordering with zero positions', async () => {
    // Create tasks with various positions
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task A',
        description: 'Task A description',
        color: '#red',
        status: 'completed',
        position: 5
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task B',
        description: 'Task B description',
        color: '#blue',
        status: 'completed',
        position: 3
      })
      .returning()
      .execute();

    // Reorder with zero positions
    const input: ReorderTasksInput = {
      tasks: [
        { id: task1[0].id, position: 0 },
        { id: task2[0].id, position: 0 } // Both tasks at position 0
      ]
    };

    const result = await reorderTasks(input);
    expect(result.success).toBe(true);

    // Verify both tasks have position 0
    const reorderedTasks = await db.select()
      .from(tasksTable)
      .orderBy(asc(tasksTable.id))
      .execute();

    expect(reorderedTasks[0].position).toBe(0);
    expect(reorderedTasks[1].position).toBe(0);
  });

  it('should handle reordering tasks with non-existent task id gracefully', async () => {
    // Create one valid task
    const validTask = await db.insert(tasksTable)
      .values({
        title: 'Valid Task',
        description: 'This task exists',
        color: '#green',
        status: 'todo',
        position: 0
      })
      .returning()
      .execute();

    const input: ReorderTasksInput = {
      tasks: [
        { id: validTask[0].id, position: 1 },
        { id: 99999, position: 2 } // Non-existent task ID
      ]
    };

    // Should throw error for non-existent task
    await expect(reorderTasks(input)).rejects.toThrow(/Task with id 99999 not found/);

    // Verify the transaction was rolled back - valid task should still have original position
    const unchangedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, validTask[0].id))
      .execute();

    expect(unchangedTask[0].position).toBe(0); // Should still be original position
  });
});