import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import type { PrismaClient } from '../src/generated/prisma/client'

// Restaurant Data Onboarding (Sprint 1.4). Populates real master data for
// the platform's two pilot restaurants — transcribed from the real Burger's
// Ink supplier order sheet + kitchen ingredient list (Data Photos/) and the
// real Burger's Ink + Topo Gigio menus, plus the manually-provided Topo
// Gigio ingredient list. This is a one-time manual onboarding script, NOT
// wired into bootstrap.ts/seed.ts's automatic chain — same "manual only"
// posture as seed-demo-content.ts, since this is real customer data, not
// platform-required scaffolding. Run once via `npx tsx
// prisma/seed-restaurant-product-onboarding.ts` against the target database.
//
// Idempotent: every write is a find-by-(restaurantId, name) then create —
// same pattern as seed-restaurant-tenancy.ts — so re-running never
// duplicates a row. This is also what satisfies this sprint's "no duplicate
// menu items/ingredients/suppliers/recipes" validation requirement
// structurally, not as a separate manual check.
//
// Deliberately does NOT seed Unit rows (per this sprint's explicit
// instruction — Units are entered manually through the UI) and therefore
// does NOT create any RecipeIngredient rows (RecipeIngredient.unitId is a
// required foreign key; with zero Units in existence, no such row can be
// created without inventing a quantity/unit, which this sprint explicitly
// forbids). Recipe containers are created wherever the source menu gives an
// actual ingredient description — never for items where only a name and
// price are known (e.g. Burger's Ink's desserts) — see restaurant.md's new
// "Restaurant Onboarding Workflow" section for the full policy this script
// encodes.

interface MenuItemSeed {
  name: string
  description?: string
  price: string
  hasRecipe: boolean
}

interface MenuCategorySeed {
  name: string
  items: MenuItemSeed[]
}

interface IngredientSeed {
  name: string
  category: string
  suppliers?: string[]
}

interface RestaurantOnboardingData {
  restaurantName: string
  menuCategories: MenuCategorySeed[]
  ingredientCategories: string[]
  suppliers: { name: string; phone?: string }[]
  ingredients: IngredientSeed[]
}

