import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_CITY_MAP,
  TECH_LOCATIONS,
  REGIONAL_MARKET_MAP,
  getGlobalLocationAliases,
  resolveCountryCode,
  isLocationInRegion,
  matchLocationString
} from './country_city_taxonomy.js';

test('country_city_taxonomy: covers 80+ countries with valid taxonomy schema', () => {
  const countryKeys = Object.keys(COUNTRY_CITY_MAP);
  assert.ok(countryKeys.length >= 80, `Expected >= 80 countries, found ${countryKeys.length}`);

  // Test critical tech hubs across Africa, Latin America, and Southeast Asia
  const requiredCountries = [
    'bangladesh', 'sri lanka', 'pakistan', 'turkey', 'ukraine',
    'bulgaria', 'croatia', 'serbia', 'slovakia', 'lithuania', 'latvia',
    'rwanda', 'morocco', 'tunisia', 'uganda', 'senegal', 'ivory coast', 'cameroon', 'ethiopia',
    'uruguay', 'panama', 'ecuador', 'dominican republic', 'guatemala',
    'cambodia', 'myanmar'
  ];

  for (const c of requiredCountries) {
    assert.ok(countryKeys.includes(c), `Country map should include ${c}`);
    const entry = COUNTRY_CITY_MAP[c];
    assert.ok(entry.countryName, `${c} must have countryName`);
    assert.ok(entry.flag, `${c} must have flag emoji`);
    assert.ok(entry.code, `${c} must have ISO country code`);
    assert.ok(Array.isArray(entry.aliases) && entry.aliases.length > 0, `${c} must have aliases`);
    assert.ok(Array.isArray(entry.cities) && entry.cities.length > 0, `${c} must have cities list`);
  }
});

test('country_city_taxonomy: TECH_LOCATIONS aggregates over 500 unique tech hubs', () => {
  assert.ok(Array.isArray(TECH_LOCATIONS));
  assert.ok(TECH_LOCATIONS.length >= 500, `Expected >= 500 locations, got ${TECH_LOCATIONS.length}`);

  // Verify key cities across Africa, LATAM, and SEA are included
  const requiredCities = [
    'Dhaka', 'Chittagong', 'Colombo', 'Lahore', 'Karachi', 'Islamabad',
    'Istanbul', 'Ankara', 'Kyiv', 'Lviv', 'Kharkiv', 'Sofia', 'Zagreb',
    'Belgrade', 'Bratislava', 'Vilnius', 'Riga', 'Lagos', 'Cairo', 'Tallinn',
    'Kigali', 'Casablanca', 'Tunis', 'Nairobi', 'Dakar', 'Abidjan', 'Douala', 'Addis Ababa',
    'Montevideo', 'Panama City', 'Quito', 'Santo Domingo', 'Guatemala City',
    'Tijuana', 'Curitiba', 'Medellín', 'Guadalajara', 'Penang', 'Da Nang', 'BSD City'
  ];

  for (const city of requiredCities) {
    assert.ok(TECH_LOCATIONS.includes(city), `TECH_LOCATIONS must include ${city}`);
  }
});

