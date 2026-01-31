--
-- PostgreSQL database dump
--

\restrict GHQd5ObNogMGGhVbwgrASXOVHgkeCyGeRKZP9XrHndt5fPhix07Y79LLUeEbT01

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.addresses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    label text NOT NULL,
    full_address text NOT NULL,
    details text,
    is_default boolean DEFAULT false NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL
);


ALTER TABLE public.addresses OWNER TO "user";

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.cart_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.cart_items OWNER TO "user";

--
-- Name: categories; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text NOT NULL,
    color text NOT NULL,
    image text
);


ALTER TABLE public.categories OWNER TO "user";

--
-- Name: messages; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    user_id character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    type character varying DEFAULT 'text'::character varying NOT NULL
);


ALTER TABLE public.messages OWNER TO "user";

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    price_at_entry numeric(10,2) NOT NULL
);


ALTER TABLE public.order_items OWNER TO "user";

--
-- Name: orders; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    user_id character varying NOT NULL,
    store_id character varying,
    picker_id character varying,
    driver_id character varying,
    items jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total integer NOT NULL,
    delivery_fee integer DEFAULT 10000 NOT NULL,
    address_id character varying,
    payment_method text DEFAULT 'midtrans'::text,
    payment_status text DEFAULT 'pending'::text,
    cod_collected boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    picked_at timestamp without time zone,
    packed_at timestamp without time zone,
    delivered_at timestamp without time zone,
    estimated_delivery timestamp without time zone,
    customer_lat numeric(10,7),
    customer_lng numeric(10,7)
);


ALTER TABLE public.orders OWNER TO "user";

--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.otp_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    code text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.otp_codes OWNER TO "user";

--
-- Name: products; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand text DEFAULT 'Generic'::text NOT NULL,
    price integer NOT NULL,
    original_price integer,
    image text,
    category_id character varying NOT NULL,
    description text,
    nutrition jsonb
);


ALTER TABLE public.products OWNER TO "user";

--
-- Name: store_inventory; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.store_inventory (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    store_id character varying NOT NULL,
    product_id character varying NOT NULL,
    stock_count integer DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    location text
);


ALTER TABLE public.store_inventory OWNER TO "user";

