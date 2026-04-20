/**
 * Built-in SVG template library — 16 templates across 4 categories.
 *
 * Every SVG uses multiple filled paths so the staggered Flow animation
 * and the 3D Sculpt extrusion both have something interesting to work with.
 * All SVGs use a 200×200 viewBox and non-white fills.
 */

export type LibraryCategory = 'all' | 'icon' | 'geometric' | 'logo' | 'illustration'

export interface LibraryItem {
  id:       string
  name:     string
  category: Exclude<LibraryCategory, 'all'>
  svg:      string
}

// ─────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────

const bolt: LibraryItem = {
  id: 'bolt', name: 'Bolt', category: 'icon',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M118 18L52 108H97L78 182L152 90H105Z" fill="#F97316"/>
  <path d="M118 18L90 75H112L100 118L138 74H114Z" fill="#FCD34D"/>
</svg>`,
}

const star: LibraryItem = {
  id: 'star', name: 'Star', category: 'icon',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 18L122 74H180L134 108L152 164L100 130L48 164L66 108L20 74H78Z" fill="#F59E0B"/>
  <path d="M100 52L112 84H146L120 104L130 136L100 118L70 136L80 104L54 84H88Z" fill="#FDE68A"/>
</svg>`,
}

const heart: LibraryItem = {
  id: 'heart', name: 'Heart', category: 'icon',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 170C60 148 20 115 20 76C20 51 40 32 66 32C81 32 94 40 100 52C106 40 119 32 134 32C160 32 180 51 180 76C180 115 140 148 100 170Z" fill="#EF4444"/>
  <path d="M100 148C72 130 46 106 46 80C46 65 57 54 70 54C80 54 90 60 95 70C100 60 110 54 120 54C133 54 144 65 144 80C144 106 118 130 100 148Z" fill="#FCA5A5"/>
</svg>`,
}

const gem: LibraryItem = {
  id: 'gem', name: 'Gem', category: 'icon',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <polygon points="65,75 135,75 100,40"             fill="#4F46E5"/>
  <polygon points="65,75 40,100 100,182"             fill="#6366F1"/>
  <polygon points="135,75 160,100 100,182"           fill="#4338CA"/>
  <polygon points="40,100 160,100 100,182"           fill="#818CF8"/>
  <polygon points="100,40 120,75 80,75"              fill="#C7D2FE"/>
  <polygon points="65,75 135,75 160,100 40,100"      fill="#6366F1" opacity="0.6"/>
</svg>`,
}

// ─────────────────────────────────────────────────────────────────
// Geometric
// ─────────────────────────────────────────────────────────────────

const rings: LibraryItem = {
  id: 'rings', name: 'Rings', category: 'geometric',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="82" fill="#7C3AED"/>
  <circle cx="100" cy="100" r="62" fill="#8B5CF6"/>
  <circle cx="100" cy="100" r="42" fill="#A78BFA"/>
  <circle cx="100" cy="100" r="22" fill="#7C3AED"/>
</svg>`,
}

const hexgrid: LibraryItem = {
  id: 'hexgrid', name: 'Hexgrid', category: 'geometric',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <polygon points="122,100 111,119 89,119 78,100 89,81 111,81"  fill="#0D9488"/>
  <polygon points="144,62 133,81 111,81 100,62 111,43 133,43"   fill="#14B8A6"/>
  <polygon points="166,100 155,119 133,119 122,100 133,81 155,81" fill="#0F766E"/>
  <polygon points="144,138 133,157 111,157 100,138 111,119 133,119" fill="#0D9488"/>
  <polygon points="100,138 89,157 67,157 56,138 67,119 89,119"  fill="#14B8A6"/>
  <polygon points="78,100 67,119 45,119 34,100 45,81 67,81"     fill="#0F766E"/>
  <polygon points="100,62 89,81 67,81 56,62 67,43 89,43"        fill="#2DD4BF"/>
</svg>`,
}

const waves: LibraryItem = {
  id: 'waves', name: 'Waves', category: 'geometric',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 75 Q25 55 50 75 Q75 95 100 75 Q125 55 150 75 Q175 95 200 75 L200 200 L0 200Z" fill="#3B82F6"/>
  <path d="M0 105 Q25 85 50 105 Q75 125 100 105 Q125 85 150 105 Q175 125 200 105 L200 200 L0 200Z" fill="#60A5FA"/>
  <path d="M0 135 Q25 115 50 135 Q75 155 100 135 Q125 115 150 135 Q175 155 200 135 L200 200 L0 200Z" fill="#93C5FD"/>
</svg>`,
}

const squares: LibraryItem = {
  id: 'squares', name: 'Squares', category: 'geometric',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="58" y="58" width="84" height="84" rx="6" fill="#F43F5E" transform="rotate(0 100 100)"/>
  <rect x="58" y="58" width="84" height="84" rx="6" fill="#FB923C" transform="rotate(15 100 100)"/>
  <rect x="58" y="58" width="84" height="84" rx="6" fill="#FBBF24" transform="rotate(30 100 100)"/>
  <rect x="58" y="58" width="84" height="84" rx="6" fill="#34D399" transform="rotate(45 100 100)"/>
</svg>`,
}

// ─────────────────────────────────────────────────────────────────
// Logo marks
// ─────────────────────────────────────────────────────────────────