test('resolveCountryCode: accurately resolves ISO alpha-2 codes for new tech hubs', () => {
  assert.equal(resolveCountryCode('Dhaka'), 'bd');
  assert.equal(resolveCountryCode('Bangladesh'), 'bd');
  assert.equal(resolveCountryCode('Colombo'), 'lk');
  assert.equal(resolveCountryCode('Sri Lanka'), 'lk');
  assert.equal(resolveCountryCode('Lahore'), 'pk');
  assert.equal(resolveCountryCode('Karachi'), 'pk');
  assert.equal(resolveCountryCode('Islamabad'), 'pk');
  assert.equal(resolveCountryCode('Istanbul'), 'tr');
  assert.equal(resolveCountryCode('Turkey'), 'tr');
  assert.equal(resolveCountryCode('Kyiv'), 'ua');
  assert.equal(resolveCountryCode('Lviv'), 'ua');
  assert.equal(resolveCountryCode('Ukraine'), 'ua');
  assert.equal(resolveCountryCode('Sofia'), 'bg');
  assert.equal(resolveCountryCode('Zagreb'), 'hr');
  assert.equal(resolveCountryCode('Belgrade'), 'rs');
  assert.equal(resolveCountryCode('Bratislava'), 'sk');
  assert.equal(resolveCountryCode('Vilnius'), 'lt');
  assert.equal(resolveCountryCode('Riga'), 'lv');
  assert.equal(resolveCountryCode('Lagos'), 'ng');
  assert.equal(resolveCountryCode('Cairo'), 'eg');
  assert.equal(resolveCountryCode('Tallinn'), 'ee');
  assert.equal(resolveCountryCode('Kigali'), 'rw');
  assert.equal(resolveCountryCode('Casablanca'), 'ma');
  assert.equal(resolveCountryCode('Tunis'), 'tn');
  assert.equal(resolveCountryCode('Nairobi'), 'ke');
  assert.equal(resolveCountryCode('Montevideo'), 'uy');
  assert.equal(resolveCountryCode('Panama City'), 'pa');
  assert.equal(resolveCountryCode('Da Nang'), 'vn');
  assert.equal(resolveCountryCode('Penang'), 'my');
});

