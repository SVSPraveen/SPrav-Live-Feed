import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_DOMAINS,
  ALL_TECH_ROLES,
  classifySeniority,
  matchesTargetRoleWithSeniority,
  normalizeRoleSearchTerm,
  expandRoleSearchVariants,
  detectCandidateDomain
} from './tech_roles_taxonomy.js';

test('tech_roles_taxonomy: contains 18 comprehensive tech domains', () => {
  const domainKeys = Object.keys(ROLE_DOMAINS);
  assert.equal(domainKeys.length, 18, 'Should have exactly 18 tech domains');
  assert.ok(domainKeys.includes('game_development'), 'Should include game_development');
  assert.ok(domainKeys.includes('edtech_lms'), 'Should include edtech_lms');
  assert.ok(domainKeys.includes('embedded_hardware'), 'Should include embedded_hardware');
  assert.ok(domainKeys.includes('product_management'), 'Should include product_management');
  assert.ok(domainKeys.includes('technical_writing'), 'Should include technical_writing');

  // Verify structure of each domain
  for (const [key, domain] of Object.entries(ROLE_DOMAINS)) {
    assert.ok(domain.domainName && typeof domain.domainName === 'string', `${key} should have domainName`);
    assert.ok(domain.badge && typeof domain.badge === 'string', `${key} should have badge`);
    assert.ok(Array.isArray(domain.aliases) && domain.aliases.length > 0, `${key} should have aliases array`);
    assert.ok(Array.isArray(domain.roles) && domain.roles.length > 0, `${key} should have roles array`);
  }
});

test('tech_roles_taxonomy: ALL_TECH_ROLES compiles over 300 unique roles', () => {
  assert.ok(Array.isArray(ALL_TECH_ROLES));
  assert.ok(ALL_TECH_ROLES.length >= 300, `Expected >= 300 roles, got ${ALL_TECH_ROLES.length}`);
});

test('tech_roles_taxonomy: game_development covers Unity, Unreal, Graphics Programmer', () => {
  const game = ROLE_DOMAINS.game_development;
  assert.ok(game);
  assert.equal(game.badge, '🎮');
  assert.ok(game.roles.includes('Unity Developer'));
  assert.ok(game.roles.includes('Unreal Engine Developer'));
  assert.ok(game.roles.includes('Graphics Programmer'));
  assert.ok(game.roles.includes('3D Rendering Engineer'));
  assert.ok(game.roles.includes('Gameplay Programmer'));
  assert.ok(game.roles.includes('Technical Artist (Tech Art)'));
  assert.ok(game.roles.includes('Shaders & VFX Engineer'));
  assert.ok(game.aliases.includes('unity'));
  assert.ok(game.aliases.includes('unreal'));
  assert.ok(game.aliases.includes('graphics'));
});

test('tech_roles_taxonomy: edtech_lms covers Instructional Design and LMS systems', () => {
  const edtech = ROLE_DOMAINS.edtech_lms;
  assert.ok(edtech);
  assert.equal(edtech.badge, '📚');
  assert.ok(edtech.roles.includes('Instructional Design Engineer'));
  assert.ok(edtech.roles.includes('Instructional Designer'));
  assert.ok(edtech.roles.includes('Learning Experience Designer (LXD)'));
  assert.ok(edtech.roles.includes('LMS Systems Architect'));
  assert.ok(edtech.roles.includes('SCORM / xAPI Integration Specialist'));
  assert.ok(edtech.aliases.includes('instructional design'));
  assert.ok(edtech.aliases.includes('lms'));
  assert.ok(edtech.aliases.includes('elearning'));
});

test('tech_roles_taxonomy: product_management prominently features Technical Customer Success', () => {
  const pm = ROLE_DOMAINS.product_management;
  assert.ok(pm);
  assert.ok(pm.domainName.includes('Customer Success'));
  assert.ok(pm.roles.includes('Technical Customer Success Engineer (TCSE)'));
  assert.ok(pm.roles.includes('Customer Success Architect'));
  assert.ok(pm.roles.includes('Technical Account Manager (TAM)'));
  assert.ok(pm.roles.includes('Customer Solutions Engineer'));
  assert.ok(pm.aliases.includes('customer success'));
  assert.ok(pm.aliases.includes('tcse'));
  assert.ok(pm.aliases.includes('tam'));
});

