-- KioscoApp: tablas nuevas + bucket de backups. Correr una sola vez en el SQL Editor de Supabase.
-- No toca ninguna tabla de PeluApp (licencias_vendidas, pagos, etc.) — todo separado.

-- ── Tablas ────────────────────────────────────────────────────────────────

create table if not exists kioscoapp_licencias (
    id             bigint generated always as identity primary key,
    kiosco         text not null,
    nombre_contacto text,
    contacto       text,
    telefono       text,
    machine_id     text not null,
    nombre_maquina text,
    desde          date not null,
    vence          date not null,
    licencia_key   text not null,
    notas          text,
    precio         numeric,
    creada_en      timestamptz not null default now()
);

create index if not exists idx_kioscoapp_licencias_kiosco on kioscoapp_licencias (kiosco);
create index if not exists idx_kioscoapp_licencias_machine on kioscoapp_licencias (machine_id);

create table if not exists kioscoapp_pagos (
    id         bigint generated always as identity primary key,
    kiosco     text not null,
    monto      numeric not null,
    pagado_en  date not null,
    metodo     text not null default 'Transferencia',
    nota       text
);

create index if not exists idx_kioscoapp_pagos_kiosco on kioscoapp_pagos (kiosco);

-- RLS: estas tablas solo se tocan desde las API routes de peluapp-admin, que usan la
-- service_role key (bypassea RLS). No hace falta abrir políticas para anon/authenticated.
alter table kioscoapp_licencias enable row level security;
alter table kioscoapp_pagos enable row level security;

-- ── Storage: bucket de backups ───────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('kioscoapp-backups', 'kioscoapp-backups', false)
on conflict (id) do nothing;

-- La app (con la clave "anon") puede subir/pisar su propio backup. No puede borrar nada.
-- Las descargas reales (bajar el contenido) desde el panel usan la service_role key
-- (server-side, ignora RLS) con una signed URL temporal — eso sigue protegido.
--
-- El "select" de acá abajo NO es opcional: el Storage API de Supabase hace un
-- `INSERT ... RETURNING *` al subir un archivo, y sin una política de select que cubra esa
-- fila, el RETURNING falla por RLS y toda la subida se rechaza con un 403 genérico aunque el
-- insert en sí esté permitido (ver https://supabase.com/docs/guides/troubleshooting/storage-error-403-forbidden-new-row-violates-row-level-security-policy-on-upload-a94384).
-- Costo de seguridad: con esto, cualquiera con la anon key embebida en el instalador podría
-- listar los machineId/nombres de archivo del bucket (no su contenido). Trade-off aceptado
-- para un v1 — igual que ya no puede leer el contenido de ningún backup ajeno.
--
-- El select de storage.buckets también hace falta: sin él, el Storage API no puede ni
-- siquiera confirmar que el bucket existe/su configuración, y falla con el mismo 403 genérico.
--
-- (drop + create para que este script se pueda volver a correr sin romper si ya existían)
drop policy if exists "kioscoapp anon puede subir backups" on storage.objects;
drop policy if exists "kioscoapp anon puede sobreescribir su backup" on storage.objects;
drop policy if exists "kioscoapp anon puede ver metadatos de su bucket" on storage.objects;
drop policy if exists "kioscoapp puede ver el bucket de backups" on storage.buckets;

create policy "kioscoapp anon puede subir backups"
on storage.objects for insert
to anon
with check (bucket_id = 'kioscoapp-backups');

create policy "kioscoapp anon puede sobreescribir su backup"
on storage.objects for update
to anon
using (bucket_id = 'kioscoapp-backups')
with check (bucket_id = 'kioscoapp-backups');

create policy "kioscoapp anon puede ver metadatos de su bucket"
on storage.objects for select
to public
using (bucket_id = 'kioscoapp-backups');

create policy "kioscoapp puede ver el bucket de backups"
on storage.buckets for select
to public
using (id = 'kioscoapp-backups');

-- ── Activación remota ────────────────────────────────────────────────────
-- El botón "Activar remotamente" de la pantalla de Licencia manda estos datos acá en vez
-- de que el cliente tenga que copiar/pegar el machineId a mano. A diferencia del bucket de
-- backups, esta tabla tiene nombre/teléfono/mail de clientes reales — por eso NO se le da
-- SELECT abierto a "anon" (cualquiera con la anon key embebida en el instalador podría listar
-- clientes ajenos). Solo puede insertar su propia solicitud; para consultar el estado usa la
-- función RPC de más abajo, que solo expone la fila que coincide con SU machineId (que ya es
-- información que viaja por WhatsApp/mail hoy, así que no es un dato más sensible que agregar).

create table if not exists kioscoapp_solicitudes (
    id              bigint generated always as identity primary key,
    kiosco          text not null,
    nombre_contacto text,
    contacto        text,
    telefono        text,
    machine_id      text not null,
    nombre_maquina  text,
    estado          text not null default 'pendiente' check (estado in ('pendiente', 'activada', 'rechazada')),
    licencia_key    text,
    desde           date,
    vence           date,
    creada_en       timestamptz not null default now(),
    resuelta_en     timestamptz
);

create index if not exists idx_kioscoapp_solicitudes_machine on kioscoapp_solicitudes (machine_id);
create index if not exists idx_kioscoapp_solicitudes_estado on kioscoapp_solicitudes (estado);

alter table kioscoapp_solicitudes enable row level security;

drop policy if exists "kioscoapp anon puede crear solicitud" on kioscoapp_solicitudes;

create policy "kioscoapp anon puede crear solicitud"
on kioscoapp_solicitudes for insert
to anon
with check (estado = 'pendiente' and licencia_key is null);

-- Sin policies de select/update/delete para anon: quedan denegadas por defecto con RLS
-- activado. El panel admin sigue usando la service_role key (bypassea RLS) para todo eso.

create or replace function public.kioscoapp_estado_solicitud(p_machine_id text)
returns table(estado text, licencia_key text, desde date, vence date)
language sql
security definer
set search_path = public
as $$
    select estado, licencia_key, desde, vence
    from kioscoapp_solicitudes
    where machine_id = p_machine_id
    order by creada_en desc
    limit 1
$$;

grant execute on function public.kioscoapp_estado_solicitud(text) to anon;
