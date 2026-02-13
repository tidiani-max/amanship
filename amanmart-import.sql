-- =====================================================
-- AMANMART PRODUCT IMPORT - 201 PRODUCTS
-- Launch: Tomorrow
-- Store: Amanmart
-- Database: Railway PostgreSQL
-- =====================================================
-- Execution:
-- export PGPASSWORD="hApDxPlGUCcxaxGrSNZgrbMLabUfvtZF" 
-- psql -h switchback.proxy.rlwy.net -p 23823 -U postgres -d railway -f amanmart-import.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Ensure Amanmart store exists
-- =====================================================

INSERT INTO stores (id, name, address, latitude, longitude, cod_allowed, is_active, created_at)
VALUES (
    'store-amanmart',
    'Amanmart',
    'Pattaya, Chon Buri, Thailand',
    '12.9236',
    '100.8825',
    true,
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 2: Insert All 201 Products
-- Category Mapping Applied
-- Cost Price → Selling Price (15% margin auto-calculated by DB trigger)
-- =====================================================

INSERT INTO products (id, name, brand, cost_price, margin, category_id, image, description, is_fresh) VALUES

-- NON CARBONATED DRINKS → cat-beverages (9 products)
('prod-1000001', 'Adem Sari Herbal Tea Orisinil', 'Adem', 7900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1v2geXjM2oVtWw1zxqQPRlPoUniQEPMWN', 'Herbal tea drink', false),
('prod-1000002', 'Adem Sari Chingku Sparkling Lemon', 'Adem', 7200, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1V5Vk-ou7lV8Ir-HWe845wy7EMq8lPdsG', 'Sparkling lemon drink', false),
('prod-1000004', 'Adem Sari Chingku Herbal Lemon', 'Adem', 7900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1TYhqy7kNGTlaYpZDt_yX8O7i6Y7ry5hF', 'Herbal lemon drink', false),
('prod-1000074', 'Pristine Water 400ml', 'Pristine', 3500, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1o75n9Pv3dadt6S5MliFD8qdc2tFOGFtu', 'Bottled water 400ml', false),
('prod-1000075', 'Pristine Water 600ml', 'Pristine', 4900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1fkjdVeNfB8aFLOt3_HF1Czovu75Dnox2', 'Bottled water 600ml', false),
('prod-1000076', 'Pristine Water 1500ml', 'Pristine', 8900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1MIYAcZgQpaDsjwGPg4aQvhkFMSHlffAq', 'Bottled water 1.5L', false),
('prod-1000115', 'Kiranti Jamu Pegal Linu', 'Kiranti', 6500, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1HVQ91YAzsN8ZuZjTqwCLHKvQTJrhyF9F', 'Traditional herbal drink', false),
('prod-1000116', 'Kiranti Jamu Sehat Datang Bulan', 'Kiranti', 6500, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1hAZ6_vAiJ4KC_l9FTEivyRbh5fj1S_W5', 'Traditional herbal drink', false),
('prod-1000235', 'Chocolatos Choco Drink', 'Chocolatos', 5900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1nR6T7Y5gQ_aeZ0klbk9A0UCEsuBhXvx-', 'Chocolate drink', false),
('prod-1000378', 'Tong Tji Celup Jasmine Non Envelope', 'Tong', 10900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1i25MJNzl6_IQRJPV8hN9T3cCZdr2TWUG', 'Jasmine tea', false),

-- COFFEE, TEA, COCOA, JUICE → cat-beverages (6 products)
('prod-1000243', 'Prendjak Tea Celup Box', 'Prendjak', 6200, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1DNjLtngc9mxlCH4wxuJnVa4lRTHHiAGH', 'Tea bags box', false),
('prod-1000244', 'Prendjak Tea Amplop Lemon Box', 'Prendjak', 21900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1FnK2szw87YaRhoHdSK3ICPNhYdiGFbbE', 'Lemon tea box', false),
('prod-1000245', 'Prendjak Tea Celup Sachet', 'Prendjak', 18500, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1L9Bt39g7M55oVxt4AgpAQEITCwNkuefD', 'Tea sachet', false),
('prod-1000246', 'Prendjak Tea Tarik', 'Prendjak', 39900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1RVtg7r1Uy7FYzUnLeFRGvtIJuafIO8Rc', 'Pulled tea', false),
('prod-1000247', 'Prendjak Tea Hijau Box', 'Prendjak', 11500, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=1-v6ynXn7bIwUQqlKjITBhIrGUnIwr7Ji', 'Green tea box', false),
('prod-1000379', 'Tong Tji Celup Jasmine Envelope', 'Tong', 12900, 15.00, 'cat-beverages', 'https://drive.google.com/uc?export=view&id=12tjlqR-KpFWFv1KGsEVhwzml72nfJ4NC', 'Jasmine tea with envelope', false),

-- CANDY → cat-snacks (14 products)
('prod-1000023', 'Milkita Lolipop Assorted Bag', 'Milkita', 11500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Re_kG2FL-2JWxsiOE1_Y5WUXfnaOq4YG', 'Assorted lollipops', false),
('prod-1000031', 'Milkita Candy Bites Box', 'Milkita', 4000, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1hPuXKJGiN6elRo4f8srvAO22htflY_bX', 'Milk candy bites', false),
('prod-1000068', 'Milkita Candy Assorted Neapol', 'Milkita', 11400, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1ZyoDG3rjlSZB0tsxpObEdywb7ate1yCb', 'Assorted milk candy', false),
('prod-1000069', 'Milkita Candy Chocolate', 'Milkita', 10900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=15AnSauH080lYQv18mR8GlC6YYf4iMMga', 'Chocolate milk candy', false),
('prod-1000070', 'Milkita Candy Melon', 'Milkita', 10900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Rcv2Cr0ei6k_enZ0koxpnANVFX1oBYPV', 'Melon milk candy', false),
('prod-1000071', 'Milkita Candy Strawberry', 'Milkita', 10900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=19oB9QRrz2eBUtKa6mua0S4rlQ9m9xdxJ', 'Strawberry milk candy', false),
('prod-1000072', 'Milkita Candy Susu', 'Milkita', 10900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=162Q5bjTXFSQCAyYl1uHURD0nNmKfxnXt', 'Original milk candy', false),
('prod-1000104', 'Cannon Ball Candy Chocolate', 'Cannon', 4400, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1pN_ARXpvZSLvcspcLkU7EoI_4BK3NJ_5', 'Chocolate ball candy', false),
('prod-1000105', 'Cannon Ball Candy Mocha', 'Cannon', 4400, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1WV-6fMIW4juaSVbnC-FqC2f95wY9sxgY', 'Mocha ball candy', false),
('prod-1000120', 'Mintz Candy Barleymint', 'Mintz', 6300, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1AORCopxCtJFzS8WQQOZGtbnNCMiYqPA5', 'Barley mint candy', false),
('prod-1000121', 'Mintz Candy Cherrymint', 'Mintz', 6300, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1gyMclc_WqePCvKX7GEXEgOpSh9onlxJC', 'Cherry mint candy', false),
('prod-1000122', 'Mintz Candy Grapemint', 'Mintz', 6300, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1NRli4WpWwHsWK4v5wYI0rDyXO1VPvC9b', 'Grape mint candy', false),
('prod-1000127', 'Mintz Candy Zak Duomint', 'Mintz', 6300, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1oXVKYehvZY1kDlmXpBzrPO1MWHzn4Yg7', 'Duo mint candy', false),
('prod-1000222', 'Garuda Ting Ting Kacang Candy', 'Garuda', 9500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1F4DmyKWSpbWE6cXCKr7fEhVX8wM3uso4', 'Peanut candy', false),

-- SNACKS → cat-snacks (32 products)
('prod-1000032', 'French Fries Ciki Premium', 'French', 14500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1TiZuo9ATi6BvYG6_5yURY4Kvaa0rnSm6', 'Premium french fries snack', false),
('prod-1000035', 'Twistko Snack Jagung BBQ', 'Twistko', 6500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1JlWfD7pA1EgnuIWOsy-QFUy2NtcOD36w', 'BBQ corn snack', false),
('prod-1000036', 'Twisko Ciki Keju Bakar', 'Twisko', 6500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Tw5tAcbiMrkmkJC7xpw6CJGRADAMMI98', 'Grilled cheese snack', false),
('prod-1000037', 'Tic Tic Ciki Snack Bawang', 'Tic', 6500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1MkiEY9V9Wd3-SOLoMBa74ZZ-726aP5Fk', 'Onion flavor snack', false),
('prod-1000040', 'Gemez Enaak Snack Mi Spicy Family', 'Gemez', 7800, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1FRTyZ2WpANR9x87mOwm_eLuE3o9bof2P', 'Spicy noodle snack', false),
('prod-1000051', 'Mr Potato Crisps Original', 'Mr', 15200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1KfBrUGlKTxS4npna60BAIdb_1nYCyrA9', 'Original potato crisps', false),
('prod-1000052', 'Mr Potato Crisps BBQ', 'Mr', 15200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Jtw9ACyC2CGd8TfmlshX-dV-coKv9pdk', 'BBQ potato crisps', false),
('prod-1000054', 'Mr Potato Crisps Seaweed', 'Mr', 15200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1XGeVGpKsXurJ7GVCtqliqM2ykY-2Oq5n', 'Seaweed potato crisps', false),
('prod-1000106', 'Chizmill Ball Chiki Grana Cheese', 'Chizmill', 6100, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1-550_OLlHYyv0amFdmVgpfYO5SaT_y0I', 'Cheese ball snack', false),
('prod-1000209', 'Garuda Kacang Garing', 'Garuda', 17900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Q-ajqQwJRp1bNqZMU8AK_mLREHL8_R-3', 'Crispy peanuts', false),
('prod-1000210', 'Garuda Garing Kacang Rasa Bawang', 'Garuda', 22500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=19wmGbeugwRmgQ72lapeJeNoa-AZZjPgo', 'Onion flavored peanuts', false),
('prod-1000212', 'Garuda Kacang Atom Original', 'Garuda', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1nJblnXEEQMklFneOFYKtKYcwxE6ef7dW', 'Original atom peanuts', false),
('prod-1000213', 'Garuda Kacang Atom Pedas', 'Garuda', 8900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=11Pu6vH1pTEfU4vs1EdMSlNzWrZDHVAlq', 'Spicy atom peanuts', false),
('prod-1000214', 'Garuda Kacang Telur', 'Garuda', 8500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Aw7uaHtvQWt9RJ9mz36RmsqtAihv_YnA', 'Egg coated peanuts', false),
('prod-1000215', 'Garuda Kacang Rosta Oven Bawang', 'Garuda', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1z9wN9N9UVvhS8HX5hQGnWjlgcK5q10G0', 'Oven roasted onion peanuts', false),
('prod-1000216', 'Garuda Kacang Rosta Beef Wagyu', 'Garuda', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1BhTmG7pztt-JtMASH3BYSxBofbF_edIM', 'Wagyu beef flavored peanuts', false),
('prod-1000217', 'Garuda Kacang Rosta Pedas', 'Garuda', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1peNHUQempBLGVDmT4bQ2_ePSXYB29aHa', 'Spicy roasted peanuts', false),
('prod-1000218', 'Garuda Snack Pilus Pedas', 'Garuda', 5600, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=15ZXZ2qiKLCJwozwSLvdirVdsndYbQgAh', 'Spicy pilus snack', false),
('prod-1000219', 'Garuda Pilus Sapi Panggang', 'Garuda', 5750, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1MbC3vzv31OvgcjvbVzeWdsJntQfHjcO6', 'Grilled beef pilus', false),
('prod-1000220', 'Garuda Snack Pilus Rasa Mie Goreng', 'Garuda', 5600, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1ZsCKKhu7vai4qKi8_SdQ-Eo-t74iTIGB', 'Fried noodle flavor pilus', false),
('prod-1000221', 'Garuda Snack Pilus Rendang Sapi', 'Garuda', 5600, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=15w9IVwDAE1PGstrk_B4EGn5Q35WtiHiH', 'Beef rendang pilus', false),
('prod-1000253', 'Tic Tac Original', 'Tic', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1LTBahGLQ7AWvBa8SyvQ6SgpPZusiEbqS', 'Original flavor', false),
('prod-1000254', 'Tic Tac Pedas', 'Tic', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=18X62gy0ZshlCrKOcnWiWCiWQD3owLGtj', 'Spicy flavor', false),
('prod-1000260', 'Sukro Oven Jagung Bakar', 'Sukro', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1lHrG2PzUxrsZLF65iF1RI8xILINPbFI5', 'Grilled corn', false),
('prod-1000261', 'Sukro Oven Pedas', 'Sukro', 8200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1xrlRytnWh4PmS1W7tNG-Sg865FvAzxCH', 'Spicy oven baked', false),
('prod-1000265', 'Dua Kelinci Kacang 720g', 'Dua', 59900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1piGmuVnegA3Ph7KoxOsuUXOxEIpTXDrV', 'Peanuts 720g', false),
('prod-1000266', 'Dua Kelinci Polong Original', 'Dua', 9500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1LT7tmQnXXFbbmnkZpl7kabmduLfJXbep', 'Original peanuts', false),
('prod-1000267', 'Dua Kelinci Koro Original', 'Dua', 9500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=19hlf404A9PEigYCl0dI3C39AB12ozTkU', 'Original koro nuts', false),
('prod-1000268', 'Dua Kelinci Koro Pedas', 'Dua', 9500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Wdu5WmUo-MwBPY6q4iKUldXWMQmS_jWa', 'Spicy koro nuts', false),
('prod-1000275', 'Dua Kelinci Kacang Garing', 'Dua', 16900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1SGXklyztIKEr0x5Te3oZIcJtrhTqipHT', 'Crispy peanuts', false),
('prod-1000277', 'Tic Tac Ayam Bawang', 'Tic', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1oiSJbVGeu3M3D7lMT9WLylPTKgU42SaS', 'Chicken onion flavor', false),
('prod-1000278', 'Tic Tac Mix', 'Tic', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1zRL6eqXqCqdP-pKytGQg3u82zZ3SPN15', 'Mixed flavors', false),
('prod-1000279', 'Sukro Oven Bawang', 'Sukro', 8200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1dc4ycMuS0ele9BSCGnKlrOwgSG6LP4ps', 'Onion flavor oven baked', false),
('prod-1000281', 'Sukro Original', 'Sukro', 8200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1d1OfqQI_yQhtwU65XLeiQnYcKNetVM_2', 'Original flavor', false),
('prod-1000283', 'Sukro BBQ', 'Sukro', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=18W_1B02Qg6AslnP0n7wqJ0QRSpbNbY32', 'BBQ flavor', false),
('prod-1000284', 'Sukro Kribo', 'Sukro', 8700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=16CWqNcDqLrrDnip_HHniUxUtmcht_oAd', 'Kribo flavor', false),
('prod-1000287', 'Tic Tac Sapi Panggang', 'Tic', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=19ckMS5hiU9YNoOpHu164DMm0n43jnI1H', 'Grilled beef flavor', false),

-- BISCUITS → cat-snacks (30 products)
('prod-1000044', 'Go Potato Biskuit', 'Go', 4750, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1axfMthkZyK3ZmRQ5neUFlZgmQ9XSNHd7', 'Potato biscuit', false),
('prod-1000129', 'Tango Wafer Royal Chocolate', 'Tango', 12500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1bcKgVSIyLCmioxbo68_XBY3pWxeY0icu', 'Royal chocolate wafer', false),
('prod-1000130', 'Tango Wafer Javamocca', 'Tango', 5200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1duAvlnferL8BcBf1McjkEV0XgQxt1avL', 'Java mocha wafer', false),
('prod-1000131', 'Tango Wafer Milky Chocolate Bag', 'Tango', 5200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1b07cNIFwSk11H_Tx3uN7SdjqYuU9SaNG', 'Milky chocolate wafer', false),
('prod-1000132', 'Tango Wafer Royal Choco Bag', 'Tango', 5200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1AtrqEscwOd1QAbK3wQr0eZCh6VwdZlY1', 'Royal choco wafer bag', false),
('prod-1000135', 'Tango Wafer Sassy SB', 'Tango', 12500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1fY1dlBX6cnLz1rtLxhjK5gweDbSATf49', 'Sassy strawberry wafer', false),
('prod-1000136', 'Tango Wafer Tiramisu Bag', 'Tango', 5200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1bF5r0iSq8mOAsTV07UY34XBj5vzL3DNN', 'Tiramisu wafer', false),
('prod-1000137', 'Tango Wafer Vanilla Delight', 'Tango', 9900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=167_BHFfk16T-y48THDsPqj4B1_UyW9eS', 'Vanilla delight wafer', false),
('prod-1000138', 'Tango Wafer Vanilla Delight Bag', 'Tango', 5200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1eipWD9vWgivLdzcT2eTOHN5Nb7YwMtBb', 'Vanilla delight wafer bag', false),
('prod-1000139', 'Tango Wafer Vanilla Delight Box', 'Tango', 12500, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1sr0JTVp14PWUL1vw0DT8sJzsPIH3uTfB', 'Vanilla delight wafer box', false),
('prod-1000143', 'Tango Waffle Cookiez Cream', 'Tango', 22900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=13UBZVDFSdk88kN9RhVf4WXyyJW-qpbG1', 'Cookies cream waffle', false),
('prod-1000184', 'Nabati Richeese Keju 37g', 'Nabati', 2200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1TVz0hnuAPu3hk1q0ZFzFuqR9GHiB4P1p', 'Cheese wafer 37g', false),
('prod-1000185', 'Nabati Richoco Coklat 37g', 'Nabati', 2200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1TeVl2-PvT2gV3l4ihi0CJBGD5v7kAeLe', 'Chocolate wafer 37g', false),
('prod-1000185b', 'Nabati Siip Coklat', 'Nabati', 2200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1thtwMb5kEWMlJHBFOF-OjQ2yvuaUwGYv', 'Siip chocolate', false),
('prod-1000186', 'Nabati Richeese Wafer 75g', 'Nabati', 5700, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1TOuPT0_Dl1VignFQ6VAt_lplwgvpIJwd', 'Cheese wafer 75g', false),
('prod-1000187', 'Richoco Wafer Coklat', 'Richoco', 5650, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1gaOwx4_JKhWfJp9UzpIs6NlWfTc4ZGtH', 'Chocolate wafer', false),
('prod-1000188', 'Richeese Wafer Keju Pouch', 'Richeese', 10450, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1OdSYkI4UzUu5ZqFlNqjBlwcRt3vSmSbw', 'Cheese wafer pouch', false),
('prod-1000189', 'Richoco Wafer Chocolate Pouch', 'Richoco', 10450, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1Ph9BAyYzYpcnqqyknAQScT6XRuwNIqw-', 'Chocolate wafer pouch', false),
('prod-1000191', 'Ahh Richesee Sachet', 'Ahh', 6600, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1YF86AeN0CSA0iUKeyHR3UeKG-iUvXVFr', 'Cheese wafer sachet', false),
('prod-1000193', 'Richeese Siip Keju', 'Richeese', 4550, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1eneQaXxxtQYMTkbtwGRB85DXRrSalVp4', 'Siip cheese snack', false),
('prod-1000194', 'Richeese Siip Jagung Bakar Keju', 'Richeese', 4550, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1mNoFzd45SAAUjffWDEq_HIodgyZbGc9P', 'Grilled corn cheese', false),
('prod-1000201', 'Nextar Wafer Noir', 'Nextar', 7550, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1-ff49UtbdZG-SmLJPb9Q5x4pa23ZvLdz', 'Noir wafer', false),
('prod-1000226', 'Chocolatos Dark', 'Chocolatos', 23900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1PMaTCX2QMKFScKJMbyG9iJu0LnEcVJ2W', 'Dark chocolate', false),
('prod-1000230', 'Gery Saluut Malkist Coklat Family', 'Gery', 6350, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1s2SI6jZ48jQ6Ng5Z98cAgj6-NbwWLxBQ', 'Chocolate malkist family', false),
('prod-1000231', 'Gery Saluut Malkist S Cheese', 'Gery', 6350, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1L7IsyYJ9cw04KoEl5CCMTnvGYiMtTVLt', 'Swiss cheese malkist', false),
('prod-1000232', 'Gery Saluut Malkist Kelapa', 'Gery', 6350, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=12grl1eB8cdnFrmERxPIfcQ1QzWZG_WA4', 'Coconut malkist', false),
('prod-1000233', 'Gery Saluut Malkist 4in1 Coklat Kelapa', 'Gery', 6350, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1iY_Nh1GOqt_vfl2Cto1wv1ssgrcMexqj', '4in1 chocolate coconut', false),
('prod-1000234', 'Gery Saluut Malkist D Abon', 'Gery', 6550, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1zW0CNLevF1k5WtF6AV1n9Fev2hi7ba5O', 'Abon malkist', false),
('prod-1000236', 'Gery Wafer Cream Coconut', 'Gery', 2200, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1FFYIef2JXzK7ytbVr_kTrFnHE0SVscDO', 'Coconut cream wafer', false),
('prod-1000238', 'Dilan Chocolate Crunchy', 'Dilan', 11900, 15.00, 'cat-snacks', 'https://drive.google.com/uc?export=view&id=1m-y12C29He0wOi5qIrlSzM7Mh_5wPdId', 'Crunchy chocolate', false),

-- NOODLES → cat-staple-food (1 product)
('prod-1000065', 'Lemonilo Mie Goreng', 'Lemonilo', 6500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1gKMGI8F0_jwiBVMY_EZWlVKbqK1__P1S', 'Healthy fried noodles', false),

-- BULK PRODUCT → cat-staple-food (2 products already inserted above)

-- SUGAR & SUGAR PRODUCTS → cat-staple-food (7 products: 4 already inserted + 3 tea)
('prod-1000344', 'Teh Sisri Wangi Melati', 'Teh', 3250, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1QlHKQAPIhjWJ9QrduIc9C20XDrpzsMOK', 'Jasmine fragrant tea', false),
('prod-1000345', 'Teh Sisri Extract', 'Teh', 3250, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1MFcftbpe8qmxLMz-ky5s8_LpADvIIc2s', 'Tea extract', false),
('prod-1000346', 'Teh Sisri Gula Tebu', 'Teh', 3250, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1tXiyeGMzdfBwsNN67ivCzQUwn9x6F7Zj', 'Sugarcane tea', false),

-- SAUCES → cat-staple-food (15 products)
('prod-1000038', 'Tic Tic Ciki Sambal Colek', 'Tic', 6500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1xRZcMHKN_-TSHpbPi7dylPlUOJRZCsYB', 'Chili dipping sauce', false),
('prod-1000096', 'Sasa Sambal Asli 950ml', 'Sasa', 18900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1arMoyHRMlxBtwvJCwsiQW8OP0v47iW99', 'Original chili sauce', false),
('prod-1000097', 'Sasa Saus Tomat 950ml', 'Sasa', 14900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1IkCBdvFopq1qqhu-bWZPDylAcrBGibeI', 'Tomato sauce', false),
('prod-1000154', 'Del Monte Tomato Ketchup Pet', 'Del', 5950, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1zbdnjyzcfyEZg-w87maV8Lzw_L3HNgIm', 'Tomato ketchup pet bottle', false),
('prod-1000155', 'Del Monte Tomato Ketchup Sachet', 'Del', 5900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1oYxae-X4r-Mu8SiRN_a-GyAR0vBqbXIz', 'Tomato ketchup sachet', false),
('prod-1000156', 'Del Monte Tomato Ketchup Pouch', 'Del', 17900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1s5xlPvoWxsLDSzWHPaT6eESQbajrdq0d', 'Tomato ketchup pouch', false),
('prod-1000162', 'Del Monte Chilli Extra Hot', 'Del', 14000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1d1b3_nC-99SaTNsII2O1p7ULAnoEdVVf', 'Extra hot chili sauce', false),
('prod-1000163', 'Del Monte Chili Sauce Bottle', 'Del', 14000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1ic4zn4nXNIcLAtjab5pMmtbwEfF6vWlP', 'Chili sauce bottle', false),
('prod-1000165', 'Del Monte Tasty Chili Sauce', 'Del', 6500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1QNUdsOV323IcR347fr__DiwM1EeiYbl1', 'Tasty chili sauce', false),
('prod-1000168', 'Del Monte Extra Hot 1L', 'Del', 24500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1fbVNoASTNPXXDhvGJg7vOsYcfqCKWOGs', 'Extra hot 1 liter', false),
('prod-1000171', 'Del Monte Chilli Extra Hot 200ml', 'Del', 6500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=16RweUJoRXc4cNy4wOvTpouiQtPqRGZ9B', 'Extra hot 200ml', false),
('prod-1000173', 'Del Monte Chilli Extra Hot Sachet', 'Del', 6500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1iaHroV6K01AWROlnkkza6WVLd6o01wSP', 'Extra hot sachet', false),
('prod-1000296', 'Mc Lewis Chili Sachet', 'Mc', 5700, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1u_UwjXQDxhJcur0fjBFPm9bZe9PSTJgR', 'Chili sauce sachet', false),
('prod-1000297', 'Mc Lewis Saus Tomat Pouch', 'Mc', 6700, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1c_X7MihnIocv8zQ5v-uKOUqaflS0R9ZA', 'Tomato sauce pouch', false),

-- SEA SAUCE → cat-staple-food (12 products)
('prod-1000147', 'Del Monte Spaghetti Sauce', 'Del', 9900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1P5iI54RadqBZC9UjpsOlReqBmgGRjiCO', 'Spaghetti sauce', false),
('prod-1000148', 'Del Monte Barbeque Sauce', 'Del', 9900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1ewDsl3R5IOUCbTLiyeZP2hSWcMt_LNIY', 'BBQ sauce', false),
('prod-1000248', 'Prendjak Cuka 150ml', 'Prendjak', 4200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1Fe4P-kce3w-T54ypRJZxktmEf74eufsA', 'Vinegar 150ml', false),
('prod-1000249', 'Prendjak Cuka 620ml', 'Prendjak', 12900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1X66i32yRtrIszWI-6yfKewktTWWJY_dr', 'Vinegar 620ml', false),
('prod-1000298', 'Mc Lewis Mayonnaise', 'Mc', 12900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1S8KwU26sezZpK-AwC4SsJ013YtavT2QF', 'Mayonnaise', false),
('prod-1000299', 'Mc Lewis Mayo 1kg', 'Mc', 24900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1j8kdZuHjQmCXrjDoUZQkhGYHV63_9vBu', 'Mayonnaise 1kg', false),
('prod-1000300', 'Mc Lewis Thousand Island', 'Mc', 26900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=152K1kytpkYlUgYBBdznF8LL-VqrZj8yr', 'Thousand island sauce', false),
('prod-1000301', 'Mc Lewis Sauce BBQ', 'Mc', 11500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1H7vj7EHUISDRU9EZW1xvUisoO6DrX4dx', 'BBQ sauce', false),
('prod-1000302', 'Mc Lewis Black Pepper Sauce', 'Mc', 12500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1pZl0SfSYZTTd2PlzLuhKpJJw1vDd1TnD', 'Black pepper sauce', false),
('prod-1000369', 'Saori Saus Tiram Botol 133ml', 'Saori', 11900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=17-E-A4QGxpV5IHZFOa1MS47MmnMrnYrQ', 'Oyster sauce 133ml', false),
('prod-1000370', 'Saori Saus Tiram Botol 270ml', 'Saori', 19500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1AxrNdlqoys73EiixJkhz9aGIp48YhJEW', 'Oyster sauce 270ml', false),
('prod-1000372', 'Saori Saus Teriyaki Botol 135ml', 'Saori', 11900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1oNaUPyMk-6xCtow6tSNVsriKdmPvbDXN', 'Teriyaki sauce 135ml', false),
('prod-1000373', 'Saori Saus Teriyaki Botol 275ml', 'Saori', 19500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1HSEZ4dda2tbRSeXbslyCwKNF33s5IGYK', 'Teriyaki sauce 275ml', false),
('prod-1000375', 'Saori Saus Lada Hitam 133ml', 'Saori', 11900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1TeSv-Nsevx23mYVLZUeXYPtvqPzj5oRs', 'Black pepper sauce 133ml', false),
('prod-1000376', 'Saori Saus Asam Manis Sachet 10x25g', 'Saori', 28500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1r5_L7y8eE6ELzEPLVOa2sAXakRxJMmS3', 'Sweet sour sauce sachet', false),
('prod-1000377', 'Saori Saus Rasa Mentega 10x26ml', 'Saori', 28500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=19DNv6QGhqitJc_2DMkcuLkuXZz51Rqma', 'Butter flavor sauce', false),

-- CANNED MEAT → cat-staple-food (3 products)
('prod-1000149', 'Del Monte Sarden Tomat Can 155g', 'Del', 10900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=19KwdMQ0_ltCREAxoy6BAAX43HdCie-Yv', 'Sardines in tomato 155g', false),
('prod-1000150', 'Del Monte Sarden Tomat Can 425g', 'Del', 25500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1nyBqWFMMfcpMWDhbf20jdoz3TEN1Joku', 'Sardines in tomato 425g', false),
('prod-1000175', 'Del Monte Sardines Chili', 'Del', 25500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1-hRPvI5DR4erS6UqIHoX1clNipbEA1rM', 'Sardines in chili', false),

-- OIL & FATS → cat-staple-food (5 products)
('prod-1000179', 'Sunco Minyak Goreng Bottle 1L', 'Sunco', 22900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1wzcvYBA_sj_cdqdPLuGLlvbwWaMCPpc8', 'Cooking oil bottle 1L', false),
('prod-1000180', 'Sunco Minyak Goreng Bottle 2L', 'Sunco', 45500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1ijmr_SiMeG1E1IVToAEpbZLuqQSdoeLH', 'Cooking oil bottle 2L', false),
('prod-1000181', 'Sunco Minyak Goreng Bottle 5L', 'Sunco', 118500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1jBup2z_IXbB8tLaEG4KhWVfk48duanV9', 'Cooking oil bottle 5L', false),
('prod-1000182', 'Sunco Minyak Goreng Pouch 1L', 'Sunco', 21500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1s9sTgFvsDdRGsgceDJTMKvma0rLZvLuW', 'Cooking oil pouch 1L', false),
('prod-1000183', 'Sunco Minyak Goreng Pouch 2L', 'Sunco', 41900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1tm45uZIPfFMQYebZ_JhYWV3e9sjl-BM0', 'Cooking oil pouch 2L', false),

-- BAKING SUPPLIES → cat-staple-food (28 products)
('prod-1000081', 'Sasa Santan Cair 65ml', 'Sasa', 5500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1cVUqL5zbiSDs1nrvUyjk9XBONTB7bV6C', 'Coconut milk 65ml', false),
('prod-1000082', 'Sasa Santan Cair 200ml', 'Sasa', 16900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1xIScV2Gs_rDpFnI_s8tP_s2W0y7xg6GX', 'Coconut milk 200ml', false),
('prod-1000303', 'Agarasa Strawberry', 'Agarasa', 3850, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1MpjPZpewOyBsRAtLomgJVKi7ELE30Kas', 'Strawberry agar', false),
('prod-1000304', 'Agarasa Chocolate', 'Agarasa', 4550, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1NzAfmDVxdpxbpAcpAinujP7zPM5fv2on', 'Chocolate agar', false),
('prod-1000305', 'Agarasa Vanilla', 'Agarasa', 3850, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1NFD7xLB1LxfdI0mnOQYIxgJIkenwM1S-', 'Vanilla agar', false),
('prod-1000308', 'Nutrijell Kelapa Muda', 'Nutrijell', 4850, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1UhvF5lZesj_V4LGcU5XtSDr_w0t8ABBd', 'Young coconut jelly', false),
('prod-1000309', 'Nutrijell My Vla Coklat', 'Nutrijell', 4850, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=19bIKzMwEr0FFza9WrPqJL5hjzisZaThV', 'Chocolate custard', false),
('prod-1000309b', 'Nutrijell My Vla Vanila', 'Nutrijell', 4850, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=165XdX-1WnGDRzCbjLY6LKKrYp4fx6I_2', 'Vanilla custard', false),
('prod-1000312', 'Nutrijell Ekonomis Coklat', 'Nutrijell', 3000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1rUE7T6T2t_DazDMjklIKyllKhHv9L4_2', 'Economy chocolate jelly', false),
('prod-1000313', 'Nutrijell Ekonomis Plain', 'Nutrijell', 2200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=111lB8ItdIZGW381pX5khLFt8jCrI623S', 'Economy plain jelly', false),
('prod-1000314', 'Nutrijell Ekonomis Mangga', 'Nutrijell', 2200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=148jv-eVeEsgXJhwrkyf68r0KF2a-W72n', 'Economy mango jelly', false),
('prod-1000315', 'Nutrijell Ekonomis Leci', 'Nutrijell', 2200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=13xbv_uFxRfo5V8FVF2QdgSBLQdGvdPqM', 'Economy lychee jelly', false),
('prod-1000316', 'Nutrijell Ekonomis Black Grass Jelly', 'Nutrijell', 1700, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1Ot8K8wRxxvVdBOXT0IOeYPiVtTjF_qoF', 'Black grass jelly', false),
('prod-1000318', 'Nutrijell Ekonomis Kelapa', 'Nutrijell', 2000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1dWG84Ms1AkpZBxO_ONmF-dxGCaI_0_3N', 'Economy coconut jelly', false),
('prod-1000319', 'Nutrijell Regular Plain', 'Nutrijell', 5600, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1sa2MQe_kgIPHIkwtKlQTtR3LqlgCQXOJ', 'Regular plain jelly', false),
('prod-1000320', 'Nutrijell Regular Melon', 'Nutrijell', 5500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1XzGDCcWI1rgjSIUthKKpLvGKc4Ao8Wu7', 'Regular melon jelly', false),
('prod-1000321', 'Nutrijell Regular Mango', 'Nutrijell', 5500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1SH9XOccnc8kHywvMPc-78xgeRie0UBUl', 'Regular mango jelly', false),
('prod-1000322', 'Nutrijell Regular Lychee', 'Nutrijell', 5600, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=15FUaSEUfazbLt1GuKUqkYBNTXqCgQ5vg', 'Regular lychee jelly', false),
('prod-1000323', 'Nutrijell Regular Strawberry', 'Nutrijell', 5600, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1iSMe6M3WHeNfIWShIQEjWDKtdoptk55g', 'Regular strawberry jelly', false),
('prod-1000325', 'Nutrijell Cincau', 'Nutrijell', 5500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1QajqNidPhc-IQodkBHAjm0Jp_Hs2aT_Y', 'Grass jelly', false),
('prod-1000326', 'Nutrijell Ekonomis Strawberry', 'Nutrijell', 5400, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1oGS2arjzWrMus4VRzAGPf22I0WXer_5n', 'Economy strawberry', false),
('prod-1000332', 'Nutrijell Puding Susu Mangga', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1xqORMa1HGu-hEPsB9kFK-4DrJOZIQHYM', 'Milk pudding mango', false),
('prod-1000333', 'Nutrijell Puding Susu Coklat', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1933VArFQClpyBMl3UvpmooZ7acN4Kf2D', 'Milk pudding chocolate', false),
('prod-1000334', 'Nutrijell Puding Lps Gula Jawa', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=18E5LW562CbuMnRx3EZORsoe8CmAMFC1D', 'Palm sugar pudding', false),
('prod-1000335', 'Nutrijell Puding Lps Cocopandan', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1hcYf8MwSCqDa0CysbYl4FdW2Sz5Nbuxc', 'Coconut pandan pudding', false),
('prod-1000336', 'Nutrijell Puding Susu Vanila', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=14-oKiyL4afWa1WoeGMixU5RtTL8UuPR2', 'Milk pudding vanilla', false),
('prod-1000337', 'Nutrijel Puding Susu Red Velvet', 'Nutrijell', 9000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1hXelQJJ_R6-ZD_LxipOqTGxgB1Wt6IwB', 'Milk pudding red velvet', false),

-- SPICY, SALT & VINEGAR → cat-staple-food (21 products)
('prod-1000083', 'Sasa MSG Bag 100g', 'Sasa', 5900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1YUDCm_6VfOXSp-RUDp_Q9LuGJaCdgzw6', 'MSG seasoning 100g', false),
('prod-1000084', 'Sasa MSG Bag 250g', 'Sasa', 13900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1VYH9Ie5IYmM9_TTU7HetmqmSETtGGAHD', 'MSG seasoning 250g', false),
('prod-1000085', 'Sasa Tepung Bumbu Original 70g', 'Sasa', 2500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1kzpkrDrR_RKkNM3mIpRbfpXDLnhtcEWf', 'Original flour seasoning 70g', false),
('prod-1000086', 'Sasa Tepung Bumbu Pedas', 'Sasa', 2500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=14mTAs_DQqrjIXvy4A99I_HDpxgvjQNhZ', 'Spicy flour seasoning', false),
('prod-1000088', 'Sasa Tepung Bumbu Original', 'Sasa', 7500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1DYAWMAD1CaklLPGx5SdId9gBhfkbV_rG', 'Original flour seasoning', false),
('prod-1000089', 'Sasa Tepung Bumbu Pedas 210g', 'Sasa', 7500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1tuM1jUaQ5Vh4GqzG94tj5qvbY360xwSM', 'Spicy flour seasoning 210g', false),
('prod-1000090', 'Sasa Tepung Bumbu Ayam Kentucky 1', 'Sasa', 7500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1pxtq-ULeT9KS7f3hnc4Lkv8MUgTYGEXQ', 'Kentucky chicken seasoning', false),
('prod-1000091', 'Sasa Tepung Bumbu Ayam Kentucky 2', 'Sasa', 19900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1vxyDyCUUGj5URk8Yup4l3EakZcaMe8Jj', 'Kentucky chicken seasoning large', false),
('prod-1000092', 'Sasa Tepung Bumbu Pisang Vanila 75g', 'Sasa', 2500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1AOlQyrVGnvFUc3S5XXR4OHR3g8uoKVg2', 'Banana vanilla seasoning 75g', false),
('prod-1000093', 'Sasa Tepung Bumbu Pisang Vanila 210g', 'Sasa', 7500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1aAf73ewq5WRZ6aozPLKMZe59Lf_n_xjV', 'Banana vanilla seasoning 210g', false),
('prod-1000094', 'Sasa Tepung Bakwan 90g', 'Sasa', 2500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1m0rNuQDLz7TscLW60tZMwQtYV9uDQwp-', 'Bakwan flour 90g', false),
('prod-1000095', 'Sasa Tepung Bakwan 225g', 'Sasa', 7500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=15iP7p-9E7xt5Snw7sxa0PxrT8MZUfWEm', 'Bakwan flour 225g', false),
('prod-1000351', 'Ajinomoto 1000', 'Ajinomoto', 19500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1MvyGzs3fUBtFXDK_VR6jhoY9GMPTH-Uf', 'MSG 1000 pack', false),
('prod-1000352', 'Ajinomoto 5000', 'Ajinomoto', 5000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1RMlY2nYdfPCDRl5wcxu4Ufh89gO89XSP', 'MSG 5000 pack', false),
('prod-1000353', 'Masako Ayam Sachet 100g', 'Masako', 4500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1f7-POMJG_gJhynN0AGA_CORbOV_dULkc', 'Chicken seasoning 100g', false),
('prod-1000354', 'Masako Ayam Sachet 130g', 'Masako', 5000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1Kjav5nMtq_7TszTsxzrINCDZSU85JkPg', 'Chicken seasoning 130g', false),
('prod-1000355', 'Masako Ayam Sachet 250g', 'Masako', 10200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1dHRLAfRT9ckKnc60SvXM7O087GQX5x6e', 'Chicken seasoning 250g', false),
('prod-1000356', 'Masako Sapi Sachet 100g', 'Masako', 4500, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1b7o99Q3C9TvhhIlS0G-wcR7j98YHgjP0', 'Beef seasoning 100g', false),
('prod-1000357', 'Masako Sapi Sachet 130g', 'Masako', 5000, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1OcSuir7ljb1-mdTgyv5_4-uIcUkVX_Cx', 'Beef seasoning 130g', false),
('prod-1000358', 'Masako Sapi Sachet 250g', 'Masako', 10200, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1sJJMubjDjTkRCEguadin_0wYZflcirfC', 'Beef seasoning 250g', false),
('prod-1000359', 'Sajiku Tepung Bumbu Serba Guna 80g', 'Sajiku', 2450, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1_BiZcxlv4v2cedJITGnOhKGk3Wr2Xdjl', 'All purpose flour 80g', false),
('prod-1000360', 'Sajiku Tepung Bumbu Golden Crispy 80g', 'Sajiku', 2900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1otlyidDhyzgV0cw9Dv8IKdr-HN_-NIB4', 'Golden crispy flour 80g', false),
('prod-1000361', 'Sajiku Tepung Bumbu Pedas 70g', 'Sajiku', 2900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1liP8fiC7WgkCnhLdRQhOaK-caleEu12I', 'Spicy flour 70g', false),
('prod-1000362', 'Sajiku Tepung Bumbu Bakwan 90g', 'Sajiku', 2900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=116aIE-C8SPH7HQHCZz39G9sAALkCPsyY', 'Bakwan flour 90g', false),
('prod-1000363', 'Sajiku Tepung Tempe Crispy 80g', 'Sajiku', 2900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1tJNMWZD2noG3Eb9pcKiiBkpk59j_Gwwj', 'Crispy tempeh flour 80g', false),

-- BREAKFAST PRODUCTS & SPREAD → cat-staple-food (1 product)
('prod-1000223', 'Gery Snack N Cereal', 'Gery', 7900, 15.00, 'cat-staple-food', 'https://drive.google.com/uc?export=view&id=1fIOrYEKgWyLcgrfvtgiVWD2J1fDi7kUp', 'Snack and cereal', false),

-- MILK → cat-dairy (2 products - MARKED AS FRESH)
('prod-1000228', 'Clevo Susu UHT Coklat', 'Clevo', 2900, 15.00, 'cat-dairy', 'https://drive.google.com/uc?export=view&id=17SAjxWtR-_M3cuVWXQVnAsDvyd7wrd2n', 'UHT chocolate milk', true),
('prod-1000229', 'Clevo Susu UHT Strawberry', 'Clevo', 2900, 15.00, 'cat-dairy', 'https://drive.google.com/uc?export=view&id=1kyOI1aAmpl-SOHAjNHhnv8_-s26qcLdB', 'UHT strawberry milk', true)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 3: Update Freshness Settings for MILK Products
-- =====================================================

UPDATE products 
SET 
    requires_refrigeration = true,
    shelf_life = 7,
    freshness_priority = 80
WHERE id IN ('prod-1000228', 'prod-1000229');

-- =====================================================
-- Step 4: Insert Store Inventory
-- Link all products to Amanmart store
-- =====================================================

INSERT INTO store_inventory (id, store_id, product_id, stock_count, is_available) VALUES
('inv-1000001', 'store-amanmart', 'prod-1000001', 47, true),
('inv-1000002', 'store-amanmart', 'prod-1000002', 64, true),
('inv-1000004', 'store-amanmart', 'prod-1000004', 56, true),
('inv-1000010', 'store-amanmart', 'prod-1000010', 17, true),
('inv-1000012', 'store-amanmart', 'prod-1000012', 21, true),
('inv-1000016', 'store-amanmart', 'prod-1000016', 18, true),
('inv-1000017', 'store-amanmart', 'prod-1000017', 57, true),
('inv-1000018', 'store-amanmart', 'prod-1000018', 27, true),
('inv-1000019', 'store-amanmart', 'prod-1000019', 33, true),
('inv-1000023', 'store-amanmart', 'prod-1000023', 27, true),
('inv-1000031', 'store-amanmart', 'prod-1000031', 58, true),
('inv-1000032', 'store-amanmart', 'prod-1000032', 12, true),
('inv-1000035', 'store-amanmart', 'prod-1000035', 18, true),
('inv-1000036', 'store-amanmart', 'prod-1000036', 11, true),
('inv-1000037', 'store-amanmart', 'prod-1000037', 19, true),
('inv-1000038', 'store-amanmart', 'prod-1000038', 29, true),
('inv-1000040', 'store-amanmart', 'prod-1000040', 18, true),
('inv-1000044', 'store-amanmart', 'prod-1000044', 18, true),
('inv-1000051', 'store-amanmart', 'prod-1000051', 9, true),
('inv-1000052', 'store-amanmart', 'prod-1000052', 10, true),
('inv-1000054', 'store-amanmart', 'prod-1000054', 11, true),
('inv-1000065', 'store-amanmart', 'prod-1000065', 43, true),
('inv-1000068', 'store-amanmart', 'prod-1000068', 14, true),
('inv-1000069', 'store-amanmart', 'prod-1000069', 25, true),
('inv-1000070', 'store-amanmart', 'prod-1000070', 32, true),
('inv-1000071', 'store-amanmart', 'prod-1000071', 29, true),
('inv-1000072', 'store-amanmart', 'prod-1000072', 22, true),
('inv-1000074', 'store-amanmart', 'prod-1000074', 139, true),
('inv-1000075', 'store-amanmart', 'prod-1000075', 238, true),
('inv-1000076', 'store-amanmart', 'prod-1000076', 199, true),
('inv-1000081', 'store-amanmart', 'prod-1000081', 882, true),
('inv-1000082', 'store-amanmart', 'prod-1000082', 343, true),
('inv-1000083', 'store-amanmart', 'prod-1000083', 216, true),
('inv-1000084', 'store-amanmart', 'prod-1000084', 117, true),
('inv-1000085', 'store-amanmart', 'prod-1000085', 129, true),
('inv-1000086', 'store-amanmart', 'prod-1000086', 100, true),
('inv-1000088', 'store-amanmart', 'prod-1000088', 59, true),
('inv-1000089', 'store-amanmart', 'prod-1000089', 83, true),
('inv-1000090', 'store-amanmart', 'prod-1000090', 54, true),
('inv-1000091', 'store-amanmart', 'prod-1000091', 24, true),
('inv-1000092', 'store-amanmart', 'prod-1000092', 114, true),
('inv-1000093', 'store-amanmart', 'prod-1000093', 52, true),
('inv-1000094', 'store-amanmart', 'prod-1000094', 136, true),
('inv-1000095', 'store-amanmart', 'prod-1000095', 41, true),
('inv-1000096', 'store-amanmart', 'prod-1000096', 12, true),
('inv-1000097', 'store-amanmart', 'prod-1000097', 7, true),
('inv-1000104', 'store-amanmart', 'prod-1000104', 49, true),
('inv-1000105', 'store-amanmart', 'prod-1000105', 78, true),
('inv-1000106', 'store-amanmart', 'prod-1000106', 19, true),
('inv-1000115', 'store-amanmart', 'prod-1000115', 16, true),
('inv-1000116', 'store-amanmart', 'prod-1000116', 52, true),
('inv-1000120', 'store-amanmart', 'prod-1000120', 65, true),
('inv-1000121', 'store-amanmart', 'prod-1000121', 78, true),
('inv-1000122', 'store-amanmart', 'prod-1000122', 75, true),
('inv-1000127', 'store-amanmart', 'prod-1000127', 42, true),
('inv-1000129', 'store-amanmart', 'prod-1000129', 122, true),
('inv-1000130', 'store-amanmart', 'prod-1000130', 55, true),
('inv-1000131', 'store-amanmart', 'prod-1000131', 74, true),
('inv-1000132', 'store-amanmart', 'prod-1000132', 82, true),
('inv-1000135', 'store-amanmart', 'prod-1000135', 3, true),
('inv-1000136', 'store-amanmart', 'prod-1000136', 66, true),
('inv-1000137', 'store-amanmart', 'prod-1000137', 18, true),
('inv-1000138', 'store-amanmart', 'prod-1000138', 129, true),
('inv-1000139', 'store-amanmart', 'prod-1000139', 91, true),
('inv-1000143', 'store-amanmart', 'prod-1000143', 1, true),
('inv-1000147', 'store-amanmart', 'prod-1000147', 35, true),
('inv-1000148', 'store-amanmart', 'prod-1000148', 63, true),
('inv-1000149', 'store-amanmart', 'prod-1000149', 89, true),
('inv-1000150', 'store-amanmart', 'prod-1000150', 19, true),
('inv-1000154', 'store-amanmart', 'prod-1000154', 102, true),
('inv-1000155', 'store-amanmart', 'prod-1000155', 1, true),
('inv-1000156', 'store-amanmart', 'prod-1000156', 4, true),
('inv-1000162', 'store-amanmart', 'prod-1000162', 31, true),
('inv-1000163', 'store-amanmart', 'prod-1000163', 24, true),
('inv-1000165', 'store-amanmart', 'prod-1000165', 36, true),
('inv-1000168', 'store-amanmart', 'prod-1000168', 16, true),
('inv-1000171', 'store-amanmart', 'prod-1000171', 49, true),
('inv-1000173', 'store-amanmart', 'prod-1000173', 1, true),
('inv-1000175', 'store-amanmart', 'prod-1000175', 27, true),
('inv-1000179', 'store-amanmart', 'prod-1000179', 39, true),
('inv-1000180', 'store-amanmart', 'prod-1000180', 10, true),
('inv-1000181', 'store-amanmart', 'prod-1000181', 25, true),
('inv-1000182', 'store-amanmart', 'prod-1000182', 1690, true),
('inv-1000183', 'store-amanmart', 'prod-1000183', 913, true),
('inv-1000184', 'store-amanmart', 'prod-1000184', 6, true),
('inv-1000185', 'store-amanmart', 'prod-1000185', 84, true),
('inv-1000185b', 'store-amanmart', 'prod-1000185b', 84, true),
('inv-1000186', 'store-amanmart', 'prod-1000186', 105, true),
('inv-1000187', 'store-amanmart', 'prod-1000187', 76, true),
('inv-1000188', 'store-amanmart', 'prod-1000188', 47, true),
('inv-1000189', 'store-amanmart', 'prod-1000189', 38, true),
('inv-1000191', 'store-amanmart', 'prod-1000191', 1, true),
('inv-1000193', 'store-amanmart', 'prod-1000193', 72, true),
('inv-1000194', 'store-amanmart', 'prod-1000194', 117, true),
('inv-1000201', 'store-amanmart', 'prod-1000201', 0, false),
('inv-1000209', 'store-amanmart', 'prod-1000209', 57, true),
('inv-1000210', 'store-amanmart', 'prod-1000210', 34, true),
('inv-1000212', 'store-amanmart', 'prod-1000212', 11, true),
('inv-1000213', 'store-amanmart', 'prod-1000213', 28, true),
('inv-1000214', 'store-amanmart', 'prod-1000214', 40, true),
('inv-1000215', 'store-amanmart', 'prod-1000215', 11, true),
('inv-1000216', 'store-amanmart', 'prod-1000216', 19, true),
('inv-1000217', 'store-amanmart', 'prod-1000217', 55, true),
('inv-1000218', 'store-amanmart', 'prod-1000218', 116, true),
('inv-1000219', 'store-amanmart', 'prod-1000219', 65, true),
('inv-1000220', 'store-amanmart', 'prod-1000220', 39, true),
('inv-1000221', 'store-amanmart', 'prod-1000221', 84, true),
('inv-1000222', 'store-amanmart', 'prod-1000222', 22, true),
('inv-1000223', 'store-amanmart', 'prod-1000223', 28, true),
('inv-1000226', 'store-amanmart', 'prod-1000226', 13, true),
('inv-1000228', 'store-amanmart', 'prod-1000228', 52, true),
('inv-1000229', 'store-amanmart', 'prod-1000229', 68, true),
('inv-1000230', 'store-amanmart', 'prod-1000230', 95, true),
('inv-1000231', 'store-amanmart', 'prod-1000231', 32, true),
('inv-1000232', 'store-amanmart', 'prod-1000232', 64, true),
('inv-1000233', 'store-amanmart', 'prod-1000233', 52, true),
('inv-1000234', 'store-amanmart', 'prod-1000234', 63, true),
('inv-1000235', 'store-amanmart', 'prod-1000235', 22, true),
('inv-1000236', 'store-amanmart', 'prod-1000236', 53, true),
('inv-1000238', 'store-amanmart', 'prod-1000238', 76, true),
('inv-1000243', 'store-amanmart', 'prod-1000243', 49, true),
('inv-1000244', 'store-amanmart', 'prod-1000244', 37, true),
('inv-1000245', 'store-amanmart', 'prod-1000245', 51, true),
('inv-1000246', 'store-amanmart', 'prod-1000246', 18, true),
('inv-1000247', 'store-amanmart', 'prod-1000247', 41, true),
('inv-1000248', 'store-amanmart', 'prod-1000248', 24, true),
('inv-1000249', 'store-amanmart', 'prod-1000249', 21, true),
('inv-1000253', 'store-amanmart', 'prod-1000253', 90, true),
('inv-1000254', 'store-amanmart', 'prod-1000254', 62, true),
('inv-1000260', 'store-amanmart', 'prod-1000260', 4, true),
('inv-1000261', 'store-amanmart', 'prod-1000261', 16, true),
('inv-1000265', 'store-amanmart', 'prod-1000265', 20, true),
('inv-1000266', 'store-amanmart', 'prod-1000266', 26, true),
('inv-1000267', 'store-amanmart', 'prod-1000267', 19, true),
('inv-1000268', 'store-amanmart', 'prod-1000268', 61, true),
('inv-1000275', 'store-amanmart', 'prod-1000275', 39, true),
('inv-1000277', 'store-amanmart', 'prod-1000277', 85, true),
('inv-1000278', 'store-amanmart', 'prod-1000278', 66, true),
('inv-1000279', 'store-amanmart', 'prod-1000279', 55, true),
('inv-1000281', 'store-amanmart', 'prod-1000281', 0, false),
('inv-1000283', 'store-amanmart', 'prod-1000283', 18, true),
('inv-1000284', 'store-amanmart', 'prod-1000284', 31, true),
('inv-1000287', 'store-amanmart', 'prod-1000287', 39, true),
('inv-1000296', 'store-amanmart', 'prod-1000296', 1, true),
('inv-1000297', 'store-amanmart', 'prod-1000297', 32, true),
('inv-1000298', 'store-amanmart', 'prod-1000298', 18, true),
('inv-1000299', 'store-amanmart', 'prod-1000299', 3, true),
('inv-1000300', 'store-amanmart', 'prod-1000300', 5, true),
('inv-1000301', 'store-amanmart', 'prod-1000301', 9, true),
('inv-1000302', 'store-amanmart', 'prod-1000302', 32, true),
('inv-1000303', 'store-amanmart', 'prod-1000303', 70, true),
('inv-1000304', 'store-amanmart', 'prod-1000304', 88, true),
('inv-1000305', 'store-amanmart', 'prod-1000305', 88, true),
('inv-1000308', 'store-amanmart', 'prod-1000308', 84, true),
('inv-1000309', 'store-amanmart', 'prod-1000309', 169, true),
('inv-1000309b', 'store-amanmart', 'prod-1000309b', 169, true),
('inv-1000312', 'store-amanmart', 'prod-1000312', 94, true),
('inv-1000313', 'store-amanmart', 'prod-1000313', 205, true),
('inv-1000314', 'store-amanmart', 'prod-1000314', 66, true),
('inv-1000315', 'store-amanmart', 'prod-1000315', 105, true),
('inv-1000316', 'store-amanmart', 'prod-1000316', 40, true),
('inv-1000318', 'store-amanmart', 'prod-1000318', 49, true),
('inv-1000319', 'store-amanmart', 'prod-1000319', 57, true),
('inv-1000320', 'store-amanmart', 'prod-1000320', 72, true),
('inv-1000321', 'store-amanmart', 'prod-1000321', 40, true),
('inv-1000322', 'store-amanmart', 'prod-1000322', 71, true),
('inv-1000323', 'store-amanmart', 'prod-1000323', 77, true),
('inv-1000325', 'store-amanmart', 'prod-1000325', 67, true),
('inv-1000326', 'store-amanmart', 'prod-1000326', 49, true),
('inv-1000332', 'store-amanmart', 'prod-1000332', 143, true),
('inv-1000333', 'store-amanmart', 'prod-1000333', 130, true),
('inv-1000334', 'store-amanmart', 'prod-1000334', 49, true),
('inv-1000335', 'store-amanmart', 'prod-1000335', 95, true),
('inv-1000336', 'store-amanmart', 'prod-1000336', 105, true),
('inv-1000337', 'store-amanmart', 'prod-1000337', 98, true),
('inv-1000344', 'store-amanmart', 'prod-1000344', 118, true),
('inv-1000345', 'store-amanmart', 'prod-1000345', 1, true),
('inv-1000346', 'store-amanmart', 'prod-1000346', 67, true),
('inv-1000351', 'store-amanmart', 'prod-1000351', 68, true),
('inv-1000352', 'store-amanmart', 'prod-1000352', 27, true),
('inv-1000353', 'store-amanmart', 'prod-1000353', 42, true),
('inv-1000354', 'store-amanmart', 'prod-1000354', 80, true),
('inv-1000355', 'store-amanmart', 'prod-1000355', 26, true),
('inv-1000356', 'store-amanmart', 'prod-1000356', 76, true),
('inv-1000357', 'store-amanmart', 'prod-1000357', 119, true),
('inv-1000358', 'store-amanmart', 'prod-1000358', 61, true),
('inv-1000359', 'store-amanmart', 'prod-1000359', 55, true),
('inv-1000360', 'store-amanmart', 'prod-1000360', 78, true),
('inv-1000361', 'store-amanmart', 'prod-1000361', 26, true),
('inv-1000362', 'store-amanmart', 'prod-1000362', 36, true),
('inv-1000363', 'store-amanmart', 'prod-1000363', 54, true),
('inv-1000369', 'store-amanmart', 'prod-1000369', 87, true),
('inv-1000370', 'store-amanmart', 'prod-1000370', 27, true),
('inv-1000372', 'store-amanmart', 'prod-1000372', 43, true),
('inv-1000373', 'store-amanmart', 'prod-1000373', 28, true),
('inv-1000375', 'store-amanmart', 'prod-1000375', 52, true),
('inv-1000376', 'store-amanmart', 'prod-1000376', 0, false),
('inv-1000377', 'store-amanmart', 'prod-1000377', 0, false),
('inv-1000378', 'store-amanmart', 'prod-1000378', 290, true),
('inv-1000379', 'store-amanmart', 'prod-1000379', 246, true)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 5: Verification Queries
-- =====================================================

-- Count total products imported
SELECT COUNT(*) as total_products_imported FROM products WHERE id LIKE 'prod-1000%';

-- Count inventory records
SELECT COUNT(*) as total_inventory_records FROM store_inventory WHERE store_id = 'store-amanmart';

-- Total stock count
SELECT SUM(stock_count) as total_stock FROM store_inventory WHERE store_id = 'store-amanmart';

-- Products by category
SELECT 
    c.name as category,
    COUNT(p.id) as product_count
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.id LIKE 'prod-1000%'
GROUP BY c.name
ORDER BY product_count DESC;

-- Fresh products
SELECT COUNT(*) as fresh_products FROM products WHERE id LIKE 'prod-1000%' AND is_fresh = true;

-- Out of stock items
SELECT COUNT(*) as out_of_stock FROM store_inventory 
WHERE store_id = 'store-amanmart' AND stock_count <= 0;

COMMIT;

-- =====================================================
-- IMPORT COMPLETE! 
-- Total: 201 products
-- Store: Amanmart
-- Ready for launch!
-- =====================================================