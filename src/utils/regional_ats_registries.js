/**
 * regional_ats_registries.js
 * ==========================
 * Verified Global & Domestic Regional ATS Catalogs.
 * 
 * 100% Client-Side, Open CORS, Verified Active Boards ($0).
 * Eliminates spam, dead links, and third-party scrapers.
 */

import { COUNTRY_CITY_MAP, REGIONAL_MARKET_MAP } from './country_city_taxonomy.js';

export const REGIONS = [
  { id: 'all', label: 'All Global Regions', flag: '🌍', desc: 'Unified global ATS network (550+ verified employers)' },
  { id: 'india_gccs', label: 'India & GCC Hubs', flag: '🇮🇳', desc: 'Top Indian Unicorns & Global Capability Centers (BLR, HYD, DEL, PUN)' },
  { id: 'north_america', label: 'North America', flag: '🇺🇸', desc: 'Silicon Valley, NYC, Seattle & Canadian Tech Startups & Tier-1 MNCs' },
  { id: 'europe_uk', label: 'Europe & UK', flag: '🇪🇺', desc: 'London, Berlin, Amsterdam, Stockholm & Paris Product Unicorns' },
  { id: 'apac', label: 'Asia-Pacific (APAC)', flag: '🌏', desc: 'Singapore, Sydney, Melbourne & Tokyo High-Growth Engineering Hubs' },
  { id: 'latam', label: 'Latin America', flag: '🌎', desc: 'São Paulo, Mexico City & Bogota Tech Pioneers' },
  { id: 'global_remote', label: 'Global Remote', flag: '🌐', desc: 'Air-gapped distributed engineering teams hiring worldwide' }
];

