import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// Using text-based icons for better compatibility
// import { Edit, Trash2, GripVertical } from 'lucide-react';
import type { Task } from '../../../server/src/schema';
import { TaskForm } from './TaskForm';

interface TaskCardProps {
  task: Task;
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: number) => Promise<void>;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
}

export function TaskCard({ task, onTaskUpdate, onTaskDelete, onDragStart, onDragEnd }: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(task);
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleEdit = async (taskData: { title: string; description: string | null; color: string }) => {
    try {
      await onTaskUpdate(task.id, taskData);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await onTaskDelete(task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`cursor-move transition-all duration-200 hover:shadow-md ${
          isDragging ? 'opacity-50 scale-95 rotate-2' : 'hover:scale-[1.02]'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="text-gray-400 mt-1 flex-shrink-0 text-sm">⋮⋮</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate" title={task.title}>
                  {task.title}
                </h3>
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm mt-2"
                  style={{ backgroundColor: task.color }}
                  title="Task color"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        {task.description && (
          <CardContent className="py-0 pb-3">
            <p className="text-sm text-gray-600 break-words">
              {task.description}
            </p>
          </CardContent>
        )}

        <CardFooter className="pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {formatDate(task.created_at)}
          </span>
          
          <div className="flex items-center gap-1">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <span className="text-sm">✏️</span>
              </Button>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  initialData={{
                    title: task.title,
                    description: task.description,
                    color: task.color
                  }}
                  onSubmit={handleEdit}
                  onCancel={() => setIsEditDialogOpen(false)}
                  submitLabel="Update Task"
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                >
                  <span className="text-sm">🗑️</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{task.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}