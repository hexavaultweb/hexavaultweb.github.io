# Hexavault — Brand Guidelines

> **Version:** 1.0 · **Last Updated:** 2025 · **Maintainer:** UI Team

This document defines the visual identity, tone, and component standards for the **Hexavault** web service. All contributors must follow these guidelines to ensure a consistent and premium user experience.

---

## 1. Brand Overview

| Attribute      | Description |
|----------------|-------------|
| **Product**    | MLBB Diamond Top-Up Web Service |
| **Tagline**    | *"Fast. Safe. Always Cheaper."* |
| **Audience**   | Mobile Legends: Bang Bang players in Indonesia, ages 13–30 |
| **Tone**       | Energetic, trustworthy, gamer-friendly |
| **Language**   | Bahasa Indonesia (primary) · English (UI labels) |

---

## 2. Color Palette

### 2.1 Background Scale

| Token              | Hex       | Usage |
|--------------------|-----------|-------|
| `bg-base`          | `#0f172a` | Page background (Tailwind: `slate-900`) |
| `bg-surface`       | `#1e293b` | Cards, forms (Tailwind: `slate-800`) |
| `bg-elevated`      | `#0f172a` | Inputs, dropdowns (Tailwind: `slate-900`) |
| `bg-border`        | `#334155` | Dividers, borders (Tailwind: `slate-700`) |

### 2.2 Accent Colors

| Token              | Hex       | Tailwind Class     | Usage |
|--------------------|-----------|--------------------|-------|
| `accent-blue`      | `#3b82f6` | `blue-500`         | Links, primary CTA, focus rings |
| `accent-indigo`    | `#6366f1` | `indigo-500`       | Highlights, active states, verification |
| `accent-purple`    | `#8b5cf6` | `violet-500`       | Selected product borders, step 2 indicator |
| `accent-gold`      | `#f59e0b` | `amber-500`        | Prices, buy button, sale badges |
| `accent-orange`    | `#f97316` | `orange-500`       | Buy Now gradient end, flash-sale |

### 2.3 Semantic Colors

| Token              | Hex       | Usage |
|--------------------|-----------|-------|
| `success`          | `#10b981` | Verified state, success toast (emerald-500) |
| `danger`           | `#ef4444` | Required field marker, error states (red-500) |
| `warning`          | `#f59e0b` | Promo badges (amber-500) |
| `info`             | `#3b82f6` | Tooltip panels (blue-500) |

### 2.4 Gradient Recipes

```css
/* Brand gradient (logo, hero text) */
background: linear-gradient(135deg, #3b82f6, #8b5cf6, #f59e0b);

/* Primary CTA (Login, Verify) */
background: linear-gradient(to right, #2563eb, #6366f1);   /* blue-600 → indigo-600 */

/* Buy Now / Sale */
background: linear-gradient(to right, #f59e0b, #f97316);   /* amber-500 → orange-500 */

/* Hero glow overlay */
radial-gradient(circle, #6366f1 0%, transparent 60%),
radial-gradient(circle, #f59e0b 0%, transparent 60%);
```

---

## 3. Typography

### 3.1 Font Stack

```css
font-family: 'Inter', sans-serif;
```

### 3.2 Type Scale

| Role              | Size        | Weight | Class Example |
|-------------------|-------------|--------|---------------|
| Hero Heading      | 3rem / 5rem | 900    | `text-5xl font-black` |
| Section Title     | 1.25rem     | 700    | `text-xl font-bold` |
| Card Label        | 1rem        | 800    | `text-base font-extrabold` |
| Body / Paragraph  | 0.875rem    | 400    | `text-sm` |
| Caption / Badge   | 0.625rem    | 700    | `text-[10px] font-bold` |
| Price Display     | 0.75rem     | 600    | `text-xs font-semibold text-amber-400` |

### 3.3 Text Treatments

- **Gradient Text** — used for hero headings and the logo wordmark only.