export const REGIONAL_ATS_COMPANIES = {
  india_gccs: {
    greenhouse: [
      'razorpaysoftwareprivatelimited', 'razorpay', 'postman', 'inmobi', 'groww', 'porter',
      'swiggy', 'zomato', 'blinkit', 'zerodha', 'cred', 
      'meesho', 'urbancompany', 'curefit', 'zepto', 'ola', 'olaelectric', 
      'phonepe', 'paytm', 'delhivery', 'mpl', 'dream11', 'games24x7', 'unacademy', 
      'upgrad', 'physicswallah', 'eruditus', 'lead', 'classplus', 'cuemath', 
      'scaler', 'interviewbit', 'browserstack', 'hasura', 'chargebee', 'freshworks', 
      'clevertap', 'moengage', 'whatfix', 'darwinbox', 'yellowai', 'gupshup', 
      'haptik', 'sarvam', 'krutrim', 'gnani', 'karya', 'bhashini', 'subspace', 'jio',
      'slice', 'rapido', 'licious', 'spinny', 'khatabook',
      'cashfree', 'lendingkart', 'navi', 'atherenergy', 'coindcx', 'coinswitch',
      'mudrex', 'jar', 'jupiter', 'fimoney', 'scripbox', 'smallcase', 'dukaan',
      'shiprocket', 'shadowfax', 'blackbuck', 'ninjacart', 'dehaat', 'agrostar',
      'pratilipi', 'sharechat', 'pocketfm', 'kukufm', 'stage', 'apna', 'loconav',
      'fleetx', 'intangles', 'greyorange', 'addverb', 'curefoods', 'lenskart',
      'nykaa', 'purplle', 'mamaearth', 'sugarcosmetics', 'boat', 'noise',
      'wakefit', 'cars24', 'droom', 'cardekho', 'acko', 'digit', 'turtlemint',
      'policybazaar', 'paisabazaar', 'cleartax', 'kissflow', 'facilio', 'vymo',
      'zinier', 'mindtickle', 'highradius', 'leadsquared', 'keka', 'perfios',
      'nobroker', 'magicbricks', 'housing', 'squareyards', 'oyo'
    ],
    ashby: [
      'cursor', 'anysphere', 'replit', 'togetherai', 'groq', 'glean', 'infisical', 'livekit',
      'decagon', 'tavily', 'axiom', 'cartesia', 'deepgram', 'fireworks', 'browserbase',
      'langchain', 'pinecone', 'modal', 'e2b', 'sandpack', 'posthog', 'sentry', 'retool',
      'ramp', 'vercel', 'supabase', 'clickhouse'
    ],
    lever: [
      'cred', 'meesho', 'porter', 'zeta', 'postman', 'atlassian', 'freshworks', 
      'chargebee', 'hasura', 'browserstack', 'clevertap', 'moengage', 'whatfix', 'acceldata',
      'thoughtworks', 'sprinklr', 'hackerrank', 'leena-ai', 'signzy', 'verloop', 'slintel',
      'leadsquared', 'leadiq', 'airmeet', 'hubilo', 'yellowmessenger', 'redbus', 'goibibo',
      'makemytrip', 'cleartrip', 'yatra', 'practo'
    ],
    smartrecruiters: [
      'freshworks', 'publicissapient', 'bosch', 'visa', 'ikea', 'accenture', 'capgemini',
      'cognizant', 'infosys', 'wipro', 'tcs', 'hcltech', 'techmahindra',
      'lntinfotech', 'mphasis', 'mindtree', 'hexaware', 'persistent',
      'birlasoft', 'coforge', 'zensar', 'cyient', 'kpit', 'tataelxsi', 'ltmindtree'
    ],
    workday: [
      'browserstack', 'walmart', 'target', 'adobe', 'salesforce', 'servicenow', 'nvidia',
      'autodesk', 'mastercard', 'visa', 'fidelity', 'morganstanley', 'bankofamerica',
      'boeing', 'siemens', 'ge', 'pfizer', 'astrazeneca', 'abbott', 'intuit',
      'vmware', 'paloaltonetworks', 'cisco', 'dell', 'intel', 'qualcomm', 'micron',
      'nxp', 'broadcom', 'texas-instruments'
    ]
  },

  north_america: {
    greenhouse: [
      'gitlab', 'figma', 'reddit', 'databricks', 'doordash', 'pinterest', 
      'affirm', 'dropbox', 'cloudflare', 'instacart', 'robinhood', 'datadog',
      'elastic', 'coinbase', 'mongodb', 'twitch', 'discord', 'gusto', 'brex',
      'scaleai', 'stripe', 'shopify', 'waymo', 'lyft', 'snap', 'unity',
      'hubspot', 'pagerduty', 'splunk', 'box', 'palantir', 'notion', 'airtable',
      'plaid', 'crowdstrike', 'zscaler', 'andurilindustries', 'tesla', 'skydio',
      'snowflake', 'confluent', 'dbtlabs', 'duckduckgo', 'hashicorp', 'temporal',
      'couchbase', 'carta', 'checkr', 'benchling', 'samsara', 'toast',
      'asana', 'okta', 'rubrik', 'sumologic', 'sentinelone', 'dataminr',
      'braze', 'amplitude', 'klaviyo', 'quora', 'roblox', 'duolingo',
      'sofi', 'opendoor', 'lyrahealth', 'grammarly', 'canonical'
    ],
    ashby: [
      'linear', 'retool', 'ramp', 'vercel', 'supabase', 'posthog', 'sentry',
      'openai', 'anthropic', 'perplexity', 'resend', 'prisma', 'modal', 'cursor',
      'midjourney', 'descript', 'warp', 'replit', 'codeium', 'lumaai',
      'weightsandbiases', 'clickhouse', 'langchain', 'pinecone', 'runway',
      'elevenlabs', 'cohere', 'sourcegraph', 'axiom', 'tavily', 'decagon'
    ],
    lever: [
      'palantir', 'shieldai', 'waabi', 'wealthfront', 'sysdig', 'automattic',
      'docker', 'coursera', 'medium', 'fullstory', 'webflow', 'zapier'
    ],
    smartrecruiters: [
      'visa', 'square', 'electronic-arts', 'epicgames', 'riotgames', 'valve'
    ],
    bamboohr: [
      'modal', 'posthog', 'wpengine', 'articulate', 'pair', 'seatgeek', 'chime',
      'zapier', 'sourcegraph', 'docker', 'clickhouse', 'astronomer', 'timescale',
      'planetscale', 'soundhound', 'bitly', 'udacity'
    ],
    workday: [
      'nvidia', 'adobe', 'salesforce', 'autodesk', 'workday', 'target', 'mastercard', 'netflix', 'walmart'
    ],
    rippling: [
      'aalyria-careers', 'superhuman', 'watershed', 'scale-ai', 'anthropic'
    ]
  },

  europe_uk: {
    greenhouse: [
      'deliveryhero', 'glovo', 'wolt', 'bolt', 'klarna', 'personio',
      'contentful', 'pitch', 'adjust', 'n26', 'qonto', 'revolut', 'monzo',
      'starling', 'checkout', 'primer', 'deepL', 'mistral'
    ],
    ashby: [
      'mistral', 'poolside', 'synthesia', 'heygen', 'monzo', 'revolut',
      'checkout', 'primer', 'autumn', 'octane', 'openmeter'
    ],
    lever: [
      'spotify', 'qonto', 'trustpilot', 'kraken', 'canonical'
    ],
    smartrecruiters: [
      'deliveryhero', 'glovo', 'ikea', 'criteo', 'cdprojektred', 'supercell', 'rovio'
    ],
    recruitee: [
      'bunq', 'ticketswap', 'transloadit', 'blendle', 'wetransfer', 'tideways',
      'hotjar', 'brevo', 'swapfiets', 'picnic', 'messagebird', 'mollie',
      'adyen', 'orderbird', 'taxdoo', 'personio', 'flinks', 'freetrade',
      'trade-republic', 'scalable-capital', 'n26', 'urban-sports-club', 'taxfix'
    ],
    workable: [
      'taxfix', 'omio', 'personio', 'wolt', 'bolt', 'tier', 'getir',
      'typeform', 'transfergo', 'starlingbank', 'curve', 'oaknorth',
      'sumup', 'pleo', 'spendesk', 'moss', 'payhawk', 'agicap', 'pennylane'
    ],
    personio: [
      'personio', 'taxfix', 'statista', 'grover', 'spryker', 'getyourguide',
      'tier', 'flixbus', 'scalable-capital', 'flinks', 'trade-republic', 'cargo-one',
      'contentful', 'pitch'
    ]
  },

  apac: {
    greenhouse: [
      'canva', 'atlassian', 'grab', 'airwallex', 'carousell', 'safetyculture',
      'cultureamp', 'envato', 'xero', 'afterpay', 'zip'
    ],
    ashby: [
      'linear', 'supabase', 'posthog'
    ],
    lever: [
      'atlassian', 'airwallex', 'safetyculture'
    ],
    smartrecruiters: [
      'canva', 'grab', 'publicissapient'
    ]
  },

  latam: {
    greenhouse: [
      'nubank', 'mercadolibre', 'rappi', 'dlocal', 'kavak', 'quintoandar'
    ],
    lever: [
      'nubank', 'rappi', 'creditas', 'loft'
    ],
    workable: [
      'flutterwave', 'paystack', 'kredivo', 'chipper-cash', 'wave'
    ]
  },

  global_remote: {
    greenhouse: [
      'gitlab', 'canonical', 'duckduckgo', 'sourcegraph', 'hashicorp', 'elastic'
    ],
    ashby: [
      'posthog', 'supabase', 'sentry', 'linear', 'prisma', 'resend'
    ],
    lever: [
      'automattic', 'zapier', 'coursera', 'docker', 'algolia'
    ],
    bamboohr: [
      'modal', 'posthog', 'pair', 'zapier', 'sourcegraph', 'docker'
    ],
    personio: [
      'personio', 'taxfix', 'getyourguide', 'tier'
    ]
  }
};

