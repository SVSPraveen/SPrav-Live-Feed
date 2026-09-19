/**
 * country_city_taxonomy.js
 * =========================
 * Comprehensive worldwide geographic taxonomy for tech hubs and engineering markets.
 * Covers 65+ countries and 400+ tech cities across Asia-Pacific, Europe, Americas,
 * Middle East & Africa, and Global Remote.
 *
 * Pure JavaScript - zero UI/framework dependencies. Safe for Node.js, Vite, and workers.
 */

export const COUNTRY_CITY_MAP = {
  "india": {
    countryName: "India",
    flag: "🇮🇳",
    code: "in",
    aliases: ["india", "ind", "bharat", "indian"],
    cities: [
      "India",
      "Bengaluru",
      "Hyderabad",
      "Pune",
      "Delhi NCR",
      "Gurgaon",
      "Noida",
      "Mumbai",
      "Chennai",
      "Kolkata",
      "Ahmedabad",
      "Kochi",
      "Chandigarh",
      "Coimbatore",
      "Indore",
      "Jaipur",
      "Thiruvananthapuram",
      "Bhubaneswar",
      "Nagpur",
      "Visakhapatnam",
      "Surat",
      "Vadodara",
      "Mysuru",
      "Mangaluru",
      "Lucknow",
      "Bhopal",
      "Patna",
      "Dehradun",
      "Raipur",
      "Ranchi",
      "Agra",
      "Kanpur",
      "Nashik",
      "Varanasi",
      "Prayagraj"
    ]
  },
  "united states": {
    countryName: "United States",
    flag: "🇺🇸",
    code: "us",
    aliases: ["united states", "usa", "us", "u.s.", "u.s.a.", "america", "united states of america"],
    cities: [
      "United States",
      "San Francisco Bay Area",
      "Silicon Valley",
      "New York",
      "Seattle",
      "Austin",
      "Boston",
      "Los Angeles",
      "Chicago",
      "Denver",
      "San Diego",
      "Atlanta",
      "Dallas-Fort Worth",
      "Washington D.C.",
      "Raleigh-Durham",
      "Salt Lake City",
      "Phoenix",
      "Miami",
      "Minneapolis",
      "Philadelphia",
      "Portland",
      "Charlotte",
      "Pittsburgh",
      "Detroit",
      "Tampa",
      "Nashville",
      "Boulder",
      "Houston"
    ]
  },
  "canada": {
    countryName: "Canada",
    flag: "🇨🇦",
    code: "ca",
    aliases: ["canada", "ca", "can"],
    cities: [
      "Canada",
      "Toronto",
      "Vancouver",
      "Montreal",
      "Ottawa",
      "Waterloo",
      "Calgary",
      "Edmonton",
      "Quebec City",
      "Halifax",
      "Victoria"
    ]
  },
  "united kingdom": {
    countryName: "United Kingdom",
    flag: "🇬🇧",
    code: "gb",
    aliases: ["united kingdom", "uk", "great britain", "britain", "england", "scotland", "wales", "u.k."],
    cities: [
      "United Kingdom",
      "London",
      "Manchester",
      "Cambridge",
      "Oxford",
      "Edinburgh",
      "Bristol",
      "Birmingham",
      "Glasgow",
      "Leeds",
      "Belfast",
      "Cardiff",
      "Newcastle"
    ]
  },
  "germany": {
    countryName: "Germany",
    flag: "🇩🇪",
    code: "de",
    aliases: ["germany", "de", "deutschland", "ger"],
    cities: [
      "Germany",
      "Berlin",
      "Munich",
      "Frankfurt",
      "Hamburg",
      "Cologne",
      "Stuttgart",
      "Düsseldorf",
      "Leipzig",
      "Dresden",
      "Nuremberg",
      "Karlsruhe"
    ]
  },
  "netherlands": {
    countryName: "Netherlands",
    flag: "🇳🇱",
    code: "nl",
    aliases: ["netherlands", "nl", "holland", "dutch"],
    cities: [
      "Netherlands",
      "Amsterdam",
      "Rotterdam",
      "Utrecht",
      "Eindhoven",
      "The Hague",
      "Delft",
      "Groningen"
    ]
  },
  "france": {
    countryName: "France",
    flag: "🇫🇷",
    code: "fr",
    aliases: ["france", "fr", "fra"],
    cities: [
      "France",
      "Paris",
      "Lyon",
      "Toulouse",
      "Bordeaux",
      "Nantes",
      "Lille",
      "Marseille",
      "Sophia Antipolis",
      "Rennes",
      "Strasbourg"
    ]
  },
  "ireland": {
    countryName: "Ireland",
    flag: "🇮🇪",
    code: "ie",
    aliases: ["ireland", "ie", "irl"],
    cities: [
      "Ireland",
      "Dublin",
      "Cork",
      "Galway",
      "Limerick"
    ]
  },
  "switzerland": {
    countryName: "Switzerland",
    flag: "🇨🇭",
    code: "ch",
    aliases: ["switzerland", "ch", "swiss", "schweiz", "suisse"],
    cities: [
      "Switzerland",
      "Zurich",
      "Geneva",
      "Lausanne",
      "Basel",
      "Bern"
    ]
  },
  "sweden": {
    countryName: "Sweden",
    flag: "🇸🇪",
    code: "se",
    aliases: ["sweden", "se", "sverige", "swedish"],
    cities: [
      "Sweden",
      "Stockholm",
      "Gothenburg",
      "Malmö",
      "Uppsala",
      "Lund"
    ]
  },
  "poland": {
    countryName: "Poland",
    flag: "🇵🇱",
    code: "pl",
    aliases: ["poland", "pl", "polska", "polish"],
    cities: [
      "Poland",
      "Warsaw",
      "Kraków",
      "Krakow",
      "Wrocław",
      "Wroclaw",
      "Gdańsk",
      "Gdansk",
      "Poznań",
      "Poznan",
      "Katowice",
      "Łódź",
      "Lodz",
      "Szczecin",
      "Lublin"
    ]
  },
  "spain": {
    countryName: "Spain",
    flag: "🇪🇸",
    code: "es",
    aliases: ["spain", "es", "españa", "spanish"],
    cities: [
      "Spain",
      "Madrid",
      "Barcelona",
      "Valencia",
      "Seville",
      "Málaga",
      "Bilbao"
    ]
  },
  "italy": {
    countryName: "Italy",
    flag: "🇮🇹",
    code: "it",
    aliases: ["italy", "it", "italia", "italian"],
    cities: [
      "Italy",
      "Milan",
      "Rome",
      "Turin",
      "Bologna",
      "Florence",
      "Naples"
    ]
  },
  "denmark": {
    countryName: "Denmark",
    flag: "🇩🇰",
    code: "dk",
    aliases: ["denmark", "dk", "danmark", "danish"],
    cities: [
      "Denmark",
      "Copenhagen",
      "Aarhus",
      "Odense",
      "Aalborg"
    ]
  },
  "norway": {
    countryName: "Norway",
    flag: "🇳🇴",
    code: "no",
    aliases: ["norway", "no", "norge", "norwegian"],
    cities: [
      "Norway",
      "Oslo",
      "Bergen",
      "Trondheim",
      "Stavanger"
    ]
  },
  "finland": {
    countryName: "Finland",
    flag: "🇫🇮",
    code: "fi",
    aliases: ["finland", "fi", "suomi", "finnish"],
    cities: [
      "Finland",
      "Helsinki",
      "Espoo",
      "Tampere",
      "Oulu"
    ]
  },
  "austria": {
    countryName: "Austria",
    flag: "🇦🇹",
    code: "at",
    aliases: ["austria", "at", "österreich", "austrian"],
    cities: [
      "Austria",
      "Vienna",
      "Graz",
      "Linz",
      "Salzburg"
    ]
  },
  "belgium": {
    countryName: "Belgium",
    flag: "🇧🇪",
    code: "be",
    aliases: ["belgium", "be", "belgique", "belgië"],
    cities: [
      "Belgium",
      "Brussels",
      "Antwerp",
      "Ghent",
      "Leuven"
    ]
  },
  "czech republic": {
    countryName: "Czech Republic",
    flag: "🇨🇿",
    code: "cz",
    aliases: ["czech republic", "czechia", "cz", "prague"],
    cities: [
      "Czech Republic",
      "Prague",
      "Brno",
      "Ostrava"
    ]
  },
  "portugal": {
    countryName: "Portugal",
    flag: "🇵🇹",
    code: "pt",
    aliases: ["portugal", "pt", "portuguese"],
    cities: [
      "Portugal",
      "Lisbon",
      "Porto",
      "Braga",
      "Coimbra",
      "Faro",
      "Aveiro"
    ]
  },
  "estonia": {
    countryName: "Estonia",
    flag: "🇪🇪",
    code: "ee",
    aliases: ["estonia", "ee", "eesti", "tallinn"],
    cities: [
      "Estonia",
      "Tallinn",
      "Tartu"
    ]
  },
  "romania": {
    countryName: "Romania",
    flag: "🇷🇴",
    code: "ro",
    aliases: ["romania", "ro", "romanian"],
    cities: [
      "Romania",
      "Bucharest",
      "Cluj-Napoca",
      "Cluj",
      "Timișoara",
      "Timisoara",
      "Iași",
      "Iasi",
      "Brașov",
      "Brasov",
      "Sibiu"
    ]
  },
  "hungary": {
    countryName: "Hungary",
    flag: "🇭🇺",
    code: "hu",
    aliases: ["hungary", "hu", "magyarország"],
    cities: [
      "Hungary",
      "Budapest",
      "Debrecen",
      "Szeged"
    ]
  },
  "greece": {
    countryName: "Greece",
    flag: "🇬🇷",
    code: "gr",
    aliases: ["greece", "gr", "hellas"],
    cities: [
      "Greece",
      "Athens",
      "Thessaloniki",
      "Heraklion"
    ]
  },
  "luxembourg": {
    countryName: "Luxembourg",
    flag: "🇱🇺",
    code: "lu",
    aliases: ["luxembourg", "lu"],
    cities: [
      "Luxembourg",
      "Luxembourg City"
    ]
  },
  "turkey": {
    countryName: "Turkey",
    flag: "🇹🇷",
    code: "tr",
    aliases: ["turkey", "tr", "tur", "türkiye", "turkiye", "istanbul"],
    cities: [
      "Turkey",
      "Istanbul",
      "Ankara",
      "Izmir",
      "Bursa",
      "Antalya"
    ]
  },
  "ukraine": {
    countryName: "Ukraine",
    flag: "🇺🇦",
    code: "ua",
    aliases: ["ukraine", "ua", "ukr", "kyiv", "kiev"],
    cities: [
      "Ukraine",
      "Kyiv",
      "Lviv",
      "Kharkiv",
      "Odesa",
      "Dnipro",
      "Vinnytsia"
    ]
  },
  "bulgaria": {
    countryName: "Bulgaria",
    flag: "🇧🇬",
    code: "bg",
    aliases: ["bulgaria", "bg", "bgr", "sofia"],
    cities: [
      "Bulgaria",
      "Sofia",
      "Plovdiv",
      "Varna"
    ]
  },
  "croatia": {
    countryName: "Croatia",
    flag: "🇭🇷",
    code: "hr",
    aliases: ["croatia", "hr", "hrv", "zagreb"],
    cities: [
      "Croatia",
      "Zagreb",
      "Split",
      "Rijeka"
    ]
  },
  "serbia": {
    countryName: "Serbia",
    flag: "🇷🇸",
    code: "rs",
    aliases: ["serbia", "rs", "srb", "belgrade"],
    cities: [
      "Serbia",
      "Belgrade",
      "Novi Sad",
      "Niš"
    ]
  },
  "slovakia": {
    countryName: "Slovakia",
    flag: "🇸🇰",
    code: "sk",
    aliases: ["slovakia", "sk", "svk", "bratislava", "slovak republic"],
    cities: [
      "Slovakia",
      "Bratislava",
      "Košice"
    ]
  },
  "lithuania": {
    countryName: "Lithuania",
    flag: "🇱🇹",
    code: "lt",
    aliases: ["lithuania", "lt", "ltu", "vilnius"],
    cities: [
      "Lithuania",
      "Vilnius",
      "Kaunas"
    ]
  },
  "latvia": {
    countryName: "Latvia",
    flag: "🇱🇻",
    code: "lv",
    aliases: ["latvia", "lv", "lva", "riga"],
    cities: [
      "Latvia",
      "Riga"
    ]
  },
  "singapore": {
    countryName: "Singapore",
    flag: "🇸🇬",
    code: "sg",
    aliases: ["singapore", "sg", "sin"],
    cities: [
      "Singapore",
      "One-North",
      "Jurong",
      "Changi",
      "Woodlands"
    ]
  },
  "japan": {
    countryName: "Japan",
    flag: "🇯🇵",
    code: "jp",
    aliases: ["japan", "jp", "jpn", "nippon", "nihon"],
    cities: [
      "Japan",
      "Tokyo",
      "Osaka",
      "Kyoto",
      "Fukuoka",
      "Yokohama",
      "Nagoya",
      "Sapporo",
      "Kobe"
    ]
  },
  "south korea": {
    countryName: "South Korea",
    flag: "🇰🇷",
    code: "kr",
    aliases: ["south korea", "korea", "kr", "kor", "seoul"],
    cities: [
      "South Korea",
      "Seoul",
      "Pangyo",
      "Busan",
      "Incheon",
      "Daejeon",
      "Suwon"
    ]
  },
  "australia": {
    countryName: "Australia",
    flag: "🇦🇺",
    code: "au",
    aliases: ["australia", "au", "aus", "anz"],
    cities: [
      "Australia",
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
      "Gold Coast"
    ]
  },
  "new zealand": {
    countryName: "New Zealand",
    flag: "🇳🇿",
    code: "nz",
    aliases: ["new zealand", "nz", "kiwi"],
    cities: [
      "New Zealand",
      "Auckland",
      "Wellington",
      "Christchurch"
    ]
  },
  "taiwan": {
    countryName: "Taiwan",
    flag: "🇹🇼",
    code: "tw",
    aliases: ["taiwan", "tw", "taipei"],
    cities: [
      "Taiwan",
      "Taipei",
      "Hsinchu",
      "Taichung",
      "Kaohsiung"
    ]
  },
  "hong kong": {
    countryName: "Hong Kong",
    flag: "🇭🇰",
    code: "hk",
    aliases: ["hong kong", "hk"],
    cities: [
      "Hong Kong"
    ]
  },
  "malaysia": {
    countryName: "Malaysia",
    flag: "🇲🇾",
    code: "my",
    aliases: ["malaysia", "my", "mys"],
    cities: [
      "Malaysia",
      "Kuala Lumpur",
      "Penang",
      "George Town",
      "Cyberjaya",
      "Petaling Jaya",
      "Shah Alam",
      "Johor Bahru",
      "Subang Jaya"
    ]
  },
  "indonesia": {
    countryName: "Indonesia",
    flag: "🇮🇩",
    code: "id",
    aliases: ["indonesia", "id", "idn"],
    cities: [
      "Indonesia",
      "Jakarta",
      "BSD City",
      "Bandung",
      "Bali",
      "Surabaya",
      "Yogyakarta",
      "Tangerang",
      "Medan",
      "Semarang",
      "Batam"
    ]
  },
  "philippines": {
    countryName: "Philippines",
    flag: "🇵🇭",
    code: "ph",
    aliases: ["philippines", "ph", "phl", "filipino"],
    cities: [
      "Philippines",
      "Manila",
      "Metro Manila",
      "Makati",
      "Taguig/BGC",
      "BGC",
      "Taguig",
      "Cebu City",
      "Quezon City",
      "Pasig/Ortigas",
      "Pasig",
      "Ortigas",
      "Davao City",
      "Iloilo City",
      "Clark/Angeles",
      "Clark",
      "Bacolod"
    ]
  },
  "thailand": {
    countryName: "Thailand",
    flag: "🇹🇭",
    code: "th",
    aliases: ["thailand", "th", "tha", "bangkok"],
    cities: [
      "Thailand",
      "Bangkok",
      "Chiang Mai",
      "Phuket",
      "Nonthaburi",
      "Pattaya",
      "Khon Kaen",
      "Rayong"
    ]
  },
  "vietnam": {
    countryName: "Vietnam",
    flag: "🇻🇳",
    code: "vn",
    aliases: ["vietnam", "vn", "vnm"],
    cities: [
      "Vietnam",
      "Ho Chi Minh City",
      "Hanoi",
      "Da Nang",
      "Can Tho",
      "Hai Phong",
      "Nha Trang",
      "Binh Duong"
    ]
  },
  "cambodia": {
    countryName: "Cambodia",
    flag: "🇰🇭",
    code: "kh",
    aliases: ["cambodia", "kh", "khm", "phnom penh"],
    cities: [
      "Cambodia",
      "Phnom Penh",
      "Siem Reap"
    ]
  },
  "myanmar": {
    countryName: "Myanmar",
    flag: "🇲🇲",
    code: "mm",
    aliases: ["myanmar", "mm", "mmr", "burma", "yangon"],
    cities: [
      "Myanmar",
      "Yangon"
    ]
  },
  "bangladesh": {
    countryName: "Bangladesh",
    flag: "🇧🇩",
    code: "bd",
    aliases: ["bangladesh", "bd", "bgd", "bengali", "dhaka"],
    cities: [
      "Bangladesh",
      "Dhaka",
      "Chittagong",
      "Sylhet",
      "Rajshahi",
      "Khulna"
    ]
  },
  "sri lanka": {
    countryName: "Sri Lanka",
    flag: "🇱🇰",
    code: "lk",
    aliases: ["sri lanka", "lk", "lka", "ceylon", "colombo"],
    cities: [
      "Sri Lanka",
      "Colombo",
      "Kandy",
      "Galle",
      "Jaffna"
    ]
  },
  "pakistan": {
    countryName: "Pakistan",
    flag: "🇵🇰",
    code: "pk",
    aliases: ["pakistan", "pk", "pak", "lahore", "karachi", "islamabad"],
    cities: [
      "Pakistan",
      "Lahore",
      "Karachi",
      "Islamabad",
      "Rawalpindi",
      "Faisalabad",
      "Peshawar"
    ]
  },
  "uae": {
    countryName: "UAE",
    flag: "🇦🇪",
    code: "ae",
    aliases: ["uae", "dubai", "emirates", "united arab emirates", "abu dhabi", "ae"],
    cities: [
      "UAE",
      "Dubai",
      "Abu Dhabi",
      "Sharjah"
    ]
  },
  "saudi arabia": {
    countryName: "Saudi Arabia",
    flag: "🇸🇦",
    code: "sa",
    aliases: ["saudi arabia", "sa", "ksa", "riyadh"],
    cities: [
      "Saudi Arabia",
      "Riyadh",
      "Jeddah",
      "Dammam",
      "NEOM"
    ]
  },
  "qatar": {
    countryName: "Qatar",
    flag: "🇶🇦",
    code: "qa",
    aliases: ["qatar", "qa", "doha"],
    cities: [
      "Qatar",
      "Doha"
    ]
  },
  "israel": {
    countryName: "Israel",
    flag: "🇮🇱",
    code: "il",
    aliases: ["israel", "il", "isr", "tel aviv"],
    cities: [
      "Israel",
      "Tel Aviv",
      "Haifa",
      "Jerusalem",
      "Herzliya"
    ]
  },
  "south africa": {
    countryName: "South Africa",
    flag: "🇿🇦",
    code: "za",
    aliases: ["south africa", "za", "saf"],
    cities: [
      "South Africa",
      "Cape Town",
      "Johannesburg",
      "Durban",
      "Pretoria",
      "Stellenbosch",
      "Centurion",
      "Gqeberha"
    ]
  },
  "nigeria": {
    countryName: "Nigeria",
    flag: "🇳🇬",
    code: "ng",
    aliases: ["nigeria", "ng", "nga", "lagos"],
    cities: [
      "Nigeria",
      "Lagos",
      "Abuja",
      "Ibadan",
      "Port Harcourt",
      "Enugu",
      "Lekki",
      "Yaba",
      "Ikeja",
      "Victoria Island"
    ]
  },
  "kenya": {
    countryName: "Kenya",
    flag: "🇰🇪",
    code: "ke",
    aliases: ["kenya", "ke", "ken", "nairobi"],
    cities: [
      "Kenya",
      "Nairobi",
      "Mombasa",
      "Kisumu",
      "Nakuru",
      "Eldoret",
      "Westlands",
      "Kilimani"
    ]
  },
  "egypt": {
    countryName: "Egypt",
    flag: "🇪🇬",
    code: "eg",
    aliases: ["egypt", "eg", "egy", "cairo"],
    cities: [
      "Egypt",
      "Cairo",
      "Alexandria",
      "Giza",
      "New Cairo",
      "Smart Village",
      "Mansoura"
    ]
  },
  "ghana": {
    countryName: "Ghana",
    flag: "🇬🇭",
    code: "gh",
    aliases: ["ghana", "gh", "gha", "accra"],
    cities: [
      "Ghana",
      "Accra",
      "Kumasi",
      "Takoradi",
      "Tema"
    ]
  },
  "rwanda": {
    countryName: "Rwanda",
    flag: "🇷🇼",
    code: "rw",
    aliases: ["rwanda", "rw", "rwa", "kigali"],
    cities: [
      "Rwanda",
      "Kigali"
    ]
  },
  "morocco": {
    countryName: "Morocco",
    flag: "🇲🇦",
    code: "ma",
    aliases: ["morocco", "ma", "mar", "maroc", "casablanca"],
    cities: [
      "Morocco",
      "Casablanca",
      "Rabat",
      "Tangier",
      "Marrakech"
    ]
  },
  "tunisia": {
    countryName: "Tunisia",
    flag: "🇹🇳",
    code: "tn",
    aliases: ["tunisia", "tn", "tun", "tunis"],
    cities: [
      "Tunisia",
      "Tunis",
      "Sousse",
      "Sfax"
    ]
  },
  "uganda": {
    countryName: "Uganda",
    flag: "🇺🇬",
    code: "ug",
    aliases: ["uganda", "ug", "uga", "kampala"],
    cities: [
      "Uganda",
      "Kampala",
      "Entebbe"
    ]
  },
  "senegal": {
    countryName: "Senegal",
    flag: "🇸🇳",
    code: "sn",
    aliases: ["senegal", "sn", "sen", "dakar"],
    cities: [
      "Senegal",
      "Dakar"
    ]
  },
  "ivory coast": {
    countryName: "Ivory Coast",
    flag: "🇨🇮",
    code: "ci",
    aliases: ["ivory coast", "côte d'ivoire", "cote d'ivoire", "ci", "abidjan"],
    cities: [
      "Ivory Coast",
      "Abidjan"
    ]
  },
  "cameroon": {
    countryName: "Cameroon",
    flag: "🇨🇲",
    code: "cm",
    aliases: ["cameroon", "cm", "cmr", "douala"],
    cities: [
      "Cameroon",
      "Douala",
      "Yaoundé",
      "Buea"
    ]
  },
  "ethiopia": {
    countryName: "Ethiopia",
    flag: "🇪🇹",
    code: "et",
    aliases: ["ethiopia", "et", "eth", "addis ababa"],
    cities: [
      "Ethiopia",
      "Addis Ababa"
    ]
  },
  "brazil": {
    countryName: "Brazil",
    flag: "🇧🇷",
    code: "br",
    aliases: ["brazil", "br", "brasil"],
    cities: [
      "Brazil",
      "São Paulo",
      "Sao Paulo",
      "Rio de Janeiro",
      "Florianópolis",
      "Florianopolis",
      "Belo Horizonte",
      "Curitiba",
      "Porto Alegre",
      "Campinas",
      "Brasília",
      "Brasilia",
      "Recife",
      "Fortaleza",
      "Salvador",
      "Joinville",
      "São José dos Campos",
      "Sao Jose dos Campos",
      "Campina Grande"
    ]
  },
  "mexico": {
    countryName: "Mexico",
    flag: "🇲🇽",
    code: "mx",
    aliases: ["mexico", "mx", "mex", "méxico"],
    cities: [
      "Mexico",
      "Mexico City",
      "CDMX",
      "Ciudad de México",
      "Ciudad de Mexico",
      "Guadalajara",
      "Monterrey",
      "Querétaro",
      "Queretaro",
      "Puebla",
      "Mérida",
      "Merida",
      "Tijuana",
      "Ciudad Juárez",
      "Ciudad Juarez",
      "León",
      "Leon",
      "Cancún",
      "Cancun",
      "Zapopan"
    ]
  },
  "argentina": {
    countryName: "Argentina",
    flag: "🇦🇷",
    code: "ar",
    aliases: ["argentina", "ar", "arg"],
    cities: [
      "Argentina",
      "Buenos Aires",
      "Córdoba",
      "Rosario",
      "Mendoza",
      "La Plata",
      "Mar del Plata",
      "Tandil"
    ]
  },
  "colombia": {
    countryName: "Colombia",
    flag: "🇨🇴",
    code: "co",
    aliases: ["colombia", "co", "col"],
    cities: [
      "Colombia",
      "Bogotá",
      "Medellín",
      "Cali",
      "Barranquilla",
      "Bucaramanga",
      "Cartagena",
      "Manizales"
    ]
  },
  "chile": {
    countryName: "Chile",
    flag: "🇨🇱",
    code: "cl",
    aliases: ["chile", "cl", "chl"],
    cities: [
      "Chile",
      "Santiago",
      "Valparaíso",
      "Concepción",
      "Viña del Mar",
      "Antofagasta"
    ]
  },
  "costa rica": {
    countryName: "Costa Rica",
    flag: "🇨🇷",
    code: "cr",
    aliases: ["costa rica", "cr", "cri"],
    cities: [
      "Costa Rica",
      "San José",
      "Heredia",
      "Alajuela",
      "Cartago",
      "Belén"
    ]
  },
  "peru": {
    countryName: "Peru",
    flag: "🇵🇪",
    code: "pe",
    aliases: ["peru", "pe", "per", "perú"],
    cities: [
      "Peru",
      "Lima",
      "Arequipa",
      "Cusco",
      "Trujillo"
    ]
  },
  "uruguay": {
    countryName: "Uruguay",
    flag: "🇺🇾",
    code: "uy",
    aliases: ["uruguay", "uy", "ury", "montevideo"],
    cities: [
      "Uruguay",
      "Montevideo",
      "Punta del Este"
    ]
  },
  "panama": {
    countryName: "Panama",
    flag: "🇵🇦",
    code: "pa",
    aliases: ["panama", "pa", "pan", "panama city"],
    cities: [
      "Panama",
      "Panama City",
      "Ciudad del Saber"
    ]
  },
  "ecuador": {
    countryName: "Ecuador",
    flag: "🇪🇨",
    code: "ec",
    aliases: ["ecuador", "ec", "ecu", "quito"],
    cities: [
      "Ecuador",
      "Quito",
      "Guayaquil",
      "Cuenca"
    ]
  },
  "dominican republic": {
    countryName: "Dominican Republic",
    flag: "🇩🇴",
    code: "do",
    aliases: ["dominican republic", "do", "dom", "santo domingo"],
    cities: [
      "Dominican Republic",
      "Santo Domingo",
      "Santiago de los Caballeros"
    ]
  },
  "guatemala": {
    countryName: "Guatemala",
    flag: "🇬🇹",
    code: "gt",
    aliases: ["guatemala", "gt", "gtm", "guatemala city"],
    cities: [
      "Guatemala",
      "Guatemala City"
    ]
  },
  "remote": {
    countryName: "Remote & Global",
    flag: "🌐",
    code: "remote",
    aliases: ["remote", "worldwide", "anywhere", "global", "wfh", "any", "telecommute", "distributed"],
    cities: [
      "Remote",
      "Worldwide",
      "Anywhere",
      "Global Remote",
      "Remote - US",
      "Remote - Europe",
      "Remote - APAC",
      "Remote - India",
      "Remote - LATAM",
      "Remote - EMEA",
      "Remote - Americas",
      "Work From Anywhere"
    ]
  }
};

