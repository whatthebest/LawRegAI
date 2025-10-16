import { load } from "cheerio";

const BOT_FORM_URL = "https://app.bot.or.th/FIPCS/Thai/PFIPCS_list.aspx";
const BOT_BASE_URL = "https://app.bot.or.th/FIPCS/Thai/";

const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 1,
  "ก.พ.": 2,
  "มี.ค.": 3,
  "เม.ย.": 4,
  "พ.ค.": 5,
  "มิ.ย.": 6,
  "ก.ค.": 7,
  "ส.ค.": 8,
  "ก.ย.": 9,
  "ต.ค.": 10,
  "พ.ย.": 11,
  "ธ.ค.": 12,
  // fallback spellings without dot
  "ม.ค": 1,
  "ก.พ": 2,
  "มี.ค": 3,
  "เม.ย": 4,
  "พ.ค": 5,
  "มิ.ย": 6,
  "ก.ค": 7,
  "ส.ค": 8,
  "ก.ย": 9,
  "ต.ค": 10,
  "พ.ย": 11,
  "ธ.ค": 12,
};

export type BotDocument = {
  title: string;
  documentType: string;
  rawDate: string;
  effectiveDate: string | null;
  status?: string;
  flag?: string;
  pdfUrl?: string;
  detailUrl?: string;
};

export type BotScrapeResult = {
  success: boolean;
  documents: BotDocument[];
  fetchedAt: string;
  rawCount: number;
  filters: {
    issueBy: string;
    status: string;
  };
  error?: string;
};

export type BotScrapeOptions = {
  issueBy?: string;
  status?: string;
  limit?: number;
};

function parseThaiDate(value: string): string | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const match = cleaned.match(/(\d{1,2})\s*([ก-๙\.]+)\s*(\d{4})/);
  if (!match) {
    const fallback = Number.isNaN(Date.parse(cleaned)) ? null : new Date(cleaned).toISOString();
    return fallback;
  }

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = parseInt(dayRaw, 10);
  let month = THAI_MONTHS[monthRaw];
  if (!month) {
    const withDot = monthRaw.endsWith(".") ? monthRaw.slice(0, -1) : `${monthRaw}.`;
    month = THAI_MONTHS[withDot];
  }

  let year = parseInt(yearRaw, 10);

  if (!day || !month || !year) {
    return null;
  }

  if (year > 2400) {
    year -= 543;
  }

  const isoDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(isoDate.getTime())) {
    return null;
  }
  return isoDate.toISOString();
}

function resolveUrl(href?: string | null): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, BOT_BASE_URL).href;
  } catch {
    return undefined;
  }
}

function extractDetailUrl(onclick?: string | null): string | undefined {
  if (!onclick) return undefined;
  const match = onclick.match(/OpenWindow\('([^']+)'/);
  if (!match) return undefined;
  return resolveUrl(match[1]);
}

function buildSearchParams(
  values: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    params.append(key, value);
  });
  return params;
}

export async function scrapeBotDocuments(
  options: BotScrapeOptions = {},
): Promise<BotScrapeResult> {
  const issueBy = options.issueBy ?? "11";
  const status = options.status ?? "1";
  const limit = options.limit ?? 20;

  try {
    const initialResponse = await fetch(BOT_FORM_URL);
    if (!initialResponse.ok) {
      throw new Error(`Failed to load BOT regulations page (status ${initialResponse.status})`);
    }

    const initialHtml = await initialResponse.text();
    const initial$ = load(initialHtml);

    const viewState = initial$('input[name="__VIEWSTATE"]').attr("value") ?? "";
    const viewStateGenerator = initial$('input[name="__VIEWSTATEGENERATOR"]').attr("value") ?? "";
    const eventValidation = initial$('input[name="__EVENTVALIDATION"]').attr("value") ?? "";

    const form = buildSearchParams({
      "__EVENTTARGET": "",
      "__EVENTARGUMENT": "",
      "__VIEWSTATE": viewState,
      "__VIEWSTATEGENERATOR": viewStateGenerator,
      "__VIEWSTATEENCRYPTED": "",
      "__EVENTVALIDATION": eventValidation,
      "ctl00$ContentPlaceHolder1$IssueBy": issueBy,
      "ctl00$ContentPlaceHolder1$DocGroup": "0",
      "ctl00$ContentPlaceHolder1$ByYear": "0",
      "ctl00$ContentPlaceHolder1$DocType": "0",
      "ctl00$ContentPlaceHolder1$Category": "0",
      "ctl00$ContentPlaceHolder1$ddlStatus": status,
      "ctl00$ContentPlaceHolder1$ddlLaw": "0",
      "ctl00$ContentPlaceHolder1$SubCategory": "0",
      "ctl00$ContentPlaceHolder1$txtDocNo": "",
      "ctl00$ContentPlaceHolder1$txtSubject": "",
      "ctl00$ContentPlaceHolder1$txtSearch": "",
      "ctl00$ContentPlaceHolder1$btnsearch.x": "32",
      "ctl00$ContentPlaceHolder1$btnsearch.y": "12",
    });

    const response = await fetch(BOT_FORM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: BOT_FORM_URL,
      },
      body: form.toString(),
    });

    if (!response.ok) {
      throw new Error(`BOT search request failed (status ${response.status})`);
    }

    const html = await response.text();
    const $ = load(html);
    const allRows = $("#ctl00_ContentPlaceHolder1_dgDocument tr").toArray().slice(1);
    const totalRows = allRows.length;
    const rows = allRows.slice(0, Math.max(limit * 2, limit + 5)); // read a bit more rows to skip blanks

    const documents: BotDocument[] = [];
    for (const row of rows) {
      if (documents.length >= limit) break;
      const cells = $(row).find("td");
      if (cells.length < 6) {
        continue;
      }

      const documentTypeRaw = $(cells[0]).text().replace(/\s+/g, " ").trim();
      const rawDate = $(cells[1]).text().replace(/\s+/g, " ").trim();
      const flag =
        $(cells[2]).find("img").attr("alt")?.trim() ||
        $(cells[2]).text().replace(/\s+/g, " ").trim() ||
        undefined;
      const title =
        $(cells[3]).find(".setrow").text().replace(/\s+/g, " ").trim() ||
        $(cells[3]).text().replace(/\s+/g, " ").trim();
      if (!title) {
        continue;
      }

      const statusText =
        $(cells[4]).find("img").attr("alt")?.trim() ||
        $(cells[4]).text().replace(/\s+/g, " ").trim() ||
        undefined;
      const pdfUrl = resolveUrl($(cells[5]).find("a").attr("href"));
      const detailUrl = extractDetailUrl($(cells[3]).find("a").attr("onclick"));

      documents.push({
        title,
        documentType: documentTypeRaw || "ไม่ระบุ",
        rawDate,
        effectiveDate: parseThaiDate(rawDate),
        status: statusText,
        flag,
        pdfUrl,
        detailUrl,
      });
    }

    return {
      success: true,
      documents,
      fetchedAt: new Date().toISOString(),
      rawCount: totalRows,
      filters: { issueBy, status },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraping error";
    return {
      success: false,
      documents: [],
      fetchedAt: new Date().toISOString(),
      rawCount: 0,
      filters: {
        issueBy: options.issueBy ?? "11",
        status: options.status ?? "1",
      },
      error: message,
    };
  }
}