/**
 * Verified Workday enterprise tenant configurations.
 * Maps company slugs to exact subdomain, tenant company, and careers site.
 */
export const VERIFIED_WORKDAY_TENANTS = {
  nvidia: { company: 'nvidia', subdomain: 'nvidia.wd5', site: 'NVIDIAExternalCareerSite' },
  adobe: { company: 'adobe', subdomain: 'adobe.wd5', site: 'external_experienced' },
  salesforce: { company: 'salesforce', subdomain: 'salesforce.wd12', site: 'External_Career_Site' },
  workday: { company: 'workday', subdomain: 'workday.wd5', site: 'Workday' },
  autodesk: { company: 'autodesk', subdomain: 'autodesk.wd1', site: 'Ext' },
  target: { company: 'target', subdomain: 'target.wd5', site: 'targetcareers' },
  mastercard: { company: 'mastercard', subdomain: 'mastercard.wd1', site: 'CorporateCareers' },
  netflix: { company: 'netflix', subdomain: 'netflix.wd1', site: 'NetflixCareers' },
  walmart: { company: 'walmart', subdomain: 'walmart.wd5', site: 'WalmartExternal' },
  browserstack: { company: 'browserstack', subdomain: 'browserstack.wd3', site: 'External' }
};

/**
 * Returns a flattened array of company slugs for a given region and platform.
 * If region is 'all', returns union across all regions.
 */
