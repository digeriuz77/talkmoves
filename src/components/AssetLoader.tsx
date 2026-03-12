// Optional classroom/atmosphere image URLs. Empty = use CSS gradients.
// When set, use filenames from public/ (e.g. from scripts/generate-images.ts).
export type AssetUrls = {
  classroom_normal: string;
  classroom_beasts: string;
  classroom_transformers: string;
};

// Maps to script output: classroom_bg.jpg, beast_aura.jpg, transformer_aura.jpg in public/
export const DEFAULT_ASSETS: AssetUrls = {
  classroom_normal: '/classroom_bg.jpg',
  classroom_beasts: '/beast_aura.jpg',
  classroom_transformers: '/transformer_aura.jpg',
};
