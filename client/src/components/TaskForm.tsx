import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TaskFormProps {
  initialData?: {
    title: string;
    description: string | null;
    color: string;
  };
  onSubmit: (data: { title: string; description: string | null; color: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const predefinedColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Yellow', value: '#EAB308' },
];

export function TaskForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Create Task' 
}: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    color: initialData?.color || predefinedColors[0].value
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        color: formData.color
      });
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, color }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Enter task title..."
          required
          disabled={isLoading}
          className="w-full"
        />
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Enter task description (optional)..."
          disabled={isLoading}
          className="w-full min-h-[80px] resize-none"
        />
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-3">
          {predefinedColors.map((colorOption) => (
            <button
              key={colorOption.value}
              type="button"
              onClick={() => handleColorChange(colorOption.value)}
              disabled={isLoading}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                formData.color === colorOption.value 
                  ? 'border-gray-800 ring-2 ring-gray-300 ring-offset-2' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: colorOption.value }}
              title={colorOption.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-600">Custom:</span>
          <input
            type="color"
            value={formData.color}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleColorChange(e.target.value)
            }
            disabled={isLoading}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}