test('tech_roles_taxonomy: embedded_hardware covers VLSI, RTL, ASIC, and Silicon design', () => {
  const hw = ROLE_DOMAINS.embedded_hardware;
  assert.ok(hw);
  assert.ok(hw.domainName.includes('Semiconductor'));
  assert.ok(hw.domainName.includes('VLSI'));
  assert.ok(hw.roles.includes('VLSI Design Engineer'));
  assert.ok(hw.roles.includes('RTL Design Engineer'));
  assert.ok(hw.roles.includes('ASIC Verification Engineer (UVM / SystemVerilog)'));
  assert.ok(hw.roles.includes('Physical Design Engineer (PD)'));
  assert.ok(hw.roles.includes('Silicon Validation & Bring-Up Engineer'));
  assert.ok(hw.roles.includes('FPGA Engineer'));
  assert.ok(hw.aliases.includes('vlsi'));
  assert.ok(hw.aliases.includes('rtl'));
  assert.ok(hw.aliases.includes('silicon'));
  assert.ok(hw.aliases.includes('semiconductor'));
});

test('classifySeniority: classifies new roles into appropriate seniority tiers', () => {
  // Freshers / Interns
  assert.equal(classifySeniority('Unity Game Developer Intern').level, 'fresher');
  assert.equal(classifySeniority('Instructional Design Intern').isInternship, true);

  // Junior / Entry
  assert.equal(classifySeniority('Junior Game Developer').level, 'entry');
  assert.equal(classifySeniority('Junior VLSI Engineer').level, 'entry');

  // Mid
  assert.equal(classifySeniority('Technical Customer Success Engineer').level, 'mid');
  assert.equal(classifySeniority('RTL Design Engineer').level, 'mid');
  assert.equal(classifySeniority('Graphics Programmer').level, 'mid');

  // Senior / Lead
  assert.equal(classifySeniority('Senior Graphics Programmer').level, 'senior');
  assert.equal(classifySeniority('Senior VLSI Engineer').level, 'senior');
  assert.equal(classifySeniority('Senior Technical Customer Success Engineer').level, 'senior');
  assert.equal(classifySeniority('Lead Unreal Engine Developer').level, 'senior');

  // Staff / Exec
  assert.equal(classifySeniority('Principal Graphics Architect').level, 'staff_exec');
  assert.equal(classifySeniority('Principal Silicon Architect').level, 'staff_exec');
  assert.equal(classifySeniority('Technical Director (Games)').level, 'staff_exec');

  // Contract detection
  const contractRole = classifySeniority('Senior RTL Design Consultant (1099 Contract)');
  assert.equal(contractRole.level, 'senior');
  assert.equal(contractRole.isContract, true);
});

test('matchesTargetRoleWithSeniority: prevents seniority pollution for new tech roles', () => {
  // Fresher candidate should not match Senior or Staff roles
  assert.equal(
    matchesTargetRoleWithSeniority('Senior Game Developer', ['Game Developer'], 'fresher'),
    false
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Junior Game Developer', ['Game Developer'], 'fresher'),
    true
  );

  // Senior candidate should match Senior roles
  assert.equal(
    matchesTargetRoleWithSeniority('Senior VLSI Engineer', ['VLSI Engineer'], 'senior'),
    true
  );
  // Senior candidate should NOT match Internship
  assert.equal(
    matchesTargetRoleWithSeniority('VLSI Engineering Intern', ['VLSI Engineer'], 'senior'),
    false
  );
});

