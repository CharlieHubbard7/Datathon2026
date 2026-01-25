/**
 * Preprocessing script to transform HPC/HNO 2025 CSV data into country-level JSON
 *
 * Implements the UN Priority Score calculation:
 * - Need Intensity = In Need / Population
 * - Response Coverage = Reached / In Need
 * - Neglect Severity = (In Need - Reached) / Population
 * - Unmet Need = In Need - Reached
 * - Low Coverage = 1 - Response Coverage
 *
 * UN Priority Score = weighted composite of percentile scores:
 *   35% Neglect Severity + 30% Need Intensity + 20% Unmet Need + 15% Low Coverage
 *
 * Final score rescaled to 35-100 range
 */

const fs = require('fs');
const path = require('path');

// Read and parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // First line is headers, second line is HXL tags (skip it)
  const headers = lines[0].split(',');
  const dataLines = lines.slice(2); // Skip header and HXL tag row

  const records = [];
  for (const line of dataLines) {
    // Handle CSV parsing with potential commas in quoted fields
    const values = parseCSVLine(line);
    if (values.length >= headers.length - 1) {
      const record = {};
      headers.forEach((header, idx) => {
        record[header.trim()] = values[idx]?.trim() || '';
      });
      records.push(record);
    }
  }

  return records;
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

// Convert string to number, return NaN for invalid
function toNumber(val) {
  if (!val || val === '') return NaN;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? NaN : num;
}

// Calculate percentile rank (0-100)
function percentileRank(values) {
  const sorted = [...values].filter(v => !isNaN(v)).sort((a, b) => a - b);
  const ranks = {};

  return values.map(val => {
    if (isNaN(val)) return NaN;
    const position = sorted.filter(v => v < val).length;
    return (position / (sorted.length - 1)) * 100;
  });
}