```css
.text-gradient {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- **Uppercase tracking** — used for micro-labels and section sub-headings: `uppercase tracking-widest text-xs`.
- **Numbers / prices** — always use `font-black` for prices; format in Indonesian locale (`toLocaleString('id-ID')`).

---

## 4. Spacing & Layout

### 4.1 Grid System

- **Mobile:** 2 columns (product & payment grids)
- **Tablet (sm):** 3 columns
- **Desktop (lg):** 4 columns
- **Max page width:** `max-w-7xl` (80rem / 1280px)
- **Page padding:** `px-4 sm:px-6 lg:px-8`

### 4.2 Border Radius

| Context       | Radius | Tailwind |
|---------------|--------|----------|
| Cards / Forms | 16px   | `rounded-2xl` |
| Inputs / Tags | 12px   | `rounded-xl` |
| Badges        | 6px    | `rounded-md` |
| Dots / Avatars| full   | `rounded-full` |

### 4.3 Spacing Tokens

- Section gap: `py-12` (vertical padding between major sections)
- Card gap: `gap-3 sm:gap-4`
- Form field gap: `gap-4`
- Inner card padding: `p-3` (compact) · `p-6 sm:p-8` (sections)

---

## 5. Component Standards

### 5.1 Cards

All cards share a base style. Copy this pattern:

```html
<div class="bg-slate-900 border border-slate-700 p-4 rounded-xl
            hover:border-[accent-color] hover:shadow-lg hover:shadow-[accent]/10
            transition-all cursor-pointer select-none">
</div>
```

**Selected state** — add a glow ring via box-shadow + border color:

```css
/* Purple glow (product card) */
border-color: #6366f1;
box-shadow: 0 0 0 2px #6366f1, 0 0 20px rgba(99,102,241,0.4);

/* Gold glow (payment card) */
border-color: #f59e0b;
box-shadow: 0 0 0 2px #f59e0b, 0 0 16px rgba(245,158,11,0.35);
```

### 5.2 Buttons

| Variant    | Classes |
|------------|---------------------------------------|
| **Primary** (Verify / Login) | `bg-gradient-to-r from-blue-600 to-indigo-600 font-bold rounded-xl hover:shadow-indigo-500/30 active:scale-95` |
| **CTA Buy** | `bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-black rounded-xl shadow-amber-500/30 hover:scale-105 active:scale-95` |
| **Ghost** (Login border) | `border border-slate-600 hover:border-indigo-400 hover:text-indigo-400` |
| **Icon** (Carousel nav) | `bg-slate-800/70 border border-slate-600 hover:bg-slate-700 rounded-full` |

All buttons must have `transition-all` and `active:scale-95` for micro-feedback.

### 5.3 Badges / Labels

```html
<!-- Hot badge -->
<span class="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">HOT</span>

<!-- Best Value -->
<span class="px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold">BEST</span>

<!-- Promo -->
<span class="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-900 text-[10px] font-bold">PROMO</span>

<!-- VIP -->
<span class="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-[10px] font-bold">VIP</span>
```

### 5.4 Inputs

```html
<input class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-sm
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40
              transition-colors placeholder-slate-600" />
