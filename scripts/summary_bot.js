#!/usr/bin/env node
"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

const PDF_URL =
  process.env.SUMMARY_BOT_PDF_URL ??
  "https://www.bot.or.th/content/dam/bot/fipcs/documents/FPG/2560/ThaiPDF/25600025.pdf";

function extractJsonFromText(text) {
  if (!text) return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1].trim()) {
    return fenced[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

async function fetchPdfBuffer(url) {
  if (typeof fetch !== "function") {
    throw new Error("Fetch API is not available in this Node.js version.");
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to download PDF (status ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function callGemini(pdfBuffer) {
  const apiKey =
    process.env.SUMMARY_BOT_GOOGLE_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Set SUMMARY_BOT_GOOGLE_API_KEY or GOOGLE_API_KEY."
    );
  }

  const modelName =
    process.env.SUMMARY_BOT_MODEL ??
    process.env.GEMINI_MODEL ??
    "gemini-1.5-flash-latest";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are a compliance analyst. Summarise the provided Bank of Thailand circular and return a strict JSON object.
The JSON schema must be:
{
  "Document Title": string,
  "Effective Date": string,
  "Summary": string,
  "Top Keywords": string[]
}

Guidelines:
- Use Thai when the source document is Thai.
- If a field is missing, respond with "ไม่พบข้อมูล".
- Summary should be concise (<= 6 sentences).
- Provide 8-15 keywords prioritising regulatory, risk, and process terminology.
- Return only machine-readable JSON, no markdown, no commentary.
`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    },
    { text: prompt },
  ]);

  const responseText = typeof result.response?.text === "function"
    ? result.response.text()
    : "";

  const jsonCandidate = extractJsonFromText(responseText);
  if (!jsonCandidate) {
    throw new Error("Gemini response did not include JSON payload.");
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    throw new Error(
      `Unable to parse Gemini response as JSON: ${(error && error.message) || error}`
    );
  }

  return parsed;
}

async function main() {
  const runId = new Date().toISOString();

  try {
    const pdfBuffer = await fetchPdfBuffer(PDF_URL);
    const summary = await callGemini(pdfBuffer);

    const payload = {
      success: true,
      runId,
      data: {
        ...summary,
        "Source URL": PDF_URL,
        "Processed At (UTC)": runId,
      },
    };

    process.stdout.write(JSON.stringify(payload));
    process.exit(0);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Summary workflow failed.";
    const details =
      error && typeof error === "object" && "stack" in error
        ? String(error.stack)
        : undefined;
    const payload = {
      success: false,
      error: message,
      details,
    };

    process.stdout.write(JSON.stringify(payload));
    process.exit(1);
  }
}

main();
