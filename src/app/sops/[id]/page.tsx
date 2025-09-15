// src/app/sops/[id]/page.tsx

"use client";



import MainLayout from '@/components/MainLayout';
import { SopTimeline } from '@/components/SopTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { mockSops } from '@/lib/mockData';
import type { SOP, SOPStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Check, MessageSquare, Share2, FileDown, Edit } from 'lucide-react';
import Link from 'next/link';




// Add this helper near the top of the file
function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy");
}


// Helper to find the SOP from mock data
const getSop = (id: string): SOP | undefined => {
  // Note: The link from the list page uses sop.sopId, but the mock data uses 'id'.
  // We'll check against both for robustness.
  return mockSops.find(sop => sop.id === id || sop.sopId === id);
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

  // If no SOP is found for the given ID, show a 404 page.
  if (!sop) {
    return (
      <MainLayout>
        <div className="p-6 text-red-500">SOP not found.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
                <Link href="/sops" className="text-sm text-primary hover:underline">
                    &larr; Back to SOP Repository
                </Link>
                <h1 className="text-4xl font-bold text-primary">{sop.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Department: {sop.department}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Created on: {fmtDate(sop.createdAt)}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link href={`/sops/${params.id}/edit`} passHref>
                  <Button variant="outline"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                </Link>
                <Button variant="outline"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
                <Button variant="outline"><FileDown className="w-4 h-4 mr-2" /> Export</Button>
            </div>
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>SOP Timeline</CardTitle>
                <CardDescription>Step-by-step process and responsible parties.</CardDescription>
              </CardHeader>
              <CardContent>
                <SopTimeline steps={sop.steps ?? []} />
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Details & Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        {/* Placeholder for additional details or attachments */}
                        No additional details for this SOP.
                    </p>
                </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                    <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                    Last updated on {fmtDate(sop.updatedAt)}
                </p>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-semibold">SOP ID:</span> <span>{sop.sopId}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Version:</span> <span>{sop.version}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Owner:</span> <span>{sop.owner}</span></div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center text-center text-muted-foreground py-4">
                    <p><MessageSquare className="w-6 h-6 mx-auto mb-2" /> No comments yet.</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
