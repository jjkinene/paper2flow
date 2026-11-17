-- Administrators are Supabase Auth users; no extra users table needed.

CREATE TABLE forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  slug          text UNIQUE,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'processing', 'review', 'failed', 'published', 'unpublished')),
  source_path   text,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  label           text NOT NULL,
  field_type      text NOT NULL
                    CHECK (field_type IN ('text','number','date','checkbox','radio','textarea')),
  placeholder     text NOT NULL DEFAULT '',
  required        boolean NOT NULL DEFAULT false,
  options         jsonb,
  confidence      numeric(4,3),
  confirmed       boolean NOT NULL DEFAULT false,
  UNIQUE (form_id, position)
);

CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid NOT NULL REFERENCES forms(id),
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  payload         jsonb NOT NULL
);

-- Indexes
CREATE INDEX ON forms (owner_id);
CREATE INDEX ON fields (form_id, position);
CREATE INDEX ON responses (form_id, submitted_at DESC);