--
-- Name: store_staff; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.store_staff (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    store_id character varying NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'offline'::text NOT NULL,
    last_status_change timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.store_staff OWNER TO "user";

--
-- Name: stores; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.stores (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    owner_id character varying,
    cod_allowed boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stores OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    phone text,
    email text,
    apple_id text,
    google_id text,
    role text DEFAULT 'customer'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    area_id integer,
    store_id integer,
    name text,
    push_token text
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.vouchers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount integer NOT NULL,
    discount_type text NOT NULL,
    min_order integer DEFAULT 0 NOT NULL,
    valid_until timestamp without time zone NOT NULL,
    description text
);


ALTER TABLE public.vouchers OWNER TO "user";

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.addresses (id, user_id, label, full_address, details, is_default, latitude, longitude) FROM stdin;
241d24bc-5897-4cd1-83fd-dfd6330dcbab	154dbc9b-de36-40cf-a34c-50dca0a11a13	Current Location	Auto-detected from GPS	\N	t	-7.9576365	112.6172361
6b998801-a920-40f2-8124-695dcc20d2a4	6f0fed4c-55a5-4746-877e-b7c2e3bff069	Current Location	Auto-detected from GPS	\N	t	-7.9575931	112.6172734
0c5eecec-dde9-4254-a8a0-26be9e6404cf	42adacd2-06bf-4533-997d-f8b6d9ce7fef	Current Location	Auto-detected from GPS	\N	t	-7.9577333	112.6175419
f42fb3c5-aff7-4417-8be5-dc7903158158	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	Current Location	Auto-detected from GPS	\N	t	-7.9576243	112.6172260
2fabb4d7-62cb-4fab-9505-3a813ed52a44	3fc88176-d2e7-4891-a76d-e1ed2dec883e	Current Location	Auto-detected from GPS	\N	t	-7.9749440	112.6263088
5992b584-5c82-4ec5-ab7a-3d91b64e1c94	952d6800-42da-4fcd-940b-46d51e88449e	Current Location	Auto-detected from GPS	\N	t	-7.9576315	112.6172722
d3d37998-78ae-4ef4-a0db-03a3287d70bb	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	Current Location	Auto-detected from GPS	\N	f	-7.9577234	112.6174236
60234348-3eff-4991-966e-c8e4e55aabe5	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	depan Matos	Nowhere Cafe, Jalan Veteran, Sumbersari, Malang, Kota Malang, East Java, Java, 65113, Indonesia	lobby	f	-7.9574737	112.6172391
ab77fb46-14f7-46eb-849e-c89c731f2ba7	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	depan Matos	Nowhere Cafe, Jalan Veteran, Sumbersari, Malang, Kota Malang, East Java, Java, 65113, Indonesia	lobby	t	-7.9574737	112.6172391
39634d53-a5ae-47e3-8c54-d334f2edee4f	864a40e9-5860-458c-beea-d783e1062ced	depan matos	Nowhere Cafe, Jalan Veteran, Sumbersari, Malang, Kota Malang, East Java, Java, 65113, Indonesia	lobby	f	-7.9574737	112.6172391
a07aaeb7-5cd0-48e1-8506-0a8bc32425e6	864a40e9-5860-458c-beea-d783e1062ced	Current Location	Auto-detected from GPS	\N	t	-7.9577096	112.6175139
b58e9cf4-3df6-407a-b0b4-c0402058993b	d7922e9f-3754-4bc6-872c-88d6fe9a587b	depan matos 	Nowhere Cafe, Jalan Veteran, Sumbersari, Malang, Kota Malang, East Java, Java, 65113, Indonesia	lobby	f	-7.9574737	112.6172391
d818be5a-9a9d-478a-9b43-a98a1f4751f9	d7922e9f-3754-4bc6-872c-88d6fe9a587b	apprtement	Bangkok, Boyolali, Central Java, Java, 57382, Indonesia	lobby	t	-7.3349500	110.6589317
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.cart_items (id, user_id, product_id, quantity) FROM stdin;
d1cb0921-4105-4e33-9aa8-93333e082ac3	demo-user	5	1
edaed2c9-7a41-4fb3-a394-1bc978616b05	4104e0a6-27c9-41cd-8ad4-74accc803860	1	1
77fb16a9-3d60-4efa-97f6-9606938dc6f2	952d6800-42da-4fcd-940b-46d51e88449e	6	1
08d76af8-62b4-4198-a2f1-33beb1c2e489	633a1033-965b-4d8f-87e3-569a5342cd13	5	2
330954b7-c4fa-42f2-945e-20407475b5d6	633a1033-965b-4d8f-87e3-569a5342cd13	1	1
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.categories (id, name, icon, color, image) FROM stdin;
0b1a33de-4349-491a-91eb-33d6dddc1478	Dairy	🧀	#FFFACD	https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800
1	Milk	droplet	#4A90E2	https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800
2	Eggs	circle	#FF9800	https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800
3	Snacks	box	#9C27B0	https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800
348dcb73-fb25-4505-a6ff-69937004c4d7	Frozen Food	❄️	#00CED1	https://images.unsplash.com/photo-1551798507-629020c81463?w=800
4	Fruits	sun	#4CAF50	https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800
5	Frozen	thermometer	#00BCD4	https://images.unsplash.com/photo-1476887334197-56adbf254e1a?w=800
6	Drinks	coffee	#F44336	https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=800
6e121962-f52e-453e-baf6-6f1125ab5635	Beverages	🥤	#1E90FF	https://images.unsplash.com/photo-1546173159-315724a31696?w=800
7	Veggies	feather	#8BC34A	https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800
8	Meat	target	#E91E63	https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800
d6269f85-ca50-46c8-8658-309e5cab15f0	Fruits	🍎	#FF6347	https://images.unsplash.com/photo-1490885578174-acda8905c2c6?w=800
7fe46e22-621f-4a9b-b9cd-d059900ac2cb	Snacks	🍿	#FFD700	https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.messages (id, order_id, user_id, content, created_at, type) FROM stdin;
deef90aa-c5ac-4e6f-af2b-553c2dfd058e	049c4c87-ed77-4ab4-8032-557096f2850d	952d6800-42da-4fcd-940b-46d51e88449e	hi	2025-12-25 16:08:58.606364	text
5d742f56-00b4-4358-9c54-4133fecd6631	049c4c87-ed77-4ab4-8032-557096f2850d	demo-driver	hello	2025-12-25 18:57:25.345447	text
d40ba2b0-0d51-4ae9-933d-f15b4a8bda6b	049c4c87-ed77-4ab4-8032-557096f2850d	demo-driver	hi	2025-12-25 20:25:45.973315	text
4324c19a-b848-4eac-94cb-94c76204a849	049c4c87-ed77-4ab4-8032-557096f2850d	952d6800-42da-4fcd-940b-46d51e88449e	ok	2025-12-25 20:28:22.277889	text
4331a6b6-5b20-41ca-8d9c-eae65b042f9f	049c4c87-ed77-4ab4-8032-557096f2850d	demo-driver	http://10.30.51.95:5000/uploads/chat/chat-1766671723902-864282078.jpg	2025-12-25 21:08:43.90593	image
3be8458d-25d2-4fa0-84b9-12f55134346b	cbc51a3d-d610-40ae-a487-07c0ddc97327	952d6800-42da-4fcd-940b-46d51e88449e	hi	2025-12-27 02:45:24.018003	text
d6d68ccc-4916-4284-b42d-1f86b3a0d172	cbc51a3d-d610-40ae-a487-07c0ddc97327	demo-driver	how u doing 	2025-12-27 02:45:34.65681	text
c5ed6c62-6d36-4397-b39d-51a19f560a71	cbc51a3d-d610-40ae-a487-07c0ddc97327	952d6800-42da-4fcd-940b-46d51e88449e	http://10.30.51.95:5000/uploads/chat/chat-1766778342881-877048574.jpg	2025-12-27 02:45:42.886866	image
b397a269-f4fc-4526-8cdd-90f710b35367	77372828-9b7b-4dc7-aead-6b67c5d0bf4f	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	hi	2025-12-28 02:06:27.09853	text
4857aec3-5f92-4be3-b80b-9003948b4fbd	77372828-9b7b-4dc7-aead-6b67c5d0bf4f	demo-driver	hi	2025-12-28 02:06:41.736952	text
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.order_items (id, order_id, product_id, quantity, price_at_entry) FROM stdin;
15e63c46-992f-4b91-8e2d-8abde5fd5ed5	2a58ce5d-d313-40b2-b56d-7f7cfc562bf2	1	1	18500.00
ba28acec-5e31-4ddc-8b62-85ed388285f6	6f969e45-a6a7-4d4e-a1ca-e3975fe90842	1	1	18500.00
bf180477-3197-4ff3-a93f-0acd81820e22	298cbba9-b919-42bf-88ae-2a9cadd53071	1	2	18500.00
9d2f737e-4ec3-42f4-9cdb-5d4c310f5adc	8ab20143-397f-425d-a2be-9be9dffc072d	1	3	18500.00
5cfee36b-f389-48c6-9ffe-5d6828beb546	872a015b-5f9c-4694-8ec3-6d2501342b4e	1	4	18500.00
37d160fa-830b-45e3-8daa-8aea98eb9a71	45adc3c1-324e-4a52-8371-0b387347f185	1	1	18500.00
5821b7a2-31d2-49d5-b0cf-a6541402e216	d56ca8c2-28bf-4acc-b009-26d7c6c4b78c	1	1	18500.00
3c155efd-dda5-468a-8b7c-db784c4ebb47	80f78a78-d4cd-4e7c-ba87-9e90fa9e426a	1	1	18500.00
ed847300-0fc9-4ceb-bdbb-3269b8aab785	ad73f54b-a76b-449f-ac75-36be428c1eb7	1	1	18500.00
76f72fa2-dda3-4ba5-b5e1-56f8e9341b82	8a5c279e-8e30-4661-bdfa-436734d691c8	1	1	18500.00
7b34535a-84ca-42fa-9a6c-b1d2f9b2e9e3	1cff36a0-402f-40eb-b53e-043224b81429	1	1	18500.00
25485e8a-a429-43b8-bd0b-73512a2647fd	d7a88d27-d4a7-4ea6-9d0d-065069a5bd9e	1	1	18500.00
0414a107-5a48-4f9a-bc25-447588ea3c16	b045480f-b8e5-41e7-9777-68e054751046	1	1	18500.00
c3034843-da38-42b4-8141-1486b49af3cc	915d875f-9eca-4722-88a2-273998448326	5	1	45000.00
fc2d7af6-f917-46bc-a13c-2bbca1a0f737	d48d9e99-b70e-4cfd-9c9c-843bcfbcdddf	3	1	15000.00
687964b4-c736-4419-8c6a-2f47c00f99d9	ecefc15f-cbd8-4282-bb3c-1ad63db10a17	2	1	32000.00
86e5bd07-b10b-42fe-9b11-bef38bbf30a4	0c45cd83-8b7f-4a73-98b6-3aaf169d5117	1	1	18500.00
321404c0-ca59-433e-b873-beb89d7daa3d	4546d3c1-11a5-4935-b7e5-afb591f9a7c1	3	3	15000.00
c0ece965-dd27-4bbe-b172-0821f40dbe3d	4546d3c1-11a5-4935-b7e5-afb591f9a7c1	4	3	8000.00
68950111-619a-45cb-a44e-f17a1f7d1acd	4ac40bd1-20af-4989-aa1f-d320339d0651	1	1	18500.00
6d37865b-ab78-419c-a852-e1849c5ca28f	4ac40bd1-20af-4989-aa1f-d320339d0651	2	1	32000.00
c2634d70-b867-4e06-83b0-dff69f966afe	260577e8-267d-4d5f-99f2-36f55782f9b5	3	1	15000.00
c29b1454-2ae0-471f-a1aa-1cc760157a71	052d6883-d5b0-42fe-9f4a-634edc1d5734	3	1	15000.00
d3852eb6-48a4-46a5-9450-5caba20774b4	086db3fb-ebb7-4a78-bde8-ab523de8e188	4	1	8000.00
de2fec45-5b52-4264-ad94-d727293ed53a	bb2b8c6d-a301-4745-8cc8-afb98e8125cb	1	1	18500.00
e5ea4569-43fa-4524-ad90-a3539b1a2177	1c99212b-57d9-4717-a3f3-195b9c8b6423	1	1	18500.00
29392b86-a819-413e-86bc-29223aec90e3	19270a3c-1c2a-481a-b5f0-e2d83a9e8872	3	1	15000.00
16eb6a4f-bd2b-4eb3-9c48-b53ea26381f9	763ccbf4-b141-4c92-8722-22547a0d7c6f	1	1	18500.00
55a1364a-8ede-49c0-aa8e-b6975c461458	2547b8ee-ee6c-4423-9a30-a7859f516935	5	1	45000.00
1407b8b7-d4c1-4d41-8481-752ba2dc2901	0ec297db-7e2d-4a8f-8ec0-4e72c4bd52b3	3	1	15000.00
00608621-5848-4b82-a320-ca2bb0db46a8	15c3e6a3-de89-4e0a-ba63-9cbfa7165c31	1	1	18500.00
096a5c09-9576-48ea-817d-5736b77d6090	7610129b-7657-46b3-9245-ae4751e9ad1b	1	1	18500.00
a4b0485c-48a4-4bbc-9bb8-6e7dbede3bf3	7610129b-7657-46b3-9245-ae4751e9ad1b	2	1	32000.00
b628c453-b3b0-4792-b00d-c0bac1cfe7d7	7610129b-7657-46b3-9245-ae4751e9ad1b	3	1	15000.00
50877da8-c28d-4b46-b3db-b1247aff4c35	051564a1-785c-40c3-8916-3b76618228f6	3	1	15000.00
016027fb-e8e2-47dc-982a-cf438b1a874b	051564a1-785c-40c3-8916-3b76618228f6	4	1	8000.00
91c62d8b-b87f-4428-ad9e-b2e72ce44830	051564a1-785c-40c3-8916-3b76618228f6	5	1	45000.00
9ce588f2-438d-42f8-9a6e-f75e79df7efd	049c4c87-ed77-4ab4-8032-557096f2850d	3	1	15000.00
b5d2e52a-7f8d-400e-bdec-af0f075727af	702351b9-c1b5-48f7-8347-a1cd92798152	5	1	45000.00
34dc2d43-4665-44fd-9fe5-6e7308acd215	8ff3ffaf-66e4-4799-9601-45fbd4ef7ee2	1	1	18500.00
63708cf1-9090-402e-9c48-8da688505e1b	ca3595ee-09a8-4e3d-a40b-c3f6c2ee8a70	3	1	15000.00
415db235-6144-4d6d-a6a2-077a22815233	cbc51a3d-d610-40ae-a487-07c0ddc97327	6	1	5500.00
5649c93d-7d4a-48ee-89ea-337b36dd58bb	50b53eb8-abb7-42cd-9bdc-6da1d18983c8	6	1	5500.00
0f59dcd2-c53f-42d0-ad8a-bbd898752491	77372828-9b7b-4dc7-aead-6b67c5d0bf4f	1	1	18500.00
05617b36-2211-4def-b921-2d8769c46da7	7de72e48-3d2c-4c85-9d78-9bc8c2773fc5	6	1	5500.00
d9c499c9-d869-4297-ba08-587360f51a9d	a7cf258e-b8b1-4192-8a9a-d0e22e2be62d	4	1	8000.00
b6ffa05c-65f7-454e-8c55-93595d136109	684b2a22-ce0e-45ac-8064-ca74368f2521	6	2	5500.00
4afc2d1b-4faf-4de6-a609-b15a8567e3d6	2ddd5c53-12f2-4ccb-8ce2-40cc23f18d5a	1	1	18500.00
ac545c88-d85c-4898-bc22-bc6844fd33c3	f53bb961-6b4a-47d0-bfc7-b324a20a977c	6	1	5500.00
851a0759-cf61-4b03-9eda-63225091eab3	cb89ea84-0632-4d98-b08f-ea8ce661c425	4	1	8000.00
8928b672-4d83-4f11-a8ce-0744f7b764bc	cb89ea84-0632-4d98-b08f-ea8ce661c425	3	1	15000.00
fb82bfba-0512-4fdd-a178-83c0410bec7c	5dbaf2f0-05cf-4d42-b94d-83c430c9afc4	1	1	18500.00
a7d5992f-fa2d-4f00-9917-ca4e704aec02	3eb415dc-822e-4a54-9464-6b61f805ed5b	7	1	12000.00
4b2fd9cf-3b9a-45ef-828d-3cee7bcb9e5c	7db1a8f9-c07a-4630-8d90-3018c36e5c66	6	1	5500.00
285c570e-7824-4fdb-a775-d1e4706b02eb	6d953d8f-4050-46a8-9a4d-db1012992bcf	0f697d7c-89ce-4675-b467-7c0d918b9c9e	1	15000.00
a8149d05-1a47-4937-ada0-fb24f6eb32d7	c1d1a560-36d9-408e-9d26-d11a71750c98	623c3685-8f1d-45e2-b532-146e7c5383f8	1	25000.00
10cfc980-5719-4f97-a5ae-bc0cefe5ac19	c1d1a560-36d9-408e-9d26-d11a71750c98	0f697d7c-89ce-4675-b467-7c0d918b9c9e	1	15000.00
36a3c561-acde-42da-90fe-a25d71dbc345	147827d3-7c31-42fc-adfd-5ede54adee1d	0f697d7c-89ce-4675-b467-7c0d918b9c9e	1	15000.00
5ff68161-0e71-41dd-9d9b-ea626b7375d5	4c4fc682-8ec1-42ff-b4d8-1a7976151e20	9ab9a245-b97e-44f3-963f-52ec5debf1c1	1	18000.00
984c5b4b-6a26-4815-8ba5-9c109f9393dd	c5762fe7-7ad9-4cd5-bf09-270183a04e36	4e909c8f-a7a9-476f-b3a9-9b2c41f0dca3	1	50000.00
825b9b65-3674-41bd-8dfe-8968ebc8944d	4b869960-3217-47fa-b455-a20e258fd9d0	e3972949-0fac-47d2-b841-d53f8653968d	1	30000.00
05374c9d-56fa-460c-831a-43d67c628702	0ac8338b-a481-48ac-a8c2-eb1be9bb325c	9ab9a245-b97e-44f3-963f-52ec5debf1c1	1	18000.00
2f01cd23-f958-429f-b054-71799b07956b	d4e86e05-1538-439e-b559-3fd602bdc3f1	bd14b39b-ff68-41ad-8cdb-556520a71ba0	1	45000.00
29ec1379-b03f-4a23-8ec5-f54b0e1a63d1	7b070c1b-af5c-4296-bc12-9e2d759feada	9ab9a245-b97e-44f3-963f-52ec5debf1c1	1	18000.00
ae95d868-e45f-4710-b118-1dda44333bd7	e2e7b4f3-f9d3-4ac5-9702-90d101dd2e15	623c3685-8f1d-45e2-b532-146e7c5383f8	1	25000.00
6f0d018f-0436-454d-9102-5c9078b649cf	83843f49-1242-47e9-b44b-ca321acf6035	9ab9a245-b97e-44f3-963f-52ec5debf1c1	1	18000.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.orders (id, order_number, user_id, store_id, picker_id, driver_id, items, status, total, delivery_fee, address_id, payment_method, payment_status, cod_collected, created_at, picked_at, packed_at, delivered_at, estimated_delivery, customer_lat, customer_lng) FROM stdin;
cbc51a3d-d610-40ae-a487-07c0ddc97327	ORD-OGNU1AK	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 1, "productId": "6"}]	delivered	15500	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-27 02:44:23.875539	\N	\N	\N	\N	-7.9577268	112.6175781
0ec297db-7e2d-4a8f-8ec0-4e72c4bd52b3	ORD-5JOD4X2	3fc88176-d2e7-4891-a76d-e1ed2dec883e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	25000	10000	2fabb4d7-62cb-4fab-9505-3a813ed52a44	midtrans	pending	f	2025-12-24 13:09:05.707671	\N	\N	\N	\N	-7.9749440	112.6263088
cb89ea84-0632-4d98-b08f-ea8ce661c425	ORD-9BXWXNI	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Banana", "price": 8000, "quantity": 1, "productId": "4"}, {"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	33000	10000	ab77fb46-14f7-46eb-849e-c89c731f2ba7	midtrans	pending	f	2025-12-28 11:46:31.483175	\N	\N	\N	\N	-7.9574737	112.6172391
049c4c87-ed77-4ab4-8032-557096f2850d	ORD-404YIL0	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	25000	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-25 15:21:33.350121	\N	\N	\N	\N	-7.9576315	112.6172722
052d6883-d5b0-42fe-9f4a-634edc1d5734	ORD-GSORU2H	demo-picker	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	25000	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 05:41:21.059091	\N	\N	\N	\N	-7.9576243	112.6172260
1c99212b-57d9-4717-a3f3-195b9c8b6423	ORD-3323VG8	demo-picker	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 06:15:55.477712	\N	\N	\N	\N	-7.9576164	112.6172015
a7cf258e-b8b1-4192-8a9a-d0e22e2be62d	ORD-4PZXSBA	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Banana", "price": 8000, "quantity": 1, "productId": "4"}]	delivered	18000	10000	d3d37998-78ae-4ef4-a0db-03a3287d70bb	midtrans	pending	f	2025-12-28 02:12:50.824377	\N	\N	\N	\N	-7.9577672	112.6174263
0ac8338b-a481-48ac-a8c2-eb1be9bb325c	ORD-N7DR4AE	d7922e9f-3754-4bc6-872c-88d6fe9a587b	a2e55995-abc7-4873-9ffe-872902ebd70d	ac9016d2-03da-4dbb-89da-2b38694348b5	\N	[{"name": "Fresh Yogurt", "price": 18000, "storeId": "a2e55995-abc7-4873-9ffe-872902ebd70d", "quantity": 1, "productId": "9ab9a245-b97e-44f3-963f-52ec5debf1c1"}]	packed	18000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:28:39.382956	\N	\N	\N	\N	13.7844745	100.4912397
03fbd73d-dee5-472b-9d5e-4c3950c223a5	ORD-9COEH1W	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	\N	\N	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	pending	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:23:25.221059	\N	\N	\N	\N	-7.9576660	112.6172991
2a58ce5d-d313-40b2-b56d-7f7cfc562bf2	ORD-74BJG6W	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	\N	\N	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	pending	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:29:47.61315	\N	\N	\N	\N	-7.9576163	112.6173276
6f969e45-a6a7-4d4e-a1ca-e3975fe90842	ORD-C6SCS5M	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	\N	\N	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	pending	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:35:03.945571	\N	\N	\N	\N	-7.9576163	112.6173276
298cbba9-b919-42bf-88ae-2a9cadd53071	ORD-6RJRGUP	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	\N	\N	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 2, "productId": "1"}]	pending	47000	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	cod	pending	f	2025-12-23 05:35:56.665689	\N	\N	\N	\N	-7.9576163	112.6173276
8ab20143-397f-425d-a2be-9be9dffc072d	ORD-NDX4T5C	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	\N	\N	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 3, "productId": "1"}]	pending	65500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:37:31.740441	\N	\N	\N	\N	-7.9576186	112.6172283
147827d3-7c31-42fc-adfd-5ede54adee1d	ORD-4RXDK8C	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	548ab0a7-483b-4360-8d6c-384edbc1e2d0	9e0cbb85-1be8-48ef-84b7-91adfc7dc574	[{"name": "Potato Chips", "price": 15000, "quantity": 1, "productId": "0f697d7c-89ce-4675-b467-7c0d918b9c9e"}]	delivered	25000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 15:42:53.857774	\N	\N	\N	\N	13.7845529	100.4912306
d4e86e05-1538-439e-b559-3fd602bdc3f1	ORD-LFJ9EST	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	548ab0a7-483b-4360-8d6c-384edbc1e2d0	fb832783-0770-4f0f-8c93-e4b4cb4c26ae	[{"name": "Frozen Shrimp", "price": 45000, "storeId": "ea585ac6-7c31-470b-9dd3-8f8024d4fab6", "quantity": 1, "productId": "bd14b39b-ff68-41ad-8cdb-556520a71ba0"}]	delivering	45000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:28:39.392781	\N	\N	\N	\N	13.7844745	100.4912397
45adc3c1-324e-4a52-8371-0b387347f185	ORD-UWYTGIH	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:56:49.732383	2025-12-22 22:57:05.829	2025-12-22 22:57:07.594	\N	\N	-7.9576012	112.6171980
872a015b-5f9c-4694-8ec3-6d2501342b4e	ORD-O7AYWTP	154dbc9b-de36-40cf-a34c-50dca0a11a13	\N	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 4, "productId": "1"}]	delivered	84000	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:43:11.869603	2025-12-22 22:49:02.716	2025-12-22 22:49:06.194	\N	\N	-7.9576186	112.6172283
1cff36a0-402f-40eb-b53e-043224b81429	ORD-RCKGZKR	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 19:51:36.451885	2025-12-23 13:10:39.271	2025-12-23 14:47:37.72	\N	\N	-7.9575840	112.6172864
d48d9e99-b70e-4cfd-9c9c-843bcfbcdddf	ORD-XQW7S82	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	packed	25000	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 21:49:41.430016	2025-12-23 16:02:42.742	2025-12-23 19:14:12.154	\N	\N	-7.9575911	112.6172975
702351b9-c1b5-48f7-8347-a1cd92798152	ORD-QP4YSIV	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Frozen Chicken Nuggets", "price": 45000, "quantity": 1, "productId": "5"}]	delivered	55000	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-25 16:21:22.809032	\N	\N	\N	\N	-7.9575222	112.6172738
4546d3c1-11a5-4935-b7e5-afb591f9a7c1	ORD-TYLFA65	6f0fed4c-55a5-4746-877e-b7c2e3bff069	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 3, "productId": "3"}, {"name": "Fresh Banana", "price": 8000, "quantity": 3, "productId": "4"}]	packed	79000	10000	6b998801-a920-40f2-8124-695dcc20d2a4	midtrans	pending	f	2025-12-23 22:54:37.418757	2025-12-23 15:54:49.503	2025-12-23 19:14:10.368	\N	\N	-7.9575931	112.6172734
b045480f-b8e5-41e7-9777-68e054751046	ORD-P3V4U3Y	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 20:05:56.832659	2025-12-23 13:10:33.322	2025-12-23 13:11:53.589	\N	\N	-7.9575592	112.6172239
15c3e6a3-de89-4e0a-ba63-9cbfa7165c31	ORD-7FOJ7DD	3fc88176-d2e7-4891-a76d-e1ed2dec883e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	2fabb4d7-62cb-4fab-9505-3a813ed52a44	midtrans	pending	f	2025-12-24 13:10:12.752067	\N	\N	\N	\N	-7.9749495	112.6263306
5dbaf2f0-05cf-4d42-b94d-83c430c9afc4	ORD-EEEC6DG	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	ab77fb46-14f7-46eb-849e-c89c731f2ba7	midtrans	pending	f	2025-12-28 12:03:45.606184	\N	\N	\N	\N	-7.9574737	112.6172391
d56ca8c2-28bf-4acc-b009-26d7c6c4b78c	ORD-L4NFAQ8	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 05:58:29.240375	2025-12-22 22:58:39.066	2025-12-22 22:58:41.842	\N	\N	-7.9576012	112.6171980
80f78a78-d4cd-4e7c-ba87-9e90fa9e426a	ORD-IXYYU4U	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 06:04:18.354916	2025-12-22 23:04:26.164	2025-12-22 23:04:27.415	\N	\N	-7.9576281	112.6172199
ad73f54b-a76b-449f-ac75-36be428c1eb7	ORD-VUIVJY0	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 06:13:13.53762	2025-12-22 23:13:34.602	2025-12-22 23:13:35.499	\N	\N	-7.9576891	112.6173167
19270a3c-1c2a-481a-b5f0-e2d83a9e8872	ORD-FZWKP2Q	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	25000	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 06:25:18.385273	\N	\N	\N	\N	-7.9575873	112.6171945
50b53eb8-abb7-42cd-9bdc-6da1d18983c8	ORD-CIR2QYY	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 1, "productId": "6"}]	delivered	15500	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-27 17:42:43.407513	\N	\N	\N	\N	-7.9575599	112.6172230
684b2a22-ce0e-45ac-8064-ca74368f2521	ORD-UF8ZX06	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 2, "productId": "6"}]	delivered	21000	10000	60234348-3eff-4991-966e-c8e4e55aabe5	midtrans	pending	f	2025-12-28 11:15:08.088141	\N	\N	\N	\N	-7.9576328	112.6172694
6d953d8f-4050-46a8-9a4d-db1012992bcf	ORD-ILNO07B	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	demo-picker	fb832783-0770-4f0f-8c93-e4b4cb4c26ae	[{"name": "Potato Chips", "price": 15000, "quantity": 1, "productId": "0f697d7c-89ce-4675-b467-7c0d918b9c9e"}]	delivered	25000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-04 15:58:31.454794	\N	\N	\N	\N	13.7845890	100.4911390
4c4fc682-8ec1-42ff-b4d8-1a7976151e20	ORD-URP01G8	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	548ab0a7-483b-4360-8d6c-384edbc1e2d0	9e0cbb85-1be8-48ef-84b7-91adfc7dc574	[{"name": "Fresh Yogurt", "price": 18000, "quantity": 1, "productId": "9ab9a245-b97e-44f3-963f-52ec5debf1c1"}]	delivered	28000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 19:29:27.704851	\N	\N	\N	\N	13.7846047	100.4911434
2ddd5c53-12f2-4ccb-8ce2-40cc23f18d5a	ORD-3W05UO9	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	60234348-3eff-4991-966e-c8e4e55aabe5	midtrans	pending	f	2025-12-28 11:17:11.696547	\N	\N	\N	\N	-7.9575611	112.6172277
086db3fb-ebb7-4a78-bde8-ab523de8e188	ORD-XU64OGN	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Banana", "price": 8000, "quantity": 1, "productId": "4"}]	delivered	18000	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 05:54:12.207559	\N	\N	\N	\N	-7.9576243	112.6172260
c5762fe7-7ad9-4cd5-bf09-270183a04e36	ORD-P7QOI4J	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	548ab0a7-483b-4360-8d6c-384edbc1e2d0	fb832783-0770-4f0f-8c93-e4b4cb4c26ae	[{"name": "Frozen Fish Fillet", "price": 50000, "quantity": 1, "productId": "4e909c8f-a7a9-476f-b3a9-9b2c41f0dca3"}]	delivered	60000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 19:49:25.295834	\N	\N	\N	\N	13.7845361	100.4912218
c1d1a560-36d9-408e-9d26-d11a71750c98	ORD-56F4ENE	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	548ab0a7-483b-4360-8d6c-384edbc1e2d0	fb832783-0770-4f0f-8c93-e4b4cb4c26ae	[{"name": "Mango Thai", "price": 25000, "quantity": 1, "productId": "623c3685-8f1d-45e2-b532-146e7c5383f8"}, {"name": "Potato Chips", "price": 15000, "quantity": 1, "productId": "0f697d7c-89ce-4675-b467-7c0d918b9c9e"}]	delivered	50000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-04 17:13:47.011685	\N	\N	\N	\N	13.7845545	100.4911652
8ff3ffaf-66e4-4799-9601-45fbd4ef7ee2	ORD-E9ZU8M6	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-26 22:07:26.680909	\N	\N	\N	\N	-7.9575868	112.6172294
3eb415dc-822e-4a54-9464-6b61f805ed5b	ORD-OFF8DV9	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Spinach", "price": 12000, "quantity": 1, "productId": "7"}]	delivered	22000	10000	ab77fb46-14f7-46eb-849e-c89c731f2ba7	midtrans	pending	f	2025-12-28 12:34:51.920088	\N	\N	\N	\N	-7.9574737	112.6172391
763ccbf4-b141-4c92-8722-22547a0d7c6f	ORD-EWJK05Q	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 08:26:14.570457	\N	\N	\N	\N	-7.9576696	112.6172199
7610129b-7657-46b3-9245-ae4751e9ad1b	ORD-WKF0Y2L	3fc88176-d2e7-4891-a76d-e1ed2dec883e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}, {"name": "Organic Free Range Eggs", "price": 32000, "quantity": 1, "productId": "2"}, {"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	75500	10000	2fabb4d7-62cb-4fab-9505-3a813ed52a44	midtrans	pending	f	2025-12-24 13:12:22.524798	\N	\N	\N	\N	-7.9749477	112.6263307
77372828-9b7b-4dc7-aead-6b67c5d0bf4f	ORD-FFJHBB6	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	d3d37998-78ae-4ef4-a0db-03a3287d70bb	midtrans	pending	f	2025-12-28 02:05:42.704486	\N	\N	\N	\N	-7.9577234	112.6174236
e2e7b4f3-f9d3-4ac5-9702-90d101dd2e15	ORD-SOTEYMK	d7922e9f-3754-4bc6-872c-88d6fe9a587b	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	\N	\N	[{"name": "Mango Thai", "price": 25000, "storeId": "ea585ac6-7c31-470b-9dd3-8f8024d4fab6", "quantity": 1, "productId": "623c3685-8f1d-45e2-b532-146e7c5383f8"}]	pending	25000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:59:53.020846	\N	\N	\N	\N	13.7845051	100.4912879
83843f49-1242-47e9-b44b-ca321acf6035	ORD-TEF73ST	d7922e9f-3754-4bc6-872c-88d6fe9a587b	a2e55995-abc7-4873-9ffe-872902ebd70d	\N	\N	[{"name": "Fresh Yogurt", "price": 18000, "storeId": "a2e55995-abc7-4873-9ffe-872902ebd70d", "quantity": 1, "productId": "9ab9a245-b97e-44f3-963f-52ec5debf1c1"}]	pending	18000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:59:53.033967	\N	\N	\N	\N	13.7845051	100.4912879
d7a88d27-d4a7-4ea6-9d0d-065069a5bd9e	ORD-HKUOUIZ	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 19:59:11.181909	2025-12-23 13:00:41.705	2025-12-23 13:01:01.506	\N	\N	-7.9576107	112.6172776
051564a1-785c-40c3-8916-3b76618228f6	ORD-SB9XXB8	3fc88176-d2e7-4891-a76d-e1ed2dec883e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}, {"name": "Fresh Banana", "price": 8000, "quantity": 1, "productId": "4"}, {"name": "Frozen Chicken Nuggets", "price": 45000, "quantity": 1, "productId": "5"}]	delivered	78000	10000	2fabb4d7-62cb-4fab-9505-3a813ed52a44	midtrans	pending	f	2025-12-25 00:10:08.829189	\N	\N	\N	\N	-7.9575168	112.6175601
0c45cd83-8b7f-4a73-98b6-3aaf169d5117	ORD-3LS1XMS	6f0fed4c-55a5-4746-877e-b7c2e3bff069	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	6b998801-a920-40f2-8124-695dcc20d2a4	midtrans	pending	f	2025-12-23 22:52:44.281478	2025-12-23 15:53:14.12	2025-12-23 19:14:09.011	\N	\N	-7.9575931	112.6172734
8a5c279e-8e30-4661-bdfa-436734d691c8	ORD-7FIGA4A	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	packed	28500	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 06:14:50.608404	2025-12-22 23:14:59.267	2025-12-22 23:15:00.778	\N	\N	-7.9576891	112.6173167
915d875f-9eca-4722-88a2-273998448326	ORD-95XO9DC	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Frozen Chicken Nuggets", "price": 45000, "quantity": 1, "productId": "5"}]	packed	55000	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 21:49:12.766336	2025-12-23 19:22:38.675	2025-12-23 19:22:40.333	\N	\N	-7.9575911	112.6172975
ecefc15f-cbd8-4282-bb3c-1ad63db10a17	ORD-97GLAJR	154dbc9b-de36-40cf-a34c-50dca0a11a13	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Organic Free Range Eggs", "price": 32000, "quantity": 1, "productId": "2"}]	packed	42000	10000	241d24bc-5897-4cd1-83fd-dfd6330dcbab	midtrans	pending	f	2025-12-23 21:49:55.364972	2025-12-23 16:02:02.924	2025-12-23 16:02:47.34	\N	\N	-7.9575911	112.6172975
4ac40bd1-20af-4989-aa1f-d320339d0651	ORD-T30N22M	6f0fed4c-55a5-4746-877e-b7c2e3bff069	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}, {"name": "Organic Free Range Eggs", "price": 32000, "quantity": 1, "productId": "2"}]	packed	60500	10000	6b998801-a920-40f2-8124-695dcc20d2a4	midtrans	pending	f	2025-12-23 22:56:55.131857	2025-12-23 19:22:37.585	2025-12-23 19:22:39.547	\N	\N	-7.9577605	112.6174598
260577e8-267d-4d5f-99f2-36f55782f9b5	ORD-8TD0UJF	42adacd2-06bf-4533-997d-f8b6d9ce7fef	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	packed	25000	10000	0c5eecec-dde9-4254-a8a0-26be9e6404cf	midtrans	pending	f	2025-12-24 02:12:44.676322	2025-12-23 19:14:21.669	2025-12-23 19:14:41.652	\N	\N	-7.9577333	112.6175419
2547b8ee-ee6c-4423-9a30-a7859f516935	ORD-9NGV43S	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Frozen Chicken Nuggets", "price": 45000, "quantity": 1, "productId": "5"}]	delivered	55000	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 12:28:11.0054	\N	\N	\N	\N	-7.9749598	112.6262817
4b869960-3217-47fa-b455-a20e258fd9d0	ORD-2S9H8A8	d7922e9f-3754-4bc6-872c-88d6fe9a587b	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	\N	\N	[{"name": "Dragon Fruit", "price": 30000, "storeId": "6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6", "quantity": 1, "productId": "e3972949-0fac-47d2-b841-d53f8653968d"}]	pending	30000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:27:32.20432	\N	\N	\N	\N	13.7844745	100.4912397
f53bb961-6b4a-47d0-bfc7-b324a20a977c	ORD-8LYPA5O	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 1, "productId": "6"}]	delivered	15500	10000	60234348-3eff-4991-966e-c8e4e55aabe5	midtrans	pending	f	2025-12-28 11:33:04.686161	\N	\N	\N	\N	-7.9574737	112.6172391
bb2b8c6d-a301-4745-8cc8-afb98e8125cb	ORD-0BV26YE	fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Fresh Full Cream Milk", "price": 18500, "quantity": 1, "productId": "1"}]	delivered	28500	10000	f42fb3c5-aff7-4417-8be5-dc7903158158	midtrans	pending	f	2025-12-24 06:09:33.852237	\N	\N	\N	\N	-7.9576412	112.6172335
7de72e48-3d2c-4c85-9d78-9bc8c2773fc5	ORD-7KUN4YE	a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 1, "productId": "6"}]	delivered	15500	10000	d3d37998-78ae-4ef4-a0db-03a3287d70bb	midtrans	pending	f	2025-12-28 02:10:47.147002	\N	\N	\N	\N	-7.9577657	112.6173543
ca3595ee-09a8-4e3d-a40b-c3f6c2ee8a70	ORD-NMDTW0X	952d6800-42da-4fcd-940b-46d51e88449e	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Potato Chips Original", "price": 15000, "quantity": 1, "productId": "3"}]	delivered	25000	10000	5992b584-5c82-4ec5-ab7a-3d91b64e1c94	midtrans	pending	f	2025-12-27 02:41:14.737757	\N	\N	\N	\N	-7.9577039	112.6175525
7db1a8f9-c07a-4630-8d90-3018c36e5c66	ORD-IEYDYJF	864a40e9-5860-458c-beea-d783e1062ced	64292094-76fb-4cad-b89b-bbf1c3222e2b	demo-picker	demo-driver	[{"name": "Mineral Water 1.5L", "price": 5500, "quantity": 1, "productId": "6"}]	delivered	15500	10000	a07aaeb7-5cd0-48e1-8506-0a8bc32425e6	midtrans	pending	f	2025-12-29 11:26:29.899307	\N	\N	\N	\N	-7.9577096	112.6175139
7b070c1b-af5c-4296-bc12-9e2d759feada	ORD-XK5YDI6	d7922e9f-3754-4bc6-872c-88d6fe9a587b	a2e55995-abc7-4873-9ffe-872902ebd70d	ac9016d2-03da-4dbb-89da-2b38694348b5	\N	[{"name": "Fresh Yogurt", "price": 18000, "storeId": "a2e55995-abc7-4873-9ffe-872902ebd70d", "quantity": 1, "productId": "9ab9a245-b97e-44f3-963f-52ec5debf1c1"}]	packed	18000	10000	d818be5a-9a9d-478a-9b43-a98a1f4751f9	midtrans	pending	f	2026-01-06 20:29:31.665868	\N	\N	\N	\N	13.7845049	100.4912881
\.


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.otp_codes (id, phone, code, expires_at, verified, created_at) FROM stdin;
e8a6bdf1-be06-44bc-88eb-313e4c216164	+6288289943397	856379	2025-12-20 15:56:16.254	t	2025-12-20 22:51:16.259714
10a8c1c6-824c-48d6-8e95-a2d11dd27b15	+6288289943397	206096	2025-12-21 15:02:05.775	t	2025-12-21 21:57:05.785624
dd1b2da2-d71b-4b38-a71f-7790371a5a24	+62+6281234567890	155319	2025-12-21 15:05:14.114	t	2025-12-21 22:00:14.124795
75916f4a-857c-48c6-84c1-0bd6dab3b275	+6281234567890	437309	2025-12-21 15:06:38.581	t	2025-12-21 22:01:38.586022
f1905deb-b01b-4a23-a3cf-4d0c37533a9e	+6281234567891	841774	2025-12-21 15:09:35.864	t	2025-12-21 22:04:35.870646
644a2172-c595-4dd3-9ea7-e824ed3fbd5f	+628371892674	286516	2025-12-21 15:15:39.738	t	2025-12-21 22:10:39.743708
52e01c65-330c-4bcd-b177-bff69d9c8cb6	+62992789034	730486	2025-12-21 15:17:01.778	t	2025-12-21 22:12:01.783798
ab2de005-9e79-4dea-bdb8-9db2528976f5	+6288289943397	336687	2025-12-21 15:32:42.673	t	2025-12-21 22:27:42.674428
6151fe84-276a-4981-b12c-2c057c93c550	+629087655443	258660	2025-12-21 15:36:46.691	t	2025-12-21 22:31:46.696795
0d2bd8c5-503c-4183-b2ab-24304a1f2a1c	+6281234567890	273470	2025-12-22 12:42:23.555	t	2025-12-22 19:37:23.562213
cd430626-081a-4ee9-9158-a29f4da28469	+6281234567891	980465	2025-12-22 12:42:37.622	t	2025-12-22 19:37:37.622936
c417dc0f-db73-4814-8f7d-93f2544d706d	+62903900202	405094	2025-12-22 16:17:40.405	t	2025-12-22 23:12:40.406771
5dcd747b-5ac9-4aff-8fbe-9b8dcd5470c4	+62356789997	251513	2025-12-22 17:07:33.811	t	2025-12-23 00:02:33.817478
9aea3de5-5f0e-40b4-925c-ed8d894efd08	+629478302753	679810	2025-12-23 15:53:57.028	t	2025-12-23 22:48:57.030041
50a64e1c-e0ea-4c74-9cf7-487b6cc236ad	+6283718026564	243554	2025-12-23 16:02:55.343	t	2025-12-23 22:57:55.348634
fcc14cc0-ff6d-4b4f-8e66-dc313fbb303f	+627403708371	839672	2025-12-23 16:06:11.237	t	2025-12-23 23:01:11.243253
0562833b-5dff-4164-884a-ea789f8c0620	+6288289943397	895605	2025-12-23 16:36:19.53	t	2025-12-23 23:31:19.535694
feb082f0-f1d3-41d0-a5de-03b4c3f3d4c4	+628038888838	340781	2025-12-23 19:15:23.621	t	2025-12-24 02:10:23.622904
afafdc81-bda4-4965-91e2-f00075a1138f	+6281234567890	277346	2025-12-23 22:19:50.069	t	2025-12-24 05:14:50.07601
54e88ce3-305e-406c-889b-35860ee90216	+6281234567891	326096	2025-12-23 22:39:57.64	t	2025-12-24 05:34:57.641557
e89523d8-7027-4191-9759-cdf51747317c	+6281234567890	920329	2025-12-23 22:40:39.999	t	2025-12-24 05:35:40.004638
f057f266-c9bc-46c0-afa7-5162508b0620	+62876904326	115752	2025-12-23 22:45:49.158	t	2025-12-24 05:40:49.165069
2b929c14-1a1c-4b0f-b44d-0caa144b9a6f	+6281234567890	549115	2025-12-23 23:04:19.602	t	2025-12-24 05:59:19.609399
b0e3ae14-b9c9-43e6-abec-8fda6af78703	+6288289943397	803845	2025-12-24 05:35:14.728	t	2025-12-24 12:30:14.73375
d99893c4-9194-44fa-b8db-e61a8dbbc057	+6288289943397	547489	2025-12-24 05:50:28.487	t	2025-12-24 12:45:28.492345
3aae888b-494f-41e7-b6ab-123efd30b992	+627403707589	800565	2025-12-24 06:12:32.706	t	2025-12-24 13:07:32.71164
a37cd9f3-7efb-4f20-9abd-ccdbf4b98b77	+627403707583	326319	2025-12-25 08:25:52.662	t	2025-12-25 15:20:52.663062
1e66bed5-416e-4979-9075-df0100e59bc3	+628371802674	533521	2025-12-27 12:38:28.524	t	2025-12-27 19:33:28.524893
61ff840c-a391-42ee-8a7b-cc163c011282	+628371802674	684680	2025-12-27 12:38:59.272	t	2025-12-27 19:33:59.273407
53e38b06-033b-4eea-a225-042dc004d22b	+628371802674	903523	2025-12-27 12:39:29.808	t	2025-12-27 19:34:29.829495
0b9e5947-be9e-42e7-918d-dd5f53330044	+628371802674	842424	2025-12-27 12:42:45.371	t	2025-12-27 19:37:45.372117
1c0a4ae4-bdaa-43ac-92df-d5887f1e3634	+628371802674	970259	2025-12-27 12:43:09.526	t	2025-12-27 19:38:09.526702
f5a15cdc-4dc2-4a2b-ac09-f1f0b9b91b34	+62088289943397	566856	2025-12-27 12:59:51.073	f	2025-12-27 19:54:51.073633
2111c81b-bd27-49c1-9c88-d4ef9f9dd778	+62088289943397	967268	2025-12-27 13:20:27.354	t	2025-12-27 20:15:27.355145
6c5be6c0-cff5-4afc-b245-ba297d1be8ff	+62088289943399	828938	2025-12-27 13:21:35.203	t	2025-12-27 20:16:35.209895
e24fd5e6-db20-4557-ae83-6a54c2f87e11	+6288289943397	822654	2025-12-27 13:22:32.17	t	2025-12-27 20:17:32.171508
8ad5e2cc-26b3-4322-8da1-01a3ced1c2b4	+628371802674	867353	2025-12-27 17:17:09.637	t	2025-12-28 00:12:09.642061
6e90a32b-836e-4eff-93fd-e25a85b90539	+628371802674	119529	2025-12-27 17:18:22.732	t	2025-12-28 00:13:22.737835
28c58cb3-209b-4364-82f9-b7030cd8aaea	+626789234567	845129	2025-12-27 17:19:10.431	t	2025-12-28 00:14:10.436034
80b6013a-21c3-47f8-9e5c-0ee328d2be44	+6267892345674	320804	2025-12-27 17:20:46.216	t	2025-12-28 00:15:46.221944
a89fbd15-44bb-4aea-adc2-2f986baf1c88	+628371802674	206639	2025-12-27 17:30:25.865	t	2025-12-28 00:25:25.875245
bf44b8ee-154a-4512-88d3-a0eb6ee1a68f	+628371802674	164364	2025-12-27 17:30:53.813	t	2025-12-28 00:25:53.813596
1f9b9b8e-509b-4317-baec-11fb57428f5d	+628371802674	280279	2025-12-27 17:41:09.624	t	2025-12-28 00:36:09.629294
1a5315ca-75f8-4e1f-8bcf-2ef2c682fd3a	+628371802674	550103	2025-12-27 17:42:40.282	t	2025-12-28 00:37:40.286887
b1b2132b-92d2-4981-81d0-7cdd5d3341dd	+628371802674	197232	2025-12-27 17:46:56.225	t	2025-12-28 00:41:56.235111
7db2a22c-312e-4051-ab1f-814840d75017	+628371802674	606736	2025-12-27 18:02:02.974	t	2025-12-28 00:57:02.98297
4339911b-6918-4809-82e0-82f87893d767	+6288289943397	650413	2025-12-27 19:02:25.941	t	2025-12-28 01:57:25.943012
ec88ba5f-b276-4cbc-9b23-7e631f66a2fd	+628371802674	889055	2025-12-27 19:04:00.766	t	2025-12-28 01:59:00.767412
9350e418-e32b-46b7-a558-10c3d3d0539b	+628371802674	873822	2025-12-27 19:10:16.857	t	2025-12-28 02:05:16.858
cd1de441-642c-4975-9d33-c8cc28eeb438	+6281234567890	973887	2025-12-29 04:20:02.185	t	2025-12-29 11:15:02.186616
e023f401-dc78-4bfa-9e9f-70ed30e1620b	+62088289943397	961881	2025-12-29 04:28:20.043	t	2025-12-29 11:23:20.044406
5264b40f-33b1-4d59-8b82-85be216e058f	+6281234567891	133199	2025-12-29 04:29:49.175	t	2025-12-29 11:24:49.175676
915b4e39-6c24-40f1-9e57-77c8ce2a09ad	+626671802674	570987	2026-01-01 06:30:44.174	t	2026-01-01 13:25:44.175666
cf7c4347-181b-4b8d-a44a-89de488c9471	+628111111111	304081	2026-01-04 09:59:36.031	t	2026-01-04 16:54:36.032769
ccd0da66-01f9-4638-bec4-af82a849ebb0	+62811110004	985043	2026-01-04 10:04:06.019	t	2026-01-04 16:59:06.02171
b6b8d276-7fed-4021-8a2d-016566cdf420	+62811110007	360422	2026-01-04 10:05:00.192	t	2026-01-04 17:00:00.192676
e75de9f5-2dce-4c95-a6f3-e291c179671c	+62811110001	674325	2026-01-04 10:17:48.521	t	2026-01-04 17:12:48.523329
5fb4be2a-0ca6-4501-8f53-5dba213067e4	+62811110002	272615	2026-01-05 16:25:35.295	t	2026-01-05 23:20:35.296886
79dcd4c8-8163-416e-9626-ebbd76ed9806	+62811110003	393955	2026-01-05 16:27:59.208	t	2026-01-05 23:22:59.208982
6e13d20f-d011-4be8-9704-c03a71656f46	+62811110001	450351	2026-01-06 11:57:02.898	t	2026-01-06 18:52:02.900503
79a40f87-1d62-48c3-a7ee-bc8430919a2d	+628111111111	419697	2026-01-06 13:41:26.486	t	2026-01-06 20:36:26.486877
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.products (id, name, brand, price, original_price, image, category_id, description, nutrition) FROM stdin;
1adfb7cc-2b18-4537-80f4-6e2b10925a46	Thai Iced Coffee	ThaiCoffee Co	18000	\N	https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800	6e121962-f52e-453e-baf6-6f1125ab5635	Sweet iced coffee	\N
3	Potato Chips Original	Chitato	15000	\N	https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800	3	Crispy potato chips with original flavor.	\N
3f3871c3-034d-429a-a614-faf0752afc8a	Fresh Milk 1L	Dutch Mill	22000	\N	https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800	0b1a33de-4349-491a-91eb-33d6dddc1478	Full cream milk	\N
2	Organic Free Range Egg	Happy Farm	32000	\N	https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800	2	Premium organic eggs from free-range hens.	{"fat": "5g", "carbs": "0.5g", "protein": "6g", "calories": "70 kcal"}
0f697d7c-89ce-4675-b467-7c0d918b9c9e	Potato Chips	Lay's	15000	\N	https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800	3	Crispy salted chips	\N
4	Fresh Banana	Local Farm	8000	\N	https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800	4	Sweet and ripe bananas, perfect for snacking.	\N
4e909c8f-a7a9-476f-b3a9-9b2c41f0dca3	Frozen Fish Fillet	ThaiSea	50000	\N	https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800	348dcb73-fb25-4505-a6ff-69937004c4d7	Frozen white fish fillet	\N
5	Frozen Chicken Nuggets	Fiesta	45000	52000	https://images.unsplash.com/photo-1562158147-f9b6c2e6e4f7?w=800	5	Crispy chicken nuggets, ready to fry.	\N
504267e1-5038-44ee-95ab-102226211519	Milk	Nestle	100000	\N	https://images.unsplash.com/photo-1523294587484-bae6cc870010?w=800	1	hajajawiwowowjs	\N
6	Mineral Water 1.5L	Aqua	5500	\N	https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800	6	Pure mineral water from natural springs.	\N
623c3685-8f1d-45e2-b532-146e7c5383f8	Mango Thai	Local Farm	25000	\N	https://images.unsplash.com/photo-1553279768-865429fa0078?w=800	4	Fresh Thai mangoes	\N
6d4f280e-7cef-40ad-ad2a-e30cda01fdf9	full cream 	NESTLE	50000	70000	https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800	1	GOOD Quality 	\N
1	Fresh Full Cream Milk	Ultra Milk	18500	22000	https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800	1	Fresh pasteurized full cream milk, rich in calcium and vitamin D.	{"fat": "5g", "carbs": "12g", "protein": "8g", "calories": "120 kcal"}
7	Fresh Spinach	Organic Green	12000	\N	https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800	7	Fresh organic spinach, washed and ready to cook.	\N
8	Beef Rendang Ready	Kokita	35000	\N	https://images.unsplash.com/photo-1588347818036-79fd35816be5?w=800	8	Ready-to-eat beef rendang with authentic Indonesian taste.	\N
289c5fe4-c57d-4dab-82b0-05908bd0d98f	Frozen Squid	ThaiSea	55000	\N	https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800	348dcb73-fb25-4505-a6ff-69937004c4d7	Frozen squid rings	\N
89504978-d6e9-4592-b6bf-e6e4b24d1d73	Papaya Thai	Local Farm	20000	\N	https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=800	4	Fresh papaya from Thailand	\N
9ab9a245-b97e-44f3-963f-52ec5debf1c1	Fresh Yogurt	Dutch Mill	18000	\N	https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800	0b1a33de-4349-491a-91eb-33d6dddc1478	Plain fresh yogurt	\N
af0ba710-5725-4ce9-af80-508402b499aa	Green Tea Bottle	ThaiTea Co	15000	\N	https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800	6e121962-f52e-453e-baf6-6f1125ab5635	Refreshing Thai green tea	\N
bd14b39b-ff68-41ad-8cdb-556520a71ba0	Frozen Shrimp	ThaiSea	45000	\N	https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800	348dcb73-fb25-4505-a6ff-69937004c4d7	Frozen raw shrimp	\N
bf9b1775-febc-4e1a-91b0-677dc3e25962	Cassava Chips	ThaiSnack	12000	\N	https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800	3	Crispy cassava chips	\N
c92c4745-3a7a-41ef-96ed-baab8487030b	Coconut Water	CocoThai	18000	\N	https://images.unsplash.com/photo-1556881286-fc6915169721?w=800	6e121962-f52e-453e-baf6-6f1125ab5635	Refreshing coconut water	\N
e3972949-0fac-47d2-b841-d53f8653968d	Dragon Fruit	Local Farm	30000	\N	https://images.unsplash.com/photo-1527325678964-54921661f888?w=800	4	Fresh red dragon fruit	\N
e78c3b59-2e1a-4162-b142-3921b716efa3	Instant Noodles	Mama	12000	\N	https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800	3	Spicy instant noodles	\N
e7bcc651-d0e1-42e1-812c-f7b6bf63d0c3	eggs	Amanmart telur	20000	\N	https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800	2	bagus dan murah	\N
5aa89ae1-93df-4080-bcef-9ac1ff98cb10	Pasteurized Milk	Dutch Mill	20000	\N	https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800	0b1a33de-4349-491a-91eb-33d6dddc1478	Fresh pasteurized milk	\N
\.


