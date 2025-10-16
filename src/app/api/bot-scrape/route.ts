import { NextResponse } from "next/server";
import { scrapeBotDocuments } from "@/lib/botScraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScrapeRequestBody = {
  issueBy?: string;
  status?: string;
  limit?: number;
};

export async function POST(request: Request) {
  let body: ScrapeRequestBody | undefined;

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = await request.json();
    }
  } catch (error) {
    console.warn("[bot-scrape] Failed to parse request body:", error);
  }

  const result = await scrapeBotDocuments({
    issueBy: body?.issueBy,
    status: body?.status,
    limit: body?.limit,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
