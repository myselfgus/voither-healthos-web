# Voither HealthOS - Product Requirements Document

A cognitive operating system for healthcare that makes technology invisible, returning focus to the doctor-patient relationship.

**Experience Qualities**: 
1. **Ethereal** - The interface feels weightless yet substantial, like frosted glass suspended in space, suggesting advanced technology that dissolves into the background
2. **Serene** - Every interaction radiates calm confidence, using generous whitespace and breathing room to create a sense of relief from bureaucratic chaos
3. **Sovereign** - The design communicates absolute control and security, with each element conveying permanence, isolation, and the patient's ultimate authority over their data

**Complexity Level**: Content Showcase (information-focused)
This is a marketing site designed to captivate VCs and visionary physicians with a compelling narrative about invisible technology. While it includes interactive elements (scroll animations, hover states, breathing sphere), the core purpose is to communicate vision rather than provide application functionality.

## Essential Features

### Hero Section - The Provocation
- **Functionality**: Interactive headline transformation with liquid glass transition effect
- **Purpose**: Immediately capture attention by visualizing the core value proposition - transformation from chaos to invisible clarity
- **Trigger**: Page load displays initial state; scroll past 10px threshold activates transformation
- **Progression**: User sees "A medicina virou burocracia" → Scrolls 10px → Liquid glass wave animation flows across "burocracia" → Text morphs to "Nós a tornamos invisível" → Breathing iridescent sphere becomes focal point
- **Success criteria**: Users feel immediate cognitive relief; the transformation is smooth (300ms) and the sphere animation runs at 60fps

### MedScribe Section - The Transformation
- **Functionality**: Visual representation of chaos-to-order transformation using particle system
- **Purpose**: Demonstrate the core product value with visceral visual metaphor that VCs and doctors instantly understand
- **Trigger**: Section enters viewport
- **Progression**: User scrolls to section → Grey particles float chaotically on left (unstructured speech) → Particles flow through central glass lens (HealthOS processing) → Particles align into structured document on right with neumorphic elevation → Bullet points reveal sequentially
- **Success criteria**: Animation completes in 2 seconds; document appears tangible with subtle shadow; copy is scannable in under 20 seconds

### ASL Deep Tech Section - The Moat
- **Functionality**: Interactive audio waveform with clinical insight tooltips
- **Purpose**: Establish technical credibility and competitive moat for VC audience by showing proprietary AI capability
- **Trigger**: Hover over prismatic points on waveform
- **Progression**: User enters section → Ice-grey waveform animates with gentle motion → User hovers over colored prisms → Frosted glass tooltip appears showing clinical insight → User sees multiple examples demonstrating pattern detection
- **Success criteria**: Tooltips appear within 100ms; glass blur effect is performant; insights feel genuinely sophisticated not generic

### Architecture Section - Sovereignty
- **Functionality**: Visual metaphor of isolated patient capsules vs. vulnerable database bucket
- **Purpose**: Differentiate security architecture for both VCs (defensible tech) and doctors (patient trust)
- **Trigger**: Mouse proximity to grid
- **Progression**: User scrolls to section → Infinite grid of identical frosted capsules visible → User moves cursor near capsules → Single capsule illuminates subtly → All others remain locked/dark → Chaotic "bucket" visual provides contrast
- **Success criteria**: Grid feels infinite; single capsule unlock is obvious but elegant; contrast with traditional database is viscerally unsettling

### Ecosystem Section - The Future
- **Functionality**: Modular bento box grid showing HealthOS stages with connection visualization
- **Purpose**: Communicate market opportunity (TAM) and product roadmap for VCs while showing doctors comprehensive solution
- **Trigger**: Section enters viewport
- **Progression**: User scrolls to section → Ceramic tiles fade in sequentially → Module icons appear → Subtle light threads connect related modules → User hovers on module for expansion details
- **Success criteria**: Modules feel like they're fitting together organically; connections suggest intelligent orchestration; expandability is implied

## Edge Case Handling

- **Slow connections**: Hero sphere uses CSS animation fallback, particle effects degrade gracefully to static states
- **Reduced motion preferences**: All animations respect `prefers-reduced-motion` and show instant state changes
- **Small viewports**: Particle animations simplified on mobile; grid layouts stack vertically; sphere scales proportionally
- **No JavaScript**: Static content remains readable with semantic HTML; core message intact without enhancements
- **Color blindness**: Prismatic accents use luminosity differences not just hue; tooltips have sufficient contrast

## Design Direction

The design must evoke a surgery suite's sterile perfection merged with Apple's invisible technology philosophy - users should feel simultaneously in the presence of profound sophistication and complete simplicity, where complexity is encapsulated behind crystalline surfaces that invite touch but require no explanation.

## Color Selection

Custom palette inspired by medical ceramics and optical glass, using analogous cool tones with prismatic accents.

- **Primary Color**: Porcelain oklch(0.98 0.002 264) - The foundational surface that suggests medical-grade cleanliness without the harshness of pure white, communicating sterile precision with warmth
- **Secondary Colors**: 
  - Ink oklch(0.25 0.01 264) - Deep charcoal for typography that creates surgical precision in contrast
  - Ice Grey oklch(0.92 0.005 264) - For subtle borders and waveforms, barely visible yet structurally important
