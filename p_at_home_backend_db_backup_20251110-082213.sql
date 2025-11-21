--
-- PostgreSQL database dump
--

\restrict LxmGrvmSjGvZ4ickg7Tb1dBrd1lyuA5n0vw38ikRBmL9BnfaowOBcWeT6xzt9IM

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.6 (Debian 17.6-2.pgdg11+1)

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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_open_match boolean DEFAULT false NOT NULL,
    max_participants integer,
    auto_cancel_hours_before integer
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
-- Name: match_participants; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.match_participants (
    id bigint NOT NULL,
    booking_id bigint NOT NULL,
    user_id bigint NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.match_participants OWNER TO casaos;

--
-- Name: match_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.match_participants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.match_participants_id_seq OWNER TO casaos;

--
-- Name: match_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.match_participants_id_seq OWNED BY public.match_participants.id;


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
-- Name: waiting_list_entries; Type: TABLE; Schema: public; Owner: casaos
--

CREATE TABLE public.waiting_list_entries (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    user_id bigint NOT NULL,
    slot_start_time timestamp with time zone NOT NULL,
    slot_end_time timestamp with time zone NOT NULL,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(50) DEFAULT 'waiting'::character varying NOT NULL,
    notification_sent_at timestamp with time zone,
    confirmation_token text,
    notification_expires_at timestamp with time zone
);


ALTER TABLE public.waiting_list_entries OWNER TO casaos;

--
-- Name: waiting_list_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: casaos
--

CREATE SEQUENCE public.waiting_list_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.waiting_list_entries_id_seq OWNER TO casaos;

--
-- Name: waiting_list_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: casaos
--

ALTER SEQUENCE public.waiting_list_entries_id_seq OWNED BY public.waiting_list_entries.id;


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
-- Name: match_participants id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.match_participants ALTER COLUMN id SET DEFAULT nextval('public.match_participants_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: waiting_list_entries id; Type: DEFAULT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.waiting_list_entries ALTER COLUMN id SET DEFAULT nextval('public.waiting_list_entries_id_seq'::regclass);


--
-- Data for Name: blocked_periods; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.blocked_periods (id, court_id, start_time, end_time, reason, is_full_day, created_at, updated_at) FROM stdin;
2	1	2025-11-10 11:26:00+01	2025-11-10 01:26:00+01	fgshfd	f	2025-11-10 07:27:04.89195+01	2025-11-10 07:27:04.89195+01
3	1	2025-11-11 11:28:00+01	2025-11-11 18:59:00+01	rtey	f	2025-11-10 07:28:31.480815+01	2025-11-10 07:28:31.480815+01
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.bookings (id, court_id, user_id, start_time, end_time, status, created_at, updated_at, is_open_match, max_participants, auto_cancel_hours_before) FROM stdin;
44	1	1	2025-06-23 16:30:00+02	2025-06-23 18:00:00+02	cancelled_by_user	2025-06-22 18:39:31.833341+02	2025-06-22 18:40:07.888224+02	f	\N	\N
45	1	2	2025-06-23 19:30:00+02	2025-06-23 21:00:00+02	cancelled_by_user	2025-06-22 18:40:45.892142+02	2025-06-22 18:41:22.056813+02	f	\N	\N
46	1	1	2025-06-24 19:30:00+02	2025-06-24 21:00:00+02	cancelled_by_user	2025-06-22 18:46:38.080855+02	2025-06-22 18:47:00.718319+02	f	\N	\N
47	1	2	2025-06-24 19:30:00+02	2025-06-24 20:00:00+02	cancelled_by_user	2025-06-22 18:47:47.073044+02	2025-06-22 18:47:56.010215+02	f	\N	\N
48	1	1	2025-06-28 20:30:00+02	2025-06-28 21:30:00+02	cancelled_by_user	2025-06-22 18:48:19.405062+02	2025-06-22 18:48:31.745388+02	f	\N	\N
49	1	1	2025-06-28 14:30:00+02	2025-06-28 16:00:00+02	cancelled_by_user	2025-06-22 18:54:26.738336+02	2025-06-22 18:54:59.648344+02	f	\N	\N
50	1	2	2025-06-28 14:30:00+02	2025-06-28 15:00:00+02	cancelled_by_user	2025-06-22 18:55:19.219971+02	2025-06-22 18:55:26.981725+02	f	\N	\N
51	1	1	2025-06-21 14:30:00+02	2025-06-21 15:30:00+02	confirmed	2025-06-22 19:17:43.48999+02	2025-06-22 19:17:43.48999+02	f	\N	\N
52	1	1	2025-06-28 14:00:00+02	2025-06-28 15:00:00+02	cancelled_by_user	2025-06-22 19:17:49.441552+02	2025-06-22 19:17:53.340094+02	f	\N	\N
53	1	1	2025-06-28 20:30:00+02	2025-06-28 21:30:00+02	cancelled_by_user	2025-06-22 19:36:11.879157+02	2025-06-22 21:37:13.276063+02	f	\N	\N
54	1	1	2025-06-28 19:30:00+02	2025-06-28 20:30:00+02	cancelled_by_user	2025-06-22 21:37:25.850897+02	2025-06-22 21:57:17.51342+02	f	\N	\N
55	1	1	2025-06-27 16:00:00+02	2025-06-27 17:00:00+02	confirmed	2025-06-22 22:08:08.856004+02	2025-06-22 22:08:08.856004+02	t	4	6
56	1	2	2025-06-28 19:00:00+02	2025-06-28 20:30:00+02	cancelled_by_user	2025-06-22 22:09:13.776866+02	2025-06-22 22:12:08.348896+02	f	\N	\N
57	1	1	2025-11-11 09:30:00+01	2025-11-11 10:30:00+01	cancelled_by_user	2025-11-10 07:25:40.200965+01	2025-11-10 07:25:45.362365+01	t	4	6
\.


--
-- Data for Name: buildings; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.buildings (id, address, description, created_at, updated_at) FROM stdin;
2	Av pimpinela 45	Edificio principal	2025-06-09 18:31:07.599649+02	2025-06-09 18:31:07.599649+02
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
-- Data for Name: match_participants; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.match_participants (id, booking_id, user_id, joined_at) FROM stdin;
1	55	1	2025-06-22 22:08:08.856004+02
3	57	1	2025-11-10 07:25:40.200965+01
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
3	inciartej86@gmail.com	$2b$10$W8ZdL5xme8tPFNPHPIP4aeGpj8LpyhUJRrBLBrXJfhODFDI/4qTIC	Jose Agustin Inciarte Melean	3	4	677058623	user	active	2025-06-06 22:03:22.08481+02	2025-06-06 22:03:37.636782+02	\N
2	pendiente@email.com	$2b$10$wYB2ehMoMz1pBQ0Ns5xqB.hGCojNxmd14o1bJVw0eccmd0R49kcbC	Usuario Pendiente	\N	\N	\N	user	active	2025-06-06 13:00:07.38179+02	2025-06-08 14:26:33.756446+02	\N
1	prueba1@email.com	$2b$10$ChDStljn10ifgBrk0blMe.VuMURNbUHxUbN2EphKoKNrN5l6AooSi	Usuario de Prueba	1	101	\N	admin	active	2025-06-06 09:22:47.667356+02	2025-06-09 18:17:10.013255+02	\N
\.


--
-- Data for Name: waiting_list_entries; Type: TABLE DATA; Schema: public; Owner: casaos
--

COPY public.waiting_list_entries (id, court_id, user_id, slot_start_time, slot_end_time, requested_at, status, notification_sent_at, confirmation_token, notification_expires_at) FROM stdin;
1	1	1	2025-06-16 16:30:00+02	2025-06-16 17:00:00+02	2025-06-22 16:45:37.436149+02	waiting	\N	\N	\N
2	1	2	2025-06-20 20:00:00+02	2025-06-20 20:30:00+02	2025-06-22 18:24:54.004984+02	waiting	\N	\N	\N
3	1	2	2025-06-23 16:30:00+02	2025-06-23 17:00:00+02	2025-06-22 18:39:48.14149+02	notified	2025-06-22 18:40:07.888224+02	6f8f40b3e3226565f2d07429e1ffa08689c4a2db410907711f6ce1ac61086cb8	2025-06-22 19:10:07.915+02
4	1	1	2025-06-23 19:30:00+02	2025-06-23 20:00:00+02	2025-06-22 18:41:00.060709+02	notified	2025-06-22 18:41:22.056813+02	78242fbb96b9eef6a7bd6b1459796d1816cd81c6550b6073f0468a0f83c9b419	2025-06-22 19:11:22.066+02
5	1	2	2025-06-24 19:30:00+02	2025-06-24 20:00:00+02	2025-06-22 18:46:44.855066+02	confirmed	2025-06-22 18:47:00.718319+02	8f475bedbb837184f96da6b12cff2ebca45f0fa85210028535a47b5592d79746	2025-06-22 19:17:00.733+02
6	1	2	2025-06-28 14:30:00+02	2025-06-28 15:00:00+02	2025-06-22 18:54:49.341075+02	confirmed	2025-06-22 18:54:59.648344+02	cbcc17c3c1cafbdae84e5be11011cb752e95df61e69c8dea7a4e34a8853c1908	2025-06-22 19:24:59.661+02
7	1	2	2025-06-28 20:30:00+02	2025-06-28 21:00:00+02	2025-06-22 19:37:14.787791+02	notified	2025-06-22 21:37:13.276063+02	9bdffce489cf377e0a0220309b31e64e85aa294e07b5c9f9513e592286596384	2025-06-22 22:07:13.287+02
8	1	2	2025-06-28 19:30:00+02	2025-06-28 20:00:00+02	2025-06-22 21:37:39.267185+02	notified	2025-06-22 21:57:17.51342+02	e4aee0d5daf37212080d98aa677692e039af84497b534afc8dd930055dd12c28	2025-06-22 22:27:17.525+02
\.


--
-- Name: blocked_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.blocked_periods_id_seq', 3, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.bookings_id_seq', 57, true);


--
-- Name: buildings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.buildings_id_seq', 2, true);


--
-- Name: courts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.courts_id_seq', 2, true);


--
-- Name: match_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.match_participants_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: waiting_list_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: casaos
--

SELECT pg_catalog.setval('public.waiting_list_entries_id_seq', 8, true);


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
-- Name: match_participants match_participants_booking_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_booking_id_user_id_key UNIQUE (booking_id, user_id);


--
-- Name: match_participants match_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_pkey PRIMARY KEY (id);


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
-- Name: waiting_list_entries waiting_list_entries_court_id_user_id_slot_start_time_key; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.waiting_list_entries
    ADD CONSTRAINT waiting_list_entries_court_id_user_id_slot_start_time_key UNIQUE (court_id, user_id, slot_start_time);


--
-- Name: waiting_list_entries waiting_list_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.waiting_list_entries
    ADD CONSTRAINT waiting_list_entries_pkey PRIMARY KEY (id);


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
-- Name: match_participants match_participants_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: waiting_list_entries waiting_list_entries_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.waiting_list_entries
    ADD CONSTRAINT waiting_list_entries_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id) ON DELETE CASCADE;


--
-- Name: waiting_list_entries waiting_list_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: casaos
--

ALTER TABLE ONLY public.waiting_list_entries
    ADD CONSTRAINT waiting_list_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict LxmGrvmSjGvZ4ickg7Tb1dBrd1lyuA5n0vw38ikRBmL9BnfaowOBcWeT6xzt9IM

