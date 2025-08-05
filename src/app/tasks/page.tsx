"use client";

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { mockSops } from '@/lib/mockData';
import { SOPStep } from '@/lib/types';
import { Check, Clock } from 'lucide-react';
import Link from 'next/link';

interface Task extends SOPStep {
  sopTitle: string;
  sopId: string;
}

export default function TasksPage() {
  const { user } = useAuth();

  const tasks = useMemo(() => {
    if (!user) return [];
    const allTasks: Task[] = [];
    mockSops.forEach(sop => {
      sop.steps.forEach(step => {
        if (step.owner === user.email) {
          allTasks.push({ ...step, sopTitle: sop.title, sopId: sop.id });
        }
      });
    });
    return allTasks;
  }, [user]);

  const toReviewTasks = tasks.filter(task => task.status === 'Review');
  const toApproveTasks = tasks.filter(task => task.status === 'Draft'); // Assuming 'Draft' needs approval
  const completedTasks = tasks.filter(task => task.status === 'Approved');
  
  const TaskList = ({ tasks, emptyMessage }: { tasks: Task[], emptyMessage: string }) => {
    if (tasks.length === 0) {
        return <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
    }
    return (
        <div className="space-y-4">
            {tasks.map(task => (
                <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className='max-w-prose'>
                            <p className="text-sm text-muted-foreground">{task.sopTitle}</p>
                            <p className="font-semibold">{task.title}</p>
                        </div>
                         <Link href={`/sops/${task.sopId}`} passHref>
                            <Button variant="outline">View SOP</Button>
                         </Link>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold text-primary">My Tasks</h1>
        <p className="text-lg text-muted-foreground">Here are all the SOP steps assigned to you.</p>
      </div>

      <Tabs defaultValue="review" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="review" className="gap-2">
            <Clock className='w-4 h-4' /> To Review ({toReviewTasks.length})
          </TabsTrigger>
          <TabsTrigger value="approve" className="gap-2">
            <Check className='w-4 h-4' /> To Approve ({toApproveTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <Check className='w-4 h-4 text-accent' /> Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="review">
            <Card>
                <CardHeader>
                    <CardTitle>Tasks Pending Review</CardTitle>
                    <CardDescription>These items require your review before they can proceed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TaskList tasks={toReviewTasks} emptyMessage="No tasks are currently waiting for your review." />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="approve">
             <Card>
                <CardHeader>
                    <CardTitle>Tasks Pending Approval</CardTitle>
                    <CardDescription>These items are awaiting your final approval.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TaskList tasks={toApproveTasks} emptyMessage="You have no tasks to approve." />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="completed">
             <Card>
                <CardHeader>
                    <CardTitle>Completed Tasks</CardTitle>
                    <CardDescription>These are your recently completed tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TaskList tasks={completedTasks} emptyMessage="You have not completed any tasks yet." />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
