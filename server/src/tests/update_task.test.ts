import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (input: CreateTaskInput) => {
  const result = await db.insert(tasksTable)
    .values({
      title: input.title,
      description: input.description,
      color: input.color,
      status: input.status || 'todo',
      position: 0
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test inputs
const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  color: '#ff0000',
  status: 'todo'
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title', async () => {
    // Create a test task first
    const createdTask = await createTestTask(testTaskInput);

    // Update just the title
    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Updated Title'
    };

    const result = await updateTask(updateInput);

    // Verify the update
    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual(testTaskInput.description); // Unchanged
    expect(result.color).toEqual(testTaskInput.color); // Unchanged
    expect(result.status).toEqual(testTaskInput.status); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should update task description', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      description: 'Updated description'
    };

    const result = await updateTask(updateInput);

    expect(result.description).toEqual('Updated description');
    expect(result.title).toEqual(testTaskInput.title); // Unchanged
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should update task color', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      color: '#00ff00'
    };

    const result = await updateTask(updateInput);

    expect(result.color).toEqual('#00ff00');
    expect(result.title).toEqual(testTaskInput.title); // Unchanged
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should update task status', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      status: 'in_progress'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('in_progress');
    expect(result.title).toEqual(testTaskInput.title); // Unchanged
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'New Title',
      description: 'New description',
      color: '#0000ff',
      status: 'completed'
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.color).toEqual('#0000ff');
    expect(result.status).toEqual('completed');
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should set description to null', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual(testTaskInput.title); // Unchanged
  });

  it('should save changes to database', async () => {
    const createdTask = await createTestTask(testTaskInput);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Database Test Title',
      status: 'completed'
    };

    await updateTask(updateInput);

    // Query the database directly to verify changes were saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Test Title');
    expect(tasks[0].status).toEqual('completed');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at > createdTask.updated_at).toBe(true);
  });

  it('should throw error for non-existent task', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve position when updating other fields', async () => {
    // Create task with specific position
    const taskWithPosition = await db.insert(tasksTable)
      .values({
        title: 'Positioned Task',
        description: null,
        color: '#ff0000',
        status: 'todo',
        position: 42
      })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: taskWithPosition[0].id,
      title: 'Updated Title'
    };

    const result = await updateTask(updateInput);

    // Position should remain unchanged
    expect(result.position).toEqual(42);
    expect(result.title).toEqual('Updated Title');
  });
});