-- Lo que drizzle-kit no genera. Escrito a mano; idempotencia la da el registro de migraciones de Drizzle.

-- updated_at se mueve en CADA UPDATE (Postgres no tiene ON UPDATE CURRENT_TIMESTAMP).
-- search_path vacío: la función no resuelve nombres por un esquema que otro rol pudiera sembrar.
CREATE FUNCTION "public"."orders_set_updated_at"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders"
FOR EACH ROW EXECUTE FUNCTION "public"."orders_set_updated_at"();--> statement-breakpoint
-- Solo la usa el trigger (que no comprueba EXECUTE al dispararse); nadie la llama a mano.
REVOKE EXECUTE ON FUNCTION "public"."orders_set_updated_at"() FROM PUBLIC;--> statement-breakpoint

-- Default-deny: RLS activo y SIN políticas. El servidor conecta como el rol dueño (no le aplica RLS);
-- anon/authenticated (la llave pública de Supabase) no ven ni escriben ninguna fila.
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Supabase da privilegios por defecto a anon/authenticated en cada tabla nueva; se quitan.
-- Bloque condicional: en un Postgres sin esos roles (local, CI) la migración corre igual.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.orders FROM %I', r);
      EXECUTE format('REVOKE ALL ON SEQUENCE public.orders_order_number_seq FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.orders_set_updated_at() FROM %I', r);
    END IF;
  END LOOP;
END;
$$;
--> statement-breakpoint

-- statement_timeout de 15 s para el rol que conecta, solo en esta base. Va en el ROL y no en la conexión:
-- el pooler de transacción (6543) no conserva SET de sesión y puede no reenviar parámetros de arranque;
-- un ajuste de rol se aplica al abrir cada conexión del servidor, sin depender del estado de sesión.
-- scripts/migrate.mjs lo sube en su propia sesión (una DDL legítima puede tardar más).
DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I IN DATABASE %I SET statement_timeout = %L', current_user, current_database(), '15s');
  -- Un proceso congelado DENTRO de una transacción (p. ej. con el FOR UPDATE de completeFulfillment) suelta el lock a los 15 s.
  EXECUTE format('ALTER ROLE %I IN DATABASE %I SET idle_in_transaction_session_timeout = %L', current_user, current_database(), '15s');
END;
$$;
