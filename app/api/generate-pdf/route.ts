export const dynamic = "force-dynamic"; // Disable static rendering

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generatePDF } from '@/utils/generatePDF'; // Adjusted import path

// Initialize Supabase securely using env vars
// Debug environment variables
console.log('PDF API Environment check:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  envKeys: Object.keys(process.env).filter(key => !key.includes('KEY') && !key.includes('TOKEN'))
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Handle PDF generation and direct download
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { summary, formattedSummary, options } = body;
    
    // Input validation
    if (!summary || typeof summary !== 'object') {
      console.error('[PDF API] summary missing or not an object:', summary);
      return NextResponse.json({ error: 'Missing or invalid summary object' }, { status: 400 });
    }

    if (!formattedSummary || typeof formattedSummary !== 'string') {
      console.error('[PDF API] formattedSummary missing or not a string:', formattedSummary);
      return NextResponse.json({ error: 'Missing formatted summary string' }, { status: 400 });
    }

    const caseId = summary.caseId || `CASE-${Date.now()}`;
    const filename = `proofai-report-${caseId}.pdf`;

    // Generate PDF
    console.log('[PDF API] Generating PDF for case:', caseId);
    if (summary.location) {
      console.log('[PDF API] Location:', summary.location);
    }
    
    // Debug log transcript and language data
    console.log('[PDF API] Transcript data check:', {
      hasTranscript: !!summary.transcript,
      transcriptLength: summary.transcript?.length || 0,
      hasOriginalTranscript: !!summary.originalTranscript,
      originalTranscriptLength: summary.originalTranscript?.length || 0,
      language: summary.language || 'Not specified',
    });
    
    // If transcript available, log excerpt
    if (summary.transcript && summary.transcript.length > 0) {
      console.log('[PDF API] Transcript excerpt:', summary.transcript.substring(0, 100) + '...');
    }
    
    // If original transcript available, log excerpt
    if (summary.originalTranscript && summary.originalTranscript.length > 0) {
      console.log('[PDF API] Original transcript excerpt:', summary.originalTranscript.substring(0, 100) + '...');
    }
    
    const pdfBuffer = Buffer.from(
      await generatePDF({
        content: formattedSummary,
        caseId,
        generatedBy: 'ProofAI Whisper Bot',
        options: options || {},
        structuredSummary: summary
      })
    );
    
    console.log('[PDF API] PDF buffer length:', pdfBuffer.length);

    // Return PDF directly for download
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });

  } catch (error: any) {
    console.error('[PDF API] PDF generation error:', error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
