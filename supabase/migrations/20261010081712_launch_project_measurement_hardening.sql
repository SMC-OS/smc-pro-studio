drop policy if exists measurements_insert on public.project_measurements;
create policy measurements_insert
on public.project_measurements
for insert to authenticated
with check (
  created_by=(select auth.uid())
  and private.is_project_member(project_id)
  and (
    (
      source in ('manual'::public.measurement_source,'assisted'::public.measurement_source)
      and is_survey_grade=false
    )
    or private.can_manage_project(project_id)
  )
);

drop policy if exists measurements_update on public.project_measurements;
create policy measurements_update
on public.project_measurements
for update to authenticated
using (
  created_by=(select auth.uid())
  or private.can_manage_project(project_id)
)
with check (
  private.is_project_member(project_id)
  and (
    (
      source in ('manual'::public.measurement_source,'assisted'::public.measurement_source)
      and is_survey_grade=false
    )
    or private.can_manage_project(project_id)
  )
);
