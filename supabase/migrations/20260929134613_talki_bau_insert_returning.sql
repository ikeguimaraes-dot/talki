-- INSERT ... RETURNING checks SELECT policies before a STABLE lookup can
-- see the inserted row. Check ownership on the row itself for its owner.
alter policy bau_entries_read on public.talki_bau_entries
using (owner_id = (select auth.uid()) or talki_private.bau_can_read(id));
