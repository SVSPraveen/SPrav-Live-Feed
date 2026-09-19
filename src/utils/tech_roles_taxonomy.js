/**
 * tech_roles_taxonomy.js
 * =======================
 * Comprehensive tech roles taxonomy and algorithmic seniority classifier.
 * Covers 18 tech domains, 350+ specialized role titles, campus fresher roles,
 * game development, edtech/LMS, semiconductor/VLSI, and contract/seniority detection.
 *
 * Pure JavaScript - zero UI/framework dependencies. Safe for Node.js, Vite, and workers.
 */

export const ROLE_DOMAINS = {
  "junior_entry": {
    domainName: "Junior, Fresher & Entry-Level Roles",
    badge: "🎓",
    aliases: [
      "junior", "jr", "entry", "entry-level", "associate", "intern", "internship",
      "graduate", "fresher", "freshers", "new grad", "trainee", "get", "co-op", "apprentice", "campus"
    ],
    roles: [
      "Software Engineering Intern",
      "AI / ML Intern",
      "Data Science Intern",
      "Graduate Software Engineer",
      "Graduate Engineer Trainee (GET)",
      "Trainee Software Engineer",
      "Software Engineering Co-Op",
      "Entry-Level Software Engineer",
      "New Grad Software Developer",
      "Campus Hire - Software Developer",
      "Junior Software Engineer",
      "Junior AI Engineer",
      "Junior Machine Learning Engineer",
      "Junior Data Scientist",
      "Junior Data Engineer",
      "Junior Backend Developer",
      "Junior Frontend Developer",
      "Junior Full Stack Developer",
      "Junior Cloud Engineer",
      "Junior DevOps Engineer",
      "Junior QA Automation Engineer",
      "Junior Security Analyst",
      "Junior SOC Analyst (Tier 1)",
      "Junior Game Developer",
      "Junior Unity Developer",
      "Junior Unreal Engine Developer",
      "Junior VLSI Engineer",
      "Junior Instructional Designer",
      "Associate Software Engineer",
      "Associate AI Engineer",
      "Associate Data Engineer",
      "Associate Product Manager",
      "Associate DevOps Engineer",
      "Associate QA Engineer",
      "Associate Technical Account Manager",
      "Graduate Technical Consultant",
      "Tech Apprentice / Software Apprentice",
      "Junior Web Developer",
      "Junior Cloud Support / NOC Engineer",
      "Junior Technical Support Engineer",
      "Junior Implementation Engineer",
      "Junior Systems / Desktop Support Engineer",
      "Junior Technical Writer",
      "Technical Writing Intern",
      "Junior AI Safety & Red Teaming Analyst",
      "Quantum Computing Intern",
      "Associate FinOps Engineer",
      "Associate UX Researcher",
      "UX Research Intern",
      "Junior Full Stack AI Engineer",
      "Junior Agentic AI Developer",
      "Junior Cloud / GPU Infrastructure Engineer"
    ]
  },
  "mid_level": {
    domainName: "Mid-Level Engineering & Core Roles",
    badge: "🚀",
    aliases: ["mid", "intermediate", "sde 2", "sde ii", "swe ii", "software engineer"],
    roles: [
      "Software Engineer",
      "Software Development Engineer (SDE II)",
      "Full Stack Developer",
      "Full Stack AI Engineer",
      "Local-First Software Engineer",
      "Backend Developer",
      "Frontend Developer",
      "AI Engineer",
      "Agentic AI Developer",
      "Machine Learning Engineer",
      "AI Safety Engineer",
      "AI Red Teaming Engineer",
      "Forward Deployed Engineer (FDE)",
      "GPU Cloud Infrastructure Engineer",
      "Spatial Computing Developer",
      "Quantum Computing Engineer",
      "Quantum Software Engineer",
      "FinOps Engineer",
      "UX Researcher",
      "Technical Writer",
      "Developer Documentation Engineer",
      "Data Engineer",
      "Data Scientist",
      "DevOps Engineer",
      "Cloud Engineer",
      "Site Reliability Engineer (SRE)",
      "Mobile Developer (iOS/Android)",
      "QA Automation Engineer",
      "Security Engineer",
      "Systems Engineer",
      "Game Developer",
      "Unity Developer",
      "Unreal Engine Developer",
      "Graphics Programmer",
      "Instructional Design Engineer",
      "Technical Customer Success Engineer",
      "VLSI Design Engineer",
      "RTL Design Engineer"
    ]
  },
  "senior_lead": {
    domainName: "Senior & Lead Engineering Roles",
    badge: "⭐",
    aliases: ["senior", "sr", "sr.", "lead", "team lead", "tech lead", "sde 3", "sde iii"],
    roles: [
      "Senior AI Engineer",
      "Senior Agentic AI Developer",
      "Senior Machine Learning Engineer",
      "Senior AI Safety Engineer",
      "Lead AI Red Teaming Engineer",
      "Senior Full Stack AI Engineer",
      "Senior Forward Deployed Engineer (FDE)",
      "Senior GPU Infrastructure Engineer",
      "Senior LLM Inference Engineer",
      "Senior Quantum Computing Engineer",
      "Senior Quantum Software Engineer",
      "Senior FinOps Engineer",
      "Cloud FinOps Architect",
      "Senior UX Researcher",
      "Lead UX Researcher",
      "Senior Technical Writer",
      "Lead Technical Writer",
      "Senior Software Engineer",
      "Senior Backend Engineer",
      "Senior Frontend Engineer",
      "Senior Full Stack Engineer",
      "Senior Data Scientist",
      "Senior Data Engineer",
      "Senior DevOps Engineer",
      "Senior Cloud Architect",
      "Senior Security Engineer",
      "Senior SDET",
      "Senior Platform Engineer",
      "Senior Infrastructure Engineer",
      "Senior Systems Engineer",
      "Senior Game Developer",
      "Senior Unreal Developer",
      "Senior Graphics Programmer",
      "Senior Instructional Designer",
      "Senior Technical Customer Success Engineer",
      "Senior VLSI Engineer",
      "Senior RTL Design Engineer",
      "Lead Hardware Engineer",
      "Lead AI Engineer",
      "Lead Software Engineer",
      "Lead Backend Engineer",
      "Lead Data Engineer",
      "Lead Data Scientist",
      "Lead DevOps Engineer",
      "Tech Lead",
      "Engineering Team Lead",
      "Technical Lead Architect"
    ]
  },
  "staff_principal": {
    domainName: "Staff, Principal & Executive Architecture Roles",
    badge: "🏛️",
    aliases: ["staff", "principal", "distinguished", "architect", "fellow", "director", "vp", "head", "cto"],
    roles: [
      "Staff AI Engineer",
      "Staff Machine Learning Engineer",
      "Staff Software Engineer",
      "Staff Backend Engineer",
      "Staff Full Stack Engineer",
      "Staff Data Engineer",
      "Staff Platform Engineer",
      "Staff Infrastructure Engineer",
      "Staff Forward Deployed Engineer",
      "Senior Staff Engineer",
      "Principal AI Scientist",
      "Principal AI Systems Architect",
      "Principal GPU Infrastructure Architect",
      "Principal Distributed Systems Architect",
      "Principal AI Safety & Alignment Architect",
      "Principal Quantum Architect",
      "Principal Cloud FinOps Architect",
      "Principal UX Researcher",
      "Staff UX Researcher",
      "Principal Technical Writer",
      "Staff Technical Writer",
      "Principal Software Engineer",
      "Principal Machine Learning Engineer",
      "Principal Data Architect",
      "Principal Cloud Solutions Architect",
      "Principal Graphics Architect",
      "Principal Silicon Architect",
      "Principal Customer Solutions Architect",
      "Technical Director (Games)",
      "Distinguished Engineer",
      "Enterprise Solutions Architect",
      "Director of Engineering",
      "Director of AI / Machine Learning",
      "Head of AI",
      "Head of Engineering",
      "VP of Engineering",
      "Chief Technology Officer (CTO)",
      "Chief AI Officer (CAIO)"
    ]
  },
  "ai_ml": {
    domainName: "Artificial Intelligence, LLM & Machine Learning",
    badge: "🤖",
    aliases: [
      "ai", "ml", "artificial intelligence", "machine learning", "genai", "generative ai", "llm", "rag", "nlp", "deep learning",
      "computer vision", "mlops", "agentic ai", "ai agent", "ai agents", "agentic", "inference", "llmops", "ai safety",
      "red teaming", "red team", "ai red team", "model safety", "ai alignment"
    ],
    roles: [
      "AI Engineer",
      "Machine Learning Engineer",
      "Generative AI Engineer",
      "LLM Engineer",
      "Agentic AI Developer",
      "AI Agent Systems Engineer",
      "LLM Inference Optimization Engineer",
      "Foundation Model Post-Training Engineer",
      "Forward Deployed AI Engineer",
      "AI Gateway & LLMOps Architect",
      "AI Safety Engineer",
      "AI Red Teaming Engineer",
      "AI Alignment & Safety Researcher",
      "LLM Red Teamer",
      "Model Evaluation & Safety Engineer",
      "MLOps Engineer",
      "AI Research Scientist",
      "Deep Learning Engineer",
      "NLP Engineer",
      "Computer Vision Engineer",
      "Applied AI Scientist",
      "Prompt Engineer",
      "AI Solutions Architect",
      "AI Agent Developer",
      "RAG Specialist",
      "Autonomous Systems Engineer",
      "Robotics Engineer",
      "Physical AI / Embodied Robotics Engineer",
      "Speech & Audio AI Engineer",
      "Multimodal AI Engineer",
      "Synthetic Data Engineer",
      "Small Language Model (SLM) & Edge AI Engineer",
      "Generative AI Solutions Architect",
      "Foundation Model Researcher",
      "AI Ethics & Safety Researcher"
    ]
  },
  "full_stack": {
    domainName: "Full Stack & Core Software Engineering",
    badge: "💻",
    aliases: ["full stack", "fullstack", "software engineer", "sde", "swe", "developer", "software developer", "local-first", "local first"],
    roles: [
      "Full Stack Developer",
      "Full Stack Engineer",
      "Full Stack AI Engineer",
      "Full Stack AI Developer",
      "Local-First Software Engineer",
      "Software Development Engineer (SDE I)",
      "Software Development Engineer (SDE II)",
      "Software Development Engineer (SDE III)",
      "Software Engineer",
      "Core Software Engineer",
      "Web Developer",
      "Application Developer",
      "Distributed Systems Engineer",
      "Core Platform Engineer",
      "Microservices Developer",
      "SaaS Application Developer"
    ]
  },
  "backend": {
    domainName: "Backend & Systems Development",
    badge: "⚙️",
    aliases: ["backend", "back end", "back-end", "python", "java", "golang", "go", "node", "nodejs", "c++", "rust", "zig", "c#", ".net", "api", "microservices"],
    roles: [
      "Backend Engineer",
      "Backend Developer",
      "Systems Software Engineer (Rust / Go / Zig)",
      "Low-Latency C++ Systems Engineer",
      "Python Backend Engineer",
      "Java Backend Engineer",
      "Spring Boot Developer",
      "Golang Developer",
      "Node.js Backend Developer",
      "C++ Systems Engineer",
      "Rust Systems Engineer",
      ".NET / C# Backend Developer",
      "Ruby on Rails Developer",
      "PHP / Laravel Developer",
      "API & Microservices Engineer",
      "Distributed Systems Engineer",
      "High Performance Computing (HPC) Engineer",
      "High-Performance Distributed Systems Engineer",
      "Async & Event-Driven Systems Engineer",
      "Linux Kernel Engineer",
      "Database Kernel Developer",
      "Distributed Database Engineer"
    ]
  },
  "frontend_mobile": {
    domainName: "Frontend, UI & Mobile Engineering",
    badge: "🎨",
    aliases: ["frontend", "front end", "front-end", "react", "nextjs", "next.js", "vue", "angular", "javascript", "typescript", "mobile", "ios", "android", "flutter", "react native", "ui", "ux", "uxr", "ux research", "user research"],
    roles: [
      "Frontend Engineer",
      "Frontend Developer",
      "React Developer",
      "Next.js Developer",
      "TypeScript Frontend Engineer",
      "Vue.js Developer",
      "Angular Developer",
      "Svelte Developer",
      "Web Performance Engineer",
      "Mobile Application Engineer",
      "iOS Developer (Swift)",
      "Android Developer (Kotlin)",
      "Flutter Developer",
      "React Native Developer",
      "Cross-Platform Mobile Engineer",
      "UI/UX Engineer",
      "UX Researcher",
      "Design Researcher",
      "Design Systems Engineer",
      "Creative Technologist"
    ]
  },
  "data_analytics": {
    domainName: "Data Engineering, Science & Analytics",
    badge: "📊",
    aliases: ["data", "data engineer", "data scientist", "analytics", "bi", "business intelligence", "sql", "big data", "etl", "spark", "dba", "database"],
    roles: [
      "Data Engineer",
      "Senior Data Engineer",
      "Big Data Engineer",
      "Analytics Engineer",
      "Data Scientist",
      "Business Intelligence (BI) Developer",
      "BI Analyst",
      "Data Analyst",
      "Quantitative Researcher",
      "Quantitative Analyst (Quant)",
      "Database Administrator (DBA)",
      "Data Warehouse Architect",
      "ETL Pipeline Developer",
      "Spark / Hadoop Engineer",
      "Kafka Streaming Engineer",
      "Master Data Management Specialist"
    ]
  },
  "devops_cloud": {
    domainName: "Cloud, DevOps, Platform & SRE",
    badge: "☁️",
    aliases: [
      "devops", "cloud", "sre", "site reliability", "platform", "infrastructure", "aws", "azure", "gcp",
      "kubernetes", "k8s", "docker", "terraform", "finops", "cloud cost", "cost optimization", "cloud economics",
      "gpu infra", "gpu infrastructure", "ai cluster", "idp", "internal developer platform", "platform engineering"
    ],
    roles: [
      "DevOps Engineer",
      "Cloud Engineer",
      "Site Reliability Engineer (SRE)",
      "Platform Engineer",
      "Infrastructure Engineer",
      "GPU Cloud Infrastructure Engineer",
      "AI Cluster Reliability Engineer",
      "Internal Developer Platform (IDP) Engineer",
      "Kubernetes Control Plane Engineer",
      "FinOps Engineer",
      "Senior FinOps Engineer",
      "Cloud FinOps Architect",
      "Cloud Cost Optimization Engineer",
      "FinOps Practitioner",
      "Cloud Solutions Architect",
      "AWS Cloud Architect",
      "Azure Cloud Architect",
      "GCP Cloud Architect",
      "Kubernetes / Container Specialist",
      "Terraform / IaC Engineer",
      "Build & Release Engineer",
      "Linux Systems Administrator",
      "FinOps / Cloud Cost Engineer",
      "Observability & Monitoring Engineer"
    ]
  },
  "cybersecurity": {
    domainName: "Cybersecurity, InfoSec & DevSecOps",
    badge: "🛡️",
    aliases: [
      "security", "cyber", "cybersecurity", "infosec", "soc", "penetration", "pentest",
      "devsecops", "threat", "appsec", "siem", "splunk", "wireshark", "owasp", "firewall",
      "incident response", "vulnerability", "iam", "zero trust", "ai red teaming", "red team", "red teaming",
      "post-quantum", "pqc", "hardware security", "icam", "detection and response"
    ],
    roles: [
      "Security Engineer",
      "Cybersecurity Analyst",
      "DevSecOps Engineer",
      "Application Security (AppSec) Engineer",
      "Cloud Security Detection & Response Engineer",
      "Identity Credential & Access Management (ICAM) Engineer",
      "Hardware Security & Post-Quantum Cryptography Engineer",
      "Zero Trust Security Architect",
      "AI Security & Red Teaming Engineer",
      "Adversarial AI Security Analyst",
      "Penetration Tester / Ethical Hacker",
      "SOC Analyst",
      "Cloud Security Engineer",
      "Information Security Specialist",
      "Threat Intelligence Researcher",
      "Cryptography Engineer",
      "Vulnerability Assessment Specialist",
      "IAM (Identity & Access) Engineer",
      "Incident Response Specialist"
    ]
  },
  "qa_testing": {
    domainName: "QA, SDET & Automated Testing",
    badge: "🧪",
    aliases: ["qa", "sdet", "test automation", "qa automation", "quality assurance", "tester", "selenium", "cypress", "playwright"],
    roles: [
      "QA Automation Engineer",
      "Software Development Engineer in Test (SDET)",
      "Quality Assurance Engineer",
      "Test Automation Specialist",
      "Performance & Load Test Engineer",
      "Playwright Automation Engineer",
      "Cypress Automation Engineer",
      "Selenium Automation Specialist",
      "Mobile QA Engineer",
      "Manual QA Tester",
      "Security Test Engineer"
    ]
  },
  "product_management": {
    domainName: "Product Management, Solutions & Customer Success",
    badge: "🎯",
    aliases: [
      "product manager", "pm", "tpm", "program manager", "project manager", "scrum", "agile", "engineering manager",
      "customer success", "tcse", "tam", "customer solutions", "implementation", "technical account manager", "client solutions",
      "ux research", "uxr", "user research", "design research", "ux researcher",
      "fde", "forward deployed", "forward deployed engineer", "ai product engineer"
    ],
    roles: [
      "Technical Customer Success Engineer (TCSE)",
      "Senior Technical Customer Success Engineer",
      "Customer Solutions Engineer",
      "Customer Success Architect",
      "Technical Account Manager (TAM)",
      "Senior Technical Account Manager",
      "Implementation Engineer",
      "Forward Deployed Engineer (FDE)",
      "Forward Deployed AI Engineer",
      "AI Product Engineer",
      "Product Manager",
      "Technical Product Manager (TPM)",
      "Technical Program Manager",
      "AI Product Manager",
      "Growth Product Manager",
      "Engineering Manager",
      "UX Researcher",
      "Senior UX Researcher",
      "Lead UX Researcher",
      "Staff UX Researcher",
      "Quantitative UX Researcher",
      "Qualitative UX Researcher",
      "Design Researcher",
      "Scrum Master / Agile Coach",
      "Solutions Architect",
      "Enterprise Architect",
      "Developer Advocate / DevRel",
      "Pre-Sales Solutions Engineer",
      "Product Operations Manager"
    ]
  },
  "embedded_hardware": {
    domainName: "Semiconductor, VLSI, Quantum & Hardware Engineering",
    badge: "⚡",
    aliases: [
      "embedded", "firmware", "iot", "hardware", "fpga", "asic", "robotics", "rtos",
      "vlsi", "rtl", "silicon", "semiconductor", "verilog", "systemverilog", "physical design",
      "dft", "soc", "eda", "board design", "pcb", "microelectronics", "analog", "mixed signal",
      "quantum", "quantum computing", "qiskit", "quantum algorithm",
      "npu", "tpu", "accelerator", "ai accelerator", "chiplet", "advanced packaging", "risc-v", "serdes", "adas"
    ],
    roles: [
      "VLSI Design Engineer",
      "Senior VLSI Engineer",
      "RTL Design Engineer",
      "ASIC Design Engineer",
      "ASIC Verification Engineer (UVM / SystemVerilog)",
      "Physical Design Engineer (PD)",
      "Silicon Validation & Bring-Up Engineer",
      "AI Accelerator Hardware Architect (NPU / TPU)",
      "Chiplet & Advanced Packaging Design Engineer",
      "RISC-V Architecture Engineer",
      "High-Speed SerDes & Interconnect Engineer",
      "Automotive Embedded & ADAS Systems Engineer",
      "Design for Testability (DFT) Engineer",
      "SoC Architecture Engineer",
      "Analog & Mixed-Signal IC Design Engineer",
      "Quantum Computing Engineer",
      "Quantum Software Engineer",
      "Quantum Algorithm Researcher",
      "Quantum Hardware Engineer",
      "Cryogenic Quantum Systems Engineer",
      "FPGA Engineer",
      "FPGA / ASIC Design Specialist",
      "Hardware Board / PCB Design Engineer",
      "Signal & Power Integrity Engineer",
      "Embedded Software Engineer",
      "Firmware Engineer",
      "RTOS Systems Developer",
      "IoT Systems Engineer",
      "Automotive Embedded Software Engineer",
      "Robotics Hardware Engineer",
      "Wireless & RF Systems Engineer"
    ]
  },
  "game_development": {
    domainName: "Game Development, XR & Computer Graphics",
    badge: "🎮",
    aliases: [
      "game", "games", "gaming", "game dev", "gamedev", "unity", "unity3d", "unreal", "unreal engine",
      "ue4", "ue5", "graphics", "shader", "shaders", "rendering", "gameplay", "xr", "ar", "vr", "directx", "opengl", "vulkan",
      "spatial", "spatial computing", "visionos", "realitykit", "webgpu", "nanite", "lumen", "game physics"
    ],
    roles: [
      "Game Developer",
      "Gameplay Programmer",
      "Spatial Computing Developer (visionOS / RealityKit)",
      "WebGPU Engine Programmer",
      "Unreal Engine 5 Nanite & Lumen Technical Artist",
      "Physics & Collision Engine Programmer",
      "Unity Developer",
      "Unity 3D Game Engineer",
      "Unreal Engine Developer",
      "Unreal Engine Gameplay Programmer",
      "Graphics Programmer",
      "3D Rendering Engineer",
      "Game Engine Developer",
      "Technical Artist (Tech Art)",
      "Shaders & VFX Engineer",
      "AR / VR / XR Developer",
      "Physics Programmer (Games)",
      "Game Audio & Sound Systems Engineer",
      "Multiplayer & Network Game Programmer",
      "Mobile Game Developer"
    ]
  },
  "edtech_lms": {
    domainName: "EdTech, Instructional Design & Learning Systems",
    badge: "📚",
    aliases: [
      "edtech", "ed-tech", "lms", "instructional design", "instructional designer",
      "elearning", "e-learning", "learning experience", "lxd", "curriculum", "scorm", "xapi", "canvas", "moodle"
    ],
    roles: [
      "Instructional Design Engineer",
      "Instructional Designer",
      "Senior Instructional Designer",
      "Learning Experience Designer (LXD)",
      "LMS Systems Architect",
      "LMS Administrator / Engineer",
      "EdTech Full Stack Developer",
      "Curriculum Technologist",
      "Interactive E-Learning Content Developer",
      "SCORM / xAPI Integration Specialist",
      "Educational Simulation Developer",
      "EdTech Product Specialist"
    ]
  },
  "web3_blockchain": {
    domainName: "Blockchain, Web3 & Cryptography",
    badge: "🔗",
    aliases: ["web3", "blockchain", "solidity", "smart contract", "crypto", "defi", "ethereum"],
    roles: [
      "Blockchain Engineer",
      "Smart Contract Developer",
      "Solidity Developer",
      "Web3 Full Stack Developer",
      "Smart Contract Auditor",
      "Protocol Engineer",
      "Cryptographic Protocol Engineer",
      "DeFi Developer",
      "Zero Knowledge (ZK) Proof Engineer"
    ]
  },
  "technical_writing": {
    domainName: "Technical Writing & Developer Documentation",
    badge: "📝",
    aliases: [
      "technical writing", "tech writing", "tech writer", "technical writer", "documentation",
      "docs engineer", "developer documentation", "api documentation", "information architect",
      "technical content", "content engineer", "knowledge base", "dx writer"
    ],
    roles: [
      "Technical Writer",
      "Developer Documentation Engineer",
      "API Documentation Specialist",
      "Senior Technical Writer",
      "Staff Technical Writer",
      "Lead Technical Writer",
      "Principal Technical Writer",
      "Software Documentation Specialist",
      "Information Architect",
      "Technical Content Engineer",
      "Developer Experience (DX) Technical Writer",
      "Cloud Infrastructure Technical Writer",
      "Open Source Documentation Specialist",
      "Documentation Platform Engineer",
      "SDK & Code Sample Writer",
      "Junior Technical Writer",
      "Technical Writing Intern"
    ]
  }
};

