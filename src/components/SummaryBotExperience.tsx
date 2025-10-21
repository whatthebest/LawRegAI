"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, Loader2, RefreshCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function SummaryBotExperience() {
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
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [draftText, setDraftText] = useState<string>("");
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isDocExporting, setIsDocExporting] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Dropdown options for Edit mode
  const COMPLEXITY_OPTIONS = useMemo(() => ["ซับซ้อน", "ไม่ซับซ้อน"], []);
  const COMPLIANCE_GROUP_OPTIONS = useMemo(
    () => [
      "กฎเกณฑ์ธุรกรรมสินเชื่อและธุรกรรมคล้ายสินเชื่อ",
      "กฎเกณฑ์ผลิตภัณฑ์ลูกค้ารายย่อย",
      "กฎเกณฑ์ช่องทาง (Banking Channel)",
      "กฎเกณฑ์ Digital Banking Business",
      "กฎเกณฑ์ธุรกิจหลักทรัพย์",
      "กฎเกณฑ์ธุรกรรมอนุพันธ์ และปริวรรตเงินตราต่างประเทศ",
      "กฎเกณฑ์ธุรกิจการให้บริการอื่น และพันธมิตรทางธุรกิจ",
      "กฎเกณฑ์ที่เกี่ยวข้องกับการดำรงสถานะกิจการและบริหารจัดการความเสี่ยง",
      "กฎเกณฑ์การกำกับดูแลกลุ่มธุรกิจทางการเงิน",
      "กฎเกณฑ์การบริการจัดการทรัพย์สิน และ NPA",
      "กฎเกณฑ์ Market Conduct",
      "กฎเกณฑ์ IT Compliance",
      "กฎเกณฑ์ด้าน AML/CTPF",
      "กฎเกณฑ์สากล",
      "กฎเกณฑ์ด้านการป้องกันและปราบปรามการทุจริต",
      "กฎเกณฑ์ธุรกิจ e-Payment",
      "Policy & Procedure",
      "กฎเกณฑ์ธรรมาภิบาลและกลไกการควบคุมภายใน",
    ],
    [],
  );

  const COMPLIANCE_RISK_AREA_OPTIONS = useMemo(
    () => [
      "สินเชื่อลูกค้าบุคคล",
      "สินเชื่อที่อยู่อาศัย",
      "สินเชื่อ sSME",
      "สินเชื่อธุรกิจขนาดกลางและขนาดใหญ่",
      "ธุรกรรมที่ลักษณะคล้ายการให้สินเชื่อ เช่น Factoring, Leasing",
      "ธุรกรรมเงินฝาก [THB] และธุรกรรมที่เกี่ยวข้องกับเงินฝาก",
      "บัตรเดบิต",
      "KTC co-brand",
      "ธุรกิจ Bancassurance",
      "ช่องทางการให้บริการ (Channel ตาม สนส.15/2563)",
      "Digital Channel",
      "กฎเกณฑ์ Digital Product (ข้อมูลที่ใช้พิจารณาผลิตภัณฑ์ ในรูปแบบ Electronic Data)",
      "กฎเกณฑ์ธุรกิจ Digital ID",
      "กฎเกณฑ์ธุรกิจ Digital platform",
      "กฎเกณฑ์ธุรกิจ e-Tax",
      "ธุรกรรม LBDU",
      "ธุรกรรมการค้าตราสารแห่งหนี้",
      "ธุรกรรมการจัดจำหน่ายตราสารแห่งหนี้",
      "ธุรกิจหลักทรัพย์อื่น",
      "การขึ้นทะเบียนหลักทรัพย์",
      "คุณสมบัติกรรมการและผู้บริหาร",
      "Fair Dealing ด้านที่ 1 การจัดโครงสร้างองค์กร บทบาทของคณะกรรมการ และหน้าที่ของผู้บริหารระดับสูง",
      "Fair Dealing ด้านที่ 2 การคัดเลือกผลิตภัณฑ์และการจัดกลุ่มลูกค้า (Product Selection and Client Segmentation)",
      "Fair Dealing ด้านที่ 3 การสื่อสารและการให้ความรู้แก่คนขาย (Communication and Training Program)",
      "Fair Dealing ด้านที่ 4 กระบวนการขาย (Sales Process)",
      "Fair Dealing ด้านที่ 5 การกำหนดวิธีจ่ายค่าตอบแทน (Remuneration Structure)",
      "Fair Dealing ด้านที่ 6 การจัดการเรื่องร้องเรียน (Complaint Handling)",
      "Fair Dealing ด้านที่ 7 การควบคุมภายในและการตรวจสอบการปฏิบัติงาน (Internal Control and In-house Inspection)",
      "Fair Dealing ด้านที่ 8 ระบบปฏิบัติการและแผนรองรับกรณีเกิดเหตุฉุกเฉิน (Operation and Business Continuity)",
      "ธุรกรรมอนุพันธ์ (รวมสัญญาซื้อขายล่วงหน้า)",
      "Thai Overnight Repurchase Rate : THOR",
      "BIBOR",
      "Historical Rate Roll Over",
      "ปริวรรตเงินตราต่างประเทศ",
      "IT Related Services",
      "Other Services",
      "Banking Agent",
      "Outsourcing",
      "พันธมิตรทางธุรกิจรูปแบบอื่น",
      "การดำรงเงินกองทุน/ Basel III",
      "การลงทุน (BANK Investment)",
      "การบริหารความเสี่ยงด้านต่างๆ",
      "โครงสร้างและขอบเขตการประกอบธุรกิจ",
      "ความเสี่ยงของกลุ่มธุรกิจฯ",
      "ความเพียงพอของเงินกองทุนของกลุ่มธุรกิจฯ",
      "การจัดทำรายงานของกลุ่มธุรกิจฯ",
      "การจัดหาและใช้ประโยชน์จากอสังหาริมทรัพย์",
      "การถือครองและการนำ NPA ไปใช้ประโยชน์",
      "Market Conduct ระบบ 1 วัฒนธรรมองค์กร และบทบาทหน้าที่ของคณะกรรมการและผู้บริหารระดับสูง",
      "Market Conduct ระบบ 2 การพัฒนาผลิตภัณฑ์และการจัดกลุ่มลูกค้า",
      "Market Conduct ระบบ 3 การจ่ายค่าตอบแทน",
      "Market Conduct ระบบ 4 กระบวนการขาย",
      "Market Conduct ระบบ 5 การสื่อสารและการให้ความรู้แก่พนักงาน",
      "Market Conduct ระบบ 6 การดูแลข้อมูลของลูกค้า",
      "Market Conduct ระบบ 7 การแก้ไขปัญหาและจัดการเรื่องร้องเรียน",
      "Market Conduct ระบบ 8 การควบคุม กำกับ และตรวจสอบ",
      "Market Conduct ระบบ 9 การปฏิบัติงานและแผนรองรับการปฏิบัติงาน",
      "การปฏิบัติตามกฎเกณฑ์ IT Compliance (IT Risk Management & related guidelines)",
      "การจัดทำและนำส่งรายงาน ธปท. (IT Compliance)",
      "การบริหารจัดการ IT Incident (IT Incident Management)",
      "นโยบายและระเบียบปฏิบัติงานด้าน AML/CTPF",
      "กระบวนการ KYC/CDD",
      "กระบวนการรายงานธุรกรรม ปปง.",
      "กฎเกณฑ์ FATCA",
      "การกำกับดูแลสาขาต่างประเทศ",
      "กฎเกณฑ์ CRS",
      "การป้องกันและปราบปรามการทุจริต",
      "การประกอบธุรกิจ e-Payment",
      "การจัดทำและนำส่งรายงาน e-Payment",
      "การปฏิบัติงานถูกต้องตามระเบียบ/นโยบายธนาคาร",
      "การทบทวนระเบียบ/นโยบาย ประจำปี",
      "หลักเกณฑ์เกี่ยวกับผู้ถือหุ้นและสถาบันการเงิน",
      "หลักเกณฑ์เกี่ยวกับกรรมการและผู้บริหารระดับสูง",
      "หลักเกณฑ์ด้านกลไกการควบคุมภายใน",
    ],
    [],
  );

  const OWNER_ORG_OPTIONS = useMemo(() => ["RER", "NRR", "AMR", "DBR", "OBR"], []);

  const isDropdownField = (
    field: string,
  ): "complexity" | "group" | "risk" | "ownerOrg" | null => {
    if (/^\s*ความซับซ้อน\s*$/i.test(field)) return "complexity";
    if (/^\s*Compliance Group\s*$/i.test(field)) return "group";
    if (/^\s*Compliance Risk Area\s*$/i.test(field)) return "risk";
    if (/^\s*Risk Owner Management Organization\s*$/i.test(field)) return "ownerOrg";
    return null;
  };

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
      const metaMap = meta.reduce<Record<string, string>>((acc, row) => {
        acc[row.field] = row.value;
        return acc;
      }, {});
      return { pairs, meta, metaMap, fallback: [] as SummaryRow[] };
    }

    if (lv4Rows.length > 0) {
      return { pairs: [] as CitationPair[], meta: [] as SummaryRow[], metaMap: {}, fallback: lv4Rows };
    }

    return { pairs: [] as CitationPair[], meta: [] as SummaryRow[], metaMap: {}, fallback: [] as SummaryRow[] };
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
      // Dynamic import typed for Next/Turbopack browser build
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const lv3Header = lv3Rows.map((row) => row.field);
      const lv3Values = lv3Rows.map((row) => row.value);
      const lv3Sheet = XLSX.utils.aoa_to_sheet([lv3Header, lv3Values]);
      XLSX.utils.book_append_sheet(workbook, lv3Sheet, sanitizeSheetName("Law/Regulation LV3"));

      const citationData: (string | undefined)[][] = [];
      if (citationTables.pairs.length > 0) {
        const citationHeaders = [
          "Citation Name",
          ...CITATION_META_FIELDS,
          "Citation Description",
        ];
        citationData.push(citationHeaders);
        citationTables.pairs.forEach((pair) => {
          const metaValues = CITATION_META_FIELDS.map(
            (field) => citationTables.metaMap[field] ?? "",
          );
          citationData.push([pair.name ?? "", ...metaValues, pair.desc ?? ""]);
        });
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

  const handleGenerateCircular = async () => {
    setIsGeneratingDoc(true);
    setDocError(null);
    try {
      const trimmedUrl = pdfUrl.trim();
      const res = await fetch("/api/summary-bot/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: trimmedUrl.length ? trimmedUrl : undefined }),
      });
      if (!res.ok) {
        let message = res.statusText || "Failed to generate circular";
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch {}
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `circular_${new Date().toISOString().replace(/[:.]/g, "-")}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setDocError(msg);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateDraft = async () => {
    setIsDraftLoading(true);
    setDocError(null);
    try {
      const trimmedUrl = pdfUrl.trim();
      const res = await fetch("/api/summary-bot/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: trimmedUrl.length ? trimmedUrl : undefined, draft: true }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.content) {
        throw new Error(payload?.error || res.statusText || "Failed to generate draft");
      }
      setDraftText(String(payload.content));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setDocError(msg);
    } finally {
      setIsDraftLoading(false);
    }
  };

  // Focus/scroll to draft when it appears
  useEffect(() => {
    if (draftText && draftRef.current) {
      draftRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      draftRef.current.focus();
    }
  }, [draftText]);

  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const cloneData = (data: Record<string, unknown> | null): Record<string, unknown> =>
    data ? JSON.parse(JSON.stringify(data)) : {};

  const recomputeRowsFromData = (data: Record<string, unknown>): SummaryRow[] =>
    Object.entries(data).map(([field, value]) => ({
      field,
      value: Array.isArray(value) ? (value as unknown[]).map(String).join(", ") : `${value ?? ""}`,
    }));

  const startEditFields = () => {
    const base = rawData ?? Object.fromEntries(rows.map((r) => [r.field, r.value]));
    setEditData(cloneData(base));
    setIsEditingFields(true);
  };

  const cancelEditFields = () => {
    setIsEditingFields(false);
    setEditData(null);
  };

  const saveEditFields = () => {
    const finalData = editData ? cloneData(editData) : {};
    setRawData(finalData);
    setRows(recomputeRowsFromData(finalData));
    setIsEditingFields(false);
  };

  const handleExportDraft = async () => {
    if (!draftText.trim()) return;
    setIsDocExporting(true);
    setDocError(null);
    try {
      const res = await fetch("/api/summary-bot/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plainText: draftText }),
      });
      if (!res.ok) {
        let message = res.statusText || "Failed to export document";
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch {}
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `circular_${new Date().toISOString().replace(/[:.]/g, "-")}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setDocError(msg);
    } finally {
      setIsDocExporting(false);
    }
  };

  return (
    <section id="summary-bot" className="flex flex-col gap-6 scroll-mt-28 lg:scroll-mt-32">
        <section className="grid gap-4 lg:grid-cols-1">
          <Card className="relative rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-400" />
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
                {docError && (
                  <p className="mt-1 text-xs text-destructive-foreground">Generate failed: {docError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateDraft}
                  disabled={isDraftLoading}
                  className="gap-2"
                >
                  {isDraftLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Drafting…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate Draft
                    </>
                  )}
                </Button>

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
              </div>
            </CardFooter>
          </Card>
        </section>

        {(isLoading || !!error || hasResults) && (
          <Card className="relative rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur min-h-[320px]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-blue-400 to-sky-400" />
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Output snapshot</CardTitle>
                    <CardDescription>
                      Results from the latest processing run. Data refreshes each time the workflow completes.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {!isEditingFields ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full"
                        onClick={startEditFields}
                        disabled={!hasResults || isLoading}
                      >
                        <>
                          <FileText className="h-4 w-4" />
                          Edit
                        </>
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="gap-2 rounded-full"
                          onClick={saveEditFields}
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 rounded-full"
                          onClick={cancelEditFields}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={handleDownloadExcel}
                      disabled={!hasResults || isLoading || isExporting || isEditingFields}
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
                            {(!isEditingFields ? LV3_FIELD_ORDER : LV3_FIELD_ORDER).map((field) => {
                              const current = (isEditingFields ? editData : rawData) as any;
                              const val = current ? current[field] : undefined;
                              const isList = /สรุปสาระสำคัญที่เปลี่ยนแปลง/i.test(field) || shouldBulletize(field);
                              const dropdownKind = isDropdownField(field);
                              const displayText = Array.isArray(val)
                                ? (val as unknown[]).map(String).join(", ")
                                : typeof val === "string"
                                  ? val
                                  : "";
                              const bullets = !isEditingFields && shouldBulletize(field)
                                ? (Array.isArray(val)
                                    ? (val as unknown[]).map(String).filter(Boolean)
                                    : splitToBullets(displayText))
                                : null;
                              return (
                                <TableRow key={field}>
                                  <TableCell className="font-medium">{field}</TableCell>
                                  <TableCell className="whitespace-pre-wrap break-words">
                                    {isEditingFields ? (
                                      dropdownKind === "complexity" ? (
                                        <Select
                                          value={typeof val === "string" ? val : ""}
                                          onValueChange={(v) => {
                                            const next = { ...(editData as any) };
                                            next[field] = v;
                                            setEditData(next);
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="เลือกความซับซ้อน" />
                                          </SelectTrigger>
                                          <SelectContent className="max-h-80 overflow-y-auto">
                                            {COMPLEXITY_OPTIONS.map((opt) => (
                                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : dropdownKind === "group" ? (
                                        <Select
                                          value={typeof val === "string" ? val : ""}
                                          onValueChange={(v) => {
                                            const next = { ...(editData as any) };
                                            next[field] = v;
                                            setEditData(next);
                                          }}
                                        >
                                          <SelectTrigger className="max-w-[36rem]">
                                            <SelectValue placeholder="เลือก Compliance Group" />
                                          </SelectTrigger>
                                          <SelectContent className="max-h-80 overflow-y-auto">
                                            {COMPLIANCE_GROUP_OPTIONS.map((opt) => (
                                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : dropdownKind === "risk" ? (
                                        <Select
                                          value={typeof val === "string" ? val : ""}
                                          onValueChange={(v) => {
                                            const next = { ...(editData as any) };
                                            next[field] = v;
                                            setEditData(next);
                                          }}
                                        >
                                          <SelectTrigger className="max-w-[36rem]">
                                            <SelectValue placeholder="เลือก Compliance Risk Area" />
                                          </SelectTrigger>
                                          <SelectContent className="max-h-80 overflow-y-auto">
                                            {COMPLIANCE_RISK_AREA_OPTIONS.map((opt) => (
                                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : dropdownKind === "ownerOrg" ? (
                                        <Select
                                          value={typeof val === "string" ? val : ""}
                                          onValueChange={(v) => {
                                            const next = { ...(editData as any) };
        next[field] = v;
                                            setEditData(next);
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="เลือกหน่วยงาน Risk Owner" />
                                          </SelectTrigger>
                                          <SelectContent className="max-h-80 overflow-y-auto">
                                            {OWNER_ORG_OPTIONS.map((opt) => (
                                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : isList ? (
                                        <Textarea
                                          value={Array.isArray(val) ? (val as unknown[]).map(String).join("\n") : displayText}
                                          onChange={(e) => {
                                            const next = { ...(editData as any) };
                                            const lines = e.target.value
                                              .split(/\r?\n/)
                                              .map((s) => s.trim())
                                              .filter(Boolean);
                                            next[field] = lines;
                                            setEditData(next);
                                          }}
                                          rows={4}
                                        />
                                      ) : (
                                        <Input
                                          value={displayText}
                                          onChange={(e) => {
                                            const next = { ...(editData as any) };
                                            next[field] = e.target.value;
                                            setEditData(next);
                                          }}
                                        />
                                      )
                                    ) : bullets && bullets.length > 1 ? (
                                      <ul className="list-disc pl-5 space-y-1">
                                        {bullets.map((b, i) => (
                                          <li key={i}>{b}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      displayText
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
                      {(() => {
                        if (isEditingFields && editData) {
                          const getArray = (k: string) => {
                            const v = (editData as any)[k];
                            if (Array.isArray(v)) return (v as unknown[]).map(String);
                            if (typeof v === "string") return v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
                            return [] as string[];
                          };
                          const setArray = (k: string, arr: string[]) => {
                            setEditData({ ...(editData as any), [k]: arr });
                          };
                          const names = getArray("Citation Name");
                          const descs = getArray("Citation Description");
                          const maxLen = Math.max(names.length, descs.length, 1);
                          while (names.length < maxLen) names.push("");
                          while (descs.length < maxLen) descs.push("");

                          const metaList = CITATION_META_FIELDS.map((field) => {
                            const v = (editData as any)[field];
                            const text = Array.isArray(v) ? (v as unknown[]).map(String).join(", ") : (v ?? "");
                            return { field, value: String(text) } as SummaryRow;
                          });

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm text-muted-foreground">Edit Citations</div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setArray("Citation Name", [...names, ""]);
                                      setArray("Citation Description", [...descs, ""]);
                                    }}
                                  >
                                    Add Row
                                  </Button>
                                </div>
                              </div>
                              <div className="rounded-xl border bg-background/70 backdrop-blur">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[260px]">Citation Name</TableHead>
                                      <TableHead>Citation Description</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {names.map((_, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="align-top">
                                          <Input
                                            value={names[i]}
                                            onChange={(e) => {
                                              const next = [...names];
                                              next[i] = e.target.value;
                                              setArray("Citation Name", next);
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Textarea
                                            value={descs[i]}
                                            onChange={(e) => {
                                              const next = [...descs];
                                              next[i] = e.target.value;
                                              setArray("Citation Description", next);
                                            }}
                                            rows={3}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="rounded-xl border bg-background/70 backdrop-blur">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-56">Field</TableHead>
                                      <TableHead>Value</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                  {metaList.map((row) => {
                                    const kind = isDropdownField(row.field);
                                    return (
                                      <TableRow key={row.field}>
                                        <TableCell className="font-medium">{row.field}</TableCell>
                                        <TableCell>
                                          {kind === "complexity" ? (
                                            <Select
                                              value={row.value}
                                              onValueChange={(v) => setEditData({ ...(editData as any), [row.field]: v })}
                                            >
                                              <SelectTrigger><SelectValue placeholder="เลือกความซับซ้อน" /></SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                                {COMPLEXITY_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : kind === "group" ? (
                                            <Select
                                              value={row.value}
                                              onValueChange={(v) => setEditData({ ...(editData as any), [row.field]: v })}
                                            >
                                              <SelectTrigger className="max-w-[36rem]"><SelectValue placeholder="เลือก Compliance Group" /></SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                                {COMPLIANCE_GROUP_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : kind === "risk" ? (
                                            <Select
                                              value={row.value}
                                              onValueChange={(v) => setEditData({ ...(editData as any), [row.field]: v })}
                                            >
                                              <SelectTrigger className="max-w-[36rem]"><SelectValue placeholder="เลือก Compliance Risk Area" /></SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                                {COMPLIANCE_RISK_AREA_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : kind === "ownerOrg" ? (
                                            <Select
                                              value={row.value}
                                              onValueChange={(v) => setEditData({ ...(editData as any), [row.field]: v })}
                                            >
                                              <SelectTrigger><SelectValue placeholder="เลือกหน่วยงาน Risk Owner" /></SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                                {OWNER_ORG_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <Input
                                              value={row.value}
                                              onChange={(e) => {
                                                setEditData({ ...(editData as any), [row.field]: e.target.value });
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          );
                        }

                        if (citationTables.pairs.length > 0) {
                          return (
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
                          );
                        }

                        if (citationTables.fallback.length > 0) {
                          return (
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
                          );
                        }
                        return (
                          <div className="flex h-32 flex-col items-center justify-center gap-1 text-muted-foreground">
                            <span className="font-medium text-foreground">No citations found</span>
                            <p className="text-center text-xs">The summary did not return LV4 citation fields.</p>
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {draftText && (
          <Card className="rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Circular Draft</CardTitle>
                <CardDescription>
                  Review and edit the draft before exporting to Word.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDraftText("")}
                  className="gap-2"
                >
                  Discard Draft
                </Button>
                <Button onClick={handleExportDraft} disabled={isDocExporting} className="gap-2">
                  {isDocExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export to Word
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                ref={draftRef as any}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={20}
                className="font-thai whitespace-pre-wrap"
              />
              {docError && (
                <p className="mt-2 text-sm text-destructive-foreground">{docError}</p>
              )}
            </CardContent>
          </Card>
        )}

        <section className="rounded-3xl border border-white/70 bg-gradient-to-br from-white via-slate-50 to-sky-50/60 p-6 shadow-xl">
          <Card className="relative rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400" />
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
        </section>
      </section>
  );
}