test('normalizeRoleSearchTerm: normalizes abbreviations, colloquial shorthand, and punctuation', () => {
  assert.equal(normalizeRoleSearchTerm('ai engg'), 'ai engineer');
  assert.equal(normalizeRoleSearchTerm('aiml engg'), 'ai machine learning engineer');
  assert.equal(normalizeRoleSearchTerm('cloud engg'), 'cloud engineer');
  assert.equal(normalizeRoleSearchTerm('sec engg'), 'security engineer');
  assert.equal(normalizeRoleSearchTerm('cyber sec'), 'cyber security');
  assert.equal(normalizeRoleSearchTerm('swe'), 'software engineer');
  assert.equal(normalizeRoleSearchTerm('sde'), 'software engineer');
  assert.equal(normalizeRoleSearchTerm('sre'), 'site reliability engineer');
  assert.equal(normalizeRoleSearchTerm('ml dev'), 'machine learning developer');
  assert.equal(normalizeRoleSearchTerm('qa engg'), 'quality assurance engineer');
  assert.equal(normalizeRoleSearchTerm('devops eng'), 'devops engineer');
});

test('expandRoleSearchVariants: generates canonical industry titles from colloquial queries', () => {
  const aiVariants = expandRoleSearchVariants('ai engg');
  assert.ok(aiVariants.includes('ai engineer'), 'Must include ai engineer');
  assert.ok(aiVariants.includes('machine learning engineer'), 'Must include machine learning engineer');
  assert.ok(aiVariants.includes('artificial intelligence engineer'), 'Must include artificial intelligence engineer');

  const cloudVariants = expandRoleSearchVariants('cloud engg');
  assert.ok(cloudVariants.includes('cloud engineer'), 'Must include cloud engineer');
  assert.ok(cloudVariants.includes('devops engineer'), 'Must include devops engineer');
  assert.ok(cloudVariants.includes('platform engineer'), 'Must include platform engineer');

  const secVariants = expandRoleSearchVariants('sec engg');
  assert.ok(secVariants.includes('security engineer'), 'Must include security engineer');
  assert.ok(secVariants.includes('cybersecurity engineer'), 'Must include cybersecurity engineer');
  assert.ok(secVariants.includes('information security engineer'), 'Must include information security engineer');
});

test('detectCandidateDomain: deterministically classifies candidate profiles into correct domain and roles', () => {
  // 1. AI / ML Candidate
  const aiProfile = {
    skills: {
      ml: ['PyTorch', 'LangChain', 'LangGraph', 'RAG', 'Transformers', 'vLLM'],
      languages: ['Python', 'SQL']
    },
    work_history: [
      { role: 'AI Engg', description: 'Built RAG pipelines and deployed LLMs' }
    ]
  };
  const aiResult = detectCandidateDomain(aiProfile);
  assert.equal(aiResult.domain, 'ai_ml');
  assert.equal(aiResult.primaryRole, 'AI Engineer');
  assert.ok(aiResult.canonicalRoles.includes('Machine Learning Engineer'));

  // 2. Cybersecurity Candidate
  const secProfile = {
    skills: {
      security: ['SIEM', 'Splunk', 'Wireshark', 'OWASP', 'Penetration Testing', 'Firewall']
    },
    work_history: [
      { role: 'Sec Analyst', description: 'Monitored SOC alerts and incident response' }
    ]
  };
  const secResult = detectCandidateDomain(secProfile);
  assert.equal(secResult.domain, 'cybersecurity');
  assert.equal(secResult.primaryRole, 'Security Engineer');
  assert.ok(secResult.canonicalRoles.includes('Cybersecurity Analyst'));

  // 3. Cloud / DevOps Candidate
  const cloudProfile = {
    skills: {
      infra: ['Terraform', 'Kubernetes', 'AWS', 'Docker', 'Prometheus', 'Helm', 'CI/CD']
    },
    work_history: [
      { title: 'DevOps Engg', description: 'Managed AWS EKS clusters and Terraform scripts' }
    ]
  };
  const cloudResult = detectCandidateDomain(cloudProfile);
  assert.equal(cloudResult.domain, 'cloud_devops');
  assert.equal(cloudResult.primaryRole, 'DevOps Engineer');
  assert.ok(cloudResult.canonicalRoles.includes('Cloud Engineer'));
});

