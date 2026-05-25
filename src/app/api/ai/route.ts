import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are the SmartFuel OS AI Assistant, an enterprise operations intelligence engine for a petrol bunk management platform. 
You are speaking to the station manager.
Be professional, highly analytical, and concise. Your goal is to provide actionable business intelligence.
You have access to the live database snapshot below. USE THIS EXACT DATA to answer the user's questions accurately. Do not make up data if it is provided below.

=== REALTIME DATABASE SNAPSHOT ===
${JSON.stringify(context, null, 2)}
===================================

Analyze the data and answer the following request from the manager.`;

    // 1. Prioritize Groq (lightning fast, reliable)
    if (process.env.GROQ_API_KEY) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Manager Request: ${prompt}` }
            ],
            temperature: 0.2
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const responseText = data.choices[0].message.content;
          return NextResponse.json({ response: responseText });
        } else {
          console.warn("Groq API returned non-200, falling back to Gemini:", groqResponse.status);
        }
      } catch (groqError) {
        console.error("Groq call failed, falling back to Gemini:", groqError);
      }
    }

    // 2. Gemini Fallback
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Neither Groq nor Gemini API keys are configured.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${systemPrompt}\n\nManager Request: ${prompt}`);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error in AI API Route:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response.' },
      { status: 500 }
    );
  }
}
