UI Development Plan

Global Need-Based Aid Visualization Web App (2025)

1. Visual Baseline (From Provided Image)

The provided image establishes the default globe state:

Photorealistic Earth texture

Space/starfield background

Political borders visible

Country labels lightly rendered

Camera centered on the Western Hemisphere

No overlays active

This will serve as:

The landing view

The neutral reference before need-based overlays are applied

2. Global UI Architecture
Primary UI Layers

3D Globe Canvas (WebGL)

Overlay UI (HTML/CSS)

Context Panels & Modals

AI Chat Interface

The globe always remains the visual core; all UI elements are secondary and non-blocking.

3. Layout Structure
Desktop Layout (Primary Target)
┌──────────────────────────────────────────┐
│ Top Bar (Title + Legend Toggle)           │
├──────────────────────────────────────────┤
│                                          │
│   [ 3D Rotatable Globe (Full Screen) ]    │
│                                          │
│                                          │
│                    ┌─────────────────┐   │
│                    │ Country Panel   │   │
│                    │ (Slide-in)      │   │
│                    └─────────────────┘   │
│                                          │
├──────────────────────────────────────────┤
│ Footer: Data source + 2025 snapshot      │
└──────────────────────────────────────────┘

Mobile/tablet collapses the side panel into a bottom sheet.

4. Globe UI Development
4.1 Globe Rendering

Technology

Three.js or React Three Fiber

High-res Earth texture (day map)

Separate mesh layers:

Earth surface

Country borders

Heatmap overlay

Camera Behavior

OrbitControls enabled

Auto-rotate enabled on idle (slow, subtle)

Auto-rotate pauses on user interaction

Zoom limits enforced (no clipping)

4.2 Heatmap Overlay (Need Score)

Color Encoding

0: Neutral gray / muted blue

1–20: Pale yellow

21–40: Light orange

41–60: Orange

61–80: Red-orange

81–100: Deep red

Implementation

Country polygons mapped via ISO3

Shader-based color blending on top of Earth texture

Smooth transitions when toggling heatmap on/off

Legend UI

Collapsible legend in top-right corner

Gradient bar with numeric ticks

Toggle: “Show need score overlay”

4.3 Country Interaction States
State	Visual Behavior
Default	Photorealistic texture only
Hover	Subtle glow + tooltip
Selected	Border highlight + camera easing
No data	Desaturated / semi-transparent

Tooltip (Hover)

Country name

Need score (or “No data”)

5. Country Detail Panel UI
5.1 Panel Behavior

Slides in from the right (desktop)

Bottom sheet (mobile)

Non-modal (globe remains interactive)

One country active at a time

5.2 Panel Structure
Header

Country name (large)

Flag icon

Need score badge (color-matched)

Metrics Section

Displayed as clean, scannable rows:

Population

People in need

Targeted individuals

Helped individuals

INFORM severity

Use muted labels + emphasized values.

5.3 Top 3 Unmet Groups Section

Visual Treatment

Ranked list (1–3)

Icon + label

Short one-line description

Example:

1. Displaced families

2. Food-insecure children

3. Rural elderly populations

This section should visually stand out — it’s the emotional core.

6. AI Summary & Chatbot UI
6.1 AI Summary Block

Displayed above the chat input.

Design

Card-style container

Title: “How you can help”

150–300 word summary

Calm, human tone

Behavior

Generated once per country

Cached locally

Regenerates only if backend changes

6.2 AI Chatbot Interface

Placement

Embedded inside country panel

Expandable to full-height panel

Features

Context-aware (country-specific)

Pre-seeded prompt suggestions:

“What’s driving the need here?”

“Who is most underserved?”

“What types of aid matter most?”

Safety / Guardrails

Cannot answer outside 2025 data

No donation links unless explicitly allowed later

7. Navigation & Global Controls
Top Bar

App title

Legend toggle

Reset view button (“Return to global view”)

Footer

“Data snapshot: 2025”

Source attribution

Disclaimer (static data)

8. Animations & Microinteractions

Smooth camera easing when selecting countries

Heatmap fade-in/out (300–500ms)

Panel slide animations (ease-out)

Hover glows kept subtle and respectful

No flashy effects — seriousness and clarity first.

9. Accessibility Considerations

Colorblind-safe palette

Keyboard navigation for country selection

Screen-reader labels for panels and metrics

Reduced-motion mode

10. Performance Strategy

Lazy-load country geometry

Memoized globe layers

Static JSON loaded once at app init

AI summaries cached per ISO3

Target: 60 FPS globe interaction on modern laptops

11. Development Phases
Phase 1 – Core Globe

Render Earth

Camera controls

Country hit detection

Phase 2 – Heatmap Overlay

Need score shading

Legend UI

Hover tooltips

Phase 3 – Country Panel

Metrics

Unmet groups

Panel animations

Phase 4 – AI Integration

Summary rendering

Chatbot UI

Prompt scoping

Phase 5 – Polish & Accessibility

Performance tuning

UX refinements

Cross-device testing

12. Final UX Principle

The globe draws attention.
The score provides clarity.
The unmet groups create empathy.
The AI explains what to do next.