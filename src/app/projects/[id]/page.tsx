
"use client";

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { SopTimeline } from '@/components/SopTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { mockSops } from '@/lib/mockData';
import { Edit, Plus, Trash2 } from 'lucide-react';

const mockProjects = [
    { id: "q3-marketing-campaign", name: "Q3 Marketing Campaign", description: "Launch campaign for the new product line.", status: "In Progress", sop: "sop-004" },
    { id: "website-redesign", name: "Website Redesign", description: "Complete overhaul of the corporate website.", status: "Planning", sop: "sop-002" },
    { id: "new-hire-batch-onboarding", name: "New Hire Batch Onboarding", description: "Onboard the new batch of engineers.", status: "Completed", sop: "sop-001" },
];

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const project = mockProjects.find(p => p.id === projectId);
  const sop = mockSops.find(s => s.id === project?.sop);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  if (!project || !sop) {
    notFound();
  }

  const handleAddTask = () => {
    if (newTask.trim() !== '') {
      setTasks([...tasks, { id: `task-${Date.now()}`, text: newTask, completed: false }]);
      setNewTask('');
    }
  };
  
  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };
  
  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };


  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2 max-w-4xl">
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            &larr; Back to Work Tracker
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-primary">{project.name}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{project.description}</p>
        </div>
        <Button variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Edit Project
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Project To-Do List</CardTitle>
              <CardDescription>Track tasks specific to this project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add a new task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                    <Button onClick={handleAddTask} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Task
                    </Button>
                </div>
                <div className="space-y-2">
                    {tasks.length > 0 ? tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                            <Checkbox 
                                id={`task-${task.id}`} 
                                checked={task.completed} 
                                onCheckedChange={() => toggleTask(task.id)}
                            />
                            <Label htmlFor={`task-${task.id}`} className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.text}
                            </Label>
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeTask(task.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks added yet.</p>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>SOP Guideline</CardTitle>
              <CardDescription>{sop.title}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <SopTimeline steps={sop.steps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
