import { Router } from "express";
import {
  CATEGORIES,
  SUBCATEGORIES,
  SEASONS,
  FORMALITY,
  ACTIVITIES,
  SUITCASE_SIZES,
  INTERESTS,
  STYLE_VIBES,
} from "../constants.js";

export const metaRouter = Router();

metaRouter.get("/", (req, res) => {
  res.json({
    categories: CATEGORIES,
    subcategories: SUBCATEGORIES,
    seasons: SEASONS,
    formality: FORMALITY,
    activities: ACTIVITIES,
    suitcaseSizes: SUITCASE_SIZES,
    interests: INTERESTS,
    styleVibes: STYLE_VIBES,
  });
});
