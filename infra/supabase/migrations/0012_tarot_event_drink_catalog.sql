-- The Autumn Tarot Night catalog is intentionally limited to the three drinks
-- prepared for this event. Keep the drink ids stable so recommendations and
-- snapshots remain referentially consistent across deploys.

insert into public.drinks (
  id,
  merchant_id,
  name,
  description,
  price,
  image_url,
  ingredients,
  flavor_tags,
  allergens,
  base_spirit,
  strength,
  alcoholic,
  recommendation_note,
  availability_status,
  created_at
)
select
  '77777777-0010-4010-8010-000000000010'::uuid,
  merchant.id,
  'Tashirita',
  '柚子、青柠和杜松子百里香糖浆，清爽明亮，酸度干净，带一点草本香气。',
  null,
  null,
  array['1.5 oz Tashi Baijiu', '0.5 oz yuzu juniper thyme syrup', '0.75 oz key lime concentrate']::text[],
  array['citrusy', 'herbal', 'refreshing']::text[],
  '{}'::text[],
  'baijiu',
  'medium',
  true,
  '像秋天第一阵风，轻轻打开今晚的第一章。',
  'active',
  now()
from public.merchants as merchant
where merchant.slug in ('vibetail', 'vibetail-taproom')
order by case when merchant.slug = 'vibetail' then 0 else 1 end
limit 1
on conflict (id) do update set
  merchant_id = excluded.merchant_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  flavor_tags = excluded.flavor_tags,
  allergens = excluded.allergens,
  base_spirit = excluded.base_spirit,
  strength = excluded.strength,
  alcoholic = excluded.alcoholic,
  recommendation_note = excluded.recommendation_note,
  availability_status = excluded.availability_status;

insert into public.drinks (
  id,
  merchant_id,
  name,
  description,
  price,
  image_url,
  ingredients,
  flavor_tags,
  allergens,
  base_spirit,
  strength,
  alcoholic,
  recommendation_note,
  availability_status,
  created_at
)
select
  '77777777-0011-4011-8011-000000000011'::uuid,
  merchant.id,
  'The Yak',
  '百香果、青柠和姜汁汽水，果香明亮，酸甜里带着轻轻的辛香和气泡感。',
  null,
  null,
  array['1.5 oz Tashi Baijiu', '0.5 oz passion fruit syrup', '0.5 oz key lime concentrate', '3 oz ginger beer']::text[],
  array['fruity', 'citrusy', 'spicy', 'bubbly']::text[],
  '{}'::text[],
  'baijiu',
  'medium',
  true,
  '像一片被风吹动的秋叶，明快、俏皮，也很适合碰杯。',
  'active',
  now()
from public.merchants as merchant
where merchant.slug in ('vibetail', 'vibetail-taproom')
order by case when merchant.slug = 'vibetail' then 0 else 1 end
limit 1
on conflict (id) do update set
  merchant_id = excluded.merchant_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  flavor_tags = excluded.flavor_tags,
  allergens = excluded.allergens,
  base_spirit = excluded.base_spirit,
  strength = excluded.strength,
  alcoholic = excluded.alcoholic,
  recommendation_note = excluded.recommendation_note,
  availability_status = excluded.availability_status;

insert into public.drinks (
  id,
  merchant_id,
  name,
  description,
  price,
  image_url,
  ingredients,
  flavor_tags,
  allergens,
  base_spirit,
  strength,
  alcoholic,
  recommendation_note,
  availability_status,
  created_at
)
select
  '77777777-0012-4012-8012-000000000012'::uuid,
  merchant.id,
  'Autumn After Cake',
  'Sarabi Rum Cake Cream Liqueur 加冰，奶油般顺滑，带着温暖的蛋糕甜香。',
  null,
  null,
  array['Sarabi Rum Cake Cream Liqueur', 'ice']::text[],
  array['creamy', 'sweet', 'rich']::text[],
  '{}'::text[],
  'rum',
  'medium',
  true,
  '像秋夜最后一盏暖灯，把这一晚收在柔软的余韵里。',
  'active',
  now()
from public.merchants as merchant
where merchant.slug in ('vibetail', 'vibetail-taproom')
order by case when merchant.slug = 'vibetail' then 0 else 1 end
limit 1
on conflict (id) do update set
  merchant_id = excluded.merchant_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  flavor_tags = excluded.flavor_tags,
  allergens = excluded.allergens,
  base_spirit = excluded.base_spirit,
  strength = excluded.strength,
  alcoholic = excluded.alcoholic,
  recommendation_note = excluded.recommendation_note,
  availability_status = excluded.availability_status;

delete from public.event_drink_catalog
where event_id = 'tarot-night-2026-10-03';

insert into public.event_drink_catalog (event_id, drink_id, sort_order)
select event.event_id, drink.id, option.sort_order
from public.events as event
join (values
  ('77777777-0010-4010-8010-000000000010'::uuid, 1),
  ('77777777-0011-4011-8011-000000000011'::uuid, 2),
  ('77777777-0012-4012-8012-000000000012'::uuid, 3)
) as option(drink_id, sort_order) on true
join public.drinks as drink on drink.id = option.drink_id
where event.event_id = 'tarot-night-2026-10-03'
on conflict (event_id, drink_id) do update set sort_order = excluded.sort_order;