test('matchesTargetRoleWithSeniority: resolves colloquial terms ("ai engg", "cloud engg", "sec engg") to corporate ATS titles', () => {
  // "ai engg" matches real Ashby / Greenhouse postings
  assert.equal(
    matchesTargetRoleWithSeniority('Senior AI Engineer', ['ai engg'], 'senior'),
    true,
    '"Senior AI Engineer" must match "ai engg" for senior candidates'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Staff Machine Learning Engineer', ['ai engg'], 'any'),
    true,
    '"Staff Machine Learning Engineer" must match "ai engg"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Applied AI Engineer', ['ai engg'], 'any'),
    true,
    '"Applied AI Engineer" must match "ai engg"'
  );

  // "cloud engg" matches Cloud & DevOps postings
  assert.equal(
    matchesTargetRoleWithSeniority('Senior Cloud Engineer', ['cloud engg'], 'senior'),
    true,
    '"Senior Cloud Engineer" must match "cloud engg"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Site Reliability Engineer', ['cloud engg'], 'any'),
    true,
    '"Site Reliability Engineer" must match "cloud engg"'
  );

  // "sec engg" matches Cybersecurity postings
  assert.equal(
    matchesTargetRoleWithSeniority('Information Security Engineer', ['sec engg'], 'any'),
    true,
    '"Information Security Engineer" must match "sec engg"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Senior Cybersecurity Analyst', ['sec engg'], 'senior'),
    true,
    '"Senior Cybersecurity Analyst" must match "sec engg"'
  );

  // Guardrails: Senior candidate must not match fresher internship even with expanded variants
  assert.equal(
    matchesTargetRoleWithSeniority('AI Engineering Intern', ['ai engg'], 'senior'),
    false,
    'Senior candidate must NOT match AI Engineering Intern'
  );

  // "qa engg" matches QA & SDET postings
  assert.equal(
    matchesTargetRoleWithSeniority('QA Automation Engineer', ['qa engg'], 'any'),
    true,
    '"QA Automation Engineer" must match "qa engg"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Senior SDET', ['qa engg'], 'senior'),
    true,
    '"Senior SDET" must match "qa engg"'
  );

  // "embedded engg" / "vlsi" matches Hardware & Semiconductor postings
  assert.equal(
    matchesTargetRoleWithSeniority('Embedded Software Engineer', ['embedded engg'], 'any'),
    true,
    '"Embedded Software Engineer" must match "embedded engg"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('VLSI Design Engineer', ['vlsi'], 'any'),
    true,
    '"VLSI Design Engineer" must match "vlsi"'
  );

  // "web3 dev" / "solidity" matches Blockchain postings
  assert.equal(
    matchesTargetRoleWithSeniority('Solidity Developer', ['web3 dev'], 'any'),
    true,
    '"Solidity Developer" must match "web3 dev"'
  );

  // "game dev" / "unity" matches Gaming postings
  assert.equal(
    matchesTargetRoleWithSeniority('Unity 3D Game Engineer', ['game dev'], 'any'),
    true,
    '"Unity 3D Game Engineer" must match "game dev"'
  );
});

