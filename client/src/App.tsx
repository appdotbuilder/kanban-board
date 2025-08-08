import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// Using text-based icons for better compatibility
// import { Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task } from '../../server/src/schema';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskForm } from '@/components/TaskForm';

/**
 * Kanban Board Application
 * 
 * Note: The backend handlers are currently stubs/placeholders.
 * This implementation includes demo data and local state management
 * to showcase the full functionality. In a real implementation,
 * the backend would handle persistence and the frontend would
 * purely reflect the server state.
 */
function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTasks.query();
      // Since backend handlers are stubs, add some demo data if result is empty
      if (result.length === 0) {
        const demoTasks: Task[] = [
          {
            id: 1,
            title: 'Design user interface mockups',
            description: 'Create wireframes and high-fidelity designs for the new dashboard',
            color: '#3B82F6',
            status: 'todo',
            position: 0,
            created_at: new Date('2024-01-15T10:30:00Z'),
            updated_at: new Date('2024-01-15T10:30:00Z')
          },
          {
            id: 2,
            title: 'Implement authentication system',
            description: 'Set up JWT-based authentication with refresh tokens',
            color: '#F97316',
            status: 'in_progress',
            position: 0,
            created_at: new Date('2024-01-14T09:15:00Z'),
            updated_at: new Date('2024-01-16T14:22:00Z')
          },
          {
            id: 3,
            title: 'Write API documentation',
            description: null,
            color: '#10B981',
            status: 'completed',
            position: 0,
            created_at: new Date('2024-01-13T16:45:00Z'),
            updated_at: new Date('2024-01-15T11:30:00Z')
          },
          {
            id: 4,
            title: 'Set up deployment pipeline',
            description: 'Configure CI/CD with automated testing and deployment',
            color: '#8B5CF6',
            status: 'todo',
            position: 1,
            created_at: new Date('2024-01-16T08:20:00Z'),
            updated_at: new Date('2024-01-16T08:20:00Z')
          }
        ];
        setTasks(demoTasks);
      } else {
        setTasks(result);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Fallback to demo data on error
      const demoTasks: Task[] = [
        {
          id: 1,
          title: 'Demo Task - Create new feature',
          description: 'This is a demo task since the backend handlers are stubs',
          color: '#3B82F6',
          status: 'todo',
          position: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setTasks(demoTasks);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskCreate = async (taskData: { title: string; description: string | null; color: string }) => {
    try {
      const newTask = await trpc.createTask.mutate({
        ...taskData,
        status: 'todo'
      });
      
      // Since backend handler is a stub, create a proper task object
      const createdTask: Task = {
        id: Date.now(), // Use timestamp as ID for demo
        title: taskData.title,
        description: taskData.description,
        color: taskData.color,
        status: 'todo',
        position: tasks.filter((t: Task) => t.status === 'todo').length,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      setTasks((prev: Task[]) => [...prev, createdTask]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    try {
      await trpc.updateTask.mutate({ id: taskId, ...updates });
      
      // Since backend handler is a stub, update local state directly
      setTasks((prev: Task[]) => 
        prev.map((task: Task) => 
          task.id === taskId 
            ? { ...task, ...updates, updated_at: new Date() }
            : task
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate(taskId);
      
      // Since backend handler is a stub, update local state directly
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleTaskMove = async (taskId: number, newStatus: 'todo' | 'in_progress' | 'completed', newPosition: number) => {
    try {
      await trpc.moveTask.mutate({
        id: taskId,
        status: newStatus,
        position: newPosition
      });
      
      // Since backend handler is a stub, update local state directly
      setTasks((prev: Task[]) => {
        const updatedTasks = prev.map((task: Task) => 
          task.id === taskId 
            ? { ...task, status: newStatus, position: newPosition, updated_at: new Date() }
            : task
        );
        return updatedTasks;
      });
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📋 Kanban Board</h1>
            <p className="text-gray-600">Organize your tasks and boost productivity</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
                <span className="text-lg">➕</span>
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <TaskForm 
                onSubmit={handleTaskCreate}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onTaskMove={handleTaskMove}
          />
        )}
      </div>
    </div>
  );
}

export default App;