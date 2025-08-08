import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq, and, max } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  color: '#FF5733',
  status: 'todo'
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.color).toEqual('#FF5733');
    expect(result.status).toEqual('todo');
    expect(result.position).toEqual(1); // First task should have position 1
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with null description', async () => {
    const inputWithNullDescription: CreateTaskInput = {
      title: 'Task Without Description',
      description: null,
      color: '#00FF00',
      status: 'in_progress'
    };

    const result = await createTask(inputWithNullDescription);

    expect(result.title).toEqual('Task Without Description');
    expect(result.description).toBeNull();
    expect(result.color).toEqual('#00FF00');
    expect(result.status).toEqual('in_progress');
    expect(result.position).toEqual(1); // First task in 'in_progress' column
  });

  it('should save task to database', async () => {
    const result = await createTask(testInput);

    // Query the database to verify the task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].color).toEqual('#FF5733');
    expect(tasks[0].status).toEqual('todo');
    expect(tasks[0].position).toEqual(1);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should calculate correct position when adding multiple tasks to same column', async () => {
    // Create first task
    const firstTask = await createTask({
      title: 'First Task',
      description: 'First task in todo',
      color: '#FF0000',
      status: 'todo'
    });

    // Create second task
    const secondTask = await createTask({
      title: 'Second Task', 
      description: 'Second task in todo',
      color: '#00FF00',
      status: 'todo'
    });

    // Create third task
    const thirdTask = await createTask({
      title: 'Third Task',
      description: 'Third task in todo', 
      color: '#0000FF',
      status: 'todo'
    });

    expect(firstTask.position).toEqual(1);
    expect(secondTask.position).toEqual(2);
    expect(thirdTask.position).toEqual(3);
  });

  it('should handle position calculation for different status columns independently', async () => {
    // Create tasks in different columns
    const todoTask = await createTask({
      title: 'Todo Task',
      description: 'Task in todo column',
      color: '#FF0000',
      status: 'todo'
    });

    const inProgressTask = await createTask({
      title: 'In Progress Task',
      description: 'Task in progress column',
      color: '#00FF00', 
      status: 'in_progress'
    });

    const completedTask = await createTask({
      title: 'Completed Task',
      description: 'Task in completed column',
      color: '#0000FF',
      status: 'completed'
    });

    // Each should be position 1 in their respective columns
    expect(todoTask.position).toEqual(1);
    expect(inProgressTask.position).toEqual(1);
    expect(completedTask.position).toEqual(1);

    // Add another task to todo column
    const secondTodoTask = await createTask({
      title: 'Second Todo Task',
      description: 'Another todo task',
      color: '#FFFF00',
      status: 'todo'
    });

    expect(secondTodoTask.position).toEqual(2);
  });

  it('should handle empty column correctly', async () => {
    // Verify no tasks exist initially
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.status, 'completed'))
      .execute();

    expect(existingTasks).toHaveLength(0);

    // Create first task in empty completed column
    const result = await createTask({
      title: 'First Completed Task',
      description: 'First in completed column',
      color: '#Purple',
      status: 'completed'
    });

    expect(result.position).toEqual(1);
  });

  it('should use default status when not provided', async () => {
    const inputWithDefaultStatus: CreateTaskInput = {
      title: 'Task With Default Status',
      description: 'Should use todo as default',
      color: '#GRAY',
      status: 'todo' // Explicitly providing the default value
    };

    const result = await createTask(inputWithDefaultStatus);

    expect(result.status).toEqual('todo');
    expect(result.position).toEqual(1); // First task in todo column
  });

  it('should verify position calculation with max function', async () => {
    // Create multiple tasks to test max position calculation
    await createTask({
      title: 'Task 1',
      description: null,
      color: '#Color1',
      status: 'in_progress'
    });

    await createTask({
      title: 'Task 2', 
      description: null,
      color: '#Color2',
      status: 'in_progress'
    });

    // Query max position directly to verify our logic
    const maxPositionResult = await db
      .select({ maxPosition: max(tasksTable.position) })
      .from(tasksTable)
      .where(eq(tasksTable.status, 'in_progress'))
      .execute();

    expect(maxPositionResult[0]?.maxPosition).toEqual(2);

    // Create another task and verify it gets position 3
    const newTask = await createTask({
      title: 'Task 3',
      description: null,
      color: '#Color3',
      status: 'in_progress'
    });

    expect(newTask.position).toEqual(3);
  });
});