test('detectCandidateDomain: covers QA, Embedded, Web3, Game Dev, and PM candidates', () => {
  // 1. QA / SDET Candidate
  const qaProfile = {
    skills: { testing: ['Selenium', 'Cypress', 'Playwright', 'TestNG', 'Postman', 'SDET'] },
    work_history: [{ role: 'QA Automation Engineer', description: 'Maintained Playwright test suites' }]
  };
  const qaResult = detectCandidateDomain(qaProfile);
  assert.equal(qaResult.domain, 'qa_testing');
  assert.equal(qaResult.primaryRole, 'QA Automation Engineer');

  // 2. Embedded / VLSI Candidate
  const embeddedProfile = {
    skills: { hardware: ['Verilog', 'SystemVerilog', 'RTL', 'VLSI', 'FPGA', 'UVM', 'ASIC'] },
    work_history: [{ role: 'RTL Design Engineer', description: 'Designed ASIC blocks' }]
  };
  const embeddedResult = detectCandidateDomain(embeddedProfile);
  assert.equal(embeddedResult.domain, 'embedded_hardware');
  assert.equal(embeddedResult.primaryRole, 'VLSI Design Engineer');

  // 3. Web3 / Blockchain Candidate
  const web3Profile = {
    skills: { blockchain: ['Solidity', 'Smart Contracts', 'Ethereum', 'DeFi', 'Web3.js'] },
    work_history: [{ role: 'Blockchain Developer', description: 'Audited smart contracts' }]
  };
  const web3Result = detectCandidateDomain(web3Profile);
  assert.equal(web3Result.domain, 'web3_blockchain');
  assert.equal(web3Result.primaryRole, 'Blockchain Engineer');

  // 4. Game Development Candidate
  const gameProfile = {
    skills: { gaming: ['Unity3D', 'Unreal Engine', 'C#', 'C++', 'Shaders', 'DirectX', '3D Graphics'] },
    work_history: [{ role: 'Unity Game Developer', description: 'Developed multiplayer gameplay' }]
  };
  const gameResult = detectCandidateDomain(gameProfile);
  assert.equal(gameResult.domain, 'game_development');
  assert.equal(gameResult.primaryRole, 'Game Developer');

  // 5. Product Management Candidate
  const pmProfile = {
    skills: { product: ['Product Strategy', 'Agile', 'Scrum', 'Roadmapping', 'Jira', 'Technical Account Management'] },
    personal: { title: 'Technical Product Manager (TPM)' }
  };
  const pmResult = detectCandidateDomain(pmProfile);
  assert.equal(pmResult.domain, 'product_management');
  assert.ok(pmResult.primaryRole.includes('Technical Customer Success') || pmResult.primaryRole.includes('Product Manager'));
});

test('tech_roles_taxonomy: covers AI Safety & Red Teaming across ai_ml and cybersecurity', () => {
  const aiml = ROLE_DOMAINS.ai_ml;
  assert.ok(aiml.roles.includes('AI Safety Engineer'), 'ai_ml must include AI Safety Engineer');
  assert.ok(aiml.roles.includes('AI Red Teaming Engineer'), 'ai_ml must include AI Red Teaming Engineer');
  assert.ok(aiml.roles.includes('AI Alignment & Safety Researcher'), 'ai_ml must include AI Alignment & Safety Researcher');
  assert.ok(aiml.roles.includes('LLM Red Teamer'), 'ai_ml must include LLM Red Teamer');
  assert.ok(aiml.aliases.includes('ai safety'), 'ai_ml must include ai safety alias');
  assert.ok(aiml.aliases.includes('red teaming'), 'ai_ml must include red teaming alias');

  const cyber = ROLE_DOMAINS.cybersecurity;
  assert.ok(cyber.roles.includes('AI Security & Red Teaming Engineer'), 'cybersecurity must include AI Security & Red Teaming Engineer');
  assert.ok(cyber.roles.includes('Adversarial AI Security Analyst'), 'cybersecurity must include Adversarial AI Security Analyst');
});

test('tech_roles_taxonomy: covers Quantum Computing in embedded_hardware', () => {
  const hw = ROLE_DOMAINS.embedded_hardware;
  assert.ok(hw.domainName.includes('Quantum'), 'embedded_hardware domain title must mention Quantum');
  assert.ok(hw.roles.includes('Quantum Computing Engineer'), 'must include Quantum Computing Engineer');
  assert.ok(hw.roles.includes('Quantum Software Engineer'), 'must include Quantum Software Engineer');
  assert.ok(hw.roles.includes('Quantum Algorithm Researcher'), 'must include Quantum Algorithm Researcher');
  assert.ok(hw.roles.includes('Quantum Hardware Engineer'), 'must include Quantum Hardware Engineer');
  assert.ok(hw.aliases.includes('quantum'), 'must include quantum alias');
});