--
-- Data for Name: store_inventory; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.store_inventory (id, store_id, product_id, stock_count, is_available, location) FROM stdin;
inventory-5	64292094-76fb-4cad-b89b-bbf1c3222e2b	5	25	t	\N
inventory-6	64292094-76fb-4cad-b89b-bbf1c3222e2b	6	200	t	\N
inventory-7	64292094-76fb-4cad-b89b-bbf1c3222e2b	7	20	t	\N
inventory-8	64292094-76fb-4cad-b89b-bbf1c3222e2b	8	10	t	\N
inventory-1	64292094-76fb-4cad-b89b-bbf1c3222e2b	1	50	t	\N
inventory-2	64292094-76fb-4cad-b89b-bbf1c3222e2b	2	30	t	\N
inventory-3	64292094-76fb-4cad-b89b-bbf1c3222e2b	3	100	t	\N
inventory-4	64292094-76fb-4cad-b89b-bbf1c3222e2b	4	45	t	\N
286aaf94-93b8-467e-b2d2-132fe411271b	64292094-76fb-4cad-b89b-bbf1c3222e2b	e7bcc651-d0e1-42e1-812c-f7b6bf63d0c3	100	t	\N
9a16dcd2-ac06-4c83-8c61-d51ba5f9ada4	64292094-76fb-4cad-b89b-bbf1c3222e2b	504267e1-5038-44ee-95ab-102226211519	100	t	\N
44f73ffa-c179-4d9d-a92d-8eb1484bdeeb	64292094-76fb-4cad-b89b-bbf1c3222e2b	6d4f280e-7cef-40ad-ad2a-e30cda01fdf9	12	t	Aisle 4
f1482e5a-a39f-420e-a4e2-cf35e7af5a5d	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	623c3685-8f1d-45e2-b532-146e7c5383f8	50	t	Shelf A1
9b7ea7c4-5fc2-4bc1-968a-6cf484bd75b8	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	c92c4745-3a7a-41ef-96ed-baab8487030b	30	t	Shelf B2
afdad36d-0603-4446-b85c-b0b14cf54319	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	0f697d7c-89ce-4675-b467-7c0d918b9c9e	40	t	Shelf C1
7bc9f70a-e4b3-4a86-ab08-c767ede9d2f9	a2e55995-abc7-4873-9ffe-872902ebd70d	af0ba710-5725-4ce9-af80-508402b499aa	40	t	Shelf B2
a0e67e5b-d995-41b1-b579-cb07bf4fdc81	a2e55995-abc7-4873-9ffe-872902ebd70d	e78c3b59-2e1a-4162-b142-3921b716efa3	100	t	Shelf C1
f504fcfb-fa37-42b3-8efe-17c968627b52	a2e55995-abc7-4873-9ffe-872902ebd70d	9ab9a245-b97e-44f3-963f-52ec5debf1c1	30	t	Refrigerator 1
3a820f93-b4a1-4038-a2c7-7a87f0402218	a2e55995-abc7-4873-9ffe-872902ebd70d	4e909c8f-a7a9-476f-b3a9-9b2c41f0dca3	20	t	Freezer 2
bb2bd301-65ba-44d9-bc86-2da4e165b3f3	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	e3972949-0fac-47d2-b841-d53f8653968d	50	t	Shelf A1
9d9c56e0-bebd-46ad-b74e-bfa0b4234272	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	1adfb7cc-2b18-4537-80f4-6e2b10925a46	70	t	Shelf B2
08520a7e-131b-4848-96e4-954857be4fd6	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	bf9b1775-febc-4e1a-91b0-677dc3e25962	80	t	Shelf C1
a217165a-6c62-46c0-a895-227262c37190	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	5aa89ae1-93df-4080-bcef-9ac1ff98cb10	40	t	Refrigerator 1
628714dc-beee-4f19-bcd4-9125f6c7e431	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	289c5fe4-c57d-4dab-82b0-05908bd0d98f	25	t	Freezer 1
77a082df-32f3-4ace-8ee1-5ffaf192359c	a2e55995-abc7-4873-9ffe-872902ebd70d	89504978-d6e9-4592-b6bf-e6e4b24d1d73	0	t	Shelf A1
cc0145d9-6f1c-451a-870f-ed47a69efd2e	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	bd14b39b-ff68-41ad-8cdb-556520a71ba0	1	t	Freezer 2
c23c04d3-dd78-48c0-97df-1dac0a7c8445	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	3f3871c3-034d-429a-a614-faf0752afc8a	25	t	Refrigerator 1
\.