- **Accent Color**: Prisma Gradient (Cyan to Lilac) oklch(0.75 0.08 220) → oklch(0.80 0.07 290) - Holographic shimmer representing AI consciousness, used sparingly on sphere and data flow visualizations
- **Foreground/Background Pairings**:
  - Background (Porcelain oklch(0.98 0.002 264)): Ink text oklch(0.25 0.01 264) - Ratio 12.1:1 ✓
  - Card (Frosted Glass oklch(0.99 0.001 264 / 0.6)): Ink text oklch(0.25 0.01 264) on solid behind - Ratio 13.4:1 ✓
  - Primary (Ink oklch(0.25 0.01 264)): Porcelain text oklch(0.98 0.002 264) - Ratio 12.1:1 ✓
  - Secondary (Ice Grey oklch(0.92 0.005 264)): Ink text oklch(0.25 0.01 264) - Ratio 5.2:1 ✓
  - Accent (Prisma oklch(0.80 0.07 260)): White text oklch(1 0 0) - Ratio 8.9:1 ✓
  - Muted (Ice Grey oklch(0.94 0.004 264)): Medium Ink oklch(0.45 0.01 264) - Ratio 6.8:1 ✓

## Font Selection

Inter represents the humanist sans-serif clarity needed for medical interfaces while maintaining the technical sophistication expected by VC audiences - its optical sizing ensures readability at headline scale while remaining invisible at body text sizes.

- **Typographic Hierarchy**: 
  - H1 (Hero Headline): Inter Bold/clamp(48px, 6vw, 84px)/tight (-0.02em) letter spacing
  - H2 (Section Headlines): Inter SemiBold/clamp(32px, 4vw, 56px)/tight (-0.01em)
  - H3 (Sub-headlines): Inter Medium/clamp(20px, 2.5vw, 28px)/normal
  - Body (Descriptive text): Inter Regular/18px/relaxed (1.7em line-height)
  - Caption (Technical details): Inter Regular/14px/normal with increased letter spacing (0.01em)
  - Button Text: Inter Medium/16px/tight

## Animations

Animations must justify their presence by serving the narrative of transformation from chaos to invisible clarity, using physics that feels like liquid glass flowing and ceramic surfaces revealing themselves - movement should be felt as relief, not spectacle.

- **Purposeful Meaning**: Every animation reinforces the core metaphor: bureaucracy dissolving into invisible technology. The liquid glass transition embodies this literally. The breathing sphere suggests living, attentive intelligence. Particle flows visualize the transformation from unstructured chaos to clinical precision.
- **Hierarchy of Movement**: 
  1. Hero headline transformation - the pivotal moment that sets expectations
  2. Breathing sphere - constant reminder of cognitive presence
  3. MedScribe particle flow - demonstrates core product value
  4. Capsule illumination - shows security in action
  5. Subtle parallax on scroll - adds depth without distraction

## Component Selection

- **Components**: 
  - Button: Neumorphic custom button with extruded appearance using box-shadow layering (not standard shadcn)
  - Card: Frosted glass treatment with backdrop-blur-xl and subtle border-white/10 (modified shadcn Card)
  - Separator: Hair-thin lines in Ice Grey (shadcn Separator with custom color)
  - Tooltip: Heavily modified shadcn Tooltip with frosted glass, high blur, and clinical insight formatting
  - Badge: Minimal pills for technical terms with Ice Grey background (shadcn Badge modified)
  - ScrollArea: For smooth scroll-triggered animations (shadcn ScrollArea)

- **Customizations**: 
  - GlassCard component: Custom card with backdrop-filter blur and subtle gradient border
  - NeumorphicButton: Custom button with inset/outset shadow states for tactile feeling
  - BreathingSphere: Custom canvas/SVG component with iridescent shader and slow pulsation
  - ParticleFlow: Custom canvas component for MedScribe visualization
  - WaveformViz: Custom SVG audio waveform with interactive prism points
  - CapsuleGrid: Custom grid layout with proximity-based illumination

- **States**: 
  - Buttons: Rest (extruded with dual shadow), Hover (subtle lift with glow), Active (pressed inward), Focus (prismatic ring)
  - Capsules: Locked (frosted white), Proximity (subtle glow), Unlocked (full illumination with key visual)
  - Prisms: Inactive (subtle color), Hover (tooltip appears + brightness increase), Active (insight fully visible)
  - Glass surfaces: Static (20px blur), Hover (25px blur + border glow), Interactive (30px blur)

- **Icon Selection**: 
  - ArrowDown (Phosphor) - for Hero CTA
  - Waveform (Phosphor) - for audio visualization
  - LockKey (Phosphor) - for security/sovereignty concepts
  - CubeFocus (Phosphor) - for modular architecture
  - SparkleLight (Phosphor) - for AI/prismatic accents
  - ShieldCheck (Phosphor) - for validation/compliance

- **Spacing**: 
  - Sections: 160px vertical padding (20rem) on desktop, 80px (10rem) on mobile
  - Component groups: 48px (3rem) between related elements
  - Text blocks: 24px (1.5rem) between paragraphs
  - Button padding: 24px horizontal, 16px vertical (1.5rem x 1rem)
  - Card padding: 40px (2.5rem) on desktop, 24px (1.5rem) on mobile

- **Mobile**: 
  - Hero: Sphere scales to 60% size, headline becomes 2 lines, CTA remains fixed at bottom on scroll
  - MedScribe: Particle animation becomes vertical flow (top to bottom), simplified particle count (30 instead of 100)
  - ASL: Waveform becomes non-interactive, shows 3 example insights as static cards instead
  - Architecture: Grid shows 3x3 visible capsules instead of infinite, single example interaction auto-plays
  - Ecosystem: Bento box becomes vertical stack, connections hide, modules expand on tap
