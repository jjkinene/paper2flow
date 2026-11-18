-- RELEASE 1.1 / STAGE 1 (ADDITIVE)
-- Run this in the Supabase SQL Editor BEFORE deploying the new server code.
-- Do not remove the existing public_insert policy yet: the currently live app
-- must continue to accept submissions until the upgraded code is deployed.

CREATE TABLE IF NOT EXISTS public.public_submit_limits (
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  identity_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  submission_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (form_id, identity_hash, window_start)
);

ALTER TABLE public.public_submit_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_submit_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_response(
  p_form_id uuid,
  p_payload jsonb,
  p_identity_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_identity_hash IS NULL OR p_identity_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN 'rate_limited';
  END IF;

  -- SHARE lock prevents unpublish from racing between the check and insert.
  PERFORM 1 FROM public.forms
    WHERE id = p_form_id AND status = 'published'
    FOR SHARE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  v_window := to_timestamp(floor(extract(epoch FROM now()) / 600) * 600);

  INSERT INTO public.public_submit_limits
    (form_id, identity_hash, window_start, submission_count)
  VALUES (p_form_id, p_identity_hash, v_window, 1)
  ON CONFLICT (form_id, identity_hash, window_start)
  DO UPDATE SET submission_count = public.public_submit_limits.submission_count + 1
  RETURNING submission_count INTO v_count;

  -- 100 accepted responses per 10 minutes per detected source and form.
  IF v_count > 100 THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO public.responses (form_id, payload)
    VALUES (p_form_id, p_payload);

  RETURN 'submitted';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_response(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_response(uuid, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_response(uuid, jsonb, text) TO service_role;

-- The limits table should be cleaned periodically once traffic grows:
-- DELETE FROM public.public_submit_limits
--   WHERE window_start < now() - interval '7 days';