```

- Always use `rounded-xl`, never `rounded-md`.
- Placeholder text: `text-slate-600` (must be readable but clearly secondary).
- Focus ring: `indigo-500` at 40% opacity.

### 5.5 Navbar

- Always `fixed` with `backdrop-blur-md` and `bg-slate-900/80`.
- Height: `h-16`. Content uses `flex items-center justify-between`.
- Logo: gradient icon (SVG) + wordmark; hidden on mobile below `sm`.

### 5.6 Fixed Footer Bar (Buy Bar)

- Always `fixed bottom-0` with `backdrop-blur-md`.
- Contains: order summary (left) + CTA button (right).
- CTA is **disabled** until both product and payment are selected.
- Disabled state: `opacity-40 cursor-not-allowed`.

---

## 6. Iconography

- Use **inline SVG** only. No icon font libraries.
- Stroke icons: `stroke="currentColor"`, `stroke-width="2"` (or `2.5` for emphasis).
- Size: `w-4 h-4` (small) · `w-5 h-5` (medium) · `w-9 h-9` (large/logo).
- Emoji glyphs (💎, 🔥, ⚡) are acceptable for product/promo visual accents.

---

## 7. Motion & Animation

| Effect            | When to use | CSS/Tailwind |
|-------------------|-------------|--------------|
| Scale on hover    | All buttons, product cards | `hover:scale-105` |
| Scale on press    | Buttons | `active:scale-95` |
| Color transition  | Borders, text, backgrounds | `transition-colors` (200ms) |
| All-property transition | Cards, buttons | `transition-all` |
| Float loop        | Modal | `animation: float 4s ease-in-out infinite` |
| Carousel slide    | Hero slides | `transition: transform 0.6s cubic-bezier(0.25,0.8,0.25,1)` |
| Pulse slow        | Loading states | `animation: pulse 3s infinite` |

**Rules:**
- Never animate layout properties (width, height, margin).
- Keep animation durations under 600ms for interactive feedback.
- Auto-play interval for carousel: **4500ms**.

---

## 8. Glass & Surface Effects

```css
/* Navbar / Buy Bar */
background: rgba(15, 23, 42, 0.8);   /* slate-900 at 80% */
backdrop-filter: blur(12px);          /* backdrop-blur-md */

/* Section cards */
background: rgba(30, 41, 59, 0.6);   /* slate-800 at 60% */
backdrop-filter: blur(8px);           /* backdrop-blur-sm */

/* Modal overlay */
background: rgba(0, 0, 0, 0.6);
backdrop-filter: blur(8px);
```

---

## 9. Tone of Voice

| Situation         | Do ✅ | Avoid ❌ |
|-------------------|-------|---------|
| Promo labels      | "Double Diamond", "Flash Sale", "Mega Sale" | "Discount", "Sale Item" |
| CTA buttons       | "Buy Now →", "Get Starlight →", "Top-Up Now →" | "Submit", "Click Here" |
| Helper text       | "Your diamonds will arrive shortly ✓" | "Transaction completed." |
| Error / warning   | "Please enter both User ID and Zone ID." | "Error: field required" |
| Verified state    | "Account verified: [Name] ✓" | "Verification successful" |

---

## 10. Accessibility

- All interactive elements must have unique `id` attributes.
- Icon-only buttons require `aria-label`.
- Carousel controls use `aria-label="Previous slide"` / `"Next slide"`.
- Color is never the sole means of conveying information (use icons or text alongside).
- Minimum contrast ratio: **4.5:1** for body text on dark backgrounds.
- Inputs must have associated `<label>` elements (use `for` attribute).

---

## 11. Do's and Don'ts

### ✅ Do

- Use `font-black` (900) for all price and diamond quantity displays.
- Use `select-none` on all clickable cards to prevent text selection on tap.
- Apply `aspect-square` to product grid cards for layout consistency.
- Format all prices with `toLocaleString('id-ID')` for Indonesian formatting.
- Group HTML sections with comments: `<!-- SECTION: NAVBAR -->`.

### ❌ Don't

- Don't use plain colors (pure red, blue, green) — always use curated palette tokens.
- Don't use external image URLs — use SVG, CSS gradients, or emoji.
- Don't add Tailwind utility classes ad-hoc — use established patterns from this guide.
- Don't use `rounded-lg` on form inputs or section cards (use `rounded-xl` or `rounded-2xl`).
- Don't use `font-normal` for prices, quantities, or CTAs.

---

## 12. File Structure Reference

```
layanan-game-online/
├── index.html       # Main UI (single-page prototype)
├── CLAUDE.md        # Development SOPs and coding standards
└── BRAND.md         # This file — brand guidelines
```
