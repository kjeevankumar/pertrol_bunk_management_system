import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";

    return NextResponse.json({
      success: true,
      diagnostics: {
        groq_key_configured: groqKey.length > 0,
        groq_key_length: groqKey.length,
        groq_key_prefix: groqKey ? groqKey.substring(0, 7) : "none",
        gemini_key_configured: geminiKey.length > 0,
        gemini_key_length: geminiKey.length,
        gemini_key_prefix: geminiKey ? geminiKey.substring(0, 7) : "none",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