const arc: LibraryItem = {
  id: 'arc', name: 'Arc', category: 'logo',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 28C62 28 32 58 32 96C32 118 42 138 58 151L74 133C62 123 52 111 52 96C52 69 74 48 100 48Z" fill="#6366F1"/>
  <path d="M100 28C138 28 168 58 168 96C168 118 158 138 142 151L126 133C138 123 148 111 148 96C148 69 126 48 100 48Z" fill="#3F37C9"/>
  <circle cx="100" cy="160" r="18" fill="#3F37C9"/>
  <circle cx="100" cy="160" r="9"  fill="#818CF8"/>
</svg>`,
}

const shield: LibraryItem = {
  id: 'shield', name: 'Shield', category: 'logo',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 20L172 52V100C172 140 140 170 100 182C60 170 28 140 28 100V52Z" fill="#1E3A8A"/>
  <path d="M100 38L154 64V100C154 132 132 156 100 166C68 156 46 132 46 100V64Z" fill="#2563EB"/>
  <path d="M84 97L82 109L97 118L122 84L114 76L96 102Z" fill="#BFDBFE"/>
</svg>`,
}

const infinity: LibraryItem = {
  id: 'infinity', name: 'Infinity', category: 'logo',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 87C92 75 78 66 62 66C38 66 18 83 18 100C18 117 38 134 62 134C78 134 92 125 100 113C108 125 122 134 138 134C162 134 182 117 182 100C182 83 162 66 138 66C122 66 108 75 100 87Z" fill="#F97316"/>
  <path d="M100 95C94 86 82 78 68 78C50 78 36 88 36 100C36 112 50 122 68 122C82 122 94 114 100 105C106 114 118 122 132 122C150 122 164 112 164 100C164 88 150 78 132 78C118 78 106 86 100 95Z" fill="#FDBA74"/>
</svg>`,
}

const bloom: LibraryItem = {
  id: 'bloom', name: 'Bloom', category: 'logo',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#EC4899"/>
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#F472B6" transform="rotate(60 100 100)"/>
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#EC4899" transform="rotate(120 100 100)"/>
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#F9A8D4" transform="rotate(180 100 100)"/>
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#EC4899" transform="rotate(240 100 100)"/>
  <ellipse cx="100" cy="58" rx="20" ry="36" fill="#F472B6" transform="rotate(300 100 100)"/>
  <circle cx="100" cy="100" r="20" fill="#FDF2F8"/>
</svg>`,
}

// ─────────────────────────────────────────────────────────────────
// Illustrations
// ─────────────────────────────────────────────────────────────────

const rocket: LibraryItem = {
  id: 'rocket', name: 'Rocket', category: 'illustration',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 22C100 22 132 52 132 100L100 122L68 100C68 52 100 22 100 22Z" fill="#6366F1"/>
  <circle cx="100" cy="80" r="15" fill="#C7D2FE"/>
  <path d="M68 100L46 132L68 120Z" fill="#4F46E5"/>
  <path d="M132 100L154 132L132 120Z" fill="#4F46E5"/>
  <path d="M84 122L100 174L116 122Z" fill="#F97316"/>
  <path d="M90 122L100 154L110 122Z" fill="#FDE68A"/>
</svg>`,
}

const sun: LibraryItem = {
  id: 'sun', name: 'Sun', category: 'illustration',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <polygon points="100,16 107,46 93,46"                         fill="#F59E0B"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(45 100 100)"  fill="#FBBF24"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(90 100 100)"  fill="#F59E0B"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(135 100 100)" fill="#FBBF24"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(180 100 100)" fill="#F59E0B"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(225 100 100)" fill="#FBBF24"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(270 100 100)" fill="#F59E0B"/>
  <polygon points="100,16 107,46 93,46" transform="rotate(315 100 100)" fill="#FBBF24"/>
  <circle cx="100" cy="100" r="36" fill="#FDE68A"/>
  <circle cx="100" cy="100" r="26" fill="#F59E0B"/>
</svg>`,
}

const leaf: LibraryItem = {
  id: 'leaf', name: 'Leaf', category: 'illustration',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 168L38 82C38 52 66 26 100 26C134 26 162 52 162 82Z" fill="#22C55E"/>
  <path d="M100 148L56 86C56 62 74 42 100 42C126 42 144 62 144 86Z" fill="#4ADE80"/>
  <path d="M100 148L100 178" stroke="#16A34A" stroke-width="8" stroke-linecap="round" fill="none"/>
  <rect x="96" y="150" width="8" height="28" rx="4" fill="#16A34A"/>
</svg>`,
}

const planet: LibraryItem = {
  id: 'planet', name: 'Planet', category: 'illustration',
  svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="100" rx="84" ry="20" fill="#C084FC" opacity="0.55"/>
  <circle cx="100" cy="100" r="52" fill="#7C3AED"/>
  <ellipse cx="86" cy="84" rx="16" ry="12" fill="#A78BFA" opacity="0.65"/>
  <path d="M16 100 Q100 136 184 100 Q100 112 16 100Z" fill="#9333EA" opacity="0.75"/>
</svg>`,
}

// ─────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────

export const LIBRARY_ITEMS: LibraryItem[] = [
  bolt, star, heart, gem,
  rings, hexgrid, waves, squares,
  arc, shield, infinity, bloom,
  rocket, sun, leaf, planet,
]

export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string }[] = [
  { id: 'all',          label: 'All'          },
  { id: 'icon',         label: 'Icons'        },
  { id: 'geometric',    label: 'Geometric'    },
  { id: 'logo',         label: 'Logo'         },
  { id: 'illustration', label: 'Illustration' },
]

export function getLibraryItems(category: LibraryCategory): LibraryItem[] {
  return category === 'all'
    ? LIBRARY_ITEMS
    : LIBRARY_ITEMS.filter(i => i.category === category)
}
