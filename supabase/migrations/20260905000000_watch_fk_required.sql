-- The watch on a ticket is a catalog row, not free text.
--
-- The initial schema carried a nullable watch_id next to a watch_model text
-- column, mirroring the old app where customers typed the model into a web
-- form. Staff-created tickets pick from the catalog, so the FK is required.
-- The text column survives only as the customer's own description from a
-- web submission (nullable, display-only) so nothing typed is lost.

alter table tickets rename column watch_model to customer_watch_description;
comment on column tickets.customer_watch_description is
  'What the customer typed on the web form, before matching. Display only; the watch is watch_id.';

alter table tickets alter column watch_id set not null;
create index tickets_watch on tickets (watch_id);
