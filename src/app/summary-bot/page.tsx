"use client";

import { useState, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type SummaryRow = {
  field: string;
  value: string;
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
              <CardTitle>Output snapshot</CardTitle>
              <CardDescription>
                Results from the latest processing run. Data refreshes each time the workflow completes.
              </CardDescription>
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
                <div className="rounded-xl border bg-background/70 backdrop-blur">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-56">Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.field}>
                          <TableCell className="font-medium">{row.field}</TableCell>
                          <TableCell className="whitespace-pre-wrap break-words">{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
