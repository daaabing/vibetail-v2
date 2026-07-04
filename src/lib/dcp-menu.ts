// Fixed cocktail menu from Double Chicken Please (NYC).
// Source: https://doublechickenplease.com/pages/accessible-menus
// The AI match endpoint MUST pick one of these — nothing else.

export interface DcpCocktail {
  name: string;
  section: "Free Range" | "The Coop" | "Classics?" | "DCP House Shot";
  ingredients: string;
  price?: string;
}

export const DCP_MENU: DcpCocktail[] = [
  // ── Free Range ──
  { name: "Early Bird",              section: "Free Range", ingredients: "Guilder’s Green Tea Gin, Cocchi Americano, apricot, ginger ale, plum salt", price: "$19" },
  { name: "Tipsy Tulip",             section: "Free Range", ingredients: "Grey Goose Vodka, Cointreau, Symphony 6, tana, cranberry, apple", price: "$21" },
  { name: "Cuppa Sunshine",          section: "Free Range", ingredients: "Acqua di Cedro, espresso, yuzu, shiso, Licor 43, agave (decaf available)", price: "$22" },
  { name: "Gilded Orchard",          section: "Free Range", ingredients: "Glenfiddich 15yr, truffle honey, apple, riesling, passionfruit, clarified milk (mocktail available)", price: "$22" },
  { name: "Double Bubble",           section: "Free Range", ingredients: "Kinmen Kaoliang, MUYU Jasmine Verte, Hinata Matcha by Kettl, strawberry, oatmilk, tapioca", price: "$22" },
  { name: "Grapefruit with a Grudge",section: "Free Range", ingredients: "Campari, Aperol, The Pathfinder, caramel, grapefruit, tonic, roasted pecan (mocktail available)", price: "$21" },
  { name: "Fxxking Little Brain",    section: "Free Range", ingredients: "Don Fulano Blanco Tequila, Barsol Pisco, banana, coconut, popcorn, walnut", price: "$22" },
  { name: "Holy Shishito",           section: "Free Range", ingredients: "Patrón Silver, Acqua di Cedro, Ayuuk, charred shishito, kabosu, bell pepper, kiwi, wasabi", price: "$22" },
  { name: "Space Dog",               section: "Free Range", ingredients: "Diplomatico Rum, Campari, banana, pineapple, citrus, coffee, taro, clarified milk", price: "$21" },
  { name: "She’s So Old Fashioned",  section: "Free Range", ingredients: "Glenfiddich 12yr Original, MUYU Vetiver Gris, D.O.M. Bénédictine, shiso, palo santo", price: "$22" },
  { name: "DMV",                     section: "Free Range", ingredients: "Roku Gin, Altamura Vodka, olive, fennel, makrut lime leaf", price: "$21" },
  { name: "Fireside Tipple",         section: "Free Range", ingredients: "Ilegal Joven Mezcal, Campari, Cocchi Americano, sage, cascara", price: "$21" },

  // ── The Coop (culinary cocktails) ──
  { name: "Waldorf Salad",           section: "The Coop", ingredients: "Dewar’s 12yr Whiskey, Laphroaig 10yr Whiskey, celery, kale, apple, soda, walnut bitters", price: "$20" },
  { name: "Japanese Cold Noodle",    section: "The Coop", ingredients: "Bacardi Superior Rum, pineapple, cucumber, coconut, lime, sesame oil (mocktail available)", price: "$21" },
  { name: "Melon Prosciutto",        section: "The Coop", ingredients: "SG Imo shochu, Grey Goose vodka, jamón, cantaloupe, watermelon, fino sherry, goat cheese, clarified milk", price: "$21" },
  { name: "Papaya Salad",            section: "The Coop", ingredients: "Patrón Silver, peanut, fish sauce, tamarind, kumquat, cherry tomato, coconut, clarified milk", price: "$22" },
  { name: "Cold Pizza",              section: "The Coop", ingredients: "Don Fulano Blanco Tequila, Parmigiano Reggiano, burnt toast, tomato, basil, honey, egg white", price: "$21" },
  { name: "Red Eye Gravy",           section: "The Coop", ingredients: "Teeling Irish Whiskey, coffee butter, corn, walnut, wild mushroom, microwaved coppa", price: "$21" },
  { name: "Thai Curry",              section: "The Coop", ingredients: "Sonbi Gin, Ilegal Joven Mezcal, green curry, lime", price: "$22" },
  { name: "Mango Sticky Rice",       section: "The Coop", ingredients: "Bacardi Reserva Ocho Rum, mango, sticky rice Pu’er tea, wakame, cold brew, coconut", price: "$20" },
  { name: "French Toast",            section: "The Coop", ingredients: "Grey Goose Vodka, roasted barley, brioche, coconut, milk, maple syrup, egg", price: "$22" },
  { name: "Custard Bun",             section: "The Coop", ingredients: "Wakaze Nigori Sake, sparkling wine, koji, salted egg yolk, Pu'er tea, oat milk", price: "$22" },
  { name: "Key Lime Pie",            section: "The Coop", ingredients: "Bombay Sapphire Gin, stonefruit, winter melon, sweet cream, egg white, lime, soda (mocktail available)", price: "$22" },
  { name: "Dorayaki",                section: "The Coop", ingredients: "Kavalan Distillery Select Whisky, Suntory Toki Whisky, amontillado sherry, red bean, corn, barley tea, lychee", price: "$21" },

  // ── DCP House Shot ──
  { name: "DCP House Shot",          section: "DCP House Shot", ingredients: "Ilegal Joven Mezcal, plum, shiso", price: "$9" },

  // ── Classics? ──
  { name: "Dirty Margarita",         section: "Classics?", ingredients: "Ilegal Joven Mezcal, Cocchi Americano, Italicus, verjus, shiso, olive", price: "$19" },
  { name: "Tomatillo Mojito",        section: "Classics?", ingredients: "Bacardi Superior Rum, tomato vine, tomatillo, mint, makrut lime leaf, soda", price: "$21" },
  { name: "Banana Barley Bamboo",    section: "Classics?", ingredients: "fino & amontillado sherry, Dolin dry vermouth, Savoia Orancio, banana, barley tea", price: "$20" },
  { name: "Earl Grey Vieux Carré",   section: "Classics?", ingredients: "Michter's Kentucky Straight Rye, Pierre Ferrand Cognac, Italicus, Bénédictine, Earl Grey", price: "$19" },
  { name: "Osmanthus Bronx",         section: "Classics?", ingredients: "Tanqueray No. TEN Gin, Martini Rubino, manzanilla sherry, Savoia Orancio, osmanthus, orange", price: "$20" },
  { name: "Raspberry Espresso Martini", section: "Classics?", ingredients: "Grey Goose Vodka, SC Imo Shochu, espresso, raspberry, rosemary", price: "$21" },
];
