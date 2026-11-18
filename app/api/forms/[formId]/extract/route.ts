import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runExtractionPipeline } from '@/lib/extraction/pipeline';

// The route needs enough time to finish extraction and store a failure status.
// Deploying platforms must also permit this function duration.
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(
  _request: NextRequest,
  { params }: { params: { formId: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Atomically claim a newly uploaded form. Only the first request transitions
  // draft → processing; later tabs or retries will not duplicate AI charges.
  const { data: claimed, error: claimError } = await supabase
    .from('forms')
    .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', params.formId)
    .eq('owner_id', user.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();

  if (claimError) {
    console.error('Could not claim extraction:', claimError);
    return NextResponse.json({ error: 'Could not start extraction' }, { status: 500 });
  }

  if (!claimed) {
    const { data: form } = await supabase.from('forms')
      .select('status')
      .eq('id', params.formId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    // Another request may already be processing or extraction may be complete.
    return NextResponse.json({ status: form.status }, { status: 202 });
  }

  try {
    await runExtractionPipeline(params.formId);
    return NextResponse.json({ status: 'ready' });
  } catch (error) {
    // runExtractionPipeline records `failed` and the error in Supabase.
    console.error('Paper2Flow extraction error:', error);
    return NextResponse.json(
      { error: 'Extraction failed. Please check the status screen for details.' },
      { status: 500 },
    );
  }
}
