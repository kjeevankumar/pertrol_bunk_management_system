import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function generateFallbackInsights(context: any) {
  const insights = [];
  
  if (context && context.fuel) {
    const lowFuel = context.fuel.filter((f: any) => f.current <= f.min);
    if (lowFuel.length > 0) {
      insights.push({
        type: 'inventory',
        title: 'Critical Fuel Levels',
        description: `Refill required for: ${lowFuel.map((f: any) => f.type).join(', ')}. Levels are below minimum threshold.`,
        severity: 'critical'
      });
    }
  }

  if (context && context.sales && context.sales.revenue === 0) {
    insights.push({
      type: 'revenue',
      title: 'No Sales Activity',
      description: 'Zero transactions recorded today. Check pump connectivity or manual logging.',
      severity: 'high'
    });
  }

  return { insights, fraud: [], predictions: [] };
}

export async function processOperationalIntelligence() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  let context: any = null;

  try {
    // 1. Fetch data for analysis
    const [
      { data: sales },
      { data: expenses },
      { data: fuel },
      { data: attendance }
    ] = await Promise.all([
      supabase.from('sales').select('*').gte('created_at', today),
      supabase.from('expenses').select('*').gte('date', today),
      supabase.from('fuel_stock').select('*'),
      supabase.from('attendance').select('*').eq('date', today)
    ]);

    context = {
      sales: {
        revenue: sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        count: sales?.length || 0,
      },
      expenses: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      fuel: fuel?.map(f => ({ type: f.fuel_type, current: f.current_stock, min: f.min_alert_level })),
      attendance: {
        present: attendance?.filter(a => a.status === 'present').length || 0,
        late: attendance?.filter(a => a.status === 'late').length || 0,
      }
    };

    let aiOutput: any = null;

    // 2. Prioritize Groq JSON Mode (fast, precise, OpenAI-compatible JSON schema)
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
              {
                role: "system",
                content: "You are an AI Operations Analyst for SmartFuel Petrol Bunk. You must analyze the operational metrics and return a JSON object with: 1. 'insights' (array of objects with type, title, description, severity), 2. 'fraud' (array of objects with type, description, risk_level), 3. 'predictions' (array of objects with type, value, confidence). Return only a valid JSON block."
              },
              {
                role: "user",
                content: `Analyze this data: ${JSON.stringify(context)}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const responseText = data.choices[0].message.content.trim();
          aiOutput = JSON.parse(responseText);
        } else {
          console.warn("Groq JSON API returned error, falling back to Gemini:", groqResponse.status);
        }
      } catch (groqError) {
        console.error("Groq JSON generation failed, trying Gemini:", groqError);
      }
    }

    // 3. Fallback to Gemini if Groq did not complete
    if (!aiOutput) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        As an AI Operations Analyst for SmartFuel Petrol Bunk, analyze this data and return a JSON object with:
        1. 'insights': Array of objects { type, title, description, severity } (limit 2)
        2. 'fraud': Array of objects { type, description, risk_level } (only if anomalies detected)
        3. 'predictions': Array of objects { type, value, confidence } (e.g., fuel_demand, sales_forecast)

        DATA: ${JSON.stringify(context)}
        
        IMPORTANT: Return ONLY the JSON.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanedJson = responseText.replace(/```json|```/g, "").trim();
      aiOutput = JSON.parse(cleanedJson);
    }

    const { data: branch } = await supabase.from('branches').select('id').limit(1).single();

    // 4. Save Insights
    if (aiOutput.insights) {
      for (const insight of aiOutput.insights) {
        await supabase.from('ai_insights').insert({
          branch_id: branch?.id,
          insight_type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity || 'info'
        });
      }
    }

    // 5. Save Fraud Alerts
    if (aiOutput.fraud) {
      for (const f of aiOutput.fraud) {
        await supabase.from('fraud_alerts').insert({
          branch_id: branch?.id,
          fraud_type: f.type,
          risk_level: f.risk_level || 'medium',
          description: f.description,
          status: 'pending'
        });
      }
    }

    // 6. Save Predictions
    if (aiOutput.predictions) {
      for (const p of aiOutput.predictions) {
        await supabase.from('ai_predictions').insert({
          branch_id: branch?.id,
          prediction_type: p.type,
          prediction_value: { value: p.value },
          confidence_score: p.confidence || 0.8,
          target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Predicted for tomorrow
        });
      }
    }

    return { success: true, analysis: aiOutput };
  } catch (error) {
    console.error('Intelligence Engine Error:', error);
    
    // Fallback logic for production stability
    try {
      const fallback = generateFallbackInsights(context);
      const { data: branch } = await supabase.from('branches').select('id').limit(1).single();
      
      if (fallback.insights.length > 0) {
        for (const insight of fallback.insights) {
          await supabase.from('ai_insights').insert({
            branch_id: branch?.id,
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            severity: insight.severity
          });
        }
      }
      return { success: true, analysis: fallback, mode: 'fallback' };
    } catch (fallbackError) {
      return { success: false, error: fallbackError };
    }
  }
}