test('tech_roles_taxonomy: covers dedicated FinOps roles in devops_cloud', () => {
  const cloud = ROLE_DOMAINS.devops_cloud;
  assert.ok(cloud.roles.includes('FinOps Engineer'), 'must include FinOps Engineer');
  assert.ok(cloud.roles.includes('Senior FinOps Engineer'), 'must include Senior FinOps Engineer');
  assert.ok(cloud.roles.includes('Cloud FinOps Architect'), 'must include Cloud FinOps Architect');
  assert.ok(cloud.roles.includes('Cloud Cost Optimization Engineer'), 'must include Cloud Cost Optimization Engineer');
  assert.ok(cloud.aliases.includes('finops'), 'must include finops alias');
});

test('tech_roles_taxonomy: covers UX Researcher across product_management and frontend_mobile', () => {
  const pm = ROLE_DOMAINS.product_management;
  assert.ok(pm.roles.includes('UX Researcher'), 'product_management must include UX Researcher');
  assert.ok(pm.roles.includes('Senior UX Researcher'), 'product_management must include Senior UX Researcher');
  assert.ok(pm.roles.includes('Quantitative UX Researcher'), 'product_management must include Quantitative UX Researcher');

  const fe = ROLE_DOMAINS.frontend_mobile;
  assert.ok(fe.roles.includes('UX Researcher'), 'frontend_mobile must include UX Researcher');
  assert.ok(fe.roles.includes('Design Researcher'), 'frontend_mobile must include Design Researcher');
  assert.ok(fe.aliases.includes('uxr') || fe.aliases.includes('ux research'), 'frontend_mobile should have uxr/ux research aliases');
});

test('tech_roles_taxonomy: dedicated technical_writing domain with full suite of documentation roles', () => {
  const tw = ROLE_DOMAINS.technical_writing;
  assert.ok(tw, 'technical_writing domain must exist');
  assert.equal(tw.badge, '📝');
  assert.ok(tw.domainName.includes('Technical Writing'));
  assert.ok(tw.roles.includes('Technical Writer'));
  assert.ok(tw.roles.includes('Senior Technical Writer'));
  assert.ok(tw.roles.includes('Staff Technical Writer'));
  assert.ok(tw.roles.includes('Lead Technical Writer'));
  assert.ok(tw.roles.includes('Principal Technical Writer'));
  assert.ok(tw.roles.includes('Developer Documentation Engineer'));
  assert.ok(tw.roles.includes('API Documentation Specialist'));
  assert.ok(tw.roles.includes('SDK & Code Sample Writer'));
  assert.ok(tw.aliases.includes('technical writer'));
  assert.ok(tw.aliases.includes('developer documentation'));
});

test('normalizeRoleSearchTerm & expandRoleSearchVariants: handles new specialized role queries', () => {
  // Normalization
  assert.equal(normalizeRoleSearchTerm('fin ops engg'), 'finops engineer');
  assert.equal(normalizeRoleSearchTerm('red team engg'), 'red teaming engineer');
  assert.equal(normalizeRoleSearchTerm('uxr'), 'ux researcher');
  assert.equal(normalizeRoleSearchTerm('tech writer'), 'technical writer');
  assert.equal(normalizeRoleSearchTerm('docs eng'), 'documentation engineer');

  // Expansion
  const finopsVariants = expandRoleSearchVariants('finops');
  assert.ok(finopsVariants.includes('finops engineer'));
  assert.ok(finopsVariants.includes('cloud cost optimization engineer'));

  const safetyVariants = expandRoleSearchVariants('ai safety');
  assert.ok(safetyVariants.includes('ai safety engineer'));
  assert.ok(safetyVariants.includes('ai red teaming engineer'));

  const quantumVariants = expandRoleSearchVariants('quantum engg');
  assert.ok(quantumVariants.includes('quantum computing engineer'));
  assert.ok(quantumVariants.includes('quantum software engineer'));

  const uxrVariants = expandRoleSearchVariants('ux researcher');
  assert.ok(uxrVariants.includes('ux researcher'));
  assert.ok(uxrVariants.includes('design researcher'));

  const writerVariants = expandRoleSearchVariants('technical writer');
  assert.ok(writerVariants.includes('technical writer'));
  assert.ok(writerVariants.includes('developer documentation engineer'));
});

