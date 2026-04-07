# Project: MLBB Diamond Top-Up UI Prototype

Standard operating procedures and coding styles for the Top-Up service web prototype.

## Development Commands
* **Preview:** Open `index.html` in a browser (recommended: Live Server extension).
* **CSS Framework:** Tailwind CSS via Play CDN for rapid prototyping.

## UI & Design Standards
* **Framework:** HTML5 & Tailwind CSS.
* **Theme:** Dark Mode (Main background: `#0f172a` or `#111827`).
* **Accent Colors:** Electric Blue, Purple, or Gold for buttons and highlights.
* **Layout Structure:**
    1. **Navbar:** Logo, Search, and Login/Register buttons.
    2. **Hero:** Promo banners or carousel.
    3. **Form Section 1:** User ID & Zone ID input (with tooltip/helper image).
    4. **Form Section 2:** Product Grid (Diamond denominations with pricing).
    5. **Form Section 3:** Payment Methods (Grid of e-wallets and banks).
    6. **Action:** "Buy Now" floating button or fixed footer for mobile.
* **Responsiveness:** Mobile-first design is mandatory.

## Coding Style
* Use Tailwind utility classes directly in HTML.
* Maintain semantic HTML (e.g., `<nav>`, `<main>`, `<section>`, `<footer>`).
* Group sections using HTML comments for readability.
* Use `aspect-square` or `aspect-video` for product and banner consistency.

## Example Component Syntax
```html
<div class="bg-slate-800 border border-slate-700 p-4 rounded-xl hover:border-blue-500 transition-all cursor-pointer">
  </div>