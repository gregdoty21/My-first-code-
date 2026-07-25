export const CATEGORIES = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Shoes",
  "Accessories",
  "Swimwear",
  "Activewear",
  "Sleepwear",
  "Other",
];

// Specific garment types within each category — optional, more precise
// tagging than the broad category alone (e.g. a "Tops" item might be a
// blouse, a button-up, or a going-out top). Keyed by category so the
// frontend can show only the types relevant to whatever category is picked.
export const SUBCATEGORIES = {
  Tops: [
    "T-shirt",
    "Tank top",
    "Camisole",
    "Blouse",
    "Button-up shirt",
    "Polo shirt",
    "Crop top",
    "Going-out top",
    "Sweater",
    "Hoodie/Sweatshirt",
    "Other top",
  ],
  Bottoms: ["Jeans", "Shorts", "Skirt", "Trousers/Pants", "Leggings", "Joggers", "Other bottom"],
  Dresses: ["Mini dress", "Midi dress", "Maxi dress", "Sundress", "Cocktail dress", "Wrap dress", "Other dress"],
  Outerwear: ["Jacket", "Coat", "Blazer", "Cardigan", "Vest", "Other outerwear"],
  Shoes: ["Sneakers", "Sandals", "Heels", "Flats", "Boots", "Other shoes"],
  Accessories: ["Bag", "Jewelry", "Belt", "Scarf", "Hat", "Sunglasses", "Other accessory"],
  Swimwear: ["Bikini top", "Bikini bottom", "One-piece swimsuit", "Cover-up", "Board shorts", "Other swimwear"],
  Activewear: ["Sports bra", "Athletic top", "Leggings", "Athletic shorts", "Tracksuit", "Other activewear"],
  Sleepwear: ["Pajama top", "Pajama bottom", "Nightgown", "Robe", "Other sleepwear"],
  Other: ["Other"],
};

export const SEASONS = ["warm", "cold", "all-season"];

// The occasion/vibe a piece is suited for — broader than just "how dressy",
// since activewear and loungewear aren't really a formality level at all.
export const FORMALITY = ["casual", "activewear", "loungewear", "business", "going-out", "formal"];

export const ACTIVITIES = [
  "Walking",
  "Hiking",
  "Sightseeing",
  "Beach",
  "Fancy Dining",
  "Casual Dining",
  "Business/Work",
  "Nightlife",
  "Outdoor/Adventure",
  "Relaxing/Spa",
];

export const SUITCASE_SIZES = [
  { id: "carry-on", label: "Carry-on", guideline: 18 },
  { id: "medium-checked", label: "Medium checked bag", guideline: 30 },
  { id: "large-checked", label: "Large checked bag", guideline: 45 },
];

// Which formality/style levels each activity calls for.
export const ACTIVITY_FORMALITY = {
  Walking: ["casual"],
  Hiking: ["casual", "activewear"],
  Sightseeing: ["casual"],
  Beach: ["casual"],
  "Fancy Dining": ["formal", "going-out"],
  "Casual Dining": ["casual"],
  "Business/Work": ["business"],
  Nightlife: ["going-out", "business", "formal"],
  "Outdoor/Adventure": ["casual", "activewear"],
  "Relaxing/Spa": ["casual", "loungewear"],
};

// Activities that call out a specific wardrobe category regardless of formality.
export const ACTIVITY_CATEGORY = {
  Beach: ["Swimwear"],
  Hiking: ["Activewear"],
  "Outdoor/Adventure": ["Activewear"],
};

// "My Fashion Profile" — lightweight personality/preference tags the user
// picks about themselves, used to give the outfit builder a sense of who
// they are beyond just wardrobe tags and trip activities.
export const INTERESTS = [
  "Active sports / fitness",
  "Going out / nightlife",
  "Relaxing at home",
  "Traveling / adventure",
  "Work / business",
  "Creative / artsy",
  "Foodie / dining",
  "Beauty & self-care",
];

export const STYLE_VIBES = ["Casual", "Minimalist", "Classic", "Trendy", "Boho", "Edgy", "Sporty", "Glam"];
