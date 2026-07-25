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

export const SEASONS = ["warm", "cold", "all-season"];

export const FORMALITY = ["casual", "business", "formal"];

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

// Which formality levels each activity calls for.
export const ACTIVITY_FORMALITY = {
  Walking: ["casual"],
  Hiking: ["casual"],
  Sightseeing: ["casual"],
  Beach: ["casual"],
  "Fancy Dining": ["formal"],
  "Casual Dining": ["casual"],
  "Business/Work": ["business"],
  Nightlife: ["business", "formal"],
  "Outdoor/Adventure": ["casual"],
  "Relaxing/Spa": ["casual"],
};

// Activities that call out a specific wardrobe category regardless of formality.
export const ACTIVITY_CATEGORY = {
  Beach: ["Swimwear"],
  Hiking: ["Activewear"],
  "Outdoor/Adventure": ["Activewear"],
};