test('matchesTargetRoleWithSeniority: matches new specialized target roles correctly', () => {
  // AI Safety
  assert.equal(
    matchesTargetRoleWithSeniority('Senior AI Safety Engineer', ['ai safety'], 'senior'),
    true,
    'Senior AI Safety Engineer must match "ai safety"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Lead AI Red Teaming Engineer', ['red teaming'], 'senior'),
    true,
    'Lead AI Red Teaming Engineer must match "red teaming"'
  );

  // Quantum
  assert.equal(
    matchesTargetRoleWithSeniority('Quantum Software Engineer', ['quantum engg'], 'any'),
    true,
    'Quantum Software Engineer must match "quantum engg"'
  );

  // FinOps
  assert.equal(
    matchesTargetRoleWithSeniority('Senior FinOps Engineer', ['finops'], 'senior'),
    true,
    'Senior FinOps Engineer must match "finops"'
  );

  // UX Researcher
  assert.equal(
    matchesTargetRoleWithSeniority('Staff UX Researcher', ['uxr'], 'staff_exec'),
    true,
    'Staff UX Researcher must match "uxr"'
  );

  // Technical Writer
  assert.equal(
    matchesTargetRoleWithSeniority('Senior Technical Writer', ['tech writer'], 'senior'),
    true,
    'Senior Technical Writer must match "tech writer"'
  );
  assert.equal(
    matchesTargetRoleWithSeniority('Developer Documentation Engineer', ['docs eng'], 'any'),
    true,
    'Developer Documentation Engineer must match "docs eng"'
  );
});

test('detectCandidateDomain: correctly detects Technical Writer and Documentation candidates', () => {
  const twProfile = {
    skills: {
      documentation: ['Markdown', 'Docusaurus', 'Swagger', 'OpenAPI', 'API Documentation', 'Technical Writing', 'GitBook']
    },
    work_history: [
      { role: 'Technical Writer', description: 'Authored REST API guides and SDK documentation' }
    ]
  };
  const twResult = detectCandidateDomain(twProfile);
  assert.equal(twResult.domain, 'technical_writing');
  assert.equal(twResult.primaryRole, 'Technical Writer');
  assert.ok(twResult.canonicalRoles.includes('Developer Documentation Engineer'));
});

test('tech_roles_taxonomy: covers 2025/2026 roles across Agentic AI, GPU infra, FDE, Spatial & Silicon', () => {
  // AI / ML
  assert.ok(ROLE_DOMAINS.ai_ml.roles.includes('Agentic AI Developer'));
  assert.ok(ROLE_DOMAINS.ai_ml.roles.includes('LLM Inference Optimization Engineer'));
  assert.ok(ROLE_DOMAINS.ai_ml.roles.includes('Foundation Model Post-Training Engineer'));
  assert.ok(ROLE_DOMAINS.ai_ml.roles.includes('AI Gateway & LLMOps Architect'));

  // DevOps / Cloud / GPU Infra
  assert.ok(ROLE_DOMAINS.devops_cloud.roles.includes('GPU Cloud Infrastructure Engineer'));
  assert.ok(ROLE_DOMAINS.devops_cloud.roles.includes('AI Cluster Reliability Engineer'));
  assert.ok(ROLE_DOMAINS.devops_cloud.roles.includes('Internal Developer Platform (IDP) Engineer'));

  // Product & Field Engineering (Technical Only)
  assert.ok(ROLE_DOMAINS.product_management.roles.includes('Forward Deployed Engineer (FDE)'));
  assert.ok(ROLE_DOMAINS.product_management.roles.includes('Forward Deployed AI Engineer'));
  assert.ok(ROLE_DOMAINS.product_management.roles.includes('AI Product Engineer'));

  // Cybersecurity
  assert.ok(ROLE_DOMAINS.cybersecurity.roles.includes('Hardware Security & Post-Quantum Cryptography Engineer'));
  assert.ok(ROLE_DOMAINS.cybersecurity.roles.includes('Zero Trust Security Architect'));

  // Embedded & Hardware
  assert.ok(ROLE_DOMAINS.embedded_hardware.roles.includes('AI Accelerator Hardware Architect (NPU / TPU)'));
  assert.ok(ROLE_DOMAINS.embedded_hardware.roles.includes('Chiplet & Advanced Packaging Design Engineer'));
  assert.ok(ROLE_DOMAINS.embedded_hardware.roles.includes('RISC-V Architecture Engineer'));

  // Spatial & Game Dev
  assert.ok(ROLE_DOMAINS.game_development.roles.includes('Spatial Computing Developer (visionOS / RealityKit)'));
  assert.ok(ROLE_DOMAINS.game_development.roles.includes('WebGPU Engine Programmer'));

  // ALL_TECH_ROLES threshold
  assert.ok(ALL_TECH_ROLES.length >= 350, `Expected at least 350 roles, got ${ALL_TECH_ROLES.length}`);
});

