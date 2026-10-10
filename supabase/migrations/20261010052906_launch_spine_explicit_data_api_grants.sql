-- Launch-domain Data API grants.
-- Keep client table verbs narrower than RLS itself and grant service_role
-- explicit CRUD without TRUNCATE / REFERENCES / TRIGGER.

revoke all on table
  public.appointments,
  public.notifications,
  public.payments,
  public.project_conversations,
  public.project_documents,
  public.project_measurements,
  public.project_members,
  public.project_milestones,
  public.projects,
  public.properties,
  public.property_record_entries,
  public.quote_items,
  public.quote_requests,
  public.quotes,
  public.saved_materials,
  public.signoffs,
  public.studio_designs,
  public.variations,
  public.warranties
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.properties,
  public.quotes,
  public.quote_items,
  public.project_milestones,
  public.appointments,
  public.variations,
  public.warranties,
  public.studio_designs,
  public.project_measurements
to authenticated;

grant select, insert, update on table public.quote_requests to authenticated;
grant select, update on table public.projects to authenticated;

grant select, insert, delete on table
  public.project_members,
  public.project_documents,
  public.project_conversations,
  public.property_record_entries,
  public.saved_materials
to authenticated;

grant select, insert on table public.signoffs to authenticated;
grant select on table public.payments, public.notifications to authenticated;

grant select, insert, update, delete on table
  public.appointments,
  public.notifications,
  public.payments,
  public.project_conversations,
  public.project_documents,
  public.project_measurements,
  public.project_members,
  public.project_milestones,
  public.projects,
  public.properties,
  public.property_record_entries,
  public.quote_items,
  public.quote_requests,
  public.quotes,
  public.saved_materials,
  public.signoffs,
  public.studio_designs,
  public.variations,
  public.warranties
to service_role;

revoke truncate, references, trigger on table
  public.appointments,
  public.notifications,
  public.payments,
  public.project_conversations,
  public.project_documents,
  public.project_measurements,
  public.project_members,
  public.project_milestones,
  public.projects,
  public.properties,
  public.property_record_entries,
  public.quote_items,
  public.quote_requests,
  public.quotes,
  public.saved_materials,
  public.signoffs,
  public.studio_designs,
  public.variations,
  public.warranties
from anon, authenticated, service_role;
