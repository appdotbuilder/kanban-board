import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type MoveTaskInput, type CreateTaskInput } from '../schema';
import { moveTask } from '../handlers/move_task';
import { eq, asc } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (input: CreateTaskInput & { position?: number }) => {
  const result = await db.insert(tasksTable)
    .values({
      title: input.title,
      description: input.description,
      color: input.color,
      status: input.status || 'todo',
      position: input.position || 0
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper function to get all tasks ordered by status and position
const getAllTasks = async () => {
  return await db.select()
    .from(tasksTable)
    .orderBy(asc(tasksTable.status), asc(tasksTable.position))
    .execute();
};

describe('moveTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should move task between different columns (status change)', async () => {
    // Create test tasks in different columns
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'todo', position: 0 });
    const task2 = await createTestTask({ title: 'Task 2', description: null, color: '#00ff00', status: 'todo', position: 1 });
    const task3 = await createTestTask({ title: 'Task 3', description: null, color: '#0000ff', status: 'in_progress', position: 0 });

    const input: MoveTaskInput = {
      id: task1.id,
      status: 'in_progress',
      position: 1
    };

    const result = await moveTask(input);

    // Verify the moved task
    expect(result.id).toBe(task1.id);
    expect(result.status).toBe('in_progress');
    expect(result.position).toBe(1);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify positions after move
    const allTasks = await getAllTasks();
    
    // Find tasks by their original IDs
    const movedTask = allTasks.find(t => t.id === task1.id);
    const todoTask = allTasks.find(t => t.id === task2.id);
    const progressTask = allTasks.find(t => t.id === task3.id);

    // Verify final positions
    expect(movedTask?.status).toBe('in_progress');
    expect(movedTask?.position).toBe(1);
    
    expect(todoTask?.status).toBe('todo');
    expect(todoTask?.position).toBe(0); // Should have moved up to fill gap
    
    expect(progressTask?.status).toBe('in_progress');
    expect(progressTask?.position).toBe(0); // Should stay at position 0
  });

  it('should move task within same column (position change)', async () => {
    // Create multiple tasks in the same column
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'todo', position: 0 });
    const task2 = await createTestTask({ title: 'Task 2', description: null, color: '#00ff00', status: 'todo', position: 1 });
    const task3 = await createTestTask({ title: 'Task 3', description: null, color: '#0000ff', status: 'todo', position: 2 });
    const task4 = await createTestTask({ title: 'Task 4', description: null, color: '#ffff00', status: 'todo', position: 3 });

    // Move task from position 1 to position 3
    const input: MoveTaskInput = {
      id: task2.id,
      status: 'todo',
      position: 3
    };

    const result = await moveTask(input);

    // Verify the moved task
    expect(result.id).toBe(task2.id);
    expect(result.status).toBe('todo');
    expect(result.position).toBe(3);

    // Verify all tasks are in correct positions
    const todoTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(asc(tasksTable.position))
      .execute();

    // Expected order: task1(0), task3(1), task4(2), task2(3)
    expect(todoTasks[0].id).toBe(task1.id);
    expect(todoTasks[0].position).toBe(0);
    
    expect(todoTasks[1].id).toBe(task3.id);
    expect(todoTasks[1].position).toBe(1);
    
    expect(todoTasks[2].id).toBe(task4.id);
    expect(todoTasks[2].position).toBe(2);
    
    expect(todoTasks[3].id).toBe(task2.id);
    expect(todoTasks[3].position).toBe(3);
  });

  it('should move task up within same column', async () => {
    // Create multiple tasks
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'todo', position: 0 });
    const task2 = await createTestTask({ title: 'Task 2', description: null, color: '#00ff00', status: 'todo', position: 1 });
    const task3 = await createTestTask({ title: 'Task 3', description: null, color: '#0000ff', status: 'todo', position: 2 });

    // Move task from position 2 to position 0
    const input: MoveTaskInput = {
      id: task3.id,
      status: 'todo',
      position: 0
    };

    const result = await moveTask(input);

    expect(result.position).toBe(0);

    // Verify all positions
    const todoTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(asc(tasksTable.position))
      .execute();

    // Expected order: task3(0), task1(1), task2(2)
    expect(todoTasks[0].id).toBe(task3.id);
    expect(todoTasks[1].id).toBe(task1.id);
    expect(todoTasks[2].id).toBe(task2.id);
  });

  it('should handle moving to empty column', async () => {
    // Create task in todo column
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'todo', position: 0 });

    // Move to empty completed column
    const input: MoveTaskInput = {
      id: task1.id,
      status: 'completed',
      position: 0
    };

    const result = await moveTask(input);

    expect(result.status).toBe('completed');
    expect(result.position).toBe(0);

    // Verify task exists in completed column
    const completedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'completed'))
      .execute();

    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].id).toBe(task1.id);
  });

  it('should handle moving task to beginning of populated column', async () => {
    // Create tasks in progress column
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'in_progress', position: 0 });
    const task2 = await createTestTask({ title: 'Task 2', description: null, color: '#00ff00', status: 'in_progress', position: 1 });

    // Create task in todo column
    const todoTask = await createTestTask({ title: 'Todo Task', description: null, color: '#0000ff', status: 'todo', position: 0 });

    // Move todo task to beginning of progress column
    const input: MoveTaskInput = {
      id: todoTask.id,
      status: 'in_progress',
      position: 0
    };

    const result = await moveTask(input);

    expect(result.status).toBe('in_progress');
    expect(result.position).toBe(0);

    // Verify all tasks in progress column are correctly positioned
    const progressTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'in_progress'))
      .orderBy(asc(tasksTable.position))
      .execute();

    // Expected order: todoTask(0), task1(1), task2(2)
    expect(progressTasks[0].id).toBe(todoTask.id);
    expect(progressTasks[0].position).toBe(0);
    
    expect(progressTasks[1].id).toBe(task1.id);
    expect(progressTasks[1].position).toBe(1);
    
    expect(progressTasks[2].id).toBe(task2.id);
    expect(progressTasks[2].position).toBe(2);
  });

  it('should handle no-op move (same status and position)', async () => {
    const task1 = await createTestTask({ title: 'Task 1', description: null, color: '#ff0000', status: 'todo', position: 0 });
    const originalUpdatedAt = task1.updated_at;

    const input: MoveTaskInput = {
      id: task1.id,
      status: 'todo',
      position: 0
    };

    const result = await moveTask(input);

    expect(result.status).toBe('todo');
    expect(result.position).toBe(0);
    // updated_at should still be updated even for no-op moves
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent task', async () => {
    const input: MoveTaskInput = {
      id: 99999,
      status: 'todo',
      position: 0
    };

    expect(moveTask(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should maintain data integrity during complex moves', async () => {
    // Create a more complex scenario with multiple tasks in different columns
    const todoTasks = await Promise.all([
      createTestTask({ title: 'Todo 1', description: null, color: '#ff0000', status: 'todo', position: 0 }),
      createTestTask({ title: 'Todo 2', description: null, color: '#ff0001', status: 'todo', position: 1 }),
      createTestTask({ title: 'Todo 3', description: null, color: '#ff0002', status: 'todo', position: 2 })
    ]);

    const progressTasks = await Promise.all([
      createTestTask({ title: 'Progress 1', description: null, color: '#00ff00', status: 'in_progress', position: 0 }),
      createTestTask({ title: 'Progress 2', description: null, color: '#00ff01', status: 'in_progress', position: 1 })
    ]);

    // Move middle todo task to middle of progress column
    const input: MoveTaskInput = {
      id: todoTasks[1].id,
      status: 'in_progress',
      position: 1
    };

    await moveTask(input);

    // Verify no gaps in positions and no duplicate positions
    const finalTodoTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'todo'))
      .orderBy(asc(tasksTable.position))
      .execute();

    const finalProgressTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'in_progress'))
      .orderBy(asc(tasksTable.position))
      .execute();

    // Todo column should have positions 0, 1 (no gaps)
    expect(finalTodoTasks).toHaveLength(2);
    expect(finalTodoTasks.map(t => t.position)).toEqual([0, 1]);

    // Progress column should have positions 0, 1, 2 (no gaps)
    expect(finalProgressTasks).toHaveLength(3);
    expect(finalProgressTasks.map(t => t.position)).toEqual([0, 1, 2]);

    // Verify specific task positions
    expect(finalProgressTasks[1].id).toBe(todoTasks[1].id); // Moved task should be at position 1
  });
});