// ---------------------------------------------------------------------------
// Burger's Ink — transcribed from Data Photos/Burgers Ink Menu/*.JPG (real
// menu, both pages) and Data Photos/Burgers Ink Ingredient with Supplier/*
// (the real supplier order sheet "ORDER LIST BURGERS INK PAOLA" + the
// forwarded "Veg" list). Every menu item's description is copied verbatim
// from the printed menu — nothing invented. Package-size suffixes ("25KG",
// "1KG") are stripped from ingredient names since pack size is a purchasing
// concern, not the ingredient's identity (ADR-0037's Unit decision).
// ---------------------------------------------------------------------------
const burgersInk: RestaurantOnboardingData = {
  restaurantName: "Burger's Ink",

  menuCategories: [
    {
      name: 'Burgers',
      items: [
        { name: 'Ultimate Cheese Burger', description: 'Double beef patties, double cheese, lettuce, tomato, b.ink sauce, raw onion', price: '9.90', hasRecipe: true },
        { name: 'Redefine Cheese Burger', description: 'Redefine patty, lettuce, ketchup, mustard, gherkins, onions, cheese', price: '11.50', hasRecipe: true },
        { name: 'B.ink Burger', description: 'Double beef patty, coleslaw, garlic butter, bacon, cheese, battered onion ring', price: '11.90', hasRecipe: true },
        { name: 'Halloumi Burger', description: 'Crispy halloumi patty, mushroom, guacamole, garlic mayo, lettuce, tomato, crispy onion', price: '11.90', hasRecipe: true },
        { name: "Hell's Kitchen Burger", description: 'Double beef patties, lettuce, caramelised onions, jalapeños, american cheese, devil sauce', price: '11.90', hasRecipe: true },
        { name: 'South London Special', description: 'Double beef patties, lettuce, pickles, bacon, double cheese, crispy onion, b.ink sauce', price: '11.90', hasRecipe: true },
        { name: 'Tennessee Chicken Burger', description: "Fried chicken, coleslaw, bacon, cheese, lettuce, tomato, jack daniel's sauce", price: '11.90', hasRecipe: true },
        { name: 'Truffle Burger', description: 'Double beef patties, lettuce, cheddar cheese, bacon, truffle mayo, crispy onion', price: '11.90', hasRecipe: true },
        { name: 'Avocado Burger', description: 'Crispy avocado patty, vegan cheese, mushrooms, caramelised onion, mango chutney, rucola, lettuce, tomato', price: '11.90', hasRecipe: true },
        { name: 'BBQ Posh Burger', description: 'Double beef patties, smoked applewood cheese, grilled parma ham, bbq sauce, crispy onion', price: '11.90', hasRecipe: true },
        { name: 'BBQ Pork Smash', description: 'Smashed iberico pork patty, house made honey sesame bbq sauce, coleslaw, smoked applewood cheese, crispy onions, crispy fried egg', price: '12.90', hasRecipe: true },
        { name: "Jack Daniel's", description: 'Double beef patty, chunky lettuce, hash brown, caramelised onion, bacon, cheese, jack sauce', price: '12.90', hasRecipe: true },
        { name: 'Guapo Burger', description: 'Double beef patties, mexican cheese, tomato, sour cream, guacamole, crispy chorizo', price: '12.90', hasRecipe: true },
        { name: 'The C.B.B. Burger', description: 'Double beef patties, homemade chilli bbq sauce, apple wood cheese, bacon, crispy onions, american cheese', price: '12.90', hasRecipe: true },
        { name: 'L.A Burger', description: 'Triple beef patties, bacon, cheese, lettuce, egg, hollywood sauce', price: '13.50', hasRecipe: true },
        { name: 'Threesome Burger', description: 'Triple beef patties, american cheese, bacon, pepper jack sauce, crispy onion', price: '13.50', hasRecipe: true },
        { name: 'Black Duck Burger', description: 'Double beef patties, pulled duck, cheddar cheese, bbq sauce, egg, rucola', price: '13.50', hasRecipe: true },
      ],
    },
    {
      name: 'Hot Dogs',
      items: [
        { name: 'London Dog', description: 'Pork sausage, caramelised onions, pickles, ketchup, mustard', price: '9.50', hasRecipe: true },
        { name: 'Devil Dog', description: 'Pork sausage, coleslaw, devil sauce, crispy onion, jalapeños', price: '9.50', hasRecipe: true },
        { name: 'B.ink Dog', description: 'Pork sausage, crispy onion, ketchup, mayo', price: '9.50', hasRecipe: true },
      ],
    },
    {
      name: 'Wraps',
      items: [
        { name: 'Brunch Wrap', description: 'Bacon, cheese, egg, sausage, ketchup & mayonnaise', price: '9.95', hasRecipe: true },
        { name: 'Korean Beef Wrap', description: 'Minced beef, korean sauce, crispy onions, sautéed vegetables', price: '9.95', hasRecipe: true },
        { name: 'Philli Cheese Wrap', description: 'Minced beef, caramelised onions, provolone cheese, rocket, mustard & mayonnaise', price: '9.95', hasRecipe: true },
        { name: 'Chicken Curry Wrap', description: 'Chicken, cheese, bacon, curry sauce, lettuce and tomatoes', price: '9.95', hasRecipe: true },
        { name: 'BBQ Chicken Wrap', description: 'Chicken, cheese, bacon, jalapeño, bbq sauce', price: '9.95', hasRecipe: true },
        { name: 'Avocado Wrap', description: 'Mashed avocado, chilli, lettuce, tomatoes, mushrooms, sour cream & cheese', price: '9.95', hasRecipe: true },
      ],
    },
    {
      name: 'Tacos',
      items: [
        { name: 'Duo of Beef Tacos', description: 'Smashed beef, guacamole, hot tomato salsa, sour cream, crispy chorizo', price: '7.50', hasRecipe: true },
        { name: 'Duo of Chicken Tacos', description: 'Crispy chicken, guacamole, hot tomato salsa, sour cream, crispy chorizo', price: '7.50', hasRecipe: true },
      ],
    },
    {
      name: 'Starters & Bites',
      items: [
        { name: 'Tempura Prawns', description: '4 tempura prawns served with sriracha mayo', price: '7.00', hasRecipe: true },
        { name: 'Goat Cheese Fritters', description: '4 cheese fritters served with mango chutney', price: '7.00', hasRecipe: true },
        { name: 'Real Chicken Nuggets', description: "6 nuggets served with b.ink sauce and fries", price: '7.50', hasRecipe: true },
        { name: 'Honey BBQ Chicken Wings', description: '6 wings served in honey bbq sauce', price: '7.50', hasRecipe: true },
        { name: 'Halloumi Fries', description: 'Guacamole, crispy onions, jalapeño, sour cream', price: '7.50', hasRecipe: true },
        { name: 'Chicken Tenders', description: '3 chicken tenders served with spicy honey sauce', price: '7.50', hasRecipe: true },
        { name: 'Fish & Chips', description: 'Served with gherkin relish and sour cream', price: '12.50', hasRecipe: true },
      ],
    },
    {
      name: 'Kids Corner',
      items: [
        { name: 'Cheese Burger & Chips', description: '100gr 100% beef, cheese & ketchup', price: '7.50', hasRecipe: true },
      ],
    },
    {
      // No ingredient description exists for any item in this category on
      // the real menu (name + price only) — per this sprint's "do not
      // guess" instruction, none of these get a Recipe.
      name: 'Desserts',
      items: [
        { name: 'White Chocolate & Flake Pancake', price: '8.75', hasRecipe: false },
        { name: 'White Chocolate & Smarties Pancake', price: '8.75', hasRecipe: false },
        { name: 'Kinder Cards Pancake', price: '8.75', hasRecipe: false },
        { name: 'Kinder Bueno Pancake', price: '8.75', hasRecipe: false },
        { name: 'Kinder Maltesers Pancake', price: '8.75', hasRecipe: false },
        { name: 'Oreo Pancake', price: '8.75', hasRecipe: false },
        { name: 'Galaxy Caramel Pancake', price: '8.75', hasRecipe: false },
        { name: 'Blue Berry Crumble Pancake', price: '8.75', hasRecipe: false },
        { name: 'White Chocolate, Blueberry & Marshmallow Pancake', price: '8.75', hasRecipe: false },
        { name: "M&M's Pancake", price: '8.75', hasRecipe: false },
        { name: 'Red Velvet Pancake', price: '8.75', hasRecipe: false },
        { name: "White Chocolate & Reese's Pancake", price: '8.75', hasRecipe: false },
        { name: 'Kinderini Pancake', price: '8.75', hasRecipe: false },
        { name: 'Kinder Tronky Pancake', price: '8.75', hasRecipe: false },
        { name: 'Pistachio Pancake', price: '9.50', hasRecipe: false },
        { name: 'Kinder Fingers Pancake (Gluten Free)', price: '8.75', hasRecipe: false },
        { name: 'White Chocolate & Blueberry Pancake (Gluten Free)', price: '8.75', hasRecipe: false },
        { name: 'Kinder Churros', price: '7.90', hasRecipe: false },
        { name: 'Pistachio Churros', price: '7.90', hasRecipe: false },
        { name: 'White Chocolate and Oreo Churros', price: '7.90', hasRecipe: false },
        { name: "Nutella and M&M's Churros", price: '7.90', hasRecipe: false },
        { name: 'Classic Nutella Donut Bomb', price: '7.00', hasRecipe: false },
        { name: 'Pistachio and Nutella Donut Bomb', price: '7.50', hasRecipe: false },
        { name: 'Kinder Donut Bomb', price: '7.00', hasRecipe: false },
        { name: 'Kinder Bueno Donut Bomb', price: '7.50', hasRecipe: false },
        { name: 'White Chocolate and Vermicelli Donut Bomb', price: '7.00', hasRecipe: false },
      ],
    },
  ],

  ingredientCategories: [
    'Dairy & Cheese',
    'Meat & Poultry',
    'Seafood',
    'Vegetables & Produce',
    'Sauces & Condiments',
    'Dry Goods & Baking',
    'Confectionery & Dessert',
    'Frozen & Prepared',
    'Beverages & Alcohol',
  ],

  // Phone numbers transcribed from handwriting on the order sheet — kept
  // where legible, left undefined where genuinely ambiguous rather than
  // guessed (Chris Cardona, Schembri Ltd). Flag for manual verification.
  suppliers: [
    { name: '360 Food', phone: '79006761' },
    { name: 'Applecore', phone: '99992974' },
    { name: 'Bartoli', phone: '99620001' },
    { name: 'Camel Brand', phone: '77142292' },
    { name: 'Chris Cardona' },
    { name: 'Bon Cousine', phone: '79901742' },
    { name: 'Eat Or Be Eaten', phone: '99857135' },
    { name: 'FB Imports', phone: '79650973' },
    { name: 'Carmelo Abela', phone: '79448404' },
    { name: 'J&C Pisani', phone: '79707053' },
    { name: 'Kareplus', phone: '79791559' },
    { name: 'Schembri Ltd' },
    { name: 'J.Calleja', phone: '99085722' },
    { name: 'Nectar', phone: '79013131' },
    { name: 'Macbake', phone: '99032718' },
    { name: 'Quality Food', phone: '99663057' },
    { name: 'Quality Meat', phone: '79010010' },
  ],

  ingredients: [
    // 360 Food
    { name: 'Brown Sugar', category: 'Dry Goods & Baking', suppliers: ['360 Food'] },
    { name: 'Parma Ham', category: 'Meat & Poultry', suppliers: ['360 Food'] },
    { name: 'Halloumi', category: 'Dairy & Cheese', suppliers: ['360 Food'] },
    { name: 'Applewood Cheese', category: 'Dairy & Cheese', suppliers: ['360 Food'] },
    { name: 'Taco Shells', category: 'Dry Goods & Baking', suppliers: ['360 Food'] },
    { name: 'Wrap Shells', category: 'Dry Goods & Baking', suppliers: ['360 Food'] },
    { name: 'Pili Pili Sauce', category: 'Sauces & Condiments', suppliers: ['360 Food'] },
    { name: 'Mexican Cheese', category: 'Dairy & Cheese', suppliers: ['360 Food'] },
    // Frying Oil: real evidence of multi-supplier — 360 Food ("Frying Oil"),
    // Schembri Ltd and J.Calleja (both listed simply as "oil"), normalized
    // to one ingredient per this sprint's dedup instruction.
    { name: 'Frying Oil', category: 'Sauces & Condiments', suppliers: ['360 Food', 'Schembri Ltd', 'J.Calleja'] },

    // Applecore
    { name: 'Chips', category: 'Frozen & Prepared', suppliers: ['Applecore'] },
    { name: 'Tempura Prawns', category: 'Seafood', suppliers: ['Applecore'] },
    { name: 'Avocado Burger Patty', category: 'Frozen & Prepared', suppliers: ['Applecore'] },
    { name: 'Churros (Frozen)', category: 'Frozen & Prepared', suppliers: ['Applecore'] },
    { name: 'Chicken Nuggets', category: 'Frozen & Prepared', suppliers: ['Applecore'] },
    { name: 'Goat Cheese', category: 'Dairy & Cheese', suppliers: ['Applecore'] },
    { name: 'Mozzarella Donuts', category: 'Frozen & Prepared', suppliers: ['Applecore'] },
    { name: 'Guacamole', category: 'Sauces & Condiments', suppliers: ['Applecore'] },

    // Bartoli
    { name: 'Sriracha', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },
    { name: 'Mayo Sachets', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },
    { name: 'Ketchup Sachets', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },
    { name: 'Mustard', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },
    { name: 'Honey', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },
    { name: 'Chickpeas', category: 'Dry Goods & Baking', suppliers: ['Bartoli'] },
    { name: 'Sweet Paprika', category: 'Dry Goods & Baking', suppliers: ['Bartoli'] },
    { name: 'Croutons', category: 'Dry Goods & Baking', suppliers: ['Bartoli'] },
    { name: 'Curry Powder', category: 'Dry Goods & Baking', suppliers: ['Bartoli'] },
    { name: 'Mango Chutney', category: 'Sauces & Condiments', suppliers: ['Bartoli'] },

    // Camel Brand
    { name: 'Jalapeños', category: 'Vegetables & Produce', suppliers: ['Camel Brand'] },
    { name: 'Chorizo', category: 'Meat & Poultry', suppliers: ['Camel Brand'] },

    // Chris Cardona (confectionery/dessert supplier)
    { name: 'Chocolate Fingers', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Kinder Bueno', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Oreo', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Digestive Biscuits', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Chocolate Cookies', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Smarties', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Flake', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Ferrero Rocher', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Bounty', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Galaxy Caramel', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Aero Mint', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Maltesers', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: "M&M's", category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Kinder Cards', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: "Reese's", category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Happy Hippo', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Marshmallows', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },
    { name: 'Red Food Colouring', category: 'Dry Goods & Baking', suppliers: ['Chris Cardona'] },
    { name: 'Vanilla Essence', category: 'Dry Goods & Baking', suppliers: ['Chris Cardona'] },
    { name: 'Vermicelli Sprinkles', category: 'Confectionery & Dessert', suppliers: ['Chris Cardona'] },

    // Bon Cousine
    { name: 'Diced Hazelnuts', category: 'Dry Goods & Baking', suppliers: ['Bon Cousine'] },
    { name: 'Diced Pistachio', category: 'Dry Goods & Baking', suppliers: ['Bon Cousine'] },

    // Eat Or Be Eaten
    { name: 'Chicken Strips', category: 'Meat & Poultry', suppliers: ['Eat Or Be Eaten'] },
    { name: 'Chicken SFC', category: 'Meat & Poultry', suppliers: ['Eat Or Be Eaten'] },

    // FB Imports
    { name: 'Onion Rings', category: 'Frozen & Prepared', suppliers: ['FB Imports'] },
    { name: 'MCD Nuggets', category: 'Frozen & Prepared', suppliers: ['FB Imports'] },

    // Carmelo Abela
    { name: 'Truffle Oil', category: 'Sauces & Condiments', suppliers: ['Carmelo Abela'] },
    { name: 'Cheddar Cheese', category: 'Dairy & Cheese', suppliers: ['Carmelo Abela'] },
    { name: 'American Cheese', category: 'Dairy & Cheese', suppliers: ['Carmelo Abela'] },
    { name: 'Pickles', category: 'Vegetables & Produce', suppliers: ['Carmelo Abela'] },
    { name: 'Grana Shavings', category: 'Dairy & Cheese', suppliers: ['Carmelo Abela'] },
    { name: 'Milk', category: 'Dairy & Cheese', suppliers: ['Carmelo Abela'] },
    { name: 'Hash Browns', category: 'Frozen & Prepared', suppliers: ['Carmelo Abela'] },

    // J&C Pisani
    { name: 'Hot Dog Sausages', category: 'Meat & Poultry', suppliers: ['J&C Pisani'] },
    { name: 'Chicken Wings', category: 'Meat & Poultry', suppliers: ['J&C Pisani'] },
    { name: 'Blueberries', category: 'Vegetables & Produce', suppliers: ['J&C Pisani'] },
    { name: 'Redefine Burger Patty', category: 'Meat & Poultry', suppliers: ['J&C Pisani'] },
    { name: 'Perch Fish', category: 'Seafood', suppliers: ['J&C Pisani'] },

    // Kareplus
    { name: 'Ketchup', category: 'Sauces & Condiments', suppliers: ['Kareplus'] },
    { name: 'Mayo', category: 'Sauces & Condiments', suppliers: ['Kareplus'] },
    { name: 'Crispy Onions', category: 'Frozen & Prepared', suppliers: ['Kareplus'] },
    { name: 'Truffle Paste', category: 'Sauces & Condiments', suppliers: ['Kareplus'] },
    { name: 'Chicken Goujons (Tenders)', category: 'Meat & Poultry', suppliers: ['Kareplus'] },

    // Schembri Ltd
    { name: 'Whisky', category: 'Beverages & Alcohol', suppliers: ['Schembri Ltd'] },

    // J.Calleja
    { name: 'Sugar', category: 'Dry Goods & Baking', suppliers: ['J.Calleja'] },
    { name: 'Flour', category: 'Dry Goods & Baking', suppliers: ['J.Calleja'] },
    { name: 'GF Flour', category: 'Dry Goods & Baking', suppliers: ['J.Calleja'] },
    { name: 'Salt', category: 'Dry Goods & Baking', suppliers: ['J.Calleja'] },
    { name: 'Baking Powder', category: 'Dry Goods & Baking', suppliers: ['J.Calleja'] },

    // Nectar
    { name: 'Vanilla Ice Cream', category: 'Frozen & Prepared', suppliers: ['Nectar'] },
    { name: 'BBQ Sauce', category: 'Sauces & Condiments', suppliers: ['Nectar'] },

    // Macbake
    { name: 'Nocciola Spread', category: 'Confectionery & Dessert', suppliers: ['Macbake'] },
    { name: 'White Chocolate', category: 'Confectionery & Dessert', suppliers: ['Macbake'] },
    { name: 'Pistachio Chocolate', category: 'Confectionery & Dessert', suppliers: ['Macbake'] },
    { name: 'Caramel Topping', category: 'Confectionery & Dessert', suppliers: ['Macbake'] },

    // Quality Food
    { name: 'Vegan Cheese', category: 'Dairy & Cheese', suppliers: ['Quality Food'] },

    // Quality Meat
    { name: 'Bacon', category: 'Meat & Poultry', suppliers: ['Quality Meat'] },

    // Forwarded "Veg" list — no supplier named in the source, so left
    // unlinked rather than guessed.
    { name: 'Tomato', category: 'Vegetables & Produce' },
    { name: 'Lettuce', category: 'Vegetables & Produce' },
    { name: 'Onion', category: 'Vegetables & Produce' },
    { name: 'Mushroom', category: 'Vegetables & Produce' },
    { name: 'Carrot', category: 'Vegetables & Produce' },
    { name: 'Cabbage', category: 'Vegetables & Produce' },
    { name: 'Lemon', category: 'Vegetables & Produce' },
    { name: 'Rucola', category: 'Vegetables & Produce' },
  ],
}

// ---------------------------------------------------------------------------
// Topo Gigio Pizzeria — menu transcribed from Data Photos/Topo Menu/*.PNG
// (real delivery menu, both pages). Ingredient catalog is the manually-
// provided, already-normalized list from the sprint brief — used verbatim
// as the authoritative source, NOT expanded with every ingredient merely
// mentioned in a pizza description (e.g. "Polpa di Modena", "corn", "green
// peppers" appear in descriptions but weren't in the provided list) per
// this sprint's "never invent" instruction. No supplier data was provided
// for Topo Gigio at all — zero Suppliers/links are seeded; see the
// completion report's "remaining manual work" section.
// ---------------------------------------------------------------------------
const topoGigio: RestaurantOnboardingData = {
  restaurantName: 'Topo Gigio Pizzeria',

  menuCategories: [
    {
      name: 'Special Pizzas',
      items: [
        { name: 'Margherita Fior Di Latte', description: 'Polpa di Modena, mozzarella fior di latte, parmiggiano, oregano & basil', price: '11.50', hasRecipe: true },
        { name: 'Carbonara', description: 'Carbo sauce made from organic eggs, guanciale, cracked pepper, pecorino & parmigiano', price: '13.95', hasRecipe: true },
        { name: 'Salsiccia & Funghi', description: 'Polpa di Modena, mozzarella, italian sausage, mushrooms, roasted mixed peppers, fennel seeds, basil, oregano & pesto oil', price: '13.95', hasRecipe: true },
        { name: "Hell's Kitchen Italy", description: 'Polpa di Modena, mozzarella, panko chicken, jalapenos, onions, salame calabrese, sour cream, oregano & basil', price: '14.95', hasRecipe: true },
        { name: 'Nduja & Straciatella', description: 'Polpa di Modena, light mozzarella, straciatella, spicy nduja, black olives, black pepper, olive oil, oregano & basil', price: '14.95', hasRecipe: true },
        { name: 'Pistacchio E Mortadella', description: 'Pistacchio pesto, mozzarella, mortadella, crushed pistachios, pecorino sauce & parmigiano', price: '14.95', hasRecipe: true },
        { name: 'Pumpkin & Guanciale', description: 'Pumpkin sauce, fior di latte, crispy guanciale, pecorino, cracked black pepper & basil', price: '14.95', hasRecipe: true },
        { name: 'Tartufo Di Gigio', description: 'Polpa di Modena, mozzarella, mushrooms, guanciale, egg, truffle cream, oregano & basil', price: '14.95', hasRecipe: true },
        { name: 'B-Figgy', description: 'Mozzarella, fig chutney, brie, walnuts, speck, fresh pepper & basil', price: '15.95', hasRecipe: true },
        { name: 'La Puttanesca', description: 'Polpa di Modena, garlic, chilli, anchovy, olives, basil, capers', price: '12.95', hasRecipe: true },
        { name: 'El Jefe Pizza', description: 'Polpa, mozzarella, chorizo, chicken, sour cream, onions, olives, cherry tomatoes', price: '13.95', hasRecipe: true },
        { name: 'BBQ Chicken', description: 'Polpa di Modena, mozzarella, crispy chicken, onion, corn, bbq sauce, green peppers', price: '13.95', hasRecipe: true },
        { name: 'Tuna Melt', description: 'Double mozzarella, capers, caramelised onions, olives, tuna, garlic aioli, basil, chilli', price: '13.95', hasRecipe: true },
        { name: 'Meat Foursome', description: 'Polpa, mozzarella, pepperoni, chicken, maltese sausage, ham, bbq sauce, corn, basil', price: '14.95', hasRecipe: true },
        { name: 'Hawaiian Sin', description: 'Polpa di Modena, mozzarella, caramelised pineapple, jalapeno, guanciale, sweet chilli sauce', price: '14.95', hasRecipe: true },
        { name: 'Burrata', description: 'Pesto, mozzarella, cherry tomatoes, rucola, burrata & truffle paste', price: '15.95', hasRecipe: true },
        { name: 'Topo Gigio Special', description: 'Polpa di Modena, mozzarella, pulled maiale, bbq sauce, italian smoked cheese, caramelised onions, peperoncino, oregano & basil', price: '15.95', hasRecipe: true },
      ],
    },
    {
      name: 'Traditional Pizzas',
      items: [
        { name: 'Margherita', description: 'Polpa di Modena, mozzarella, oregano & basil', price: '10.50', hasRecipe: true },
        { name: 'Funghi', description: 'Polpa di Modena, mozzarella, mushrooms, oregano & basil', price: '10.50', hasRecipe: true },
        { name: 'Pepperoni', description: 'Polpa di Modena, mozzarella, double pepperoni, oregano & basil', price: '11.50', hasRecipe: true },
        { name: 'Vegano Da Gigio', description: 'Vegan mozzarella, mushrooms, polpa di Modena, mixed peppers, black olives, artichokes, roasted pine nuts, oregano & basil', price: '12.95', hasRecipe: true },
      ],
    },
    {
      name: 'Classic Pizzas',
      items: [
        { name: 'Capricciosa', description: 'Polpa di Modena, mozzarella, mushrooms, prosciutto cotto, eggs, artichokes, black olives, oregano & basil', price: '13.95', hasRecipe: true },
        { name: 'Quattro Topi', description: 'Polpa di Modena, mozzarella, pecorino, gorgonzola, parmeggiano, walnuts & drizzle of honey', price: '13.95', hasRecipe: true },
        { name: 'Al Tonno', description: 'Polpa di Modena, mozzarella, tuna, onions, cherry tomatoes, olives, oregano & basil', price: '13.95', hasRecipe: true },
        { name: 'Maltese', description: 'Polpa di Modena, mozzarella, onions, maltese sausage, sundried tomato, olives, capers, local sheep cheese, maltese olive oil, oregano & basil', price: '13.95', hasRecipe: true },
        { name: 'Quattro Stagioni', description: 'Polpa di Modena, mozzarella, mushrooms, prosciutto cotto, eggs, pepperoni, oregano & basil', price: '13.95', hasRecipe: true },
        { name: 'Calzone', description: 'Tomato sauce, mozzarella cheese, ham, egg, maltese sausage & truffle cream', price: '14.95', hasRecipe: true },
      ],
    },
    {
      name: 'Asian Style Pizza',
      items: [
        { name: 'Cajun Chicken Pizza', description: 'Mozzarella, mushroom, crispy chicken, cajun aioli, pepperoni, cherry tomatoes, green peppers', price: '13.95', hasRecipe: true },
        { name: 'Satay Chicken Pizza', description: 'Polpa, mozzarella, crispy chicken, satay sauce, chillie, crushed peanuts, onion, mushroom, basil', price: '13.95', hasRecipe: true },
        { name: 'Korean BBQ Beef Pizza', description: 'Polpa, mozzarella, minced beef, spicy korean bbq sauce, caramelised onion, garlic oil, peppers, corn, parsley', price: '14.95', hasRecipe: true },
      ],
    },
    {
      name: 'Kids Menu',
      items: [
        { name: 'Topolino', description: 'Polpa di Modena, mozzarella & cocktail sausages', price: '9.95', hasRecipe: true },
        { name: 'Topolina', description: 'Polpa di Modena & mozzarella. Cheese stuffed ears', price: '9.95', hasRecipe: true },
      ],
    },
  ],

  ingredientCategories: ['Cheese', 'Meat', 'Flour', 'Sauces & Condiments', 'Dry Goods & Spices', 'Vegetables & Produce'],

  // No real supplier order sheet was provided for Topo Gigio — deliberately
  // empty rather than guessed.
  suppliers: [],

  ingredients: [
    // Cheese
    { name: 'Mozzarella', category: 'Cheese' },
    { name: 'Brie Cheese', category: 'Cheese' },
    { name: 'Blue Cheese', category: 'Cheese' },
    { name: 'Gbejniet (Goat Cheese)', category: 'Cheese' },
    { name: 'Vegan Mozzarella', category: 'Cheese' },
    { name: 'Pecorino', category: 'Cheese' },
    { name: 'Parmigiano', category: 'Cheese' },
    { name: 'Burrata', category: 'Cheese' },
    { name: 'Fior Di Latte', category: 'Cheese' },
    { name: 'Smoked Cheese', category: 'Cheese' },
    // Meat
    { name: 'Ham', category: 'Meat' },
    { name: 'Pepperoni', category: 'Meat' },
    { name: 'Mortadella', category: 'Meat' },
    { name: 'Nduja', category: 'Meat' },
    { name: 'Guanciale', category: 'Meat' },
    { name: 'SFC Chicken', category: 'Meat' },
    { name: 'Pulled Pork', category: 'Meat' },
    { name: 'Maltese Sausage', category: 'Meat' },
    { name: 'Tuna', category: 'Meat' },
    { name: 'Parma Ham', category: 'Meat' },
    { name: 'Cocktail Sausages', category: 'Meat' },
    { name: 'Minced Beef', category: 'Meat' },
    { name: 'Boiled Egg', category: 'Meat' },
    { name: 'Egg Yolk', category: 'Meat' },
    // Flour
    { name: 'Molini Pizzuti Flour', category: 'Flour' },
    { name: 'Semolina', category: 'Flour' },
    // Sauces & Condiments
    { name: 'Honey', category: 'Sauces & Condiments' },
    { name: 'Fig Jam', category: 'Sauces & Condiments' },
    { name: 'Extra Virgin Olive Oil', category: 'Sauces & Condiments' },
    { name: 'BBQ Sauce', category: 'Sauces & Condiments' },
    { name: 'Mayonnaise', category: 'Sauces & Condiments' },
    { name: 'Ketchup', category: 'Sauces & Condiments' },
    { name: 'Russian Salad', category: 'Sauces & Condiments' },
    { name: 'Satay Sauce', category: 'Sauces & Condiments' },
    { name: 'Cajun Sauce', category: 'Sauces & Condiments' },
    { name: 'Tartufo', category: 'Sauces & Condiments' },
    { name: 'Pesto', category: 'Sauces & Condiments' },
    // Dry Goods & Spices
    { name: 'Salt', category: 'Dry Goods & Spices' },
    { name: 'Walnuts', category: 'Dry Goods & Spices' },
    { name: 'Pine Nuts', category: 'Dry Goods & Spices' },
    { name: 'Crushed Pepper', category: 'Dry Goods & Spices' },
    { name: 'Crushed Pistachios', category: 'Dry Goods & Spices' },
    { name: 'Fennel Seeds', category: 'Dry Goods & Spices' },
    { name: 'Yeast', category: 'Dry Goods & Spices' },
    { name: 'Oregano', category: 'Dry Goods & Spices' },
    { name: 'Rice', category: 'Dry Goods & Spices' },
    { name: 'Lemon Pepper', category: 'Dry Goods & Spices' },
    { name: 'Sweet Paprika', category: 'Dry Goods & Spices' },
    // Vegetables & Produce
    { name: 'Jalapeño', category: 'Vegetables & Produce' },
    { name: 'Artichoke', category: 'Vegetables & Produce' },
    { name: 'Capers', category: 'Vegetables & Produce' },
    { name: 'Black Olives', category: 'Vegetables & Produce' },
    { name: 'Sun Dried Tomatoes', category: 'Vegetables & Produce' },
    { name: 'Potato Wedges', category: 'Vegetables & Produce' },
    { name: 'Lemon Juice', category: 'Vegetables & Produce' },
  ],
}

async function findOrCreateRestaurant(prisma: PrismaClient, name: string) {
  const restaurant = await prisma.restaurant.findFirst({ where: { name } })
  if (!restaurant) {
    throw new Error(
      `Restaurant "${name}" not found — seedRestaurantTenancyFoundation must run first.`
    )
  }
  return restaurant
}

async function findOrCreateMenuCategory(
  prisma: PrismaClient,
  restaurantId: string,
  name: string,
  displayOrder: number
) {
  const existing = await prisma.menuCategory.findFirst({ where: { restaurantId, name } })
  return existing ?? prisma.menuCategory.create({ data: { restaurantId, name, displayOrder } })
}

async function findOrCreateMenuItem(
  prisma: PrismaClient,
  restaurantId: string,
  menuCategoryId: string,
  item: MenuItemSeed
) {
  const existing = await prisma.menuItem.findFirst({ where: { restaurantId, name: item.name } })
  if (existing) return existing
  return prisma.menuItem.create({
    data: {
      restaurantId,
      menuCategoryId,
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      status: 'ACTIVE',
    },
  })
}

async function findOrCreateIngredientCategory(prisma: PrismaClient, restaurantId: string, name: string) {
  const existing = await prisma.ingredientCategory.findFirst({ where: { restaurantId, name } })
  return existing ?? prisma.ingredientCategory.create({ data: { restaurantId, name } })
}

async function findOrCreateSupplier(
  prisma: PrismaClient,
  restaurantId: string,
  supplier: { name: string; phone?: string }
) {
  const existing = await prisma.supplier.findFirst({ where: { restaurantId, name: supplier.name } })
  return (
    existing ??
    prisma.supplier.create({ data: { restaurantId, name: supplier.name, phone: supplier.phone } })
  )
}

async function findOrCreateIngredient(
  prisma: PrismaClient,
  restaurantId: string,
  ingredient: IngredientSeed,
  categoryIdByName: Map<string, string>,
  supplierIdByName: Map<string, string>
) {
  const existing = await prisma.ingredient.findFirst({ where: { restaurantId, name: ingredient.name } })
  if (existing) return existing

  const ingredientCategoryId = categoryIdByName.get(ingredient.category)
  const supplierIds = (ingredient.suppliers ?? []).map((name) => {
    const id = supplierIdByName.get(name)
    if (!id) throw new Error(`Unknown supplier "${name}" referenced by ingredient "${ingredient.name}".`)
    return id
  })

  return prisma.ingredient.create({
    data: {
      restaurantId,
      name: ingredient.name,
      ingredientCategoryId,
      suppliers: supplierIds.length
        ? { create: supplierIds.map((supplierId) => ({ supplierId })) }
        : undefined,
    },
  })
}

async function onboardRestaurant(prisma: PrismaClient, data: RestaurantOnboardingData) {
  const restaurant = await findOrCreateRestaurant(prisma, data.restaurantName)

  const categoryIdByName = new Map<string, string>()
  for (const name of data.ingredientCategories) {
    const category = await findOrCreateIngredientCategory(prisma, restaurant.id, name)
    categoryIdByName.set(name, category.id)
  }

  const supplierIdByName = new Map<string, string>()
  for (const supplier of data.suppliers) {
    const row = await findOrCreateSupplier(prisma, restaurant.id, supplier)
    supplierIdByName.set(supplier.name, row.id)
  }

  for (const ingredient of data.ingredients) {
    await findOrCreateIngredient(prisma, restaurant.id, ingredient, categoryIdByName, supplierIdByName)
  }

  let menuCategoryDisplayOrder = 0
  let menuItemsCreated = 0
  let recipesCreated = 0

  for (const category of data.menuCategories) {
    const menuCategory = await findOrCreateMenuCategory(
      prisma,
      restaurant.id,
      category.name,
      menuCategoryDisplayOrder++
    )

    for (const item of category.items) {
      const menuItem = await findOrCreateMenuItem(prisma, restaurant.id, menuCategory.id, item)
      menuItemsCreated++

      if (item.hasRecipe) {
        const existingRecipe = await prisma.recipe.findUnique({ where: { menuItemId: menuItem.id } })
        if (!existingRecipe) {
          // notes is a manager-facing field for optional prep/operational
          // instructions ("Prepare dough 24 hours in advance.") — never an
          // onboarding-status sentence. Ingredient lines are entered
          // manually via the UI once Units exist; that fact belongs in
          // onboarding documentation, not in a field a manager will read.
          await prisma.recipe.create({
            data: {
              restaurantId: restaurant.id,
              menuItemId: menuItem.id,
            },
          })
          recipesCreated++
        }
      }
    }
  }

  return {
    restaurantName: data.restaurantName,
    ingredientCategories: data.ingredientCategories.length,
    suppliers: data.suppliers.length,
    ingredients: data.ingredients.length,
    menuCategories: data.menuCategories.length,
    menuItems: menuItemsCreated,
    recipes: recipesCreated,
  }
}

export async function seedRestaurantProductOnboarding(prisma: PrismaClient) {
  const burgersInkResult = await onboardRestaurant(prisma, burgersInk)
  const topoGigioResult = await onboardRestaurant(prisma, topoGigio)
  return [burgersInkResult, topoGigioResult]
}

// Standalone entrypoint — `npx tsx prisma/seed-restaurant-product-onboarding.ts`.
// Not imported by seed.ts's automatic chain (see file header).
if (import.meta.url === `file://${process.argv[1]}`) {
  const { PrismaClient } = await import('../src/generated/prisma/client')
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  seedRestaurantProductOnboarding(prisma)
    .then((results) => {
      console.log(JSON.stringify(results, null, 2))
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