--
-- Data for Name: store_staff; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.store_staff (id, user_id, store_id, role, status, last_status_change, created_at) FROM stdin;
staff-driver-1	demo-driver	64292094-76fb-4cad-b89b-bbf1c3222e2b	driver	online	2025-12-20 21:53:43.747784	2025-12-20 21:53:43.747784
53fa0453-8144-4fa8-88a6-471d46d405fb	548ab0a7-483b-4360-8d6c-384edbc1e2d0	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	picker	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
e50a320e-400f-47ec-ade1-9c103e63328d	fb832783-0770-4f0f-8c93-e4b4cb4c26ae	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	driver	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
acbcfe92-7d50-4b24-9e51-d63cf3421b30	9e0cbb85-1be8-48ef-84b7-91adfc7dc574	ea585ac6-7c31-470b-9dd3-8f8024d4fab6	driver	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
c45c7523-a937-49fa-a663-cc502bb0772b	567b6e3e-8130-4452-a43b-bb23528d2941	74fc2edb-ded0-4358-a8ea-61815d18c126	picker	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
b4156d44-6518-47d6-a653-67d88099dfe6	c2868b6b-c95f-497c-abc1-4057e57d576a	74fc2edb-ded0-4358-a8ea-61815d18c126	driver	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
a027d238-a4e9-4896-a34b-7e337e719625	f0f9b33a-3a05-4798-8f96-bc508c694e86	74fc2edb-ded0-4358-a8ea-61815d18c126	driver	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
52135c1f-a19f-4585-bb28-592219b986e9	ac284d42-c764-4b5f-8f17-d2683ba84256	82c17fca-bcf1-4b39-8464-e80436fa6889	picker	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
d2382ccd-d8ef-459e-abe4-1ee29bf3d76e	35d7333b-8767-44fa-9bfb-be799a4ccbab	82c17fca-bcf1-4b39-8464-e80436fa6889	+62811110008	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
053f78f1-879a-40b2-a43b-078cafcd53a4	298ce4b8-2e32-4f93-9d09-75294ea72075	82c17fca-bcf1-4b39-8464-e80436fa6889	+62811110009	online	2026-01-01 22:21:47.014521	2026-01-01 22:21:47.014521
fee18a60-bf82-4e19-b1f7-df6e64628682	ac9016d2-03da-4dbb-89da-2b38694348b5	a2e55995-abc7-4873-9ffe-872902ebd70d	picker	online	2026-01-01 22:26:05.726118	2026-01-01 22:26:05.726118
661fc4c2-c027-4f60-a473-faa955041efb	1116f653-c330-4337-a2c6-0c7e5ecf2d9d	a2e55995-abc7-4873-9ffe-872902ebd70d	driver	online	2026-01-01 22:26:05.726118	2026-01-01 22:26:05.726118
63863bab-a6e3-4e09-8b9f-ff4aaf5866c0	90b92569-0dcd-4e61-9bdc-e941ab8ed86d	a2e55995-abc7-4873-9ffe-872902ebd70d	driver	online	2026-01-01 22:26:05.726118	2026-01-01 22:26:05.726118
349712cf-6f4d-4adc-9e1f-f382c679b57d	1e9774c0-80ab-4c02-b9ad-37075b79720b	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	picker	online	2026-01-01 22:27:09.991424	2026-01-01 22:27:09.991424
9402e89d-d428-46f2-8ef0-4e66ca558342	b7ef76b8-07bb-42e1-b97d-6b1adfd55650	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	driver	online	2026-01-01 22:27:09.991424	2026-01-01 22:27:09.991424
434780f6-9908-4a45-9ce7-2a85865ab1bf	76b7d679-7bb7-4318-9208-ca74f7e27184	6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	driver	online	2026-01-01 22:27:09.991424	2026-01-01 22:27:09.991424
b3af287a-c78a-4e45-8f4c-f3285675e421	9cbc935c-5511-444f-8aaf-7ca048844cba	64292094-76fb-4cad-b89b-bbf1c3222e2b	picker	online	2026-01-05 08:17:26.683	2025-12-21 22:29:07.234346
staff-picker-1	demo-picker	64292094-76fb-4cad-b89b-bbf1c3222e2b	picker	online	2026-01-05 08:17:27.705	2025-12-20 21:53:43.747784
staff-1	demo-picker	df21492b-8107-43e9-8893-8a96a8864cc0	picker	online	2026-01-05 08:17:27.705	2025-12-26 23:02:34.308089
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.stores (id, name, address, latitude, longitude, owner_id, cod_allowed, is_active, created_at) FROM stdin;
ea585ac6-7c31-470b-9dd3-8f8024d4fab6	Siam Grocery	123 Rama VI Rd, Thung Phaya Thai, Ratchathewi, Bangkok 10400	13.7874000	100.4932000	\N	t	t	2026-01-01 22:20:12.701514
74fc2edb-ded0-4358-a8ea-61815d18c126	Bangkok Fresh Mart	45 Phaholyothin Rd, Samsen Nai, Phaya Thai, Bangkok 10400	13.7828000	100.4985000	\N	t	t	2026-01-01 22:20:12.701514
82c17fca-bcf1-4b39-8464-e80436fa6889	Chao Phraya Foods	78 Charan Sanitwong Rd, Bang Khun Non, Bangkok Noi, Bangkok 10700	13.7901000	100.4856000	\N	t	t	2026-01-01 22:20:12.701514
a2e55995-abc7-4873-9ffe-872902ebd70d	Bang Phlat Market	7 Sirindhorn Rd, Bang Bumru, Bang Phlat, Bangkok 10700	13.7845000	100.4950000	\N	t	t	2026-01-01 22:25:53.675039
6b3c15bf-2f1e-4dd2-a70d-0fd32f0428d6	Charoen Thai Mart	9 Sirindhorn Rd, Bang Bumru, Bang Phlat, Bangkok 10700	13.7850000	100.4960000	\N	t	t	2026-01-01 22:27:01.544819
df21492b-8107-43e9-8893-8a96a8864cc0	Amanmart Malang	Jl Suarabaya no 5	-7.9575700	112.6172285	\N	t	t	2025-12-20 22:14:35.529608
64292094-76fb-4cad-b89b-bbf1c3222e2b	ZendO Central Jakarta	Jl. Sudirman No. 1, Central Jakarta, DKI Jakarta 10220	-7.9800000	112.6200000	\N	t	t	2025-12-20 21:53:43.744985
145cc187-aad6-4693-b208-fa7c1498b5a0	Amanmart Malang	5 Soi Sirindhorn 1Khwaeng Bang Bumru, Khet Bang Phlat, Krung Thep Maha Nakhon 10700	-6.2088000	106.8456000	\N	t	t	2026-01-06 12:50:23.937137
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users (id, username, password, phone, email, apple_id, google_id, role, created_at, area_id, store_id, name, push_token) FROM stdin;
demo-user	demo	demo	+62123456789	\N	\N	\N	customer	2025-12-20 21:53:43.735899	\N	\N	\N	\N
5713f1ec-89be-483a-9cb1-7f642e2eeb72	user_7890	gbhd7foj	+62+6281234567890	\N	\N	\N	customer	2025-12-21 22:00:22.070526	\N	\N	\N	\N
e514e2e0-f0d8-44dd-b623-714972207d48	user_2674	b9e4dlni	+628371892674	\N	\N	\N	customer	2025-12-21 22:10:47.511269	\N	\N	\N	\N
69ad7e93-a1ec-4d11-93ac-bdebea0c0f92	user_9034	vvqyte5a	+62992789034	\N	\N	\N	customer	2025-12-21 22:12:12.71486	\N	\N	\N	\N
9cbc935c-5511-444f-8aaf-7ca048844cba	staff_1766330947230_ka03e3	placeholder_will_login_via_otp	+62874037074	amanmartmalangpicker@ZendO.com	\N	\N	picker	2025-12-21 22:29:07.231529	\N	\N	\N	\N
4104e0a6-27c9-41cd-8ad4-74accc803860	user_5443	fzggvhin	+629087655443	\N	\N	\N	customer	2025-12-21 22:32:13.43038	\N	\N	\N	\N
633a1033-965b-4d8f-87e3-569a5342cd13	user_0202	bcr6cxs8	+62903900202	\N	\N	\N	customer	2025-12-22 23:12:49.371787	\N	\N	\N	\N
154dbc9b-de36-40cf-a34c-50dca0a11a13	user_9997	7pmgkxw6	+62356789997	\N	\N	\N	customer	2025-12-23 00:02:41.157737	\N	\N	\N	\N
6f0fed4c-55a5-4746-877e-b7c2e3bff069	user_2753	hx91tmtm	+629478302753	\N	\N	\N	customer	2025-12-23 22:49:07.632104	\N	\N	\N	\N
9713f5d2-a42d-42ae-a59a-cd5272aa84e7	user_6564	61f3q138	+6283718026564	\N	\N	\N	customer	2025-12-23 22:58:04.331875	\N	\N	\N	\N
2cb4ba77-a959-45ce-ae91-090410d3768d	user_8371	zui0cv1h	+627403708371	\N	\N	\N	customer	2025-12-23 23:01:22.060861	\N	\N	\N	\N
42adacd2-06bf-4533-997d-f8b6d9ce7fef	user_8838	v0f97lwh	+628038888838	\N	\N	\N	customer	2025-12-24 02:10:31.036312	\N	\N	\N	\N
fb73e417-a68a-4e32-b4d4-21c3e1a0b9b8	user_4326	jtfxcpmd	+62876904326	\N	\N	\N	customer	2025-12-24 05:41:01.584514	\N	\N	\N	\N
3fc88176-d2e7-4891-a76d-e1ed2dec883e	user_7589	x2gi71q2	+627403707589	\N	\N	\N	customer	2025-12-24 13:07:41.699885	\N	\N	\N	\N
952d6800-42da-4fcd-940b-46d51e88449e	user_7583	4fauat1i	+627403707583	\N	\N	\N	customer	2025-12-25 15:21:02.825602	\N	\N	\N	\N
cd05619d-30bd-4ab4-ad58-663c717d1754	user_3399	615qxurq	+62088289943399	\N	\N	\N	customer	2025-12-27 20:16:45.561878	\N	\N	\N	\N
34c298a8-276f-409b-9b93-bdb58a97defd	user_4567	j0s0gbif	+626789234567	\N	\N	\N	customer	2025-12-28 00:14:20.47557	\N	\N	\N	\N
3f9fdf73-5799-40f4-a8a6-12559db862ac	user_5674	appan0a4	+6267892345674	\N	\N	\N	customer	2025-12-28 00:15:58.644046	\N	\N	\N	\N
862eddbe-9ef6-475a-abd8-84e892ad8b8f	user_3397	123456	+6288289943397	\N	\N	\N	admin	2025-12-20 22:51:26.852887	\N	\N	Main Super Admin	\N
a7c4acb8-2c6d-4851-9f7d-bc9c9e276621	cheick tidiani diawara_9232	123456	+628371802674	tidianidiawara97@gmail.com	\N	\N	customer	2025-12-28 01:59:09.233806	\N	\N	\N	\N
demo-picker	picker1	123456	+6281234567890	\N	\N	\N	picker	2025-12-20 21:53:43.746976	\N	\N	\N	\N
864a40e9-5860-458c-beea-d783e1062ced	cheics_9991	123456	+62088289943397	tidianidiawaru7@gmail.com	\N	\N	customer	2025-12-29 11:23:39.992725	\N	\N	\N	\N
demo-driver	driver1	124567	+6281234567891	\N	\N	\N	driver	2025-12-20 21:53:43.746976	\N	\N	\N	\N
d7922e9f-3754-4bc6-872c-88d6fe9a587b	Fhina_3477	123456	+626671802674	fhina@gmail.com	\N	\N	customer	2026-01-01 13:25:53.478026	\N	\N	\N	\N
c2868b6b-c95f-497c-abc1-4057e57d576a	fresh_driver1	password123	+62811110005	\N	\N	\N	driver	2026-01-01 22:21:47.014521	\N	\N	Driver 1 Fresh	\N
f0f9b33a-3a05-4798-8f96-bc508c694e86	fresh_driver2	password123	+62811110006	\N	\N	\N	driver	2026-01-01 22:21:47.014521	\N	\N	Driver 2 Fresh	\N
35d7333b-8767-44fa-9bfb-be799a4ccbab	chao_driver1	password123	driver	\N	\N	\N	+62811110008	2026-01-01 22:21:47.014521	\N	\N	Driver 1 Chao	\N
298ce4b8-2e32-4f93-9d09-75294ea72075	chao_driver2	password123	driver	\N	\N	\N	+62811110009	2026-01-01 22:21:47.014521	\N	\N	Driver 2 Chao	\N
1116f653-c330-4337-a2c6-0c7e5ecf2d9d	bp-driver1	password123	+628122222222	\N	\N	\N	driver	2026-01-01 22:26:05.726118	\N	\N	Driver 1 BP	\N
90b92569-0dcd-4e61-9bdc-e941ab8ed86d	bp-driver2	password123	+628133333333	\N	\N	\N	driver	2026-01-01 22:26:05.726118	\N	\N	Driver 2 BP	\N
1e9774c0-80ab-4c02-b9ad-37075b79720b	ct-picker	password123	+628144444444	\N	\N	\N	picker	2026-01-01 22:27:09.991424	\N	\N	Picker CT	\N
b7ef76b8-07bb-42e1-b97d-6b1adfd55650	ct-driver1	password123	+628155555555	\N	\N	\N	driver	2026-01-01 22:27:09.991424	\N	\N	Driver 1 CT	\N
76b7d679-7bb7-4318-9208-ca74f7e27184	ct-driver2	password123	+628166666666	\N	\N	\N	driver	2026-01-01 22:27:09.991424	\N	\N	Driver 2 CT	\N
567b6e3e-8130-4452-a43b-bb23528d2941	fresh_picker	123456	+62811110004	\N	\N	\N	picker	2026-01-01 22:21:47.014521	\N	\N	Picker Fresh	\N
ac284d42-c764-4b5f-8f17-d2683ba84256	chao_picker	123456	+62811110007	\N	\N	\N	picker	2026-01-01 22:21:47.014521	\N	\N	Picker Chao	\N
fb832783-0770-4f0f-8c93-e4b4cb4c26ae	siam_driver1	123456	+62811110002	\N	\N	\N	driver	2026-01-01 22:21:47.014521	\N	\N	Driver 1 Siam	\N
9e0cbb85-1be8-48ef-84b7-91adfc7dc574	siam_driver2	123456	+62811110003	\N	\N	\N	driver	2026-01-01 22:21:47.014521	\N	\N	Driver 2 Siam	\N
548ab0a7-483b-4360-8d6c-384edbc1e2d0	siam_picker	123456	+62811110001	\N	\N	\N	picker	2026-01-01 22:21:47.014521	\N	\N	Picker Siam	\N
ac9016d2-03da-4dbb-89da-2b38694348b5	bp-picker	123456	+628111111111	\N	\N	\N	picker	2026-01-01 22:26:05.726118	\N	\N	Picker BP	\N
\.


