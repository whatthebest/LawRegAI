"use client";

import { useState, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Loader2, RefreshCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SummaryRow = {
  field: string;
  value: string;
};

type CitationPair = {
  name?: string;
  desc?: string;
};

type BotDocumentRow = {
  title: string;
  documentType: string;
  rawDate: string;
  effectiveDate: string | null;
  status?: string;
  flag?: string;
  pdfUrl?: string;
  detailUrl?: string;
};

type ScrapePayload = {
  success: boolean;
  documents?: BotDocumentRow[];
  fetchedAt?: string;
  rawCount?: number;
  error?: string;
};

type SummaryResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  runId?: string;
  message?: string;
  error?: string;
};

const DEFAULT_PDF_URL =
  "https://www.bot.or.th/content/dam/bot/fipcs/documents/FPG/2560/ThaiPDF/25600025.pdf";

class SummaryError extends Error {
  details?: string | null;

  constructor(message: string, details?: string | null) {
    super(message);
    this.name = "SummaryError";
    this.details = details ?? null;
  }
}

export default function SummaryBotPage() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState(DEFAULT_PDF_URL);
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [scrapeDocs, setScrapeDocs] = useState<BotDocumentRow[]>([]);
  const [scrapeMeta, setScrapeMeta] = useState<{ fetchedAt?: string; rawCount?: number } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const trimmedUrl = pdfUrl.trim();
      const response = await fetch("/api/summary-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl: trimmedUrl.length ? trimmedUrl : undefined,
        }),
      });

      if (!response.ok) {
        const rawBody = await response.text();
        let message = response.statusText || "Failed to run summary job";
        let details: string | undefined;

        if (rawBody) {
          try {
            const errPayload = JSON.parse(rawBody);
            message = errPayload?.error ?? errPayload?.message ?? message;

            if (typeof errPayload?.details === "string") {
              details = errPayload.details;
            } else if (errPayload?.details && typeof errPayload.details === "object") {
              details = JSON.stringify(errPayload.details, null, 2);
            }
          } catch {
            details = rawBody;
          }
        }

        throw new SummaryError(message, details ?? null);
      }

      const payload: SummaryResponse = await response.json();

      if (!payload.success || !payload.data) {
        throw new Error(payload.message || payload.error || "Unexpected response from summary service");
      }

      const sourceUrl = (() => {
        const urlValue = payload.data["Source URL"];
        return typeof urlValue === "string" ? urlValue : Array.isArray(urlValue) ? urlValue[0] : undefined;
      })();

      const tableRows: SummaryRow[] = Object.entries(payload.data).map(([field, value]) => ({
        field,
        value: Array.isArray(value) ? value.join(", ") : `${value ?? ""}`,
      }));

      setRows(tableRows);
      setRawData(payload.data as Record<string, unknown>);
      setLastRunId(payload.runId ?? new Date().toISOString());
      if (sourceUrl) {
        setPdfUrl(sourceUrl);
      }
      setErrorDetails(null);
    } catch (err) {
      if (err instanceof SummaryError) {
        setError(err.message);
        setErrorDetails(err.details ?? null);
      } else {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasResults = useMemo(() => rows.length > 0, [rows]);
  const hasScrapeResults = useMemo(() => scrapeDocs.length > 0, [scrapeDocs]);

  // Split output rows into LV3 (general) and LV4 (citations)
  const lv4Rows = useMemo(
    () => rows.filter((r) => /^\s*citation\b/i.test(r.field)),
    [rows],
  );
  const LV3_FIELD_ORDER = useMemo(
    () => [
      "Law/Regulation Name",
      "Source Type",
      "หน่วยงาน Regulator",
      "ชื่อหน่วยงาน Regulator (กรณีไม่มีในตัวเลือก)",
      "Compliance Group",
      "Compliance Risk Area",
      "วันที่ประกาศ",
      "วันที่มีผลบังคับใช้",
      "วัตถุประสงค์ของกฎหมาย/กฎเกณฑ์/ประกาศ",
      "สรุปสาระสำคัญที่เปลี่ยนแปลง",
      "ช่องทางการรับทราบการเปลี่ยนแปลง",
      "รายละเอียดช่องทางการรับทราบ (เมื่อเลือก \"อื่นๆ\")",
      "URL ของกฎหมาย/กฎเกณฑ์ที่เปลี่ยนแปลง (เมื่อช่องทางการรับทราบการเปลี่ยนแปลงเป็น Website ของ Regulator )",
      "ความซับซ้อน",
      "ผลกระทบ/สิ่งที่ธนาคารต้องดาเนินการ",
      "รายละเอียดผลกระทบ/สิ่งที่ธนาคารต้องดำเนินการ (เมื่อมีผลกระทบ/มีสิ่งที่ธนาคารต้องดาเนินการ)",
    ],
    [],
  );

  const lv3Rows = useMemo(() => {
    const src = rawData ?? {};
    return LV3_FIELD_ORDER.map((field) => {
      const val = (src as any)[field];
      let text = "ไม่พบข้อมูล";
      if (Array.isArray(val)) text = val.join(", ");
      else if (typeof val === "string") text = val;
      else if (typeof val === "number" || typeof val === "boolean") text = String(val);
      return { field, value: text } as SummaryRow;
    });
  }, [rawData, LV3_FIELD_ORDER]);

  const CITATION_META_FIELDS = useMemo(
    () => [
      "Compliance Group",
      "Compliance Risk Area",
      "Law/Regulation Name",
      "วันที่กฎหมาย/กฎเกณฑ์กำหนดให้ดาเนินการแล้วเสร็จ",
      "โทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์",
      'โทษปรับสูงสุด (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น "โทษปรับ")',
      'โทษปรับรายวัน (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น "โทษปรับ")',
      'โทษจำคุกสูงสุด (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น "โทษอาญา/จำคุก ")',
      "Risk Owner Management Organization",
      "Process",
      "สิ่งที่ Risk Owner ต้องดำเนินการ",
    ],
    [],
  );

  const citationTables = useMemo(() => {
    const splitCitationText = (value: unknown): string[] => {
      if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean);
      if (typeof value === "string") {
        return value
          .split(/\r?\n|[•\u2022]|;|,|\s-\s/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    const names = splitCitationText(rawData?.["Citation Name"]);
    const descs = splitCitationText(rawData?.["Citation Description"]);
    const maxLen = Math.max(names.length, descs.length);
    const pairs: CitationPair[] = Array.from({ length: maxLen }, (_, i) => ({
      name: names[i] ?? (maxLen > 0 ? "ไม่ระบุ" : undefined),
      desc: descs[i] ?? (maxLen > 0 ? "ไม่ระบุ" : undefined),
    })).filter((p) => typeof p.name !== "undefined" || typeof p.desc !== "undefined");

    const meta = CITATION_META_FIELDS.map((field) => {
      const v = (rawData as any)?.[field] as unknown;
      let text = "ไม่พบข้อมูล";
      if (Array.isArray(v)) text = (v as unknown[]).map(String).join(", ");
      else if (typeof v === "string") text = v;
      else if (typeof v === "number" || typeof v === "boolean") text = String(v);
      return { field, value: text } as SummaryRow;
    });

    if (pairs.length > 0) {
      return { pairs, meta, fallback: [] as SummaryRow[] };
    }

    if (lv4Rows.length > 0) {
      return { pairs: [] as CitationPair[], meta: [] as SummaryRow[], fallback: lv4Rows };
    }

    return { pairs: [] as CitationPair[], meta: [] as SummaryRow[], fallback: [] as SummaryRow[] };
  }, [rawData, lv4Rows, CITATION_META_FIELDS]);

  // Bullet rendering for the detailed impact field
  const shouldBulletize = (field: string) =>
    /รายละเอียดผลกระทบ\/สิ่งที่ธนาคารต้อง/i.test(field);

  const splitToBullets = (text: string): string[] => {
    if (!text) return [];
    // Normalize common bullet markers to newline
    const normalized = text
      .replace(/[•\u2022]/g, "\n")
      .replace(/\s*-\s+/g, "\n")
      .replace(/\s*\d+\.?\s+/g, (m) => `\n${m.trim()} `);

    let items = normalized
      .split(/\r?\n|;|·|–|—/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length <= 1) {
      // Fallback: split by comma variants
      items = text
        .split(/[，、,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return items;
  };

  const formatDocumentDate = (doc: BotDocumentRow) => {
    if (doc.effectiveDate) {
      try {
        return new Date(doc.effectiveDate).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        // fall back
      }
    }
    return doc.rawDate || "-";
  };

  const handleScrapeOnly = async () => {
    setIsScraping(true);
    setScrapeError(null);

    try {
      const response = await fetch("/api/bot-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload: ScrapePayload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to fetch BOT regulations.");
      }

      if (payload.documents) {
        setScrapeDocs(payload.documents);
        setScrapeMeta({
          fetchedAt: payload.fetchedAt,
          rawCount: payload.rawCount,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown scraping error.";
      setScrapeError(message);
  } finally {
    setIsScraping(false);
  }
};

  const sanitizeSheetName = (value: string) =>
    value.replace(/[\\/?*[\]]/g, "-").slice(0, 31) || "Sheet";

  const handleDownloadExcel = async () => {
    if (!hasResults) return;

    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const lv3Data: (string | undefined)[][] = [
        ["Field", "Value"],
        ...lv3Rows.map((row) => [row.field, row.value]),
      ];
      const lv3Sheet = XLSX.utils.aoa_to_sheet(lv3Data);
      XLSX.utils.book_append_sheet(workbook, lv3Sheet, sanitizeSheetName("Law/Regulation LV3"));

      const citationData: (string | undefined)[][] = [];
      if (citationTables.pairs.length > 0) {
        citationData.push(["Citation Name", "Citation Description"]);
        citationTables.pairs.forEach((pair) => {
          citationData.push([pair.name ?? "", pair.desc ?? ""]);
        });
        if (citationTables.meta.length > 0) {
          citationData.push([]);
          citationData.push(["Field", "Value"]);
          citationTables.meta.forEach((row) => {
            citationData.push([row.field, row.value]);
          });
        }
      } else if (citationTables.fallback.length > 0) {
        citationData.push(["Field", "Value"]);
        citationTables.fallback.forEach((row) => {
          citationData.push([row.field, row.value]);
        });
      } else {
        citationData.push(["Field", "Value"]);
        citationData.push(["No citations found", ""]);
      }
      const citationSheet = XLSX.utils.aoa_to_sheet(citationData);
      XLSX.utils.book_append_sheet(workbook, citationSheet, sanitizeSheetName("Citation LV4"));

      if (scrapeDocs.length > 0) {
        const documentsSheet = XLSX.utils.json_to_sheet(
          scrapeDocs.map((doc) => ({
            Title: doc.title,
            DocumentType: doc.documentType,
            RawDate: doc.rawDate,
            EffectiveDate: doc.effectiveDate ?? "",
            Status: doc.status ?? "",
            Flag: doc.flag ?? "",
            PdfUrl: doc.pdfUrl ?? "",
            DetailUrl: doc.detailUrl ?? "",
          }))
        );
        XLSX.utils.book_append_sheet(workbook, documentsSheet, sanitizeSheetName("BOT Listings"));
      }

      const timestamp = (lastRunId ?? new Date().toISOString()).replace(/[:.]/g, "-");
      XLSX.writeFileXLSX(workbook, `bot-summary-${timestamp}.xlsx`);
    } catch (err) {
      console.error("Failed to export summary workbook:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Card className="rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Automation</Badge>
              <CardTitle>Summary file BOT (Beta)</CardTitle>
              <CardDescription>
                Run the AI-powered pipeline to download and summarize the latest BOT circular.
                The insights will be captured below as a structured compliance brief.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                This workflow fetches the official PDF directly from the Bank of Thailand website,
                extracts the core content on the server, and produces a concise summary with key
                metadata and keywords for downstream review.
              </p>
              <p className="italic">
                Expect the process to take up to a minute depending on the AI pipeline and network latency.
              </p>
              <div className="space-y-2 text-left">
                <Label htmlFor="pdf-url" className="text-sm font-medium text-foreground">
                  PDF source URL
                </Label>
                <Input
                  id="pdf-url"
                  placeholder="https://..."
                  value={pdfUrl}
                  onChange={(event) => setPdfUrl(event.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Provide a publicly accessible BOT circular link. Leave blank to run against the default reference PDF.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {lastRunId ? (
                  <>
                    <span className="font-medium text-foreground">Last run:</span>{" "}
                    <time dateTime={lastRunId}>
                      {new Date(lastRunId).toLocaleString()}
                    </time>
                  </>
                ) : (
                  "No runs yet"
                )}
              </div>
              <Button onClick={handleSummarize} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Run Summary
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

            <Card className="rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur min-h-[320px]">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Output snapshot</CardTitle>
                    <CardDescription>
                      Results from the latest processing run. Data refreshes each time the workflow completes.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full self-start sm:self-auto"
                    onClick={handleDownloadExcel}
                    disabled={!hasResults || isLoading || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Excel
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
            <CardContent className="flex-1">
              {isLoading && (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Crunching the PDF…</span>
                </div>
              )}

              {!isLoading && error && (
                <Alert variant="destructive">
                  <AlertTitle>Summary failed</AlertTitle>
                  <AlertDescription>
                    <span>{error}</span>
                    {errorDetails && (
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-destructive/10 p-2 text-xs text-destructive-foreground/80">
                        {errorDetails}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!isLoading && !error && !hasResults && (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">No data yet</span>
                  <p className="text-center text-sm">
                    Trigger the workflow to generate a fresh summary. The structured output will appear here.
                  </p>
                </div>
              )}

              {!isLoading && !error && hasResults && (
                <div className="flex flex-col">
                  <Tabs defaultValue="lv3" className="w-full space-y-4">
                    <TabsList className="mb-2 grid w-full gap-2 rounded-2xl border border-white/70 bg-white/80 p-1 backdrop-blur sm:grid-cols-2">
                      <TabsTrigger
                        value="lv3"
                        className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500/15 data-[state=active]:to-indigo-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                      >
                        Law/Regulation LV3
                      </TabsTrigger>
                      <TabsTrigger
                        value="lv4"
                        className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/15 data-[state=active]:to-teal-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                      >
                        Citation LV4
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="lv3">
                      <div className="rounded-xl border bg-background/70 backdrop-blur">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-56">Field</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lv3Rows.map((row) => {
                              const rawVal = (rawData as any)?.[row.field];
                              const bullets = shouldBulletize(row.field)
                                ? (Array.isArray(rawVal)
                                    ? (rawVal as unknown[]).map(String).filter(Boolean)
                                    : splitToBullets(row.value))
                                : null;
                              return (
                                <TableRow key={row.field}>
                                  <TableCell className="font-medium">{row.field}</TableCell>
                                  <TableCell className="whitespace-pre-wrap break-words">
                                    {bullets && bullets.length > 1 ? (
                                      <ul className="list-disc pl-5 space-y-1">
                                        {bullets.map((b, i) => (
                                          <li key={i}>{b}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      row.value
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="lv4">
                      {citationTables.pairs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="rounded-xl border bg-background/70 backdrop-blur">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[260px]">Citation Name</TableHead>
                                  <TableHead>Citation Description</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {citationTables.pairs.map((p, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="align-top font-medium">{p.name}</TableCell>
                                    <TableCell className="whitespace-pre-wrap break-words">{p.desc}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {citationTables.meta.length > 0 && (
                            <div className="rounded-xl border bg-background/70 backdrop-blur">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-56">Field</TableHead>
                                    <TableHead>Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {citationTables.meta.map((row) => (
                                    <TableRow key={row.field}>
                                      <TableCell className="font-medium">{row.field}</TableCell>
                                      <TableCell className="whitespace-pre-wrap break-words">{row.value}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ) : citationTables.fallback.length > 0 ? (
                        <div className="rounded-xl border bg-background/70 backdrop-blur">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-56">Field</TableHead>
                                <TableHead>Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {citationTables.fallback.map((row) => (
                                <TableRow key={row.field}>
                                  <TableCell className="font-medium">{row.field}</TableCell>
                                  <TableCell className="whitespace-pre-wrap break-words">{row.value}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex h-32 flex-col items-center justify-center gap-1 text-muted-foreground">
                          <span className="font-medium text-foreground">No citations found</span>
                          <p className="text-center text-xs">The summary did not return LV4 citation fields.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur">
          <CardHeader>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Latest BOT Regulations Snapshot</CardTitle>
                <CardDescription>
                  Most recent circulars published by the Bank of Thailand (IssueBy: ธนาคารพาณิชย์จดทะเบียนในประเทศ, status: ใช้อยู่).
                </CardDescription>
              </div>
              {scrapeMeta?.fetchedAt && (
                <div className="text-xs text-muted-foreground md:text-right">
                  <p>
                    Updated {new Date(scrapeMeta.fetchedAt).toLocaleString()}
                    {typeof scrapeMeta.rawCount === "number" && scrapeMeta.rawCount > 0
                      ? ` • Showing ${scrapeDocs.length} of ${scrapeMeta.rawCount}`
                      : ""}
                  </p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 md:mt-0">
                <Button
                  variant="outline"
                  onClick={handleScrapeOnly}
                  disabled={isLoading || isScraping}
                  className="gap-2"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refresh Listings
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Refresh Listings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isScraping && !hasScrapeResults && (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Refreshing BOT listings…</span>
              </div>
            )}

            {scrapeError && (
              <Alert variant="destructive">
                <AlertTitle>Scraping failed</AlertTitle>
                <AlertDescription>{scrapeError}</AlertDescription>
              </Alert>
            )}

            {!isScraping && !scrapeError && !hasScrapeResults && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">No listings captured yet</span>
                <p className="text-center text-sm">
                  Run the automation to pull the latest BOT regulations and quick links.
                </p>
              </div>
            )}

            {!scrapeError && hasScrapeResults && (
              <div className="rounded-xl border bg-background/70 backdrop-blur">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">ประเภท</TableHead>
                      <TableHead className="w-[120px]">วันที่ประกาศ</TableHead>
                      <TableHead>เรื่อง</TableHead>
                      <TableHead className="w-[160px]">สถานะ</TableHead>
                      <TableHead className="w-[120px] text-right">เอกสาร</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapeDocs.map((doc, index) => (
                      <TableRow key={`${doc.title}-${doc.pdfUrl ?? index}`}>
                        <TableCell className="whitespace-pre-wrap break-words text-sm font-medium">
                          {doc.documentType || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDocumentDate(doc)}
                        </TableCell>
                        <TableCell className="space-y-1">
                          <p
                            className="font-medium truncate"
                            title={doc.title}
                            style={{ maxWidth: "38rem" }}
                          >
                            {doc.title.length > 120 ? `${doc.title.slice(0, 120)}…` : doc.title}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {doc.detailUrl && (
                              <a
                                href={doc.detailUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-primary"
                              >
                                รายละเอียด
                              </a>
                            )}
                            {doc.flag && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 px-2 py-[2px] text-[11px] font-medium text-amber-700"
                              >
                                {doc.flag}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.status || "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {doc.pdfUrl ? (
                            <a
                              href={doc.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              เปิดไฟล์
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