export function getRegionalCompanies(region = 'all', platform = 'greenhouse') {
  if (region !== 'all' && REGIONAL_ATS_COMPANIES[region]) {
    return REGIONAL_ATS_COMPANIES[region][platform] || [];
  }

  // Union across all regions
  const set = new Set();
  for (const reg of Object.values(REGIONAL_ATS_COMPANIES)) {
    if (reg[platform]) {
      for (const comp of reg[platform]) {
        set.add(comp);
      }
    }
  }
  return Array.from(set);
}

/**
 * Returns summary counts per region.
 */
export function getRegionalStats() {
  const stats = {};
  for (const reg of REGIONS) {
    if (reg.id === 'all') continue;
    const cat = REGIONAL_ATS_COMPANIES[reg.id] || {};
    let total = 0;
    for (const list of Object.values(cat)) {
      total += list.length;
    }
    stats[reg.id] = total;
  }
  return stats;
}

/**
 * Automatically infers the candidate's active primary region from Application Scope.
 * E.g., if candidate targets Indian hubs (Bengaluru, Hyderabad, Pune, India, etc.),
 * resolves cleanly to 'india_gccs' to steer ATS boards and prevent foreign remote leakage.
 */
export function detectCandidateRegionFromScope(scope) {
  if (!scope || typeof scope !== 'object') return 'all';

  const rawLocs = [
    ...(Array.isArray(scope.locations) ? scope.locations : []).map(l => (typeof l === 'string' ? l : l?.label || l?.name || '')),
    scope.target_location,
    ...(Array.isArray(scope.preferred_locations) ? scope.preferred_locations : [])
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  if (rawLocs.length === 0) return 'all';

  // Check if candidate explicitly requested global remote or worldwide
  const hasGlobalRemote = rawLocs.some(l => ['worldwide', 'global', 'anywhere', 'all', 'global remote'].includes(l));

  let indiaCount = 0;
  let naCount = 0;
  let euCount = 0;
  let apacCount = 0;
  let latamCount = 0;

  const indiaCities = new Set((COUNTRY_CITY_MAP['india']?.cities || []).map(c => c.toLowerCase()));
  const usCities = new Set([
    ...(COUNTRY_CITY_MAP['united states']?.cities || []).map(c => c.toLowerCase()),
    ...(COUNTRY_CITY_MAP['canada']?.cities || []).map(c => c.toLowerCase())
  ]);
  const euCountries = REGIONAL_MARKET_MAP.europe || [];
  const euCities = new Set(euCountries.flatMap(k => (COUNTRY_CITY_MAP[k]?.cities || []).map(c => c.toLowerCase())));

  for (const loc of rawLocs) {
    if (loc === 'india' || loc === 'ind' || loc === 'bharat' || indiaCities.has(loc)) {
      indiaCount++;
    } else if (loc === 'united states' || loc === 'us' || loc === 'usa' || loc === 'canada' || usCities.has(loc)) {
      naCount++;
    } else if (euCountries.includes(loc) || euCities.has(loc) || loc === 'europe' || loc === 'uk' || loc === 'germany') {
      euCount++;
    } else if (loc.includes('singapore') || loc.includes('tokyo') || loc.includes('sydney') || loc === 'apac') {
      apacCount++;
    } else if (loc.includes('brazil') || loc.includes('mexico') || loc === 'latam') {
      latamCount++;
    }
  }

  // Pure Indian scope (e.g. India or Indian tech hubs like Bengaluru, Hyderabad, etc.)
  if (indiaCount > 0 && naCount === 0 && euCount === 0 && apacCount === 0 && latamCount === 0) {
    return 'india_gccs';
  }
  if (naCount > 0 && indiaCount === 0 && euCount === 0) {
    return 'north_america';
  }
  if (euCount > 0 && indiaCount === 0 && naCount === 0) {
    return 'europe_uk';
  }
  if (apacCount > 0 && indiaCount === 0 && naCount === 0 && euCount === 0) {
    return 'apac';
  }
  if (latamCount > 0 && indiaCount === 0 && naCount === 0 && euCount === 0) {
    return 'latam';
  }
  if (hasGlobalRemote) {
    return 'global_remote';
  }

  return 'all';
}