export const TECH_LOCATIONS = Array.from(
  new Set(Object.values(COUNTRY_CITY_MAP).flatMap(c => c.cities))
);

/**
 * Regional groupings for cross-border remote eligibility.
 */
export const REGIONAL_MARKET_MAP = {
  asia_pacific: [
    'india', 'singapore', 'japan', 'south korea', 'australia', 'new zealand',
    'taiwan', 'hong kong', 'malaysia', 'indonesia', 'philippines', 'thailand', 'vietnam',
    'bangladesh', 'sri lanka', 'pakistan', 'cambodia', 'myanmar'
  ],
  europe: [
    'united kingdom', 'germany', 'france', 'netherlands', 'ireland', 'switzerland',
    'sweden', 'poland', 'spain', 'italy', 'denmark', 'norway', 'finland', 'austria',
    'belgium', 'czech republic', 'portugal', 'estonia', 'romania', 'hungary', 'greece', 'luxembourg',
    'turkey', 'ukraine', 'bulgaria', 'croatia', 'serbia', 'slovakia', 'lithuania', 'latvia'
  ],
  americas: [
    'united states', 'canada', 'brazil', 'mexico', 'argentina', 'colombia', 'chile', 'costa rica', 'peru',
    'uruguay', 'panama', 'ecuador', 'dominican republic', 'guatemala'
  ],
  middle_east_africa: [
    'uae', 'saudi arabia', 'qatar', 'israel', 'south africa', 'nigeria', 'kenya', 'egypt', 'ghana',
    'rwanda', 'morocco', 'tunisia', 'uganda', 'senegal', 'ivory coast', 'cameroon', 'ethiopia'
  ],
  latin_america: [
    'brazil', 'mexico', 'argentina', 'colombia', 'chile', 'costa rica', 'peru',
    'uruguay', 'panama', 'ecuador', 'dominican republic', 'guatemala'
  ]
};

