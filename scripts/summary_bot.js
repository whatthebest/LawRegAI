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
วิเคราะห์เอกสารกฎหมาย/กฎเกณฑ์จากไฟล์ PDF ด้านบน แล้วสกัดข้อมูลเป็น JSON เดียวเท่านั้น (ต้อง parse ได้ 100%) เพื่อนำไปใช้จัดทำ Summary (LV3) และ Citations (LV4)

กติกา “กันเพี้ยน” (สำคัญมาก):
1) ให้สร้างรายการชั่วคราวชื่อ "Citations" เป็น array ของ object แต่ละรายการต้องมี:
   - name: ชื่อหลักเกณฑ์แบบสั้น กระชับ ชี้วัตถุประสงค์/ภาระหน้าที่ เช่น "กำหนดให้รายงานเหตุการณ์ภายใน 3 วัน"
   - description: คำอธิบายหลักเกณฑ์สอดคล้องกับ name ขยายความว่าต้องทำอะไร/อย่างไร/เมื่อไร/เงื่อนไข
2) จาก "Citations" ให้แตกเป็น 2 ลิสต์:
   - "Citation Name": คือ [citation.name …] ตามลำดับดั้งเดิม
   - "Citation Description": คือ [citation.description …] โดย index ตรงกับ "Citation Name" เสมอ
3) ถ้าไม่พบ ให้ใช้ "ไม่ระบุ" แต่ยังต้องรักษาจำนวนสมาชิกให้เท่ากันเสมอ
4) ห้ามมีรายการว่าง ห้ามสลับลำดับ ห้ามเพิ่ม/ลบฝั่งใดฝั่งหนึ่งเพียงฝั่งเดียว
5) จงสรุปเฉพาะ “หลักเกณฑ์ที่มีผลบังคับ/ข้อกำหนดเชิงปฏิบัติ” (อย่าใส่เหตุผลเชิงนโยบายหรือบทนำ)

หลักการสกัด (ใช้ตามลำดับความพยายาม):
- จับหัวข้อที่มักขึ้นต้นด้วย "ข้อ", "มาตรา", bullet/list, หรือประโยคที่มีคำกริยาเชิงบังคับ เช่น "ต้อง", "ห้าม", "ให้", "กำหนดให้"
- name ให้เป็นประโยคสั้น 1 บรรทัด บอก “ต้องทำอะไร” + เงื่อนเวลา/เกณฑ์สำคัญ (ถ้ามี)
- description ให้ขยายรายละเอียด: เงื่อนไข ข้อยกเว้น ผู้รับผิดชอบ ช่องทางรายงาน นิยาม/ช่วงเวลา หรือหลักฐานที่ต้องเก็บ