--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.vouchers (id, code, discount, discount_type, min_order, valid_until, description) FROM stdin;
1	NEWUSER50	50	percentage	50000	2025-12-27 14:53:43.751	50% off for new users
2	FREEDELIVERY	15000	fixed	75000	2026-01-03 14:53:43.751	Free delivery for orders above Rp75,000
\.


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: store_inventory store_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_inventory
    ADD CONSTRAINT store_inventory_pkey PRIMARY KEY (id);


--
-- Name: store_staff store_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_staff
    ADD CONSTRAINT store_staff_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vouchers vouchers_code_unique; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_unique UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart_items cart_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: cart_items cart_items_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages messages_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: messages messages_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_address_id_addresses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_addresses_id_fk FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- Name: orders orders_driver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_users_id_fk FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: orders orders_picker_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_picker_id_users_id_fk FOREIGN KEY (picker_id) REFERENCES public.users(id);


--
-- Name: orders orders_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: store_inventory store_inventory_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_inventory
    ADD CONSTRAINT store_inventory_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: store_inventory store_inventory_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_inventory
    ADD CONSTRAINT store_inventory_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: store_staff store_staff_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_staff
    ADD CONSTRAINT store_staff_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: store_staff store_staff_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.store_staff
    ADD CONSTRAINT store_staff_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stores stores_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict GHQd5ObNogMGGhVbwgrASXOVHgkeCyGeRKZP9XrHndt5fPhix07Y79LLUeEbT01

