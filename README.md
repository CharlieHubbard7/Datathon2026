# Need Map: where humanitarian aid falls short

CMU Data Science Club Datathon 2026 (United Nations data). Team: Charlie Hubbard, Adam Kablawi, Eddie Liu.

The question was which countries have the largest gap between humanitarian need and the funding they receive. We scored every country in the UN's Humanitarian Needs Overview data, compared that score with pooled-fund spending per person in need, and built a 3D globe for exploring the result.

<img width="1271" alt="Globe view" src="https://github.com/user-attachments/assets/b36c09c1-eaad-4af6-9ae1-fc4417378578" />

## The analysis

The notebook [`DSC_Datathon_2026_Starter_Notebook.ipynb`](DSC_Datathon_2026_Starter_Notebook.ipynb) builds the scores. It uses two datasets:
- **HPC/HNO** (2024 and 2025): population, people in need, and people reached, by country.
- **CBPF projects**: the UN's Country-Based Pooled Funds budgets, by country.

**Priority score.** From the HNO data we compute four measures:
- need intensity: people in need ÷ population;
- neglect severity: people in need but not reached ÷ population;
- unmet need: people in need but not reached;
- low coverage: 1 − share of people in need who were reached.

Each measure is converted to a percentile and combined with weights:

| Measure | Weight |
|---|---|
| Neglect severity | 35% |
| Need intensity | 30% |
| Unmet need | 20% |
| Low coverage | 15% |

The combined score is rescaled to 35–100.

**Mismatch.** Need and CBPF funding per person in need are each percentile-normalized. Mismatch = need − funding, so high values are countries that are badly off and underfunded.

**Clustering.** K-means (k = 4) on need score, funding per person, coverage gap, and the log of people in need. This groups countries into crisis types and picks out a cluster that is high-need but underfunded.

## The app

A Next.js app built on the preprocessed data:
- **Globe:** react-three-fiber and three.js, with country shapes from GeoJSON projected with d3-geo and triangulated with earcut, colored by need score. A year selector switches between 2024 and 2025.
- **Country panel:** the indicators behind each country's score.
- **Leaderboard:** countries ranked by need.
- **Funding allocator:** enter a budget and it is split across countries in proportion to need score, adjusted up or down by each country's cluster. This runs in the browser, with a hand-written k-means in [`src/lib/kmeans.ts`](src/lib/kmeans.ts).
- **Chat:** asks an OpenAI model (`gpt-4o-mini`) questions about a country's situation, through a Next.js API route.

```bash
npm install
node scripts/preprocess-data.js 2025   # CSV → public/data JSON (2024 also supported)
npm run dev                             # needs OPENAI_API_KEY for the chat panel
```

## Who did what

- Charlie wrote the analysis notebook: data cleaning, the priority score, the mismatch ranking and the clustering.
- Adam built the web app. The app's preprocessing script ports the notebook's scoring.

Demo videos and more screenshots are in [`Extra/`](Extra/).

## Limitations

- The data covers only countries with a UN humanitarian response plan. A country missing from it gets no score; that doesn't mean it has no need.
- The allocator is an illustration of need-weighted budgeting, not a recommendation.
