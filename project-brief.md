Project Brief: Global Need-Based Aid Visualization Platform (2025)
1. Project Overview

This web application visualizes humanitarian need across the globe using a 1–100 “Need-for-Aid Score” calculated per country from 2025 data. The platform enables users to:

Explore a 3D, rotatable globe with countries color-coded by need

Click into any country to view:

Its need score

Key humanitarian indicators

Top 3 unmet population groups

An AI-generated, actionable summary explaining how individuals or organizations can help

All data is static, derived from a provided CSV and backend preprocessing pipeline. Countries without an assigned score default to 0 (no data / no identified need).

2. Goals & Success Criteria
Goals

Make humanitarian need visually intuitive and emotionally legible

Enable quick comparison across countries and regions

Translate complex humanitarian metrics into clear, actionable insight

Provide a scalable frontend that can later support updated data or live APIs

Success Criteria

Globe renders smoothly on desktop and tablet

Country selection feels instant (<200ms interaction delay)

Need scores are clearly distinguishable visually

AI summaries are concise, contextual, and non-generic

Data provenance (2025 snapshot) is clear to users

3. Data Inputs (Backend-Provided)

The frontend does not calculate scores. It consumes backend-processed outputs.

Input Format

Single CSV (or JSON derived from CSV)

One row per country (ISO-3166 Alpha-3 as primary key)

Required Fields

country_name

iso3

population

people_in_need

targeted_individuals

helped_individuals

underserved_groups (structured or encoded)

inform_severity

need_score (integer 0–100)

top_3_unmet_groups (ordered list of strings)

Defaults

Countries missing from dataset or without calculated scores:

need_score = 0

No unmet groups shown

Rendered in neutral/disabled globe color

4. Scoring & Interpretation (Frontend Usage)

While the algorithm lives in the backend, the frontend treats the score as:

Score Range	Interpretation
0	No data / no assessed need
1–20	Low humanitarian stress
21–40	Moderate need
41–60	High need
61–80	Severe need
81–100	Extreme / urgent humanitarian crisis

These ranges are used for:

Color scaling

Tooltips

Legend labeling

AI summary tone calibration

5. Core Features
5.1 3D Rotatable Globe (Primary Interface)

Requirements

Fully rotatable and zoomable

Smooth camera inertia

Country-level interaction (hover + click)

WebGL-based rendering

Visual Encoding

Countries shaded via need-based heatmap

Low → neutral/light

High → saturated/red/orange

Countries with score = 0:

Greyed out or wireframe style

Interactions

Hover:

Country name

Need score

Click:

Opens country detail panel (side drawer or modal)

5.2 Country Detail Panel

Displayed when a country is selected.

Contents

Country Header

Name

Flag

Need Score (large, numeric + color-coded)

Key Metrics (Read-only)

Population

People in need

Targeted individuals

Helped individuals

INFORM severity

Top 3 Unmet Groups

Ranked list

Short descriptor per group

Icons or subtle visual cues (e.g. children, displaced, food insecure)

AI-Generated “How You Can Help” Summary

150–300 words

Written in accessible, non-technical language

Grounded in the unmet groups and severity level

No fundraising claims or guarantees

5.3 AI Chatbot (Country-Specific)

Each country has a contextual AI chatbot that:

Is scoped strictly to:

That country’s data

The 2025 snapshot

Cannot hallucinate statistics

Answers questions like:

“What’s driving the need here?”

“Who is being left out?”

“What types of aid matter most right now?”

“How can NGOs or individuals help?”

Prompt Context (Injected by Frontend)

Country name

Need score

Top 3 unmet groups

Summary metrics

Explicit instruction: do not invent data

6. UI / UX Design Principles
Tone

Informative, calm, human

Avoid sensationalism

Emphasize clarity and dignity

Accessibility

Colorblind-safe heatmap

Keyboard globe controls

Screen-reader support for panels

Visual Hierarchy

Globe = discovery

Panels = understanding

Chatbot = engagement

7. Technical Frontend Architecture
Suggested Stack

Framework: React / Next.js

3D Rendering: Three.js or React Three Fiber

State Management: Zustand or Redux Toolkit

Styling: Tailwind or CSS Modules

Data Loading:

CSV → preprocessed to JSON at build time

Static hosting (Vercel / Netlify)

Data Flow

App loads static dataset (2025 snapshot)

Globe renders all countries

On interaction:

Fetch country data from in-memory store

Populate UI + chatbot context

8. Performance Considerations

Lazy-load country detail panels

Memoize globe geometries

Use LOD (level of detail) for zoom levels

AI summaries cached per country

9. Edge Cases & Constraints

Small island nations with limited data

Countries with high population but low assessed need

Disputed territories (render as neutral unless explicitly included)

No real-time updates (explicitly labeled as “2025 Snapshot”)

10. Future Extensions (Out of Scope, but Designed For)

Year-over-year comparison

Live data ingestion

Regional filters

NGO / intervention overlays

Donation or action links per unmet group

11. Deliverables

Interactive 3D globe web app

Country detail UI

AI chatbot per country

Static 2025 dataset integration

Responsive desktop-first experience