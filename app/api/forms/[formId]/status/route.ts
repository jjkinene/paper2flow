import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type DbStatus = 'draft' | 'processing' | 'review' | 'failed' | 'published' | 'unpublished';
type ApiStatus = 'pending' | 'processing' | 'ready' | 'failed';

function mapStatus(dbStatus: DbStatus): ApiStatus {
  switch (dbStatus) {
    case 'review':
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
    .select('id, owner_id, status, error_message')
    .eq('id', formId)
    .single();

  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 400 });
  }

  if (form.owner_id !== user.id) {
    return NextResponse.json({ error: 'Form not found' }, { status: 400 });
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
