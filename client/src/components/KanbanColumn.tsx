import type { Task } from '../../../server/src/schema';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: number) => Promise<void>;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  isDraggedOver: boolean;
}

export function KanbanColumn({ 
  tasks, 
  onTaskUpdate, 
  onTaskDelete, 
  onDragStart, 
  onDragEnd,
  isDraggedOver 
}: KanbanColumnProps) {
  return (
    <div className={`space-y-4 min-h-[200px] transition-all duration-200 ${
      isDraggedOver ? 'bg-indigo-50 rounded-lg p-2' : ''
    }`}>
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No tasks yet</p>
        </div>
      ) : (
        tasks.map((task: Task) => (
          <TaskCard
            key={task.id}
            task={task}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))
      )}
    </div>
  );
}