/**
 * Compiles a rich bidirectional alias lookup map covering all global tech hubs and cities.
 */
export function getGlobalLocationAliases() {
  const aliases = {
    'bengaluru': ['bangalore'],
    'bangalore': ['bengaluru'],
    'gurgaon': ['gurugram'],
    'gurugram': ['gurugram', 'gurgaon'],
    'mumbai': ['bombay'],
    'bombay': ['mumbai'],
    'chennai': ['madras'],
    'madras': ['chennai'],
    'kolkata': ['calcutta'],
    'calcutta': ['kolkata'],
    'delhi ncr': ['delhi', 'new delhi', 'ncr', 'noida', 'gurgaon', 'gurugram'],
    'delhi': ['delhi ncr', 'new delhi'],
    'new delhi': ['delhi', 'delhi ncr'],
    'san francisco bay area': ['sf', 'san francisco', 'bay area', 'silicon valley'],
    'sf': ['san francisco', 'san francisco bay area', 'bay area'],
    'new york': ['nyc', 'new york city', 'ny'],
    'nyc': ['new york', 'new york city'],
    'washington d.c.': ['dc', 'washington dc', 'd.c.'],
    'los angeles': ['la', 'l.a.'],
    'kyiv': ['kiev', 'kyiv', 'ukraine'],
    'kiev': ['kyiv', 'kiev', 'ukraine'],
    'istanbul': ['istanbul', 'turkey', 'türkiye', 'turkiye'],
    'dhaka': ['dhaka', 'bangladesh'],
    'colombo': ['colombo', 'sri lanka'],
    'lahore': ['lahore', 'pakistan'],
    'karachi': ['karachi', 'pakistan'],
    'islamabad': ['islamabad', 'pakistan'],
    'sofia': ['sofia', 'bulgaria'],
    'belgrade': ['belgrade', 'serbia'],
    'zagreb': ['zagreb', 'croatia'],
    'bratislava': ['bratislava', 'slovakia'],
    'vilnius': ['vilnius', 'lithuania'],
    'riga': ['riga', 'latvia'],
    'lagos': ['lagos', 'nigeria', 'yaba', 'lekki', 'ikeja', 'victoria island'],
    'abuja': ['abuja', 'nigeria', 'fct'],
    'cairo': ['cairo', 'egypt', 'giza'],
    'kigali': ['kigali', 'rwanda'],
    'casablanca': ['casablanca', 'morocco'],
    'tunis': ['tunis', 'tunisia'],
    'nairobi': ['nairobi', 'kenya', 'silicon savannah', 'westlands', 'kilimani'],
    'dakar': ['dakar', 'senegal'],
    'abidjan': ['abidjan', 'ivory coast', "côte d'ivoire"],
    'montevideo': ['montevideo', 'uruguay'],
    'medellin': ['medellín', 'medellin', 'colombia'],
    'medellín': ['medellin', 'medellín', 'colombia'],
    'guadalajara': ['guadalajara', 'gdl', 'mexico', 'jalisco'],
    'tijuana': ['tijuana', 'mexico'],
    'mexico city': ['cdmx', 'ciudad de mexico', 'ciudad de méxico', 'mexico city', 'df', 'mexico'],
    'cdmx': ['mexico city', 'ciudad de mexico', 'ciudad de méxico', 'df', 'mexico'],
    'ciudad de mexico': ['mexico city', 'cdmx', 'ciudad de méxico', 'mexico'],
    'ciudad de méxico': ['mexico city', 'cdmx', 'ciudad de mexico', 'mexico'],
    'sao paulo': ['são paulo', 'sao paulo', 'sp', 'brazil', 'brasil'],
    'são paulo': ['sao paulo', 'são paulo', 'sp', 'brazil', 'brasil'],
    'florianopolis': ['florianópolis', 'florianopolis', 'floripa', 'brazil'],
    'florianópolis': ['florianopolis', 'florianópolis', 'floripa', 'brazil'],
    'curitiba': ['curitiba', 'brazil'],
    'warsaw': ['warszawa', 'warsaw', 'poland'],
    'warszawa': ['warsaw', 'warszawa', 'poland'],
    'krakow': ['kraków', 'krakow', 'poland', 'cracow'],
    'kraków': ['krakow', 'kraków', 'poland', 'cracow'],
    'wroclaw': ['wrocław', 'wroclaw', 'poland', 'breslau'],
    'wrocław': ['wroclaw', 'wrocław', 'poland'],
    'gdansk': ['gdańsk', 'gdansk', 'poland'],
    'gdańsk': ['gdansk', 'gdańsk', 'poland'],
    'bucharest': ['bucuresti', 'bucurești', 'bucharest', 'romania'],
    'bucuresti': ['bucharest', 'bucuresti', 'romania'],
    'cluj': ['cluj-napoca', 'cluj', 'romania'],
    'cluj-napoca': ['cluj', 'cluj-napoca', 'romania'],
    'timisoara': ['timișoara', 'timisoara', 'romania'],
    'timișoara': ['timisoara', 'timișoara', 'romania'],
    'iasi': ['iași', 'iasi', 'romania'],
    'iași': ['iasi', 'iași', 'romania'],
    'brasov': ['brașov', 'brasov', 'romania'],
    'brașov': ['brasov', 'brașov', 'romania'],
    'manila': ['metro manila', 'manila', 'philippines', 'makati', 'bgc', 'taguig'],
    'metro manila': ['manila', 'metro manila', 'philippines', 'makati', 'bgc', 'taguig'],
    'bgc': ['bonifacio global city', 'bgc', 'taguig', 'manila'],
    'raipur': ['raipur', 'india', 'chhattisgarh'],
    'ranchi': ['ranchi', 'india', 'jharkhand'],
    'agra': ['agra', 'india', 'uttar pradesh'],
    'kanpur': ['kanpur', 'india', 'uttar pradesh'],
    'nashik': ['nashik', 'india', 'maharashtra'],
    'varanasi': ['varanasi', 'banaras', 'kashi', 'india'],
    'prayagraj': ['prayagraj', 'allahabad', 'india'],
    'allahabad': ['prayagraj', 'allahabad', 'india'],
    'penang': ['penang', 'george town', 'malaysia'],
    'da nang': ['da nang', 'danang', 'vietnam'],
    'danang': ['da nang', 'danang', 'vietnam'],
    'bsd city': ['bsd city', 'bsd', 'tangerang', 'indonesia'],
    'tallinn': ['tallinn', 'estonia'],
    'remote': ['worldwide', 'anywhere', 'global', 'distributed', 'telecommute', 'wfh'],
    'worldwide': ['remote', 'anywhere', 'global'],
    'anywhere': ['remote', 'worldwide', 'global'],
    'global': ['remote', 'worldwide', 'anywhere']
  };

  // Add country aliases
  for (const [key, countryObj] of Object.entries(COUNTRY_CITY_MAP)) {
    const list = Array.from(new Set([key, ...(countryObj.aliases || [])]));
    for (const name of list) {
      const lower = name.toLowerCase().trim();
      if (!aliases[lower]) aliases[lower] = [];
      for (const other of list) {
        const otherLower = other.toLowerCase().trim();
        if (otherLower !== lower && !aliases[lower].includes(otherLower)) {
          aliases[lower].push(otherLower);
        }
      }
    }
  }

  return aliases;
}