// Main processing function
function processData() {
  const csvPath = path.join(__dirname, '..', 'hpc_hno_2025.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'countries.json');

  console.log('Reading CSV file...');
  const records = parseCSV(csvPath);
  console.log(`Parsed ${records.length} records`);

  // Group by country and aggregate at country level
  const countryTotals = {};
  const categoryData = {}; // For finding top unmet groups

  // First pass: collect country totals from records with Reached data
  for (const record of records) {
    const iso3 = record['Country ISO3'];
    if (!iso3) continue;

    const cluster = record['Cluster'] || '';
    const category = record['Category'] || '';
    const population = toNumber(record['Population']);
    const inNeed = toNumber(record['In Need']);
    const targeted = toNumber(record['Targeted']);
    const reached = toNumber(record['Reached']);

    // Country-level totals (ALL cluster, no category or empty category, with Reached data)
    if (cluster === 'ALL' && (!category || category === '') && !isNaN(reached) && reached > 0) {
      if (!countryTotals[iso3]) {
        countryTotals[iso3] = {
          iso3,
          population: 0,
          inNeed: 0,
          targeted: 0,
          reached: 0,
        };
      }
      // Use the first valid total row for each country
      if (countryTotals[iso3].population === 0) {
        countryTotals[iso3].population = population || 0;
        countryTotals[iso3].inNeed = inNeed || 0;
        countryTotals[iso3].targeted = targeted || 0;
        countryTotals[iso3].reached = reached || 0;
      }
    }

    // Track category-level data for finding top unmet groups (from ALL records with In Need)
    if (cluster === 'ALL' && category && category !== '' && !isNaN(inNeed) && inNeed > 0) {
      if (!categoryData[iso3]) {
        categoryData[iso3] = {};
      }
      // Aggregate by category name (there may be multiple rows per category)
      if (!categoryData[iso3][category]) {
        categoryData[iso3][category] = { inNeed: 0, targeted: 0 };
      }
      categoryData[iso3][category].inNeed += inNeed || 0;
      categoryData[iso3][category].targeted += targeted || 0;
    }
  }

  // Count filtered countries
  const countryCount = Object.keys(countryTotals).length;
  console.log(`Found ${countryCount} countries with valid Reached data`)

  // Convert to array for processing
  const countries = Object.values(countryTotals).filter(c =>
    c.population > 0 && c.inNeed > 0
  );

  console.log(`Found ${countries.length} countries with valid data`);

  // Calculate derived metrics for each country
  for (const country of countries) {
    // Core metrics from notebook
    country.needIntensity = country.inNeed / country.population;
    country.responseCoverage = country.reached / country.inNeed;
    country.targetingEfficiency = country.targeted > 0 ? country.reached / country.targeted : 0;
    country.unmetNeed = country.inNeed - country.reached;
    country.neglectSeverity = (country.inNeed - country.reached) / country.population;
    country.lowCoverage = 1 - country.responseCoverage;
  }

  // Calculate percentile scores
  const needIntensityScores = percentileRank(countries.map(c => c.needIntensity));
  const neglectSeverityScores = percentileRank(countries.map(c => c.neglectSeverity));
  const unmetNeedScores = percentileRank(countries.map(c => c.unmetNeed));
  const lowCoverageScores = percentileRank(countries.map(c => c.lowCoverage));

  // Apply percentile scores and calculate UN Priority Score
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    country.needIntensityScore = needIntensityScores[i] || 0;
    country.neglectSeverityScore = neglectSeverityScores[i] || 0;
    country.unmetNeedScore = unmetNeedScores[i] || 0;
    country.lowCoverageScore = lowCoverageScores[i] || 0;

    // Weighted composite (from notebook)
    country.unPriorityScore = (
      0.35 * country.neglectSeverityScore +
      0.30 * country.needIntensityScore +
      0.20 * country.unmetNeedScore +
      0.15 * country.lowCoverageScore
    );
  }

  // Rescale to 35-100 range (from notebook)
  const minScore = Math.min(...countries.map(c => c.unPriorityScore));
  const maxScore = Math.max(...countries.map(c => c.unPriorityScore));

  for (const country of countries) {
    country.needScore = Math.round(
      35 + ((country.unPriorityScore - minScore) / (maxScore - minScore)) * (100 - 35)
    );
  }

  // Get country names from a mapping (ISO3 to name)
  const countryNames = {
    'AFG': 'Afghanistan',
    'BFA': 'Burkina Faso',
    'CAF': 'Central African Republic',
    'CMR': 'Cameroon',
    'COD': 'Democratic Republic of the Congo',
    'COL': 'Colombia',
    'ETH': 'Ethiopia',
    'GTM': 'Guatemala',
    'HND': 'Honduras',
    'HTI': 'Haiti',
    'IRQ': 'Iraq',
    'LBY': 'Libya',
    'MLI': 'Mali',
    'MMR': 'Myanmar',
    'MOZ': 'Mozambique',
    'NER': 'Niger',
    'NGA': 'Nigeria',
    'PAK': 'Pakistan',
    'PSE': 'Palestine',
    'SDN': 'Sudan',
    'SLV': 'El Salvador',
    'SOM': 'Somalia',
    'SSD': 'South Sudan',
    'SYR': 'Syria',
    'TCD': 'Chad',
    'UKR': 'Ukraine',
    'VEN': 'Venezuela',
    'YEM': 'Yemen',
    'ZWE': 'Zimbabwe',
    'BGD': 'Bangladesh',
    'KEN': 'Kenya',
    'LBN': 'Lebanon',
    'JOR': 'Jordan',
  };

  // Build final output
  const output = {};

  for (const country of countries) {
    const iso3 = country.iso3;

    // Find top 3 unmet groups for this country
    // Unmet = In Need - Targeted (those not even targeted for assistance)
    const catData = categoryData[iso3] || {};
    const categoryList = Object.entries(catData).map(([name, data]) => ({
      category: name,
      inNeed: data.inNeed,
      targeted: data.targeted,
      unmetNeed: data.inNeed - data.targeted, // People in need but not targeted
    }));

    // Filter out aggregate categories
    const excludeCategories = ['total', 'all', 'overall', 'aggregate'];

    const topUnmetGroups = categoryList
      .filter(c => c.unmetNeed > 0 && !excludeCategories.includes(c.category.toLowerCase()))
      .sort((a, b) => b.unmetNeed - a.unmetNeed)
      .slice(0, 3)
      .map(c => c.category);

    // Default groups if none found
    if (topUnmetGroups.length === 0) {
      topUnmetGroups.push('General Population');
    }

    output[iso3] = {
      country_name: countryNames[iso3] || iso3,
      iso3: iso3,
      population: Math.round(country.population),
      people_in_need: Math.round(country.inNeed),
      targeted_individuals: Math.round(country.targeted),
      helped_individuals: Math.round(country.reached),
      inform_severity: Math.round(country.needIntensity * 50 * 10) / 10, // Scale to ~0-5 range
      need_score: country.needScore,
      top_3_unmet_groups: topUnmetGroups,
    };
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten ${Object.keys(output).length} countries to ${outputPath}`);

  // Print summary
  console.log('\nCountry Summary (sorted by need score):');
  const sorted = Object.values(output).sort((a, b) => b.need_score - a.need_score);
  for (const c of sorted) {
    console.log(`  ${c.iso3}: ${c.country_name} - Score: ${c.need_score}, In Need: ${(c.people_in_need / 1000000).toFixed(1)}M`);
  }
}

// Run
processData();
