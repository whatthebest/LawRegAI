"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  updateEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  OnConnect,
  Panel,
  Handle,
  Position,
  ConnectionMode,
  ConnectionLineComponentProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Paperclip, X } from "lucide-react";

export type StepType = "Sequence" | "Decision";

export type AttachmentMeta = { id: string; name: string; size: number; type: string };

export type StepRecord = {
  StepNumber: number;
  StepTitle: string;
  StepDetail: string;
  StepType: StepType;
  Owner?: string;
  Reviewer?: string;
  Approver?: string;
  SLA?: number;
  NextStep?: number;
  BranchYesNext?: number;
  BranchNoNext?: number;
  Attachments?: AttachmentMeta[];
};

export type StepNodeData = {
  stepTitle: string;
  stepDetail: string;
  stepType: StepType;
  owner?: string;
  reviewer?: string;
  approver?: string;
  sla?: number;
  createdAt: number;
  stepNo?: number;
  attachments?: Array<AttachmentMeta & { file?: File }>;
};

const baseBox =
  "relative rounded-2xl shadow-md border text-foreground bg-card px-4 py-3 min-w-[240px]";

const CustomConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  connectionStatus,
}) => {
  const bend = 70;
  let c1x = fromX,
    c1y = fromY,
    c2x = toX,
    c2y = toY;

  switch (fromPosition) {
    case Position.Left:
      c1x = fromX - bend;
      c1y = fromY;
      c2x = toX - Math.min(Math.abs(toX - fromX) / 3, bend);
      c2y = toY;
      break;
    case Position.Right:
      c1x = fromX + bend;
      c1y = fromY;
      c2x = toX + Math.min(Math.abs(toX - fromX) / 3, bend);
      c2y = toY;
      break;
    case Position.Bottom:
      c1x = fromX;
      c1y = fromY + bend;
      c2x = toX;
      c2y = toY - bend;
      break;
    case Position.Top:
      c1x = fromX;
      c1y = fromY - bend;
      c2x = toX;
      c2y = toY + bend;
      break;
  }

  const d = `M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`;
  const color = connectionStatus === "invalid" ? "hsl(var(--destructive))" : "hsl(var(--foreground))";
  return <path d={d} fill="none" stroke={color} strokeWidth={2} />;
};

