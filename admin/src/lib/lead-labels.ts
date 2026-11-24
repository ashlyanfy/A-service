import { DictionaryKey } from "./i18n/dictionaries";
import { Lead } from "@/types";

type Translate = (key: DictionaryKey) => string;

export const currentCategoryKeys: Record<string, DictionaryKey> = {
  "install": "request_cat_install",
  "transport": "request_cat_transport",
  "dispose": "request_cat_dispose",
  "canopy": "request_cat_canopy",
  "clean": "request_cat_clean",
  "furniture": "request_cat_furniture",
  "paint": "request_cat_paint",
  "rigging": "request_cat_rigging",
  "terminal": "request_cat_terminal",
  "canopy-care": "request_cat_canopy_care",
  "furniture-pack": "request_cat_furniture_pack",
  general: "request_cat_general",
  "bank-profile": "request_kind_material",
};

export const previousCategoryKeys: Record<string, DictionaryKey> = {
  "atm-installation": "cat_atm_installation",
  "transport-rigging": "cat_transport_rigging",
  "restoration-branding": "cat_restoration_branding",
  canopies: "cat_canopies",
  "corporate-logistics": "cat_corporate_logistics",
};

const categoryLabels = new Map(Object.entries({ ...previousCategoryKeys, ...currentCategoryKeys }));

export function categoryLabel(category: string | null, t: Translate) {
  const key = category ? categoryLabels.get(category) : undefined;
  if (category === "repair" || category === "buyback") return t("request_cat_archived");
  return key ? t(key) : category || "—";
}

export function requestKind(source: Lead["source"], t: Translate) {
  if (source === "website_material") return t("request_kind_material");
  if (source === "website_service") return t("request_kind_service");
  return t("request_kind_legacy");
}
