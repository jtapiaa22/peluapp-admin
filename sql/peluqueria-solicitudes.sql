-- PeluApp: activación remota de licencia. Correr una sola vez en el SQL Editor de Supabase.
-- Mismo patrón que sql/kioscoapp.sql (tabla kioscoapp_solicitudes) pero adaptado a que PeluApp
-- activa con un archivo .lic (base64) en vez de una clave de texto pegada.

create table if not exists peluqueria_solicitudes (
    id              bigint generated always as identity primary key,
    peluqueria      text not null,
    nombre_contacto text,
    contacto        text,
    telefono        text,
    machine_id      text not null,
    nombre_maquina  text,
    estado          text not null default 'pendiente' check (estado in ('pendiente', 'activada', 'rechazada')),
    lic_base64      text,
    desde           date,
    vence           date,
    creada_en       timestamptz not null default now(),
    resuelta_en     timestamptz
);

create index if not exists idx_peluqueria_solicitudes_machine on peluqueria_solicitudes (machine_id);
create index if not exists idx_peluqueria_solicitudes_estado on peluqueria_solicitudes (estado);

alter table peluqueria_solicitudes enable row level security;

drop policy if exists "peluqueria anon puede crear solicitud" on peluqueria_solicitudes;

create policy "peluqueria anon puede crear solicitud"
on peluqueria_solicitudes for insert
to anon
with check (estado = 'pendiente' and lic_base64 is null);

-- Sin policies de select/update/delete para anon: quedan denegadas por defecto con RLS
-- activado. El panel admin sigue usando la service_role key (bypassea RLS) para todo eso.

-- Devuelve también "peluqueria" (a diferencia de kioscoapp_estado_solicitud) para que la app
-- pueda precargar el nombre del negocio al activar, ya que el archivo .lic firmado no lo incluye.
create or replace function public.peluqueria_estado_solicitud(p_machine_id text)
returns table(estado text, lic_base64 text, desde date, vence date, peluqueria text)
language sql
security definer
set search_path = public
as $$
    select estado, lic_base64, desde, vence, peluqueria
    from peluqueria_solicitudes
    where machine_id = p_machine_id
    order by creada_en desc
    limit 1
$$;

grant execute on function public.peluqueria_estado_solicitud(text) to anon;
