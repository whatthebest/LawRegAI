import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScriptResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
};

function runSummaryScript(env: NodeJS.ProcessEnv): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "summary_bot.js");
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env,
    });

    let stdout = "";
    let stderr = "";
    let capturedError: NodeJS.ErrnoException | undefined;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      capturedError = error;
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr, error: capturedError });
    });
  });
}

export async function POST(request: Request) {
  let pdfUrl: string | undefined;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      if (body && typeof body.pdfUrl === "string") {
        const trimmed = body.pdfUrl.trim();
        if (trimmed) {
          pdfUrl = trimmed;
        }
      }
    }
  } catch (error) {
    console.warn("[summary-bot] Failed to parse request body:", error);
  }

  const env = { ...process.env };
  if (pdfUrl) {
    env.SUMMARY_BOT_PDF_URL = pdfUrl;
  }

  const result = await runSummaryScript(env);

  if (result.error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to execute summary script: ${result.error.message}`,
        details: result.stderr,
      },
      { status: 500 },
    );
  }

  const output = result.stdout.trim();

  if (!output) {
    return NextResponse.json(
      {
        success: false,
        error: "Summary script returned no output.",
        details: result.stderr,
      },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(output);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Summary script returned invalid JSON.",
        details: output,
        stderr: result.stderr,
      },
      { status: 500 },
    );
  }

  if (result.code !== 0) {
    return NextResponse.json(
      typeof payload === "object" && payload !== null ? payload : { success: false },
      { status: 500 },
    );
  }

  if (typeof payload === "object" && payload !== null) {
    return NextResponse.json(payload);
  }

  return NextResponse.json({
    success: true,
    result: payload,
  });
}
