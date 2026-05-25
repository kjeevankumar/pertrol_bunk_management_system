import { NextRequest, NextResponse } from 'next/server';
import { processOperationalIntelligence } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const result = await processOperationalIntelligence();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Engine failed' }, { status: 500 });
  }
}
