import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();

    expect(result).toEqual([]);
  });

  it('should return all tasks ordered by status and position', async () => {
    // Create test tasks with different statuses and positions
    await db.insert(tasksTable).values([
      {
        title: 'Task 1',
        description: 'First task',
        color: '#ff0000',
        status: 'completed',
        position: 1
      },
      {
        title: 'Task 2', 
        description: 'Second task',
        color: '#00ff00',
        status: 'todo',
        position: 0
      },
      {
        title: 'Task 3',
        description: null,
        color: '#0000ff',
        status: 'in_progress',
        position: 2
      },
      {
        title: 'Task 4',
        description: 'Fourth task',
        color: '#ffff00',
        status: 'todo',
        position: 1
      }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(4);
    
    // Verify ordering: todo (pos 0, 1), in_progress (pos 2), completed (pos 1)
    expect(result[0].title).toBe('Task 2'); // todo, position 0
    expect(result[0].status).toBe('todo');
    expect(result[0].position).toBe(0);

    expect(result[1].title).toBe('Task 4'); // todo, position 1
    expect(result[1].status).toBe('todo');
    expect(result[1].position).toBe(1);

    expect(result[2].title).toBe('Task 3'); // in_progress, position 2
    expect(result[2].status).toBe('in_progress');
    expect(result[2].position).toBe(2);

    expect(result[3].title).toBe('Task 1'); // completed, position 1
    expect(result[3].status).toBe('completed');
    expect(result[3].position).toBe(1);
  });

  it('should return tasks with all required fields', async () => {
    await db.insert(tasksTable).values({
      title: 'Test Task',
      description: 'Test description',
      color: '#123456',
      status: 'todo',
      position: 0
    }).execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    const task = result[0];

    // Verify all required fields are present
    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe('number');
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('Test description');
    expect(task.color).toBe('#123456');
    expect(task.status).toBe('todo');
    expect(task.position).toBe(0);
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should handle tasks with null descriptions', async () => {
    await db.insert(tasksTable).values({
      title: 'Task without description',
      description: null,
      color: '#654321',
      status: 'in_progress',
      position: 5
    }).execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task without description');
    expect(result[0].description).toBeNull();
    expect(result[0].color).toBe('#654321');
    expect(result[0].status).toBe('in_progress');
  });

  it('should maintain correct position ordering within same status', async () => {
    // Create multiple tasks with same status but different positions
    await db.insert(tasksTable).values([
      { title: 'Todo 3', description: null, color: '#111', status: 'todo', position: 3 },
      { title: 'Todo 1', description: null, color: '#222', status: 'todo', position: 1 },
      { title: 'Todo 5', description: null, color: '#333', status: 'todo', position: 5 },
      { title: 'Todo 2', description: null, color: '#444', status: 'todo', position: 2 }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(4);
    
    // All should be todo status, ordered by position
    expect(result[0].title).toBe('Todo 1');
    expect(result[0].position).toBe(1);
    expect(result[1].title).toBe('Todo 2');
    expect(result[1].position).toBe(2);
    expect(result[2].title).toBe('Todo 3');
    expect(result[2].position).toBe(3);
    expect(result[3].title).toBe('Todo 5');
    expect(result[3].position).toBe(5);
  });
});