export const ALL_TECH_ROLES = Array.from(
  new Set(Object.values(ROLE_DOMAINS).flatMap(d => d.roles))
);

/**
 * Classifies the seniority tier and contract type of a job listing based on title and description.
 *
 * @param {string} title
 * @param {string} [description='']
 * @returns {{ level: 'fresher' | 'entry' | 'mid' | 'senior' | 'staff_exec', isInternship: boolean, isContract: boolean }}
 */
export function classifySeniority(title = '', description = '') {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const combined = `${t} ${d}`;

  // 1. Contract checks
  const isContract = /\b(contract|contractor|c2c|corp-to-corp|corp 2 corp|1099|w2 contract|freelance|temp|temporary)\b/i.test(combined);

  // 2. Internship & Fresher checks
  const isInternship = /\b(intern|internship|co-op|coop|apprentice|apprenticeship)\b/i.test(t) ||
    (/\b(intern|internship)\b/i.test(combined) && !/\b(manage|mentor) interns\b/i.test(combined));

  const isFresherTitle = /\b(fresher|freshers|trainee|graduate engineer trainee|get|campus hire|new grad|entry level|entry-level)\b/i.test(t);

  // 3. Staff & Executive / Leadership checks
  const isStaffExec = /\b(staff|principal|distinguished|director|head of|vp|vice president|chief|fellow|fellow engineer|enterprise architect)\b/i.test(t);

  // 4. Senior & Lead checks
  const isSeniorLead = /\b(senior|sr\.?|lead|team lead|tech lead|sde 3|sde iii|sde-3|sde-iii|level 3|iii)\b/i.test(t);

  // 5. Junior & Associate checks
  const isJuniorEntry = /\b(junior|jr\.?|associate|sde 1|sde i|sde-1|sde-i|level 1|i)\b/i.test(t);

  // Precedence order:
  // Staff/Exec > Senior/Lead > Fresher/Intern > Junior/Associate > Mid
  if (isStaffExec) {
    return { level: 'staff_exec', isInternship: false, isContract };
  }
  if (isSeniorLead) {
    return { level: 'senior', isInternship: false, isContract };
  }
  if (isInternship || isFresherTitle) {
    return { level: 'fresher', isInternship: isInternship || isFresherTitle, isContract };
  }
  if (isJuniorEntry) {
    return { level: 'entry', isInternship: false, isContract };
  }

  return { level: 'mid', isInternship: false, isContract };
}