test('REGIONAL_MARKET_MAP: contains new hubs in asia_pacific, europe, latin_america, and middle_east_africa', () => {
  // Asia Pacific
  assert.ok(REGIONAL_MARKET_MAP.asia_pacific.includes('bangladesh'));
  assert.ok(REGIONAL_MARKET_MAP.asia_pacific.includes('sri lanka'));
  assert.ok(REGIONAL_MARKET_MAP.asia_pacific.includes('pakistan'));
  assert.ok(REGIONAL_MARKET_MAP.asia_pacific.includes('cambodia'));
  assert.ok(REGIONAL_MARKET_MAP.asia_pacific.includes('myanmar'));

  // Europe
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('turkey'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('ukraine'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('bulgaria'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('croatia'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('serbia'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('slovakia'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('lithuania'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('latvia'));
  assert.ok(REGIONAL_MARKET_MAP.europe.includes('estonia'));

  // Middle East & Africa
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('nigeria'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('egypt'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('rwanda'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('morocco'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('tunisia'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('kenya'));
  assert.ok(REGIONAL_MARKET_MAP.middle_east_africa.includes('senegal'));

  // Latin America
  assert.ok(REGIONAL_MARKET_MAP.latin_america.includes('uruguay'));
  assert.ok(REGIONAL_MARKET_MAP.latin_america.includes('panama'));
  assert.ok(REGIONAL_MARKET_MAP.latin_america.includes('ecuador'));
});

test('isLocationInRegion: validates regional market membership', () => {
  // Asia-Pacific
  assert.equal(isLocationInRegion('Dhaka, Bangladesh', 'asia_pacific'), true);
  assert.equal(isLocationInRegion('Colombo', 'asia_pacific'), true);
  assert.equal(isLocationInRegion('Lahore, Pakistan', 'asia_pacific'), true);
  assert.equal(isLocationInRegion('Karachi', 'asia_pacific'), true);
  assert.equal(isLocationInRegion('Da Nang, Vietnam', 'asia_pacific'), true);
  assert.equal(isLocationInRegion('Penang, Malaysia', 'asia_pacific'), true);

  // Europe
  assert.equal(isLocationInRegion('Istanbul, Turkey', 'europe'), true);
  assert.equal(isLocationInRegion('Kyiv, Ukraine', 'europe'), true);
  assert.equal(isLocationInRegion('Sofia, Bulgaria', 'europe'), true);
  assert.equal(isLocationInRegion('Zagreb, Croatia', 'europe'), true);
  assert.equal(isLocationInRegion('Belgrade', 'europe'), true);
  assert.equal(isLocationInRegion('Bratislava', 'europe'), true);
  assert.equal(isLocationInRegion('Vilnius', 'europe'), true);
  assert.equal(isLocationInRegion('Riga', 'europe'), true);
  assert.equal(isLocationInRegion('Tallinn', 'europe'), true);

  // Middle East & Africa
  assert.equal(isLocationInRegion('Lagos, Nigeria', 'middle_east_africa'), true);
  assert.equal(isLocationInRegion('Cairo, Egypt', 'middle_east_africa'), true);
  assert.equal(isLocationInRegion('Kigali, Rwanda', 'middle_east_africa'), true);
  assert.equal(isLocationInRegion('Casablanca, Morocco', 'middle_east_africa'), true);
  assert.equal(isLocationInRegion('Tunis, Tunisia', 'middle_east_africa'), true);

  // Latin America
  assert.equal(isLocationInRegion('Montevideo, Uruguay', 'latin_america'), true);
  assert.equal(isLocationInRegion('Panama City', 'latin_america'), true);
  assert.equal(isLocationInRegion('Medellín, Colombia', 'latin_america'), true);
  assert.equal(isLocationInRegion('Tijuana, Mexico', 'latin_america'), true);

  // Cross checks
  assert.equal(isLocationInRegion('Dhaka', 'europe'), false);
  assert.equal(isLocationInRegion('Kyiv', 'asia_pacific'), false);
  assert.equal(isLocationInRegion('Lagos', 'europe'), false);
});

test('matchLocationString: matches cities and bidirectional alias expansions', () => {
  // Direct matches
  assert.equal(matchLocationString('Software Engineer in Dhaka, Bangladesh', 'Dhaka'), true);
  assert.equal(matchLocationString('Staff Backend Engineer - Istanbul', 'Istanbul'), true);
  assert.equal(matchLocationString('Lead Android Developer (Lahore, PK)', 'Lahore'), true);
  assert.equal(matchLocationString('Full Stack Engineer - Colombo', 'Colombo'), true);
  assert.equal(matchLocationString('Mobile Developer in Karachi', 'Karachi'), true);
  assert.equal(matchLocationString('Site Reliability Engineer (Lagos, NG)', 'Lagos'), true);
  assert.equal(matchLocationString('AI Specialist - Cairo, Egypt', 'Cairo'), true);
  assert.equal(matchLocationString('Cloud Architect - Tallinn, Estonia', 'Tallinn'), true);
  assert.equal(matchLocationString('Senior Systems Developer (Riga, Latvia)', 'Riga'), true);
  assert.equal(matchLocationString('AI Engineer - Kigali, Rwanda', 'Kigali'), true);
  assert.equal(matchLocationString('Senior Go Developer - Montevideo', 'Montevideo'), true);

  // Bidirectional aliases (Kyiv <-> Kiev, Medellin <-> Medellín)
  assert.equal(matchLocationString('Senior Go Developer, Kiev, Ukraine', 'Kyiv'), true);
  assert.equal(matchLocationString('Senior Go Developer, Kyiv, Ukraine', 'Kiev'), true);
  assert.equal(matchLocationString('Senior React Developer, Medellin, Colombia', 'Medellín'), true);

  // Country alias resolution
  assert.equal(matchLocationString('Cloud Architect (Turkey)', 'Istanbul'), true);
  assert.equal(matchLocationString('AI Specialist - Pakistan', 'Lahore'), true);
  assert.equal(matchLocationString('FinOps Engineer - Nigeria', 'Lagos'), true);
  assert.equal(matchLocationString('Security Engineer - Egypt', 'Cairo'), true);
  assert.equal(matchLocationString('Full Stack Developer - Estonia', 'Tallinn'), true);
  assert.equal(matchLocationString('AI Engineer - Rwanda', 'Kigali'), true);
  assert.equal(matchLocationString('Platform Engineer - Uruguay', 'Montevideo'), true);
});
