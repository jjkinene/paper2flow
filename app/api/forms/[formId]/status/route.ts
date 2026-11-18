import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type DbStatus = 'draft' | 'processing' | 'review' | 'failed' | 'published' | 'unpublished';
type ApiStatus = 'pending' | 'processing' | 'ready' | 'failed';

function mapStatus(dbStatus: DbStatus): ApiStatus {
  switch (dbStatus) {
    case 'review':
    case 'published':
    case 'unpublished':
      return 'ready';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'failed';
    case 'draft':
    default:
      return 'pending';
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { formId: string } }
) {
  const { formId } = params;

  const supabase = createSupabaseServerClient();

  const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, owner_id, status, error_message, updated_at')
    .eq('id', formId)
    .single();

  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  if (form.owner_id !== user.id) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // If the processing request was terminated by the host (for example on a
  // serverless timeout), surface a failure instead of spinning forever.
  // A real extraction is bounded to 120s, so 210s leaves a safety margin.
  const staleBefore = new Date(Date.now() - 210_000).toISOString();
  if (form.status === 'processing' && form.updated_at < staleBefore) {
    const { data: failed, error: timeoutError } = await supabase.from('forms')
      .update({ status: 'failed', error_message: 'Extraction timed out. Please upload the document again.', updated_at: new Date().toISOString() })
      .eq('id', formId)
      .eq('owner_id', user.id)
      .eq('status', 'processing')
      .lt('updated_at', staleBefore)
      .select('id')
      .maybeSingle();
    if (timeoutError) {
      console.error('Failed to expire stale extraction', timeoutError);
    } else if (failed) {
      return NextResponse.json({ status: 'failed', error: 'Extraction timed out. Please upload the document again.' });
    }
  }

  const apiStatus = mapStatus(form.status as DbStatus);

  if (apiStatus === 'ready') {
    const { count, error: countError } = await supabase
      .from('fields')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', formId);

    if (countError) {
      return NextResponse.json({ error: 'Failed to count fields' }, { status: 500 });
    }

    return NextResponse.json({ status: apiStatus, fieldCount: count ?? 0 });
  }

  return NextResponse.json({ status: apiStatus, ...(apiStatus === 'failed' ? { error: form.error_message } : {}) });
}
