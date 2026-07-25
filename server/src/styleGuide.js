// Curated, research-backed packing guidance keyed by climate and activity —
// not a live lookup, so it works for any destination with zero API cost.
// "Shop similar" links go to a Google Shopping *search* rather than a
// specific product page: a fabricated direct-product link can go stale or
// simply be wrong, while a search always resolves to something relevant.

function shopSearch(query) {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

const CLIMATE_NOTES = {
  warm: "Strong sun calls for real UV protection — broad-spectrum sunscreen, sunglasses that block 100% of UVA/UVB, and something to soothe skin after a day outside.",
  cold: "Cold, dry air, wind, and indoor heating all pull moisture out of skin fast — a richer moisturizer and lip balm matter, and sunglasses/SPF are still worth packing since snow and altitude reflect a lot of UV.",
  "all-season": "A daily moisturizer with SPF and a pair of sunglasses cover most mixed-weather days — dermatologists recommend SPF daily regardless of season or cloud cover.",
};

const CLIMATE_ITEMS = {
  warm: [
    { label: "Broad-spectrum SPF 30+ sunscreen", query: "broad spectrum SPF 50 sunscreen" },
    { label: "Daily facial moisturizer with SPF", query: "facial moisturizer with SPF" },
    { label: "UV-blocking sunglasses", query: "women's UV protection sunglasses" },
    { label: "After-sun aloe vera gel", query: "after sun aloe vera gel" },
    { label: "SPF lip balm", query: "SPF lip balm" },
    { label: "Insect repellent", query: "travel size insect repellent" },
  ],
  cold: [
    { label: "Rich, ceramide-based face moisturizer", query: "rich ceramide face moisturizer" },
    { label: "Lip balm", query: "lip balm beeswax" },
    { label: "Hand cream", query: "travel size hand cream" },
    { label: "Sunglasses (snow glare)", query: "women's sunglasses" },
    { label: "SPF facial moisturizer (snow/altitude UV)", query: "facial moisturizer with SPF" },
    { label: "Hydrating face mist", query: "travel size hydrating face mist" },
  ],
  "all-season": [
    { label: "Daily moisturizer with SPF", query: "facial moisturizer with SPF" },
    { label: "Sunglasses", query: "women's sunglasses" },
    { label: "Lip balm", query: "lip balm" },
    { label: "Travel-size hand sanitizer", query: "travel size hand sanitizer" },
  ],
};

const ACTIVITY_ITEMS = {
  Beach: [
    { label: "Waterproof sunscreen SPF 50", query: "waterproof sunscreen SPF 50" },
    { label: "Aloe vera after-sun gel", query: "aloe vera after sun gel" },
  ],
  "Fancy Dining": [
    { label: "Travel-size makeup setting spray", query: "travel size makeup setting spray" },
  ],
  "Business/Work": [
    { label: "Travel-size hand cream", query: "travel size hand cream" },
  ],
  Hiking: [
    { label: "Insect repellent", query: "insect repellent" },
    { label: "Blister balm", query: "blister prevention balm" },
  ],
  "Outdoor/Adventure": [
    { label: "Insect repellent", query: "insect repellent" },
    { label: "SPF lip balm", query: "SPF lip balm" },
  ],
  Nightlife: [
    { label: "Travel-size makeup remover wipes", query: "travel size makeup remover wipes" },
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
