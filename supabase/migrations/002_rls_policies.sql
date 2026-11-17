-- forms: owner can read/write their own rows
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON forms
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "public_read_published_forms" ON forms
  FOR SELECT USING (status = 'published');

-- fields: derived from form ownership
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON fields
  USING (
    EXISTS (SELECT 1 FROM forms WHERE forms.id = fields.form_id AND forms.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM forms WHERE forms.id = fields.form_id AND forms.owner_id = auth.uid())
  );
CREATE POLICY "public_read_published_fields" ON fields
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM forms WHERE forms.id = fields.form_id AND forms.status = 'published')
  );

-- responses: owner can read; anyone can insert into published forms
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read" ON responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM forms WHERE forms.id = responses.form_id AND forms.owner_id = auth.uid())
  );
CREATE POLICY "public_insert" ON responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM forms WHERE forms.id = responses.form_id AND forms.status = 'published')
  );