รูปแบบผลลัพธ์ (ต้องเป็น JSON parse ได้เท่านั้น ห้ามมีข้อความอื่น):
{
  "Law/Regulation Name": "<เลขประกาศ> <เรื่องประกาศ>",
  "Source Type": "กฎเกณฑ์|กฎหมาย",
  "หน่วยงาน Regulator": "ธนาคารแห่งประเทศไทย (ธปท.)|สำนักงานป้องกันและปราบปรามการฟอกเงิน (ปปง.)|สำนักงานคณะกรรมการกำกับหลักทรัพย์และตลาดหลักทรัพย์ (ก.ล.ต.)|สำนักงานคณะกรรมการกำกับและส่งเสริมการประกอบธุรกิจประกันภัย (คปภ.)|สำนักงานคณะกรรมการป้องกันและปราบปรามการทุจริตแห่งชาติ (ป.ป.ช.)|สถาบันคุ้มครองเงินฝาก (สคฝ.)|คณะกรรมการข้อมูลเครดิต|สำนักงานคณะกรรมการคุ้มครองผู้บริโภค (สคบ./OCPB)|สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ (สกมช./NCSA)|กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม - สำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (สพธอ./ETDA)|กรมสรรพากร|สำนักงานเศรษฐกิจการคลัง สังกัดกระทรวงการคลัง|อื่นๆ",
  "ชื่อหน่วยงาน Regulator (กรณีไม่มีในตัวเลือก)": "<ระบุชื่อหน่วยงาน หรือ 'ไม่พบข้อมูล'>",
  "Regulator Name": "<ชื่อหน่วยงานสั้น>",
  "วันที่ประกาศ": "<วันที่ตามต้นฉบับ หรือ 'ไม่ระบุ'>",
  "วันที่มีผลบังคับใช้": "<วันที่ตามต้นฉบับ หรือ 'ไม่ระบุ'>",
  "วัตถุประสงค์ของกฎหมาย/กฎเกณฑ์/ประกาศ": "ข้อความสรุป",
  "สรุปสาระสำคัญที่เปลี่ยนแปลง": ["ข้อ...", "ข้อ..."] หรือ 'ไม่ระบุ,
  "ช่องทางการรับทราบการเปลี่ยนแปลง": "Email จาก Regulator|จดหมาย/หนังสือราชการ|Website ของ Regulator|ไม่ระบุ|อื่นๆ",
  "รายละเอียดช่องทางการรับทราบ (เมื่อเลือก \"อื่นๆ\")": "<รายละเอียด หรือ 'ไม่พบข้อมูล'>",
  "URL ของกฎหมาย/กฎเกณฑ์ที่เปลี่ยนแปลง (เมื่อช่องทางการรับทราบการเปลี่ยนแปลงเป็น Website ของ Regulator )": "<URL หรือ 'ไม่พบข้อมูล'>",
  "ผลกระทบ/สิ่งที่ธนาคารต้องดาเนินการ": "มีผลกระทบ/มีสิ่งที่ธนาคารต้องดำเนินการ|ไม่มีผลกระทบ/ไม่มีสิ่งที่ธนาคารต้องดำเนินการ|ธนาคารยังไม่มีธุรกิจ/ธุรกรรม",
  "รายละเอียดผลกระทบ/สิ่งที่ธนาคารต้องดำเนินการ (เมื่อมีผลกระทบ/มีสิ่งที่ธนาคารต้องดาเนินการ)": ["รายการ...", "รายการ..."] หรือ 'ไม่ระบุ,
  "ความซับซ้อน": ใส่คำว่า 'โปรดระบุ',

  "Citation Name": ["ชื่อหลักเกณฑ์ย่อย 1", "ชื่อหลักเกณฑ์ย่อย 2", "..."],
  "Citation Description": ["คำอธิบาย/รายละเอียดของข้อ 1", "คำอธิบาย/รายละเอียดของข้อ 2", "..."],

  "Compliance Group":  ใส่คำว่า 'โปรดระบุ',
  "Compliance Risk Area":  ใส่คำว่า 'โปรดระบุ',
  "วันที่กฎหมาย/กฎเกณฑ์กำหนดให้ดาเนินการแล้วเสร็จ": "<วันที่หรือ 'ไม่พบข้อมูล'>",
  "โทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์": "Composite Rating|โทษปรับ|โทษอาญา/จำคุก|ระงับใบอนุญาตประกอบธุรกิจชั่วคราว|ยกเลิก/เพิกถอนใบอนุญาตประกอบธุรกิจ|ไม่มีโทษ/ผลกระทบ|อื่นๆ",
  "โทษปรับสูงสุด (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น \"โทษปรับ\")": "<จำนวนเงินหรือ 'ไม่ระบุ'>",
  "โทษปรับรายวัน (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น \"โทษปรับ\")": "<จำนวนเงินหรือ 'ไม่ระบุ'>",
  "โทษจำคุกสูงสุด (เมื่อเลือกโทษ/ผลกระทบกรณีไม่ปฏิบัติตามกฎหมาย/กฎเกณฑ์ เป็น \"โทษอาญา/จำคุก \")": "<เดือนหรือปี ให้กรอกช่องที่เกี่ยวข้อง อีกช่องใส่ 'ไม่ระบุ'>",
  "Risk Owner Management Organization": ใส่คำว่า 'โปรดระบุ',
  "Process":  ใส่คำว่า 'โปรดระบุ',
  "สิ่งที่ Risk Owner ต้องดำเนินการ": "ประเมิน Gap Analysis และจัดทำ Action Plan (ถ้ามี)|ทบทวน Gap Analysis และ/หรือ Action Plan เนื่องจากมีการเปลี่ยนแปลง/ยกเลิกกฎเกณฑ์|ไม่ต้องดำเนินการ"
}

ข้อกำหนดทั่วไป:
- ถ้าไม่พบข้อมูลบางคีย์ ให้ใส่ "ไม่พบข้อมูล"
- ต้องรักษาความยาวของ "Citation Name" และ "Citation Description" ให้เท่ากันเสมอ โดย mapping จาก "Citations"
- ห้ามมีอักขระควบคุม/คอมเมนต์/ข้อความนอก JSON
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
