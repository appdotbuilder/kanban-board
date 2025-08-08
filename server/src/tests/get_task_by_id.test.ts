import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

// Test task input
const testTask: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  color: '#FF5733',
  status: 'todo'
};

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a task when it exists', async () => {
    // Create a test task first
    const insertResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        color: testTask.color,
        status: testTask.status,
        position: 0
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.description).toEqual('A task for testing');
    expect(result!.color).toEqual('#FF5733');
    expect(result!.status).toEqual('todo');
    expect(result!.position).toEqual(0);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when task does not exist', async () => {
    // Test with a non-existent ID
    const result = await getTaskById(999999);

    expect(result).toBeNull();
  });

  it('should handle tasks with null description', async () => {
    // Create a task with null description
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Task with null description',
        description: null,
        color: '#00FF00',
        status: 'in_progress',
        position: 1
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.title).toEqual('Task with null description');
    expect(result!.description).toBeNull();
    expect(result!.color).toEqual('#00FF00');
    expect(result!.status).toEqual('in_progress');
    expect(result!.position).toEqual(1);
  });

  it('should return task with different status values', async () => {
    // Create tasks with different status values
    const todoTask = await db.insert(tasksTable)
      .values({
        title: 'Todo Task',
        description: 'Todo description',
        color: '#FF0000',
        status: 'todo',
        position: 0
      })
      .returning()
      .execute();

    const inProgressTask = await db.insert(tasksTable)
      .values({
        title: 'In Progress Task',
        description: 'In progress description',
        color: '#FFFF00',
        status: 'in_progress',
        position: 1
      })
      .returning()
      .execute();

    const completedTask = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: 'Completed description',
        color: '#00FF00',
        status: 'completed',
        position: 2
      })
      .returning()
      .execute();

    // Test each task
    const todoResult = await getTaskById(todoTask[0].id);
    expect(todoResult!.status).toEqual('todo');

    const inProgressResult = await getTaskById(inProgressTask[0].id);
    expect(inProgressResult!.status).toEqual('in_progress');

    const completedResult = await getTaskById(completedTask[0].id);
    expect(completedResult!.status).toEqual('completed');
  });

  it('should return correct position values', async () => {
    // Create tasks with different positions
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        color: '#FF0000',
        status: 'todo',
        position: 0
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        color: '#FF0000',
        status: 'todo',
        position: 5
      })
      .returning()
      .execute();

    // Test positions
    const result1 = await getTaskById(task1[0].id);
    expect(result1!.position).toEqual(0);

    const result2 = await getTaskById(task2[0].id);
    expect(result2!.position).toEqual(5);
  });
});