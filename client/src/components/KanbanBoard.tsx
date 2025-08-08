import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Task, TaskStatus } from '../../../server/src/schema';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: number) => Promise<void>;
  onTaskMove: (taskId: number, newStatus: TaskStatus, newPosition: number) => Promise<void>;
}

const columns = [
  {
    id: 'todo' as TaskStatus,
    title: '📝 To Do',
    description: 'Tasks to be started',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    id: 'in_progress' as TaskStatus,
    title: '⚡ In Progress',
    description: 'Currently working on',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'completed' as TaskStatus,
    title: '✅ Completed',
    description: 'Finished tasks',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
];

export function KanbanBoard({ tasks, onTaskUpdate, onTaskDelete, onTaskMove }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Group tasks by status and sort by position
  const getTasksForColumn = (status: TaskStatus): Task[] => {
    return tasks
      .filter((task: Task) => task.status === status)
      .sort((a: Task, b: Task) => a.position - b.position);
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    // If dropping in the same column, don't move
    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      setDragOverColumn(null);
      return;
    }

    // Calculate new position (add to end of column)
    const tasksInDestination = getTasksForColumn(newStatus);
    const newPosition = tasksInDestination.length;

    try {
      await onTaskMove(draggedTask.id, newStatus, newPosition);
    } catch (error) {
      console.error('Failed to move task:', error);
    }

    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {columns.map((column) => {
        const columnTasks = getTasksForColumn(column.id);
        const isDropTarget = dragOverColumn === column.id && draggedTask?.status !== column.id;
        
        return (
          <Card
            key={column.id}
            className={`${column.bgColor} ${column.borderColor} border-2 transition-all duration-200 ${
              isDropTarget ? 'ring-2 ring-indigo-400 ring-offset-2 scale-105' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="p-6">
              {/* Column Header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {column.title}
                </h2>
                <p className="text-sm text-gray-600 mb-3">{column.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    {columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <KanbanColumn
                tasks={columnTasks}
                onTaskUpdate={onTaskUpdate}
                onTaskDelete={onTaskDelete}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDraggedOver={isDropTarget}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}