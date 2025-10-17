import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to download PDF (status ${res.status})`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function buildLetterPrompt() {
  return `ให้ตรวจสอบก่อนว่าเอกสารเข้าข่ายกรณีใด ระหว่าง:\n\n1. กรณีธนาคารไม่มีผลกระทบจากการเปลี่ยนแปลงกฎเกณฑ์และกฎหมาย (เอกสารแนบกับการแจ้งเตือนอีเมล N5): ต้องจัดรูปแบบตามโครงสร้างหนังสือเวียนดังนี้:\n"""วันที่ [Notification Date]\nเรียน [Risk Owner Management Organization Name]\nเรื่อง แจ้งการเปลี่ยนแปลงกฎเกณฑ์/กฎหมายของ [หน่วยงาน Regulator] เรื่อง [Law/Regulation Name]\n \nตามที่ [หน่วยงาน Regulator] ได้ออก [เลขที่กฎเกณฑ์/ประกาศ] [Law/Regulation Name] วันที่ประกาศ [วันที่ประกาศ] ซึ่ง [Compliance Risk Area Owner Management Organization Name] ได้แจ้งให้ทราบแล้ว โดยครั้งหลังสุดตามหนังสือเวียนที่ [เลขที่หนังสือเวียนสื่อสารการเปลี่ยนแปลง] นั้น สรุปรายละเอียด ดังนี้\n\nชื่อประกาศ: [เลขที่กฎเกณฑ์/ประกาศ] [Name of Law/Regulation] \nออกโดย: [หน่วยงาน Regulator]\nวันที่มีผลบังคับใช้: [วันที่มีผลบังคับใช้]\nสรุปสาระสำคัญ: [สรุปสาระสำคัญที่เปลี่ยนแปลง]\n\n[Compliance Risk Area Owner Management Organization Name] จึงขอนำส่ง [เลขที่กฎเกณฑ์/ประกาศ] [Name of law/regulation] วันที่ประกาศ [วันที่ประกาศ] โดยมีรายละเอียดตามลิงค์ที่แนบมาพร้อมอีเมลฉบับนี้ และขอยกเลิกหนังสือเวียนที่ [เลขที่หนังสือเวียนที่ยกเลิก] โดยให้ถือปฏิบัติตามหนังสือเวียน [เลขที่หนังสือเวียนสื่อสารการเปลี่ยนแปลง] แทน\n \nจึงเรียนมาเพื่อโปรดทราบและถือปฏิบัติ\nCompliance Risk Area Owner\nกลุ่มกำกับงานกฎเกณฑ์\n"""\n\n2. กรณีธนาคารมีผลกระทบจากการเปลี่ยนแปลงกฎเกณฑ์และกฎหมาย (เอกสารแนบกับการแจ้งเตือนอีเมล N26): ต้องจัดรูปแบบตามโครงสร้างหนังสือเวียนดังนี้:\n"""วันที่ [Notification Date]\nเรียน [Risk Owner Management Organization Name]\nเรื่อง แจ้งการเปลี่ยนแปลงกฎเกณฑ์/กฎหมายของ [หน่วยงาน Regulator] เรื่อง [Law/Regulation Name]\n \nตามที่ [หน่วยงาน Regulator] ได้ออก [เลขที่กฎเกณฑ์/ประกาศ] [Law/Regulation Name] วันที่ประกาศ [วันที่ประกาศ] ซึ่ง [Compliance Risk Area Owner Management Organization Name] ได้แจ้งให้ทราบแล้ว โดยครั้งหลังสุดตามหนังสือเวียนที่ [เลขที่หนังสือเวียนสื่อสารการเปลี่ยนแปลง] นั้น สรุปรายละเอียด ดังนี้\n\nชื่อประกาศ\t[เลขที่กฎเกณฑ์/ประกาศ] [Name of Law/Regulation]\nออกโดย\t[หน่วยงาน Regulator]\nวันที่มีผลบังคับใช้\t[วันที่มีผลบังคับใช้]\nสรุปสาระสำคัญ\t[สรุปสาระสำคัญที่เปลี่ยนแปลง]\nผลกระทบ/สิ่งที่ธนาคารต้องดำเนินการ\t[ผลกระทบ/สิ่งที่ธนาคารต้องดำเนินการ]\nสิ่งที่ธนาคารต้องดำเนินการ\t[รายละเอียดผลกระทบ/สิ่งที่ธนาคารต้องดำเนินการ]\n\nในการนี้การเปลี่ยนแปลงกฎเกณฑ์/กฎหมายข้างต้น มีผลกระทบที่ธนาคารต้องดำเนินการให้ เป็นไปตามกฎเกณฑ์/กฎหมายดังกล่าว จึงขอเรียนมายังท่านโปรดพิจารณาดำเนินการในส่วนที่เกี่ยวข้อง ดังนี้\n\nเลขที่มาตรา/ข้อ, มาตรา/ข้อ, Citation Description, กำหนดการดำเนินการ, สิ่งที่ต้องดำเนินการ, หน่วยงานที่รับผิดชอบ/เกี่ยวข้อง*\n[Citation ID], [Citation Name], [Citation Description], [วันที่กฎเกณฑ์และกฎหมายกำหนดให้ดำเนินการแล้วเสร็จ], [สิ่งที่ Risk Owner ต้องดำเนินการ], [หน่วยงานในสังกัด Risk Owner]\n[Citation ID], [Citation Name], [Citation Description], [วันที่กฎเกณฑ์และกฎหมายกำหนดให้ดำเนินการแล้วเสร็จ], [สิ่งที่ Risk Owner ต้องดำเนินการ], [หน่วยงานในสังกัด Risk Owner]\n \n [Compliance Risk Area Owner Management Organization Name] จึงขอนำส่ง [เลขที่กฎเกณฑ์/ประกาศ] [Name of law/regulation] วันที่ประกาศ [วันที่ประกาศ] โดยมีรายละเอียดตามลิงค์ที่แนบมาพร้อมอีเมลฉบับนี้ และขอยกเลิกหนังสือเวียนที่ [เลขที่หนังสือเวียนที่ยกเลิก] โดยให้ถือปฏิบัติตามหนังสือเวียน [เลขที่หนังสือเวียนสื่อสารการเปลี่ยนแปลง] แทน\n \nจึงเรียนมาเพื่อโปรดทราบและถือปฏิบัติ\nCompliance Risk Area Owner\nกลุ่มกำกับงานกฎเกณฑ์\n"""\n\nให้แมปข้อมูลจากเอกสารให้อยู่ในฟิลด์ของเทมเพลตนั้นอย่างถูกต้องและครบถ้วนทุกช่องตามรูปแบบ หากไม่พบข้อมูลให้ระบุว่า 'ไม่พบข้อมูล'\n\nข้อกำหนดผลลัพธ์:\n- ให้ตอบกลับเป็นข้อความล้วน (plain text) ภาษาไทยเท่านั้น\n- จัดบรรทัดและช่องไฟตามตัวอย่างเทมเพลต\n- ห้ามมีโค้ดบล็อก, Markdown, หรือ JSON ใดๆ\n- [Notification Date] ให้ใส่วันที่ปัจจุบันตามรูปแบบไทย เช่น 17 ตุลาคม 2568\n`;
}

function toThaiDateString(date = new Date()): string {
  const th = date.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  return th;
}

function toRtf(text: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
  const lines = esc(text).split(/\r?\n/).map((l) => (l.length ? l : " "));
  return `{
\\rtf1\\ansi\\deff0\\fs24
${lines.map((l) => `${l}\\par`).join("\n")}
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pdfUrl: string = (body?.pdfUrl && String(body.pdfUrl).trim()) ||
      "https://www.bot.or.th/content/dam/bot/fipcs/documents/FPG/2560/ThaiPDF/25600025.pdf";
    const asDraft: boolean = Boolean(body?.draft);
    const plainText: string | undefined = typeof body?.plainText === "string" && body.plainText.trim() ? String(body.plainText).trim() : undefined;

    const apiKey = process.env.SUMMARY_BOT_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing Google API key" }, { status: 500 });

    // If caller posts plain text, just convert to DOC and return
    if (plainText) {
      const rtf = toRtf(plainText);
      const filename = `circular_${Date.now()}.doc`;
      return new NextResponse(Buffer.from(rtf, "utf8"), {
        status: 200,
        headers: {
          "Content-Type": "application/rtf; charset=utf-8",
          "Content-Disposition": `attachment; filename=${filename}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdfBuffer = await fetchPdfBuffer(pdfUrl);

    const genai = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.SUMMARY_BOT_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
    const model = genai.getGenerativeModel({ model: modelName });

    const prompt = buildLetterPrompt() + `\n\nหมายเหตุ: วันนี้คือ ${toThaiDateString()}`;

    const result = await model.generateContent([
      { inlineData: { mimeType: "application/pdf", data: pdfBuffer.toString("base64") } },
      { text: prompt },
    ]);

    const text = typeof result.response?.text === "function" ? result.response.text() : "";
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Empty response from LLM" }, { status: 500 });
    }

    if (asDraft) {
      return NextResponse.json({ success: true, content: text.trim() }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const rtf = toRtf(text.trim());
    const filename = `circular_${Date.now()}.doc`;

    return new NextResponse(Buffer.from(rtf, "utf8"), {
      status: 200,
      headers: {
        "Content-Type": "application/rtf; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
