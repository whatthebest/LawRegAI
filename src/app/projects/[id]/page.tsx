"use client";

import { useState, useEffect } from "react";
import type { VariantProps } from "class-variance-authority";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { SopTimeline } from "@/components/SopTimeline";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockSops, mockProjects } from "@/lib/mockData";
import { Edit, User, Clock, Shield, CheckCircle2, BadgeCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SOPStep, SOPStepStatus } from "@/lib/types";

// ---------- เพิ่มสถานะภายใน (ขยายจากของเดิม) ----------
type ExtraStatus = "ReadyToApprove" | "ApprovedFinal";
type AnyStatus = SOPStepStatus | ExtraStatus; // Draft, Approved, Review + ใหม่

// ---------- Types (เอกสารแนบต่อ task) ----------
type FileDoc = { id: string; name: string; size: number; url: string };
type TaskWithDocs = SOPStep & { status: AnyStatus; documents?: FileDoc[] };

// ---------- Utilities ----------
const getStatusBadgeVariant = (
  status: AnyStatus
): VariantProps<typeof badgeVariants>["variant"] => {
  switch (status) {
    case "Draft":
      return "destructive"; // Not Started
    case "Approved":
      return "secondary"; // In Progress (legacy key butเราใช้เป็น "In Progress")
    case "Review":
      return "warning"; // Ready to Review
    case "ReadyToApprove":
      return "outline"; // Ready to Approve
    case "ApprovedFinal":
      return "default"; // Approved (final)
    default:
      return "secondary";
  }
};

const getStatusBadgeText = (status: AnyStatus): string => {
  switch (status) {
    case "Draft":
      return "Not Started";
    case "Approved":
      return "In Progress";
    case "Review":
      return "Ready to Review";
    case "ReadyToApprove":
      return "Ready to Approve";
    case "ApprovedFinal":
      return "Approved";
    default:
      return "Pending";
  }
};

// ---------- Form ----------
interface ProjectFormValues {
  name: string;
  description: string;
  sop: string;
  startDate?: string;
  completeDate?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState(() =>
    mockProjects.find((p) => p.id === projectId)
  );
  const [sop, setSop] = useState(() =>
    mockSops.find((s) => s.id === project?.sop)
  );
  const [tasks, setTasks] = useState<TaskWithDocs[]>([]);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  // Finish project modal + animation
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [showDoneAnim, setShowDoneAnim] = useState(false);

