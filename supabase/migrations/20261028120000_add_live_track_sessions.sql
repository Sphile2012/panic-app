begin;

create or replace function public.start_track(
  p_lat double precision, p_lng double precision, p_accuracy real
) returns text
language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare
  tracking_token text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90
     or p_lng is null or p_lng < -180 or p_lng > 180
     or (p_accuracy is not null and (
       p_accuracy < 0 or p_accuracy in ('NaN'::real, 'Infinity'::real, '-Infinity'::real)
     )) then
    raise exception using errcode = '22023', message = 'Invalid tracking data';
  end if;

  delete from public.live_tracks where updated_at < now() - interval '24 hours';
  tracking_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.live_tracks (token, user_id, lat, lng, accuracy, updated_at)
  values (tracking_token, auth.uid(), p_lat, p_lng, p_accuracy, now());
  return tracking_token;
end;
$$;

revoke all on function public.start_track(double precision, double precision, real) from public, anon, authenticated;
grant execute on function public.start_track(double precision, double precision, real) to authenticated;

commit;
