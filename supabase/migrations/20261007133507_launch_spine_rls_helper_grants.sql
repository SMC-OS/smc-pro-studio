grant execute on function private.is_active_project_staff() to authenticated, service_role;
grant execute on function private.is_project_member(uuid) to authenticated, service_role;
grant execute on function private.can_manage_project(uuid) to authenticated, service_role;
grant execute on function private.can_access_property(uuid) to authenticated, service_role;
grant execute on function private.can_access_quote(uuid) to authenticated, service_role;
grant execute on function private.is_project_member_path(text) to authenticated, service_role;
grant execute on function private.can_manage_project_path(text) to authenticated, service_role;
revoke all on function private.touch_updated_at() from public;