/**
 * Normalizes common tech slang, abbreviations, and shorthand into clean search tokens.
 * E.g. "ai engg" -> "ai engineer", "sec engg" -> "security engineer", "dev" -> "developer"
 *
 * @param {string} term
 * @returns {string}
 */
export function normalizeRoleSearchTerm(term = '') {
  if (!term || typeof term !== 'string') return '';
  return term
    .toLowerCase()
    .replace(/[._\-\\/,;|()[\]{}]/g, ' ')
    .trim()
    .replace(/\bsoftare\b/g, 'software')
    .replace(/\baiml\b/g, 'ai machine learning')
    .replace(/\bai\/ml\b/g, 'ai machine learning')
    .replace(/\bspatial dev(eloper)?\b/g, 'spatial computing developer')
    .replace(/\bagentic ai (dev(eloper)?|engg?|engineer)?\b/g, 'agentic ai developer')
    .replace(/\bgpu infra\b/g, 'gpu infrastructure')
    .replace(/\bfde\b/g, 'forward deployed engineer')
    .replace(/\bengg?\b/g, 'engineer')
    .replace(/\bdevs?\b/g, 'developer')
    .replace(/\bsec\b/g, 'security')
    .replace(/\binfosec\b/g, 'information security')
    .replace(/\bsde\b/g, 'software engineer')
    .replace(/\bswe\b/g, 'software engineer')
    .replace(/\bsre\b/g, 'site reliability engineer')
    .replace(/\bml\b/g, 'machine learning')
    .replace(/\bfullstack\b/g, 'full stack')
    .replace(/\bfrontend\b/g, 'front end')
    .replace(/\bbackend\b/g, 'back end')
    .replace(/\bk8s\b/g, 'kubernetes')
    .replace(/\bqa\b/g, 'quality assurance')
    .replace(/\bsdet\b/g, 'software development engineer in test')
    .replace(/\bpm\b/g, 'product manager')
    .replace(/\btpm\b/g, 'technical product manager')
    .replace(/\btam\b/g, 'technical account manager')
    .replace(/\btcse\b/g, 'technical customer success engineer')
    .replace(/\bhw\b/g, 'hardware')
    .replace(/\bfw\b/g, 'firmware')
    .replace(/\bfin ops\b/g, 'finops')
    .replace(/\bred team(ing)?\b/g, 'red teaming')
    .replace(/\buxr\b/g, 'ux researcher')
    .replace(/\buser research(er)?\b/g, 'ux researcher')
    .replace(/\btech writer\b/g, 'technical writer')
    .replace(/\bdocs? eng(ineer)?\b/g, 'documentation engineer')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapes regex special characters to prevent ReDoS or syntax errors on special characters (like c++).
 */
function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Expands any user role query or extracted title into canonical search variants and synonyms
 * across all 17 tech domains in ROLE_DOMAINS.
 *
 * E.g. "ai engg" -> ['ai engg', 'ai engineer', 'machine learning engineer', 'generative ai', 'llm engineer', 'ai', 'artificial intelligence']
 * E.g. "sec engg" -> ['sec engg', 'security engineer', 'cybersecurity analyst', 'cloud security', 'appsec', 'infosec', 'soc analyst']
 * E.g. "cloud engg" -> ['cloud engg', 'cloud engineer', 'devops engineer', 'site reliability engineer', 'sre', 'platform engineer']
 *
 * @param {string|Object} role
 * @returns {string[]} Array of search variants
 */
export function expandRoleSearchVariants(role = '') {
  const raw = (typeof role === 'string' ? role : role?.keyword || '').toLowerCase().trim();
  if (!raw) return [];

  const normalized = normalizeRoleSearchTerm(raw);
  const variants = new Set([raw, normalized]);

  // Match against domain aliases in ROLE_DOMAINS to expand domain-specific canonical titles
  for (const [domainKey, domain] of Object.entries(ROLE_DOMAINS)) {
    // Ignore purely seniority-based domains for domain matching
    if (['junior_entry', 'mid_level', 'senior_lead', 'staff_principal'].includes(domainKey)) continue;

    const matchesDomain = (domain.aliases || []).some(alias => {
      const a = alias.toLowerCase();
      return raw.includes(a) || normalized.includes(a);
    });

    if (matchesDomain) {
      // Add top canonical role titles for this domain (lower-cased)
      (domain.roles || []).slice(0, 8).forEach(r => {
        variants.add(r.toLowerCase());
      });

      // Add aliases
      (domain.aliases || []).slice(0, 5).forEach(a => {
        if (a.length > 2) variants.add(a.toLowerCase());
      });
    }
  }

  // Common cross-domain expansions
  if (/\b(ai|artificial intelligence|ml|machine learning)\b/i.test(raw) || /\b(ai|artificial intelligence|ml|machine learning)\b/i.test(normalized)) {
    variants.add('ai engineer');
    variants.add('machine learning engineer');
    variants.add('artificial intelligence engineer');
    variants.add('machine learning');
    variants.add('ml engineer');
    variants.add('generative ai');
    variants.add('llm engineer');
    variants.add('ai infrastructure engineer');
    variants.add('ai systems engineer');
    variants.add('ai platform engineer');
    variants.add('ai software engineer');
  }

  if (/\b(cloud|devops|sre|platform)\b/i.test(raw) || /\b(cloud|devops|sre|platform)\b/i.test(normalized)) {
    variants.add('cloud engineer');
    variants.add('devops engineer');
    variants.add('site reliability engineer');
    variants.add('sre');
    variants.add('platform engineer');
  }

  if (/\b(security|cyber|infosec|soc|appsec)\b/i.test(raw) || /\b(security|cyber|infosec|soc|appsec)\b/i.test(normalized)) {
    variants.add('security engineer');
    variants.add('cybersecurity engineer');
    variants.add('cybersecurity');
    variants.add('cloud security');
    variants.add('appsec');
    variants.add('information security');
    variants.add('information security engineer');
  }

  if (/\b(data|analytics|bi)\b/i.test(raw) || /\b(data|analytics|bi)\b/i.test(normalized)) {
    variants.add('data engineer');
    variants.add('data scientist');
    variants.add('analytics engineer');
    variants.add('bi developer');
  }

  if (/\b(backend|back end)\b/i.test(raw) || /\b(backend|back end)\b/i.test(normalized)) {
    variants.add('backend engineer');
    variants.add('backend developer');
    variants.add('software engineer');
  }

  if (/\b(frontend|front end|ui)\b/i.test(raw) || /\b(frontend|front end|ui)\b/i.test(normalized)) {
    variants.add('frontend engineer');
    variants.add('frontend developer');
    variants.add('react developer');
  }

  if (/\b(mobile|ios|android|swift|kotlin|react native|flutter)\b/i.test(raw) || /\b(mobile|ios|android|swift|kotlin|react native|flutter)\b/i.test(normalized)) {
    variants.add('mobile engineer');
    variants.add('mobile developer');
    variants.add('mobile application developer');
    variants.add('ios engineer');
    variants.add('ios developer');
    variants.add('android engineer');
    variants.add('android developer');
    variants.add('react native engineer');
    variants.add('react native developer');
    variants.add('flutter developer');
  }

  if (/\b(full stack|fullstack)\b/i.test(raw) || /\b(full stack|fullstack)\b/i.test(normalized)) {
    variants.add('full stack engineer');
    variants.add('full stack developer');
    variants.add('software engineer');
  }

  if (/\b(qa|sdet|quality assurance|test automation|testing|tester)\b/i.test(raw) || /\b(qa|sdet|quality assurance|test automation|testing|tester)\b/i.test(normalized)) {
    variants.add('qa automation engineer');
    variants.add('software development engineer in test');
    variants.add('sdet');
    variants.add('quality assurance engineer');
    variants.add('test automation specialist');
    variants.add('qa engineer');
  }

  if (/\b(embedded|firmware|hardware|vlsi|rtl|asic|fpga|semiconductor|silicon)\b/i.test(raw) || /\b(embedded|firmware|hardware|vlsi|rtl|asic|fpga|semiconductor|silicon)\b/i.test(normalized)) {
    variants.add('embedded systems engineer');
    variants.add('firmware engineer');
    variants.add('vlsi design engineer');
    variants.add('rtl design engineer');
    variants.add('asic verification engineer');
    variants.add('fpga engineer');
    variants.add('hardware engineer');
  }

  if (/\b(game|gaming|unity|unreal|graphics programmer|rendering|shader)\b/i.test(raw) || /\b(game|gaming|unity|unreal|graphics programmer|rendering|shader)\b/i.test(normalized)) {
    variants.add('game developer');
    variants.add('unity developer');
    variants.add('unity 3d developer');
    variants.add('unreal engine developer');
    variants.add('graphics programmer');
    variants.add('graphics software engineer');
    variants.add('gameplay programmer');
    variants.add('3d rendering engineer');
  }

  if (/\b(web3|blockchain|solidity|crypto|defi|smart contract)\b/i.test(raw) || /\b(web3|blockchain|solidity|crypto|defi|smart contract)\b/i.test(normalized)) {
    variants.add('blockchain engineer');
    variants.add('solidity developer');
    variants.add('smart contract developer');
    variants.add('web3 full stack developer');
    variants.add('smart contract auditor');
  }

  if (/\b(product manager|pm|tpm|customer success|tam|tcse|solutions architect)\b/i.test(raw) || /\b(product manager|pm|tpm|customer success|tam|tcse|solutions architect)\b/i.test(normalized)) {
    variants.add('product manager');
    variants.add('technical product manager');
    variants.add('solutions architect');
    variants.add('technical customer success engineer');
    variants.add('technical account manager');
  }

  if (/\b(safety|red team|red teaming|alignment)\b/i.test(raw) || /\b(safety|red team|red teaming|alignment)\b/i.test(normalized)) {
    variants.add('ai safety engineer');
    variants.add('ai red teaming engineer');
    variants.add('ai safety');
    variants.add('red team engineer');
    variants.add('llm red teamer');
    variants.add('ai alignment researcher');
    variants.add('model evaluation engineer');
  }

  if (/\b(quantum|qiskit)\b/i.test(raw) || /\b(quantum|qiskit)\b/i.test(normalized)) {
    variants.add('quantum computing engineer');
    variants.add('quantum software engineer');
    variants.add('quantum algorithm researcher');
    variants.add('quantum engineer');
    variants.add('quantum hardware engineer');
  }

  if (/\b(finops|cost optimization|cloud cost)\b/i.test(raw) || /\b(finops|cost optimization|cloud cost)\b/i.test(normalized)) {
    variants.add('finops engineer');
    variants.add('cloud finops architect');
    variants.add('senior finops engineer');
    variants.add('cloud cost optimization engineer');
  }

  if (/\b(uxr|ux researcher|user research|design research)\b/i.test(raw) || /\b(uxr|ux researcher|user research|design research)\b/i.test(normalized)) {
    variants.add('ux researcher');
    variants.add('senior ux researcher');
    variants.add('quantitative ux researcher');
    variants.add('design researcher');
    variants.add('user researcher');
  }

  if (/\b(tech writer|technical writer|technical writing|documentation|docs engineer)\b/i.test(raw) || /\b(tech writer|technical writer|technical writing|documentation|docs engineer)\b/i.test(normalized)) {
    variants.add('technical writer');
    variants.add('senior technical writer');
    variants.add('developer documentation engineer');
    variants.add('api documentation specialist');
    variants.add('technical content engineer');
  }

  if (/\b(agentic|ai agent|agent systems)\b/i.test(raw) || /\b(agentic|ai agent|agent systems)\b/i.test(normalized)) {
    variants.add('agentic ai developer');
    variants.add('ai agent systems engineer');
    variants.add('ai agent developer');
    variants.add('generative ai engineer');
    variants.add('ai engineer');
  }

  if (/\b(fde|forward deployed)\b/i.test(raw) || /\b(fde|forward deployed)\b/i.test(normalized)) {
    variants.add('forward deployed engineer');
    variants.add('forward deployed ai engineer');
    variants.add('fde');
    variants.add('customer solutions engineer');
    variants.add('solutions engineer');
  }

  if (/\b(gpu infra|gpu infrastructure|ai cluster)\b/i.test(raw) || /\b(gpu infra|gpu infrastructure|ai cluster)\b/i.test(normalized)) {
    variants.add('gpu cloud infrastructure engineer');
    variants.add('ai cluster reliability engineer');
    variants.add('gpu infrastructure architect');
    variants.add('cloud infrastructure engineer');
  }

  if (/\b(spatial|visionos|realitykit|webgpu)\b/i.test(raw) || /\b(spatial|visionos|realitykit|webgpu)\b/i.test(normalized)) {
    variants.add('spatial computing developer');
    variants.add('webgpu engine programmer');
    variants.add('ar / vr / xr developer');
    variants.add('graphics programmer');
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Deterministically classifies a candidate's primary tech domain based on their resume/profile data
 * (skills, work history roles, headline, summaries, and projects).
 *
 * @param {Object} profileOrKb - Candidate Knowledge Base or Profile
 * @returns {{ primaryDomain: string, domain: string, domainName: string, domainTitle: string, badge: string, primaryRole: string, canonicalRoles: string[], score: number, confidence: number }}
 */
export function detectCandidateDomain(profileOrKb = {}) {
  if (!profileOrKb || typeof profileOrKb !== 'object') {
    return {
      primaryDomain: 'full_stack',
      domain: 'full_stack',
      domainName: ROLE_DOMAINS.full_stack.domainName,
      domainTitle: ROLE_DOMAINS.full_stack.domainName,
      badge: ROLE_DOMAINS.full_stack.badge,
      primaryRole: ROLE_DOMAINS.full_stack.roles[0],
      canonicalRoles: (ROLE_DOMAINS.full_stack.roles || []).slice(0, 4),
      score: 0,
      confidence: 0
    };
  }

  // Aggregate candidate text
  const textParts = [];

  // 1. Personal headline / title / summary
  if (profileOrKb.personal?.title) {
    textParts.push(profileOrKb.personal.title, normalizeRoleSearchTerm(profileOrKb.personal.title));
  }
  if (profileOrKb.personal?.summary) textParts.push(profileOrKb.personal.summary);
  if (Array.isArray(profileOrKb.target_roles)) {
    textParts.push(profileOrKb.target_roles.join(' '));
    profileOrKb.target_roles.forEach(tr => textParts.push(normalizeRoleSearchTerm(tr)));
  }

  // 2. Work history roles & bullets
  (profileOrKb.work_history || []).forEach(w => {
    if (w.role) textParts.push(w.role, normalizeRoleSearchTerm(w.role));
    if (w.title) textParts.push(w.title, normalizeRoleSearchTerm(w.title));
    if (Array.isArray(w.bullets)) textParts.push(w.bullets.join(' '));
  });

  // 3. Projects
  (profileOrKb.projects || []).forEach(p => {
    if (p.name) textParts.push(p.name);
    if (p.tech || p.tech_stack) textParts.push(p.tech || p.tech_stack);
    if (p.description) textParts.push(p.description);
  });

  // 4. Skills
  const skillsList = [];
  if (profileOrKb.skills && typeof profileOrKb.skills === 'object') {
    Object.values(profileOrKb.skills).forEach(val => {
      if (Array.isArray(val)) skillsList.push(...val);
    });
  }
  if (Array.isArray(profileOrKb.custom_skills)) {
    skillsList.push(...profileOrKb.custom_skills);
  }
  textParts.push(skillsList.join(' '));

  const fullText = textParts.join(' ').toLowerCase();

  // Score each domain based on alias & role occurrences
  const domainScores = {};
  const TARGETABLE_DOMAINS = [
    'ai_ml',
    'devops_cloud',
    'cybersecurity',
    'data_analytics',
    'backend',
    'frontend_mobile',
    'full_stack',
    'qa_testing',
    'embedded_hardware',
    'game_development',
    'product_management',
    'edtech_lms',
    'web3_blockchain',
    'technical_writing'
  ];

  for (const domKey of TARGETABLE_DOMAINS) {
    const domain = ROLE_DOMAINS[domKey];
    if (!domain) continue;
    let score = 0;

    // Check aliases
    for (const alias of (domain.aliases || [])) {
      const a = alias.toLowerCase();
      // Use boundary matching for short aliases (<= 3 chars) to avoid false positives
      if (a.length <= 3) {
        const regex = new RegExp(`\\b${escapeRegExp(a)}\\b`, 'gi');
        const count = (fullText.match(regex) || []).length;
        score += count * 3;
      } else {
        if (fullText.includes(a)) score += 2;
      }
    }

    // Check roles
    for (const r of (domain.roles || [])) {
      if (fullText.includes(r.toLowerCase())) score += 5;
    }

    domainScores[domKey] = score;
  }

  // Find domain with highest score
  let bestDomain = 'full_stack';
  let maxScore = -1;

  for (const [domKey, s] of Object.entries(domainScores)) {
    if (s > maxScore) {
      maxScore = s;
      bestDomain = domKey;
    }
  }

  if (maxScore <= 0) {
    bestDomain = 'full_stack';
  }

  const selected = ROLE_DOMAINS[bestDomain] || ROLE_DOMAINS.full_stack;

  return {
    primaryDomain: bestDomain,
    domain: bestDomain === 'devops_cloud' ? 'cloud_devops' : bestDomain,
    domainName: selected.domainName,
    domainTitle: selected.domainName,
    badge: selected.badge,
    primaryRole: (selected.roles || [])[0] || 'Software Engineer',
    canonicalRoles: (selected.roles || []).slice(0, 4),
    score: Math.max(0, maxScore),
    confidence: Math.max(0, maxScore)
  };
}

/**
 * Checks whether a job title matches target roles without substring pollution
 * (e.g. preventing a fresher from getting "Senior Staff Software Engineer" when targeting "Software Engineer"),
 * while expanding abbreviations (e.g. "ai engg" -> "AI Engineer") and tech synonyms.
 *
 * @param {string} jobTitle
 * @param {string[]} targetRoles
 * @param {string} [candidateSeniority='any'] - 'any' | 'fresher' | 'entry' | 'mid' | 'senior' | 'staff_exec'
 * @returns {boolean}
 */
export function matchesTargetRoleWithSeniority(jobTitle = '', targetRoles = [], candidateSeniority = 'any') {
  if (!targetRoles || targetRoles.length === 0) return true;
  const lowerTitle = (jobTitle || '').toLowerCase();

  // Substring & expanded variant check across target roles
  const hasBasicMatch = targetRoles.some(role => {
    const rawRole = (role || '').toLowerCase().trim();
    if (!rawRole) return false;
    const variants = expandRoleSearchVariants(role);
    if (variants.some(v => v && lowerTitle.includes(v))) return true;

    // Compound domain + engineer matching (e.g. "ai engg" matching "Staff AI Infrastructure Engineer")
    if ((rawRole.includes('ai') || rawRole.includes('ml')) && /\bai\b/i.test(lowerTitle) && /\b(engineer|developer|scientist|specialist|architect|lead)\b/i.test(lowerTitle)) {
      return true;
    }
    if (rawRole.includes('cloud') && /\bcloud\b/i.test(lowerTitle) && /\b(engineer|developer|architect|specialist)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('sec') || rawRole.includes('cyber')) && /\b(security|cyber|appsec|infosec)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('react') || rawRole.includes('frontend') || rawRole.includes('ui')) && /\b(react|frontend|front end|front-end|ui|web)\b/i.test(lowerTitle) && /\b(engineer|developer|architect|lead|specialist)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('ios') || rawRole.includes('mobile') || rawRole.includes('android')) && /\b(ios|mobile|swift|android|react native|flutter)\b/i.test(lowerTitle) && /\b(engineer|developer)\b/i.test(lowerTitle)) {
      return true;
    }
    if (rawRole.includes('game') && (/\b(game|gaming|unity|unreal|graphics)\b/i.test(lowerTitle)) && /\b(engineer|developer|programmer|artist)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('safety') || rawRole.includes('red team')) && (/\bsafety\b/i.test(lowerTitle) || /\bred team\b/i.test(lowerTitle)) && /\b(engineer|specialist|researcher|analyst|lead)\b/i.test(lowerTitle)) {
      return true;
    }
    if (rawRole.includes('quantum') && /\bquantum\b/i.test(lowerTitle) && /\b(engineer|developer|scientist|researcher|architect)\b/i.test(lowerTitle)) {
      return true;
    }
    if (rawRole.includes('finops') && /\bfinops\b/i.test(lowerTitle) && /\b(engineer|architect|specialist|analyst|lead)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('ux') || rawRole.includes('research')) && /\b(ux researcher|user research|design research)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('writer') || rawRole.includes('documentation')) && /\b(technical writer|documentation engineer|api documentation)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('agent') || rawRole.includes('agentic')) && /\b(agent|agentic)\b/i.test(lowerTitle) && /\b(engineer|developer|architect|specialist)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('forward deployed') || rawRole.includes('fde')) && (/\bforward deployed\b/i.test(lowerTitle) || /\bfde\b/i.test(lowerTitle))) {
      return true;
    }
    if ((rawRole.includes('gpu') || rawRole.includes('cluster')) && (/\bgpu\b/i.test(lowerTitle) || /\bcluster\b/i.test(lowerTitle)) && /\b(engineer|infrastructure|architect|sre)\b/i.test(lowerTitle)) {
      return true;
    }
    if ((rawRole.includes('spatial') || rawRole.includes('visionos') || rawRole.includes('realitykit')) && (/\b(spatial|visionos|realitykit|webgpu)\b/i.test(lowerTitle))) {
      return true;
    }
    if ((rawRole.includes('quantum') || rawRole.includes('post-quantum') || rawRole.includes('pqc')) && /\b(quantum|post-quantum|pqc)\b/i.test(lowerTitle)) {
      return true;
    }

    return false;
  });

  if (!hasBasicMatch) return false;

  // Seniority Guardrails: prevent substring collisions
  const seniority = classifySeniority(jobTitle);

  if (candidateSeniority === 'fresher') {
    // Freshers must NOT match Senior, Staff, or Lead roles
    if (seniority.level === 'senior' || seniority.level === 'staff_exec') {
      return false;
    }
    // Block titles that explicitly state Senior, Staff, Principal, Lead, or Director
    if (/\b(senior|sr\.?|lead|staff|principal|director|vp|head)\b/i.test(lowerTitle)) {
      return false;
    }
  } else if (candidateSeniority === 'entry') {
    // Entry-level (0-2 yrs) must NOT match Senior or Staff/Exec roles
    if (seniority.level === 'senior' || seniority.level === 'staff_exec') {
      return false;
    }
  } else if (candidateSeniority === 'senior') {
    // Senior candidates should NOT match Intern or Trainee positions
    if (seniority.level === 'fresher' && seniority.isInternship) {
      return false;
    }
  } else if (candidateSeniority === 'staff_exec') {
    // Staff/Exec should NOT match Intern, Entry, or Mid roles
    if (seniority.level === 'fresher' || seniority.level === 'entry' || seniority.level === 'mid') {
      return false;
    }
  }

  return true;
}