test('normalizeRoleSearchTerm & expandRoleSearchVariants: handles 2025/2026 shorthand (fde, gpu infra, agentic ai, spatial dev, llmops)', () => {
  // Normalization
  assert.equal(normalizeRoleSearchTerm('Senior FDE'), 'senior forward deployed engineer');
  assert.equal(normalizeRoleSearchTerm('Lead GPU Infra Engg'), 'lead gpu infrastructure engineer');
  assert.equal(normalizeRoleSearchTerm('Agentic AI Dev'), 'agentic ai developer');
  assert.equal(normalizeRoleSearchTerm('Spatial Dev'), 'spatial computing developer');
  assert.equal(normalizeRoleSearchTerm('LLMOps Engg'), 'llmops engineer');

  // Expansion
  const fdeVariants = expandRoleSearchVariants('fde');
  assert.ok(fdeVariants.includes('forward deployed engineer'));

  const gpuVariants = expandRoleSearchVariants('gpu infra');
  assert.ok(gpuVariants.includes('gpu cloud infrastructure engineer'));

  const agenticVariants = expandRoleSearchVariants('agentic ai');
  assert.ok(agenticVariants.includes('agentic ai developer'));

  const spatialVariants = expandRoleSearchVariants('spatial dev');
  assert.ok(spatialVariants.includes('spatial computing developer'));
});

test('matchesTargetRoleWithSeniority: matches 2025/2026 target roles accurately without seniority violation', () => {
  // Agentic AI Developer
  assert.equal(
    matchesTargetRoleWithSeniority('Staff Agentic AI Developer', ['agentic ai'], 'staff_exec'),
    true,
    'Staff Agentic AI Developer must match "agentic ai"'
  );

  // FDE
  assert.equal(
    matchesTargetRoleWithSeniority('Forward Deployed Engineer - Enterprise AI', ['fde'], 'any'),
    true,
    'Forward Deployed Engineer must match "fde"'
  );

  // GPU Infrastructure
  assert.equal(
    matchesTargetRoleWithSeniority('Senior GPU Cluster Reliability Engineer', ['gpu infra'], 'senior'),
    true,
    'Senior GPU Cluster Reliability Engineer must match "gpu infra"'
  );

  // Spatial Computing
  assert.equal(
    matchesTargetRoleWithSeniority('visionOS Spatial Computing Developer', ['spatial dev'], 'any'),
    true,
    'visionOS Spatial Computing Developer must match "spatial dev"'
  );

  // Guardrail: Freshers must not match Staff Agentic AI Developer
  assert.equal(
    matchesTargetRoleWithSeniority('Staff Agentic AI Developer', ['agentic ai'], 'fresher'),
    false,
    'Fresher candidate must NOT match Staff Agentic AI Developer'
  );
});