/**
 * Resolves standard 2-letter ISO country code from location string.
 */
export function resolveCountryCode(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;
  const lower = locationStr.toLowerCase().trim();

  // Direct code match
  for (const country of Object.values(COUNTRY_CITY_MAP)) {
    if (country.code && country.code === lower) return country.code;
    if (country.aliases && country.aliases.includes(lower)) return country.code;
    if (country.countryName.toLowerCase() === lower) return country.code;
    // Check if any city in country is contained in the string
    for (const city of country.cities) {
      if (city.toLowerCase() === lower || lower.includes(city.toLowerCase())) {
        return country.code;
      }
    }
  }

  return null;
}

/**
 * Checks if a candidate's location qualifies under a regional boundary
 * (e.g. India or Singapore for 'asia_pacific', Germany or UK for 'europe').
 */
export function isLocationInRegion(candidateLocStr, regionKey) {
  if (!candidateLocStr || !regionKey) return false;
  const lowerCand = candidateLocStr.toLowerCase().trim();
  const lowerRegion = regionKey.toLowerCase().trim();

  // If candidate explicitly specified the regional market name (e.g. 'asia_pacific', 'europe', 'americas')
  if (lowerCand === lowerRegion || lowerCand.includes(lowerRegion)) {
    return true;
  }

  const checkCountry = (countryObj) => {
    if (!countryObj) return false;
    const countryNameLower = countryObj.countryName.toLowerCase();
    if (new RegExp(`\\b${escapeRegex(countryNameLower)}\\b`, 'i').test(lowerCand)) return true;
    if (countryObj.aliases) {
      for (const a of countryObj.aliases) {
        if (new RegExp(`\\b${escapeRegex(a)}\\b`, 'i').test(lowerCand)) return true;
      }
    }
    if (countryObj.cities) {
      for (const c of countryObj.cities) {
        if (new RegExp(`\\b${escapeRegex(c.toLowerCase())}\\b`, 'i').test(lowerCand)) return true;
      }
    }
    return false;
  };

  // If regionKey directly matches a country key, code, or alias (e.g. 'us', 'uk', 'india', 'singapore', 'germany')
  for (const [key, countryObj] of Object.entries(COUNTRY_CITY_MAP)) {
    if (key === lowerRegion || countryObj.code === lowerRegion || (countryObj.aliases && countryObj.aliases.includes(lowerRegion))) {
      if (checkCountry(countryObj)) return true;
    }
  }

  // Check regional member countries (e.g. 'europe', 'asia_pacific', 'americas', 'latin_america')
  const memberCountries = REGIONAL_MARKET_MAP[lowerRegion] || [];
  for (const countryKey of memberCountries) {
    const country = COUNTRY_CITY_MAP[countryKey];
    if (checkCountry(country)) return true;
  }

  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMPILED_ALIASES = getGlobalLocationAliases();

/**
 * Matches job location string against target location using alias expansion and word boundary rules.
 */
export function matchLocationString(jobLoc, targetLoc) {
  const cleanJob = (jobLoc || '').toLowerCase().trim();
  const cleanTarget = (targetLoc || '').toLowerCase().trim();
  if (!cleanJob || !cleanTarget) return false;

  // Handle explicit 2-letter ISO country code 'in' for India safely
  if (cleanTarget === 'in') {
    return /(?:,\s*|\()IN(?:$|\s*,|\))/i.test(jobLoc || '') &&
      !/\b(?:remote\s+in|based\s+in|located\s+in|working\s+in|office\s+in|jobs?\s+in)\b/i.test(jobLoc || '');
  }

  const candidatePatterns = [cleanTarget];
  if (COMPILED_ALIASES[cleanTarget]) {
    candidatePatterns.push(...COMPILED_ALIASES[cleanTarget]);
  }

  for (const pat of candidatePatterns) {
    if (pat === 'in') {
      if (/(?:,\s*|\()IN(?:$|\s*,|\))/i.test(jobLoc || '') &&
        !/\b(?:remote\s+in|based\s+in|located\s+in|working\s+in|office\s+in|jobs?\s+in)\b/i.test(jobLoc || '')) {
        return true;
      }
      continue;
    }
    if (pat.length <= 3) {
      const regex = new RegExp(`\\b${escapeRegex(pat)}\\b`, 'i');
      if (regex.test(cleanJob)) return true;
    } else {
      if (cleanJob.includes(pat)) return true;
    }
  }
  return false;
}
