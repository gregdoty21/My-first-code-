import { Router } from "express";
import { CATEGORIES, SEASONS, FORMALITY, ACTIVITIES, SUITCASE_SIZES } from "../constants.js";

export const metaRouter = Router();

metaRouter.get("/", (req, res) => {
  res.json({ categories: CATEGORIES, seasons: SEASONS, formality: FORMALITY, activities: ACTIVITIES, suitcaseSizes: SUITCASE_SIZES });
});
