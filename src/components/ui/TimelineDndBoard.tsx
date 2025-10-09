"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { nanoid } from "nanoid";

// ---------- Types ----------
type Task = { id: string; title: string; owner?: string; due?: string };
type Column = { id: string; title: string; taskIds: string[] };
type StatusId = "not_start" | "in_progress" | "review" | "complete";

// ---------- Data ----------
const initialTasks: Record<string, Task> = {
  t1: { id: "t1", title: "Kickoff & scope", owner: "PM", due: "2025-09-05" },
  t2: { id: "t2", title: "Design wireframes", owner: "UX", due: "2025-09-10" },
  t3: { id: "t3", title: "API contract", owner: "BE", due: "2025-09-12" },
  t4: { id: "t4", title: "MVP build", owner: "FE", due: "2025-09-20" },
};

// คอลัมน์ตรึง 4 สถานะ (ตรงตามที่มายต้องการ)
const STATUS_COLUMNS: Column[] = [
  { id: "not_start",   title: "Not start",        taskIds: ["t1"] },
  { id: "in_progress", title: "On-Process",       taskIds: ["t2", "t3"] },
  { id: "review",      title: "Review to Close",  taskIds: [] },
  { id: "complete",    title: "Complete",         taskIds: ["t4"] },
];

// map: สถานะ → id คอลัมน์ (ใช้ตอน drop)
const STATUS_TO_PRIMARY: Record<StatusId, Column["id"]> = {
  not_start: "not_start",
  in_progress: "in_progress",
  review: "review",
  complete: "complete",
};

// ---------- Small utils ----------
function insertAt<T>(arr: T[], item: T, index: number | null) {
  const a = [...arr];
  if (index == null || index < 0 || index > a.length) a.push(item);
  else a.splice(index, 0, item);
  return a;
}

// ---------- UI bits ----------
function TaskCard({ taskId, task }: { taskId: string; task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: taskId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border p-3 bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing
      ${isDragging ? "opacity-80 ring-2 ring-primary" : ""}`}
    >
      <div className="text-sm font-medium">{task.title}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {task.owner && <span className="rounded bg-muted px-2 py-0.5">{task.owner}</span>}
        {task.due && <span className="rounded bg-primary/10 px-2 py-0.5">due {task.due}</span>}
      </div>
    </div>
  );
}

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-80 w-full flex-col rounded-2xl border bg-card shadow-sm
      ${isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      {children}
    </div>
  );
}

function ColumnList({
  column,
  tasks,
  onAddTask,
}: {
  column: Column;
  tasks: Record<string, Task>;
  onAddTask: (columnId: string) => void;
}) {
  return (
    <DroppableColumn id={column.id}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-xs rounded-lg border px-2 py-1 hover:bg-muted"
        >
          + Add
        </button>
      </div>
      <div className="h-px w-full bg-border" />
      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext items={column.taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {column.taskIds.map((tid) => (
              <TaskCard key={tid} taskId={tid} task={tasks[tid]} />
            ))}
          </div>
        </SortableContext>
      </div>
    </DroppableColumn>
  );
}

// ---------- Main board (ขนาด “การ์ดปกติ” แบบแท็บ Projects) ----------
export default function TimelineDndBoard() {
  const [tasks, setTasks] = useState<Record<string, Task>>(initialTasks);
  const [columns, setColumns] = useState<Column[]>(STATUS_COLUMNS); // ใช้เฉพาะ 4 สถานะ
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // หา column ด้วย task id
  function findColumnByTaskId(taskId: string) {
    return columns.find((c) => c.taskIds.includes(taskId));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const sourceCol = findColumnByTaskId(String(active.id));
    if (!sourceCol) return;

    let targetColId: string | undefined;
    let insertIndex: number | null = null;

    const overTaskCol = findColumnByTaskId(String(over.id));
    if (overTaskCol) {
      targetColId = overTaskCol.id;
      insertIndex = overTaskCol.taskIds.indexOf(String(over.id)); // แทรกก่อนการ์ดนั้น
    } else {
      // ปล่อยบนพื้นที่ว่างของคอลัมน์สถานะ
      const overId = String(over.id) as StatusId | string;
      if (STATUS_TO_PRIMARY[overId as StatusId]) {
        targetColId = STATUS_TO_PRIMARY[overId as StatusId];
      } else {
        targetColId = columns.find((c) => c.id === overId)?.id;
      }
    }
    if (!targetColId) return;

    const targetCol = columns.find((c) => c.id === targetColId);
    if (!targetCol) return;

    const sourceTaskIds = sourceCol.taskIds.filter((id) => id !== String(active.id));
    const targetTaskIds = insertAt(
      targetCol.taskIds,
      String(active.id),
      overTaskCol && overTaskCol.id === targetCol.id ? insertIndex : null
    );

    setColumns((prev) =>
      prev.map((c) => {
        if (c.id === sourceCol.id) return { ...c, taskIds: sourceTaskIds };
        if (c.id === targetCol.id) return { ...c, taskIds: targetTaskIds };
        return c;
      })
    );
  }

  function handleAddTask(columnId: string) {
    const id = nanoid(6);
    const newTask: Task = { id, title: "New task", owner: "You", due: "" };
    setTasks((t) => ({ ...t, [id]: newTask }));

    setColumns((cols) =>
      cols.map((c) => (c.id === columnId ? { ...c, taskIds: [id, ...c.taskIds] } : c))
    );
  }

  // ใช้ความสูงอัตโนมัติแบบการ์ดปกติ (ไม่ทำ calc(100vh-...))
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
        <CardDescription>Board: Not start / On-Process / Review to Close / Complete</CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map((col) => (
              <div key={col.id} className="flex-1 w-full">
                <ColumnList column={col} tasks={tasks} onAddTask={handleAddTask} />
              </div>
            ))}
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
}
