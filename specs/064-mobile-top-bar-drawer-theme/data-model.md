# Data Model: Mobile Top Bar and Navigation Drawer Theming (SPLR-87)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **viewport-gated shell chrome theming**, **token application rules**, and **interactive control contracts** — all client-side presentation.

## Viewport mode (theme activation)

| Mode | Detection | Themed surfaces |
|------|-----------|-----------------|
| Desktop shell | Viewport > 768px (sidebar slot visible) | Sidebar rail only (existing brown/cream) |
| Mobile shell | Viewport ≤ 768px (sidebar slot hidden) | Top bar (brown/cream) + drawer panel (brown/cream) when open |

**Rule**: Mobile top bar theming MUST apply only inside `@media (max-width: 768px)`. Desktop top bar MUST remain transparent with brown text.

## Shell chrome theme entities

### Mobile top bar chrome

| Attribute | Value |
|-----------|-------|
| Component | `TopBar` |
| Activation | `showMobileMenu === true` AND viewport ≤ 768px (CSS) |
| Background | `var(--color-primary-brown)` |
| Primary text | `var(--color-text-on-dark)` → `var(--color-bg-cream)` |
| Org name class | `.top-bar__org-name` |
| Menu button class | `.top-bar__menu-button` |
| Menu icon | Font Awesome `faBars`, cream on brown |
| Brand slot | Unchanged from SPLR-84 — wordmark centered |
| Test ids | `top-bar`, `mobile-nav-open`, `top-bar-brand`, `top-bar-org-name` |

### Mobile drawer chrome

| Attribute | Value |
|-----------|-------|
| Component | `MobileNavDrawer` panel |
| Activation | `open === true` |
| Background | `var(--color-primary-brown)` (existing) |
| Primary text | `var(--color-bg-cream)` via `color: inherit` |
| Panel class | `.mobile-nav-drawer__panel` |
| Close button class | `.mobile-nav-drawer__close` |
| Close icon | Font Awesome `faXmark`, cream on brown |
| Nav links | `GlobalNav` items inherit panel color; hover uses `--color-nav-hover-overlay` |
| Profile footer | `.mobile-nav-drawer__profile` — border `rgba(244, 241, 234, 0.12)` |
| Test ids | `mobile-nav-drawer`, `mobile-nav-close`, `mobile-nav-backdrop` |

## Brand token map (consumption only — no new tokens)

| Token | Hex / value | Mobile shell usage |
|-------|-------------|-------------------|
| `--color-primary-brown` | `#3e2723` | Top bar background (mobile), drawer panel background |
| `--color-bg-cream` | `#f4f1ea` | Text on dark surfaces, focus ring on brown chrome |
| `--color-text-on-dark` | `var(--color-bg-cream)` | Org name, icons, inherited nav text |
| `--color-nav-hover-overlay` | `rgba(255, 255, 255, 0.1)` | Nav link hover/active in drawer |

## Navigation drawer state

| State | Panel rendered | Theme applied |
|-------|----------------|---------------|
| `open: false` | No (returns `null`) | N/A |
| `open: true` | Yes | Brown panel + cream text from first paint |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | At ≤768px, `.top-bar` background MUST be `var(--color-primary-brown)` |
| VR-002 | At ≤768px, `.top-bar` primary text MUST use `var(--color-text-on-dark)` |
| VR-003 | Mobile menu button icon MUST be cream on brown background |
| VR-004 | Drawer panel background MUST be `var(--color-primary-brown)` with cream text |
| VR-005 | Menu open and drawer close controls MUST be ≥44×44px where layout permits |
| VR-006 | Focus-visible on mobile shell controls MUST use cream outline on brown backgrounds |
| VR-007 | Above 768px, `.top-bar` MUST NOT use brown-bar mobile background |
| VR-008 | Shell components MUST NOT introduce ad-hoc hex color literals — tokens only in CSS |
| VR-009 | Menu and close controls MUST use Font Awesome icons, not Unicode glyphs |

## State transitions

```text
viewport > 768px  -->  desktop top bar (transparent) + sidebar themed
viewport ≤ 768px  -->  mobile top bar (brown) + drawer themed when open

drawer closed --(menu tap)--> drawer open (brown panel immediate)
drawer open --(close/backdrop/Escape)--> drawer closed (unmount)
```

## Relationships

```text
M1 design tokens (index.css :root)
    └──> mobile @media rules ──> .top-bar, .mobile-nav-drawer__panel

AppShell.showMobileMenu
    └──> TopBar mobile chrome (themed via CSS at ≤768px)

AppShell.mobileNavOpen
    └──> MobileNavDrawer.open ──> themed panel

SPLR-84 logo placements (BrandLogo)
    └──> unchanged; inherit cream context on brown mobile chrome
```
