import { notFound } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { SopTimeline } from '@/components/SopTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { mockSops } from '@/lib/mockData';
import type { SOPStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Check, MessageSquare, Share2, FileDown, Edit } from 'lucide-react';
import Link from 'next/link';

const getSop = (id: string) => {
  return mockSops.find(sop => sop.id === id);
};

const getStatusVariant = (status: SOPStatus) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'In Review': return 'secondary';
      case 'Draft': return 'outline';
      case 'Archived': return 'destructive';
      default: return 'outline';
    }
  };

export default function SopDetailPage({ params }: { params: { id: string } }) {
  const sop = getSop(params.id);

  if (!sop) {
    notFound();
  }

  return (
    <MainLayout>
        <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
            <div className="space-y-2 max-w-4xl">
                <Link href="/sops" className="text-sm text-primary hover:underline">
                    &larr; Back to all SOPs
                </Link>
                <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
                    {sop.title} 
                    <Badge variant={getStatusVariant(sop.status)} className="text-base">{sop.status}</Badge>
                </h1>
                <p className="text-lg text-muted-foreground">{sop.description}</p>
            </div>
            <div className='flex gap-2 flex-wrap'>
                <Button variant="outline" className='gap-2'><Check className='w-4 h-4' /> Approve</Button>
                <Button variant="outline" className='gap-2'><MessageSquare className='w-4 h-4' /> Comment</Button>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>SOP Timeline</CardTitle>
                        <CardDescription>Follow the procedure step-by-step.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <SopTimeline steps={sop.steps} />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6 md:col-span-1">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Department:</span>
                            <span className="font-medium">{sop.department}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">{format(new Date(sop.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Responsible:</span>
                            <span className="font-medium">{sop.responsiblePerson}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Overall SLA:</span>
                            <span className="font-medium">{sop.sla} day{sop.sla !== 1 ? 's' : ''}</span>
                        </div>
                        <Separator className="my-4" />
                        <div className="flex flex-col gap-2">
                           <Button variant="secondary" className='gap-2 w-full'><Edit className='w-4 h-4' /> Edit SOP</Button>
                           <Button variant="outline" className='gap-2 w-full'><FileDown className='w-4 h-4' /> Export as PDF</Button>
                           <Button variant="outline" className='gap-2 w-full'><Share2 className='w-4 h-4' /> Share</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </MainLayout>
  );
}
