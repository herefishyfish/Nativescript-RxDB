SET check_function_bodies = false;
CREATE FUNCTION public."set_current_timestamp_updatedAt"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updatedAt" = NOW();
  RETURN _new;
END;
$$;
CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.hero (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.hero
    ADD CONSTRAINT hero_pkey PRIMARY KEY (id);
CREATE TRIGGER "set_public_hero_updatedAt" BEFORE UPDATE ON public.hero FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_hero_updatedAt" ON public.hero IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