const TaskNode: React.FC<{ data: StepNodeData } & any> = ({ data, isConnectable }) => {
  const colorClass = data.stepType === "Decision" ? "text-warning" : "text-primary";
  return (
    <div className={`${baseBox}`} style={{ overflow: "visible" }}>
      <Handle
        type="target"
        position={Position.Top}
        id="inTop"
        isConnectable={isConnectable}
        isConnectableEnd
        style={{ pointerEvents: "auto" }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="outBottom"
        isConnectable={isConnectable}
        isConnectableStart
        style={{ pointerEvents: "auto" }}
      />

      <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow">
        {data.stepNo ?? ""}
      </div>

      <div className={`text-xs font-semibold tracking-wide mb-1 ${colorClass}`}>
        {data.stepType.toUpperCase()}
      </div>
      <div className="text-sm font-medium truncate text-foreground">
        {data.stepTitle || "New Step"}
      </div>
      {data.owner && <div className="text-xs mt-1 text-muted-foreground">Owner: {data.owner}</div>}
      {typeof data.sla === "number" && (
        <div className="text-[11px] mt-1 text-muted-foreground">SLA: {data.sla} day(s)</div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = { task: TaskNode };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function SopWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow-step", "Sequence");
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const bounds = (e.target as HTMLElement).getBoundingClientRect();
    const pos = { x: e.clientX - bounds.left - 140, y: e.clientY - bounds.top };

    const id = newId();
    const createdAt = Date.now();

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "task",
        position: pos,
        data: {
          stepTitle: "New Step",
          stepDetail: "",
          stepType: "Sequence",
          createdAt,
          attachments: [],
        },
      },
    ]);
  }, [setNodes]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const edgeUpdateSuccessful = useRef(true);
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConn: Connection) => {
    edgeUpdateSuccessful.current = true;
    setEdges((eds) => updateEdge(oldEdge, newConn as any, eds));
  }, [setEdges]);
  const onEdgeUpdateEnd = useCallback((_: any, edge: Edge) => {
    if (!edgeUpdateSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeUpdateSuccessful.current = true;
  }, [setEdges]);

  const setEdgeType = useCallback((id: string, type: Edge["type"]) => {
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, type } : e)));
    setEdgeMenu(null);
  }, [setEdges]);

  const onConnect: OnConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => {
        let label: string | undefined;
        const srcNode = nodes.find((n) => n.id === params.source);
        if (srcNode && (srcNode.data as StepNodeData).stepType === "Decision") {
          const outgoing = eds.filter((e) => e.source === params.source);
          const hasYes = outgoing.some((e) => String(e.label || "").toLowerCase().includes("yes"));
          const hasNo = outgoing.some((e) => String(e.label || "").toLowerCase().includes("no"));
          if (!hasYes) label = "Yes";
          else if (!hasNo) label = "No";
        }

        const edge: Edge = {
          ...(params as any),
          type: "default",
          markerEnd: { type: MarkerType.ArrowClosed },
          ...(label
            ? {
                label,
                labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
                labelStyle: { fontSize: 12, fontWeight: 600 },
              }
            : {}),
        };

        return addEdge(edge, eds);
      });
    },
    [nodes, setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => setSelectedId(node.id), []);

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  function assignRunningNumbers() {
    setNodes((nds) => {
      const byCreated = [...nds]
        .sort((a, b) => (a.data as StepNodeData).createdAt - (b.data as StepNodeData).createdAt)
        .map((n) => n.id);
      const map: Record<string, number> = {};
      byCreated.forEach((id, i) => (map[id] = i + 1));
      let changed = false;
      const updated = nds.map((n) => {
        const want = map[n.id];
        const cur = (n.data as StepNodeData).stepNo;
        if (cur !== want) {
          changed = true;
          return { ...n, data: { ...(n.data as StepNodeData), stepNo: want } };
        }
        return n;
      });
      return changed ? updated : nds;
    });
  }

  useEffect(() => {
    assignRunningNumbers();
  }, [nodes.length]);

  const serialize = useCallback((): StepRecord[] => {
    const byCreated = [...nodes].sort(
      (a, b) => (a.data as StepNodeData).createdAt - (b.data as StepNodeData).createdAt
    );

    const idToNo: Record<string, number> = {};
    byCreated.forEach((n) => (idToNo[n.id] = (n.data as StepNodeData).stepNo ?? 0));

    const steps: StepRecord[] = byCreated.map((n, i) => {
      const d = n.data as StepNodeData;
      return {
        StepNumber: d.stepNo ?? i + 1,
        StepTitle: d.stepTitle || "",
        StepDetail: d.stepDetail || "",
        StepType: d.stepType,
        Owner: d.owner || "",
        Reviewer: d.reviewer || "",
        Approver: d.approver || "",
        SLA: typeof d.sla === "number" ? Number(d.sla) : undefined,
        Attachments: (d.attachments || []).map((a) => ({
          id: String(a.id),
          name: a.name,
          size: a.size,
          type: a.type,
        })),
      } as StepRecord;
    });

    edges.forEach((e) => {
      const srcNo = idToNo[e.source!];
      const tgtNo = idToNo[e.target!];
      const src = steps.find((s) => s.StepNumber === srcNo);
      if (!src) return;

      if (src.StepType === "Decision") {
        const lab = String((e as any).label || "").toLowerCase();
        if (lab.includes("yes") && src.BranchYesNext == null) src.BranchYesNext = tgtNo;
        else if (lab.includes("no") && src.BranchNoNext == null) src.BranchNoNext = tgtNo;
        else if (src.BranchYesNext == null) src.BranchYesNext = tgtNo;
        else if (src.BranchNoNext == null) src.BranchNoNext = tgtNo;
      } else {
        src.NextStep = tgtNo;
      }
    });

    return steps;
  }, [nodes, edges]);

  useEffect(() => {
    (window as any).__sopSerialize = serialize;
  }, [serialize]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const updateSelected = (patch: Partial<StepNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  };

  const addFilesToSelected = (files: FileList | null) => {
    if (!files || !selectedNode) return;
    const add = Array.from(files).map((f) => ({
      id: newId(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    const prev = ((selectedNode.data as StepNodeData).attachments || []) as Array<
      AttachmentMeta & { file?: File }
    >;
    updateSelected({ attachments: [...prev, ...add] });
  };

  const removeAttachment = (id: string) => {
    if (!selectedNode) return;
    const prev = (((selectedNode.data as StepNodeData).attachments || []) as Array<
      AttachmentMeta & { file?: File }
    >).filter((x) => String(x.id) !== String(id));
    updateSelected({ attachments: prev });
  };

  return (
    <div className="w-full grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-2 space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">Blocks</div>
        <div
          className="flex items-center gap-2 p-3 rounded-xl border bg-card shadow-sm cursor-move"
          draggable
          onDragStart={onDragStart}
          title="Drag to canvas"
        >
          <Plus className="w-4 h-4" /> <span className="text-sm">Step</span>
        </div>

        <button
          className="mt-6 w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm"
          onClick={() => {
            const steps = serialize();
            console.log("Serialized steps", steps);
            alert(`Serialized to ${steps.length} step(s). Check console for JSON.`);
          }}
        >
          Preview JSON
        </button>
      </div>

      <div
        className="col-span-12 lg:col-span-7 h-[70vh] bg-white rounded-2xl border"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Delete" || e.key === "Backspace") && selectedEdges.length) {
            setEdges((eds) => eds.filter((edge) => !selectedEdges.some((se) => se.id === edge.id)));
            setEdgeMenu(null);
          }
          if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
            deleteSelected();
          }
        }}
      >
        <ReactFlow
          style={{ backgroundColor: "white" }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          defaultEdgeOptions={{ type: "bezier", markerEnd: { type: MarkerType.ArrowClosed }, updatable: true }}
          connectionLineType="smoothstep"
          connectionLineStyle={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
          connectionLineComponent={CustomConnectionLine}
          onDrop={onDrop}
          onDragOver={onDragOver}
          connectOnClick
          nodesConnectable
          isValidConnection={(c) => !!c.source}
          edgesUpdatable
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onSelectionChange={({ edges }) => setSelectedEdges(edges)}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            setEdgeMenu({ id: edge.id, x: e.clientX, y: e.clientY });
          }}
        >
          <Background variant="dots" gap={28} size={1.5} color="rgba(0,0,0,0.08)" />
          <MiniMap pannable zoomable />
          <Controls />
          <Panel
            position="bottom-left"
            className="text-[11px] bg-card/90 rounded-md shadow px-2 py-1"
          >
            Tip: Sequence — <b>top (in)</b>  <b>bottom (out)</b>. Decision — <b>top (in)</b>; drag from <b>bottom (out)</b> to
            connect. First outgoing = <b>Yes</b>, second = <b>No</b> (edge labels shown).
          </Panel>
        </ReactFlow>
        {edgeMenu && (
          <div
            style={{ position: "fixed", left: edgeMenu.x, top: edgeMenu.y, zIndex: 60 }}
            className="rounded-md border bg-card shadow px-2 py-1 text-sm min-w-[200px]"
          >
            {(() => {
              const edge = edges.find((e) => e.id === edgeMenu.id);
              const isManhattan = edge?.type === "smoothstep" || edge?.type === "step";
              return (
                <div className="flex flex-col gap-1">
                  <button
                    className="text-left px-2 py-1 rounded hover:bg-muted"
                    onClick={() => {
                      setEdges((eds) => eds.filter((e) => e.id !== edgeMenu.id));
                      setEdgeMenu(null);
                    }}
                  >
                    Delete connection
                  </button>
                  <button
                    className="text-left px-2 py-1 rounded hover:bg-muted"
                    onClick={() => setEdgeType(edgeMenu.id, isManhattan ? "bezier" : "smoothstep")}
                  >
                    {isManhattan ? "Line: Curved (bezier)" : "Line: Manhattan (orthogonal)"}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="col-span-12 lg:col-span-3">
        <div className="rounded-2xl border bg-card shadow-sm p-4 h-[70vh] overflow-auto">
          <div className="text-sm font-semibold text-muted-foreground mb-3">Properties</div>

          {!selectedId && (
            <div className="text-sm text-muted-foreground">Select a block to edit its properties.</div>
          )}

          {selectedId && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Step Number</div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-muted"
                  value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).stepNo ?? "-"}
                  readOnly
                />
              </div>

              <label className="block text-xs text-muted-foreground">Step Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).stepType}
                onChange={(e) => updateSelected({ stepType: e.target.value as StepType })}
              >
                <option value="Sequence">Sequence</option>
                <option value="Decision">Decision</option>
              </select>

              <label className="block text-xs text-muted-foreground">Step Title</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).stepTitle || ""}
                onChange={(e) => updateSelected({ stepTitle: e.target.value })}
                placeholder="e.g., Send Welcome Kit"
              />

              <label className="block text-xs text-muted-foreground">Step Detail</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] bg-background"
                value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).stepDetail || ""}
                onChange={(e) => updateSelected({ stepDetail: e.target.value })}
                placeholder="Describe the action to be taken."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">SLA (days)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).sla ?? ""}
                    onChange={(e) =>
                      updateSelected({
                        sla: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Owner</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).owner || ""}
                    onChange={(e) => updateSelected({ owner: e.target.value })}
                    placeholder="owner@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Reviewer</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).reviewer || ""}
                    onChange={(e) => updateSelected({ reviewer: e.target.value })}
                    placeholder="reviewer@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Approver</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={(nodes.find((n) => n.id === selectedId)!.data as StepNodeData).approver || ""}
                    onChange={(e) => updateSelected({ approver: e.target.value })}
                    placeholder="approver@company.com"
                  />
                </div>
              </div>

              <label className="block text-xs text-muted-foreground">File Attachment (Optional)</label>
              <div className="border rounded-lg p-3 bg-muted/50">
                <input
                  type="file"
                  multiple
                  className="block w-full text-sm"
                  onChange={(e) => addFilesToSelected(e.target.files)}
                />
                <div className="mt-2 space-y-1">
                  {(
                    ((nodes.find((n) => n.id === selectedId)!.data as StepNodeData).attachments) || []
                  ).map((a: any) => (
                    <div
                      key={String(a.id)}
                      className="flex items-center justify-between text-sm text-muted-foreground bg-muted rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4" />
                        <span className="truncate">{a.name}</span>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(String(a.id))}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="mt-2 w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm"
                onClick={() => {
                  const steps = serialize();
                  console.log("POST payload -> { steps }", steps);
                  console.log(
                    "Note: For file uploads, map each step's Attachments and its in-memory files (not serialized) to your storage/API."
                  );
                  alert("Ready to POST. JSON printed in console. See comment about uploads.");
                }}
              >
                Save / Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






