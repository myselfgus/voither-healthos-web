# Voither HealthOS Landing Page

> AI-Editable Landing Page with Liquid Glass Design System

## Structure

```
landing/
├── components/           # React components (modular, AI-editable)
│   ├── Hero/            # Hero section with GSAP animations
│   ├── Features/        # MedScribe features with particles
│   ├── Intelligence/    # ASL clinical intelligence
│   ├── Architecture/    # Security & sovereignty
│   ├── Ecosystem/       # Product roadmap
│   ├── Footer/          # Footer with links
│   └── shared/          # Reusable components
├── content/             # i18n content (AI-EDITABLE)
│   ├── pt.json          # Portuguese content
│   └── en.json          # English content
├── design-system/       # Design tokens & styles
│   ├── tokens.css       # CSS custom properties
│   ├── liquid-glass.css # Apple-inspired glass effects
│   ├── neumorphic.css   # Neumorphic shadows
│   ├── animations.css   # GSAP & CSS animations
│   └── fonts.css        # Font imports
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── types/               # TypeScript definitions
├── assets/              # Images, icons, backgrounds
│   ├── images/          # Static images
│   ├── backgrounds/     # Animated backgrounds
│   └── icons/           # Custom icons
├── LandingPage.tsx      # Main landing component
├── worker.ts            # Cloudflare Worker entry
└── index.ts             # Exports
```

## AI Editing Guide

### To edit content (hero, features, footer):
Edit files in `content/pt.json` or `content/en.json`

### To edit animations:
Edit `design-system/animations.css` or component-specific animation configs

### To edit colors/design:
Edit `design-system/tokens.css`

### To edit backgrounds:
Edit files in `assets/backgrounds/` or component background configs

## Technologies

- React 19 + TypeScript
- Tailwind CSS v4 (OKLCH colors)
- GSAP for advanced animations
- Liquid Glass + Neumorphic design
- Cloudflare Workers deployment
- i18n: EN/PT support

## Fonts

- **Titles**: Josefin Sans Bold
- **Body**: Space Grotesk
- **UI**: Nunito
- **Code**: Roboto Mono
