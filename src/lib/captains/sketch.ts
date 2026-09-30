import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import type { Database } from "@/lib/supabase/database.types";

type VehicleKind = Database["public"]["Enums"]["vehicle_kind"];

/**
 * Drop your own outline drawings in `public/vehicle-sketch/` and the condition
 * sketch uses them instead of the built-in vector ones. Any web image format
 * works; damage marks are stored as a share of the drawing, so swapping the
 * picture never moves existing marks.
 */
const OUTLINE_FILES: Partial<Record<VehicleKind, string[]>> = {
  company_car: ["car-top.png", "car-top.jpg", "car-top.jpeg", "car-top.webp", "car-top.svg"],
  company_scooter: [
    "scooter-side.png",
    "scooter-side.jpg",
    "scooter-side.jpeg",
    "scooter-side.webp",
    "scooter-side.svg",
  ],
};

export type OutlineUrls = Partial<Record<VehicleKind, string>>;

export function sketchOutlineUrls(): OutlineUrls {
  const dir = path.join(process.cwd(), "public", "vehicle-sketch");
  const urls: OutlineUrls = {};

  for (const [kind, names] of Object.entries(OUTLINE_FILES) as [VehicleKind, string[]][]) {
    const found = names.find((name) => existsSync(path.join(dir, name)));
    if (found) urls[kind] = `/vehicle-sketch/${found}`;
  }

  return urls;
}