  const {
    control,
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProject,
    watch,
    setValue,
  } = useForm<ProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
      sop: "",
      startDate: "",
      completeDate: "",
    },
  });

  // ตั้งค่า form + steps -> tasks
  useEffect(() => {
    if (project) {
      resetProject({
        name: project.name,
        description: project.description,
        sop: project.sop,
        startDate: (project as any).startDate ?? "",
        completeDate: (project as any).completeDate ?? "",
      });
    }
    if (sop) {
      setTasks(
        sop.steps.map((step) => ({
          ...step,
          status: (step.status as AnyStatus) || "Draft",
          documents: [],
        }))
      );
    }
  }, [project, sop, resetProject]);

  if (!project || !sop) {
    notFound();
  }

  const handleStatusChange = (taskId: string, newStatus: AnyStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleEditProject = (data: ProjectFormValues) => {
    const updatedProject = { ...project, ...data };
    const updatedSop = mockSops.find((s) => s.id === data.sop);

    setProject(updatedProject as any);

    if (updatedSop) {
      setSop(updatedSop);
      setTasks(
        updatedSop.steps.map((step) => ({
          ...step,
          status: (step.status as AnyStatus) || "Draft",
          documents: [],
        }))
      );
    }
    setIsEditProjectOpen(false);
  };

  // ------- จัดการเอกสารแนบต่อ task -------
  const getId = () =>
    (globalThis as any)?.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2);

  const handleAddDocuments = (taskId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextDocs: FileDoc[] = [
          ...(t.documents || []),
          ...files.map((f) => ({
            id: `${taskId}-${getId()}`,
            name: f.name,
            size: f.size,
            url: URL.createObjectURL(f),
          })),
        ];
        return { ...t, documents: nextDocs };
      })
    );
  };

  const handleRemoveDocument = (taskId: string, docId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextDocs = (t.documents || []).filter((d) => d.id !== docId);
        return { ...t, documents: nextDocs };
      })
    );
  };

  // ------- Finish Project flow -------
  const allApproved = tasks.length > 0 && tasks.every((t) => t.status === "ApprovedFinal");

  const stampTodayToCompleteDate = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;
    setProject((prev) => (prev ? ({ ...prev, completeDate: isoDate } as any) : prev));
    setValue("completeDate", isoDate);
  };

  const confirmFinishProject = () => {
    if (!allApproved) return;
    // 1) ตีตราวัน
    stampTodayToCompleteDate();
    // 2) อัปเดตสถานะโปรเจคเป็น Complete
    setProject((prev) => (prev ? ({ ...prev, status: "Complete" } as any) : prev));
    // 3) แสดง Animation "Done"
    setShowDoneAnim(true);
    setIsFinishOpen(false);
    // ซ่อนแอนิเมชันอัตโนมัติ
    setTimeout(() => setShowDoneAnim(false), 1800);
  };

  return (
    <MainLayout>
      {/* ===== Header บนสุด: Finish Project (ตำแหน่งเดิม) + Status โปรเจค ===== */}
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2 max-w-4xl">
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            &larr; Back to Work Tracker
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-4xl font-bold text-primary">{project.name}</h1>
            {(project as any)?.status && (
              <Badge variant="default" className="h-6">
                {(project as any).status}
              </Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground">{project.description}</p>
        </div>

        {/* ✅ Finish Project: คงตำแหน่งเดิม (มี Warning/Confirm) */}
        <Button className="gap-2" onClick={() => setIsFinishOpen(true)}>
          <CheckCircle2 className="w-4 h-4" />
          Finish Project
        </Button>

        {/* Warning / Confirm */}
        <AlertDialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finish this project?</AlertDialogTitle>
              <AlertDialogDescription>
                คุณกำลังจะปิดโปรเจคนี้ ระบบจะตรวจสอบว่า <b>ทุก Task ต้องเป็น Approved</b> เท่านั้นจึงจะปิดได้
                {allApproved ? (
                  <span className="block mt-2 text-green-600">
                    ✓ ทุก Task เป็น Approved แล้ว สามารถปิดโปรเจคได้
                  </span>
                ) : (
                  <span className="block mt-2 text-red-600">
                    ✗ ยังมี Task ที่ไม่ใช่ Approved กรุณาปรับสถานะให้ครบก่อน
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!allApproved}
                onClick={confirmFinishProject}
              >
                Confirm Finish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Animation Done (overlay) */}
        {showDoneAnim && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
                <div className="rounded-full bg-green-500 p-4 text-white">
                  <BadgeCheck className="w-10 h-10" />
                </div>
              </div>
              <div className="text-xl font-semibold text-green-700">Done!</div>
              <div className="text-sm text-muted-foreground">
                Project marked as <b>Complete</b>.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            {/* ===== CardHeader: ย้าย Edit Project มาขวาสุดของหัวการ์ด ===== */}
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project To-Do List</CardTitle>
                <CardDescription>
                  Tasks generated from the linked SOP: "{sop.title}"
                </CardDescription>
              </div>

              {/* ✅ Edit Project: อยู่ขวาสุดในหัวการ์ด */}
              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>
                      Update the project details and linked SOP.
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    onSubmit={handleSubmitProject(handleEditProject)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        {...registerProject("name", {
                          required: "Project name is required",
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectDescription">Project Description</Label>
                      <Textarea
                        id="projectDescription"
                        {...registerProject("description", {
                          required: "Description is required",
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 col-span-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          {...registerProject("startDate")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complete-date">Complete Date</Label>
                        <Input
                          id="complete-date"
                          type="date"
                          {...registerProject("completeDate")}
                        />
                      </div>
                    </div>

                    {/* เลือก E-SOP รวมใน Edit Project + พรีวิว */}
                    <div className="space-y-2">
                      <Label htmlFor="projectSop">Relevant SOP</Label>
                      <Controller
                        control={control}
                        name="sop"
                        rules={{ required: "SOP is required" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="projectSop">
                              <SelectValue placeholder="Select an SOP" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockSops.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                      <div className="font-semibold">
                        {mockSops.find((s) => s.id === watch("sop"))?.title ?? "—"}
                      </div>
                      <ul className="mt-1 list-disc pl-4">
                        {mockSops
                          .find((s) => s.id === watch("sop"))
                          ?.steps.slice(0, 3)
                          .map((st, i) => <li key={i}>{(st as any).title ?? st}</li>) ||
                          null}
                      </ul>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="ghost">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-4">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <Card key={task.id} className="p-4 pt-10 relative">
                      <Badge
                        variant={getStatusBadgeVariant(task.status)}
                        className="absolute top-3 left-3"
                      >
                        {getStatusBadgeText(task.status)}
                      </Badge>

                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex justify-between items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-lg font-semibold truncate cursor-pointer">
                                    {task.title}
                                  </Label>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{task.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Select
                                value={task.status}
                                onValueChange={(value: AnyStatus) =>
                                  handleStatusChange(task.id, value)
                                }
                              >
                                <SelectTrigger className="w-[220px] h-8">
                                  <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Draft">Not Started</SelectItem>
                                  <SelectItem value="Approved">In Progress</SelectItem>
                                  <SelectItem value="Review">Ready to Review</SelectItem>
                                  <SelectItem value="ReadyToApprove">
                                    Ready to Approve
                                  </SelectItem>
                                  <SelectItem value="ApprovedFinal">
                                    Approved
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground break-words">
                            {task.detail}
                          </p>

                          {/* Documents section */}
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                Documents
                              </Label>

                              {/* ปุ่มอัปโหลดไฟล์ */}
                              <div className="relative">
                                <Input
                                  id={`file-${task.id}`}
                                  type="file"
                                  multiple
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) =>
                                    handleAddDocuments(task.id, e.target.files)
                                  }
                                />
                                <Button variant="outline" size="sm">
                                  Add Document
                                </Button>
                              </div>
                            </div>

                            {task.documents && task.documents.length > 0 ? (
                              <ul className="space-y-2">
                                {task.documents.map((doc) => (
                                  <li
                                    key={doc.id}
                                    className="flex items-center justify-between rounded-md border p-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {doc.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {(doc.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm underline"
                                      >
                                        Download
                                      </Link>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveDocument(task.id, doc.id)
                                        }
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No documents yet.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs pt-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> SLA: {task.sla} days
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Owner: {task.owner}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3 h-3" /> Reviewer: {task.reviewer}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    This SOP has no steps defined.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: SOP Guideline (แสดงผลอย่างเดียว) */}
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