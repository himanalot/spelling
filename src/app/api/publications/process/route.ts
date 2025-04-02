import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/r2r-client';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { publicationUrl } = await request.json();
    const supabase = createClient();
    const r2rClient = await getAuthenticatedClient();

    // Process publication with R2R
    const response = await r2rClient.rag({
      query: `Analyze this research publication: ${publicationUrl}`,
      rag_generation_config: {
        model: "openai/gpt-4o",
        temperature: 0.0,
        stream: false,
      }
    });

    // Extract key information from the RAG response
    const analysis = response.results.completion.choices[0].message.content;

    // Store in Supabase
    const { data, error } = await supabase
      .from('publications')
      .insert({
        url: publicationUrl,
        analysis,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data 
    });

  } catch (error) {
    console.error('Error processing publication:', error);
    return NextResponse.json(
      { error: 'Failed to process publication' },
      { status: 500 }
    );
  }
} 