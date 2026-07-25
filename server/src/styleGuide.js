// Curated, research-backed packing guidance keyed by climate and activity —
// not a live lookup, so it works for any destination with zero API cost.
// "Shop similar" links go to a Google Shopping *search* rather than a
// specific product page: a fabricated direct-product link can go stale or
// simply be wrong, while a search always resolves to something relevant.

function shopSearch(query) {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

const CLIMATE_NOTES = {
  warm: "Warm-weather travel calls for breathable natural fabrics (linen, cotton) in a few mix-and-match neutral colors, plus one dressier piece for evenings.",
  cold: "Cold-weather travel is about layering: a thermal base layer, a warm mid-layer, and a weather-resistant outer layer, so you can adjust through the day.",
  "all-season": "Mixed or mild weather calls for versatile layers you can add or remove — a packable jacket and comfortable walking shoes cover most days.",
};

const CLIMATE_ITEMS = {
  warm: [
    { label: "Lightweight linen or cotton top", query: "women's linen top" },
    { label: "Breathable trousers or shorts", query: "women's linen trousers" },
    { label: "Sundress", query: "women's sundress" },
    { label: "Comfortable walking sandals", query: "women's leather walking sandals" },
    { label: "Wide-brim sun hat", query: "women's sun hat" },
    { label: "Lightweight scarf (doubles as a sun or shoulder cover)", query: "lightweight silk travel scarf" },
  ],
  cold: [
    { label: "Thermal base layers", query: "women's thermal base layer" },
    { label: "Wool or fleece sweater", query: "women's merino wool sweater" },
    { label: "Weather-resistant coat", query: "women's waterproof winter coat" },
    { label: "Insulated waterproof boots", query: "women's insulated winter boots" },
    { label: "Warm hat, gloves, and scarf", query: "women's winter hat gloves scarf set" },
    { label: "Wool or thermal socks", query: "women's wool hiking socks" },
  ],
  "all-season": [
    { label: "Versatile layering top", query: "women's lightweight layering top" },
    { label: "Packable light jacket", query: "women's packable jacket" },
    { label: "Comfortable walking shoes", query: "women's comfortable walking shoes" },
    { label: "Travel-friendly trousers", query: "women's travel trousers" },
  ],
};

const ACTIVITY_ITEMS = {
  Beach: [
    { label: "Swimsuit", query: "women's swimsuit" },
    { label: "Swim cover-up", query: "women's swim cover up" },
  ],
  "Fancy Dining": [
    { label: "Elevated dinner dress", query: "women's dinner dress" },
    { label: "Dressy sandals or heels", query: "women's dressy sandals" },
  ],
  "Business/Work": [
    { label: "Blazer", query: "women's blazer" },
    { label: "Tailored trousers", query: "women's tailored trousers" },
    { label: "Loafers or flats", query: "women's loafers" },
  ],
  Hiking: [
    { label: "Moisture-wicking layers", query: "women's moisture wicking hiking shirt" },
    { label: "Hiking shoes or trail sneakers", query: "women's hiking shoes" },
  ],
  "Outdoor/Adventure": [
    { label: "Moisture-wicking layers", query: "women's moisture wicking activewear" },
    { label: "Sturdy trainers", query: "women's trail running shoes" },
  ],
  Nightlife: [
    { label: "Going-out top", query: "women's going out top" },
  ],
};

// Destination keyword -> cultural/modesty note, matched case-insensitively
// against the trip's destination text. Not exhaustive — a reasonable set of
// commonly-visited regions rather than every country in the world.
const DESTINATION_NOTES = [
  {
    keywords: ["italy", "vatican", "spain", "france", "portugal", "greece", "poland", "austria", "croatia"],
    note: "Many churches and cathedrals in this region require covered shoulders and knees for entry — pack a lightweight scarf or wrap you can throw on.",
  },
  {
    keywords: ["saudi", "uae", "dubai", "abu dhabi", "qatar", "egypt", "morocco", "jordan", "turkey", "oman"],
    note: "Mosques generally expect long sleeves and long pants or skirts, with hair covered for women — a scarf and a looser layer are worth packing even if a visit isn't planned.",
  },
  {
    keywords: ["thailand", "vietnam", "cambodia", "indonesia", "bali", "malaysia", "myanmar", "laos", "singapore"],
    note: "Temples typically expect shoulders and knees covered and shoes removed at the entrance — a light sarong or scarf packs small and covers both.",
  },
  {
    keywords: ["japan", "korea", "china"],
    note: "Comfortable slip-on shoes are handy — many temples, traditional restaurants, and some homes expect shoes off at the door.",
  },
];

export function getStyleGuide(destination, targetSeason, activities) {
  const season = targetSeason && CLIMATE_ITEMS[targetSeason] ? targetSeason : "all-season";

  const seen = new Set();
  const items = [];
  const addAll = (list) => {
    for (const item of list) {
      if (seen.has(item.label)) continue;
      seen.add(item.label);
      items.push(item);
    }
  };
  addAll(CLIMATE_ITEMS[season]);
  for (const activity of activities) addAll(ACTIVITY_ITEMS[activity] || []);

  const destLower = (destination || "").toLowerCase();
  const culturalNotes = DESTINATION_NOTES.filter((entry) => entry.keywords.some((k) => destLower.includes(k))).map(
    (entry) => entry.note
  );

  return {
    climateNote: CLIMATE_NOTES[season],
    items: items.map((item) => ({ label: item.label, shopUrl: shopSearch(item.query) })),
    culturalNotes,
  };
}
