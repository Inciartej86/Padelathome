--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.4 (Debian 17.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: account_status_enum; Type: TYPE; Schema: public; Owner: casaos
--

CREATE TYPE public.account_status_enum AS ENUM (
    'pending_approval',
    'active',
    'inactive'
);


ALTER TYPE public.account_status_enum OWNER TO casaos;

--
-- Name: booking_status_enum; Type: TYPE; Schema: public; Owner: casaos
--

CREATE TYPE public.booking_status_enum AS ENUM (
    'confirmed',
    'cancelled_by_user',
    'cancelled_by_admin'
);


ALTER TYPE public.booking_status_enum OWNER TO casaos;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: casaos
--

CREATE TYPE public.user_role_enum AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public.user_role_enum OWNER TO casaos;

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: casaos
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO casaos;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blocked_periods; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.blocked_periods (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    reason text,
    is_full_day boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.blocked_periods OWNER TO casaos;

--
-- Name: blocked_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.blocked_periods_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blocked_periods_id_seq OWNER TO casaos;

--
-- Name: blocked_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.blocked_periods_id_seq OWNED BY public.blocked_periods.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.bookings (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    user_id bigint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.booking_status_enum DEFAULT 'confirmed'::public.booking_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bookings OWNER TO casaos;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO casaos;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: buildings; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.buildings (
    id bigint NOT NULL,
    address character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.buildings OWNER TO casaos;

--
-- Name: buildings_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.buildings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buildings_id_seq OWNER TO casaos;

--
-- Name: buildings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.buildings_id_seq OWNED BY public.buildings.id;


--
-- Name: courts; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.courts (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.courts OWNER TO casaos;

--
-- Name: courts_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.courts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courts_id_seq OWNER TO casaos;

--
-- Name: courts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.courts_id_seq OWNED BY public.courts.id;


--
-- Name: instance_settings; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.instance_settings (
    setting_key character varying(255) NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.instance_settings OWNER TO casaos;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.password_reset_tokens (
    token text NOT NULL,
    user_id bigint NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO casaos;

--
-- Name: users; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    floor character varying(50),
    door character varying(50),
    phone_number character varying(50),
    role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL,
    account_status public.account_status_enum DEFAULT 'pending_approval'::public.account_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    building_id bigint
);


ALTER TABLE public.users OWNER TO casaos;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO casaos;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: blocked_periods id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.blocked_periods ALTER COLUMN id SET DEFAULT nextval('public.blocked_periods_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: buildings id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.buildings ALTER COLUMN id SET DEFAULT nextval('public.buildings_id_seq'::regclass);


--
-- Name: courts id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.courts ALTER COLUMN id SET DEFAULT nextval('public.courts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: blocked_periods; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.blocked_periods (id, court_id, start_time, end_time, reason, is_full_day, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.bookings (id, court_id, user_id, start_time, end_time, status, created_at, updated_at) FROM stdin;
1	1	1	2025-06-10 13:00:00+02	2025-06-10 14:00:00+02	cancelled_by_user	2025-06-06 11:40:41.784461+02	2025-06-06 14:48:04.879089+02
2	1	1	2025-06-06 10:00:00+02	2025-06-06 11:30:00+02	confirmed	2025-06-06 14:48:11.700844+02	2025-06-06 14:48:11.700844+02
3	1	1	2025-06-06 16:30:00+02	2025-06-06 18:00:00+02	cancelled_by_user	2025-06-06 14:48:33.184077+02	2025-06-06 14:48:43.188649+02
4	1	1	2025-06-06 19:00:00+02	2025-06-06 20:30:00+02	cancelled_by_user	2025-06-06 15:06:02.729045+02	2025-06-06 15:06:07.440162+02
5	1	1	2025-06-06 20:00:00+02	2025-06-06 21:30:00+02	cancelled_by_user	2025-06-06 15:08:55.480892+02	2025-06-06 15:09:06.026741+02
6	1	1	2025-06-06 17:00:00+02	2025-06-06 18:30:00+02	cancelled_by_user	2025-06-06 15:29:42.80345+02	2025-06-06 15:29:49.091371+02
7	1	1	2025-06-06 13:00:00+02	2025-06-06 14:30:00+02	confirmed	2025-06-06 15:32:06.539489+02	2025-06-06 15:32:06.539489+02
8	1	1	2025-06-06 18:00:00+02	2025-06-06 19:00:00+02	cancelled_by_user	2025-06-06 15:32:12.170302+02	2025-06-06 15:32:17.263739+02
9	1	1	2025-06-06 16:30:00+02	2025-06-06 18:00:00+02	cancelled_by_user	2025-06-06 16:39:09.01365+02	2025-06-06 16:39:22.519971+02
10	1	1	2025-06-06 11:30:00+02	2025-06-06 13:00:00+02	confirmed	2025-06-06 16:39:34.1215+02	2025-06-06 16:39:34.1215+02
11	1	1	2025-06-06 08:00:00+02	2025-06-06 09:00:00+02	confirmed	2025-06-06 22:22:46.322796+02	2025-06-06 22:22:46.322796+02
12	1	1	2025-06-06 14:30:00+02	2025-06-06 16:00:00+02	confirmed	2025-06-06 22:22:53.70152+02	2025-06-06 22:22:53.70152+02
13	1	1	2025-06-06 14:30:00+02	2025-06-06 16:00:00+02	confirmed	2025-06-06 22:22:57.538734+02	2025-06-06 22:22:57.538734+02
14	1	1	2025-06-06 16:00:00+02	2025-06-06 17:30:00+02	confirmed	2025-06-06 22:23:17.525081+02	2025-06-06 22:23:17.525081+02
15	1	1	2025-06-06 17:30:00+02	2025-06-06 19:00:00+02	confirmed	2025-06-06 22:23:21.570976+02	2025-06-06 22:23:21.570976+02
16	1	1	2025-06-06 09:00:00+02	2025-06-06 10:00:00+02	confirmed	2025-06-06 22:23:34.591324+02	2025-06-06 22:23:34.591324+02
17	1	1	2025-06-08 08:00:00+02	2025-06-08 09:30:00+02	confirmed	2025-06-08 14:25:24.410995+02	2025-06-08 14:25:24.410995+02
18	1	1	2025-06-08 17:00:00+02	2025-06-08 18:00:00+02	cancelled_by_user	2025-06-08 14:25:34.475805+02	2025-06-08 14:25:39.74037+02
19	1	1	2025-06-09 08:00:00+02	2025-06-09 09:00:00+02	confirmed	2025-06-09 17:59:14.486905+02	2025-06-09 17:59:14.486905+02
20	1	1	2025-06-09 09:00:00+02	2025-06-09 10:00:00+02	confirmed	2025-06-09 17:59:18.064936+02	2025-06-09 17:59:18.064936+02
21	1	1	2025-06-09 10:00:00+02	2025-06-09 11:00:00+02	confirmed	2025-06-09 18:05:41.069423+02	2025-06-09 18:05:41.069423+02
22	1	1	2025-06-09 20:00:00+02	2025-06-09 21:30:00+02	cancelled_by_user	2025-06-09 18:05:46.484896+02	2025-06-09 18:05:53.488505+02
\.


--
-- Data for Name: buildings; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.buildings (id, address, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: courts; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.courts (id, name, description, is_active, created_at, updated_at) FROM stdin;
1	Pista Central	Pista principal de cristal	t	2025-06-06 10:55:54.778326+02	2025-06-06 10:55:54.778326+02
2	Pista lateral	la pista que esta al lado2	t	2025-06-06 15:54:48.924901+02	2025-06-06 16:14:13.004489+02
\.


--
-- Data for Name: instance_settings; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.instance_settings (setting_key, setting_value, description, created_at, updated_at) FROM stdin;
community_name	Padel@Home (Default)	El nombre de la comunidad que se muestra en la app	2025-06-06 15:33:53.371367+02	2025-06-06 15:33:53.371367+02
operating_open_time	08:00	Hora de apertura de las pistas (formato HH:MM)	2025-06-06 15:33:53.371367+02	2025-06-06 15:33:53.371367+02
operating_close_time	22:00	Hora de cierre de las pistas (formato HH:MM)	2025-06-06 15:33:53.371367+02	2025-06-06 15:33:53.371367+02
booking_advance_days	7	Número de días de antelación para reservar	2025-06-06 15:33:53.371367+02	2025-06-06 15:33:53.371367+02
enable_booking_gap_optimization	true	Activa/desactiva la optimización de huecos	2025-06-06 15:33:53.371367+02	2025-06-06 15:33:53.371367+02
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.password_reset_tokens (token, user_id, expires_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.users (id, email, password_hash, name, floor, door, phone_number, role, account_status, created_at, updated_at, building_id) FROM stdin;
1	prueba1@email.com	$2b$10$ChDStljn10ifgBrk0blMe.VuMURNbUHxUbN2EphKoKNrN5l6AooSi	Usuario de Prueba	1	101	\N	admin	active	2025-06-06 09:22:47.667356+02	2025-06-06 12:30:04.943863+02	\N
3	inciartej86@gmail.com	$2b$10$W8ZdL5xme8tPFNPHPIP4aeGpj8LpyhUJRrBLBrXJfhODFDI/4qTIC	Jose Agustin Inciarte Melean	3	4	677058623	user	active	2025-06-06 22:03:22.08481+02	2025-06-06 22:03:37.636782+02	\N
2	pendiente@email.com	$2b$10$wYB2ehMoMz1pBQ0Ns5xqB.hGCojNxmd14o1bJVw0eccmd0R49kcbC	Usuario Pendiente	\N	\N	\N	user	active	2025-06-06 13:00:07.38179+02	2025-06-08 14:26:33.756446+02	\N
\.


--
-- Name: blocked_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.blocked_periods_id_seq', 1, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.bookings_id_seq', 22, true);


--
-- Name: buildings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.buildings_id_seq', 1, true);


--
-- Name: courts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.courts_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: blocked_periods blocked_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.blocked_periods
    ADD CONSTRAINT blocked_periods_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_address_key; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_address_key UNIQUE (address);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: courts courts_name_key; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.courts
    ADD CONSTRAINT courts_name_key UNIQUE (name);


--
-- Name: courts courts_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.courts
    ADD CONSTRAINT courts_pkey PRIMARY KEY (id);


--
-- Name: instance_settings instance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.instance_settings
    ADD CONSTRAINT instance_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_blocked_periods_court_id; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_blocked_periods_court_id ON public.blocked_periods USING btree (court_id);


--
-- Name: idx_blocked_periods_start_time; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_blocked_periods_start_time ON public.blocked_periods USING btree (start_time);


--
-- Name: idx_bookings_court_id; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_bookings_court_id ON public.bookings USING btree (court_id);


--
-- Name: idx_bookings_start_time; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_bookings_start_time ON public.bookings USING btree (start_time);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: casaos
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: blocked_periods set_timestamp_blocked_periods; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_blocked_periods BEFORE UPDATE ON public.blocked_periods FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: bookings set_timestamp_bookings; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_bookings BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: buildings set_timestamp_buildings; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_buildings BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: courts set_timestamp_courts; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_courts BEFORE UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: instance_settings set_timestamp_instance_settings; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_instance_settings BEFORE UPDATE ON public.instance_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: users set_timestamp_users; Type: TRIGGER; Schema: public; Owner: casaos
--

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: blocked_periods blocked_periods_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.blocked_periods
    ADD CONSTRAINT blocked_periods_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id);


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

