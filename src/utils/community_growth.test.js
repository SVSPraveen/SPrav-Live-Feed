import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  SOCIAL_PLATFORMS,
  SUBREDDIT_PRESETS,
  MANIFESTO_PILLARS,
  generateSocialShareUrl,
  buildShowHnPost,
  buildRedditPost,
  buildLinkedInPost,
  generateEmbedBadgeMarkdown,
  toShieldsSegment,
  exportLaunchKit
} from './community_growth.js';

test('community_growth: SOCIAL_PLATFORMS dictionary integrity', () => {
  assert.deepStrictEqual(SOCIAL_PLATFORMS, {
    LINKEDIN: 'linkedin',
    TWITTER: 'twitter',
    REDDIT: 'reddit',
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    EMAIL: 'email'
  });
});

test('community_growth: toShieldsSegment handles spaces, dashes, percent, parentheses, and defaults', () => {
  assert.strictEqual(toShieldsSegment('SPrav Job AI'), 'SPrav_Job_AI');
  assert.strictEqual(toShieldsSegment('Client-Side'), 'Client--Side');
  assert.strictEqual(toShieldsSegment('100% Free'), '100%25_Free');
  assert.strictEqual(toShieldsSegment('Item (0)'), 'Item_%280%29');
  assert.strictEqual(toShieldsSegment(''), '');
  assert.strictEqual(toShieldsSegment(), '');
});

test('community_growth: MANIFESTO_PILLARS and SUBREDDIT_PRESETS constants integrity', () => {
  assert.strictEqual(MANIFESTO_PILLARS.length, 5);
  MANIFESTO_PILLARS.forEach(pillar => {
    assert.ok(pillar.title.length > 0);
    assert.ok(pillar.icon.length > 0);
    assert.ok(pillar.badge.length > 0);
    assert.ok(pillar.description.length > 0);
  });
  assert.strictEqual(MANIFESTO_PILLARS[0].title, '$0 Forever Business Model');
  assert.strictEqual(MANIFESTO_PILLARS[0].icon, 'Zap');
  assert.strictEqual(MANIFESTO_PILLARS[0].badge, 'Zero Paywalls');
  assert.ok(MANIFESTO_PILLARS[0].description.includes('No premium tiers'));

  assert.strictEqual(MANIFESTO_PILLARS[1].title, 'Candidate Data Sovereignty');
  assert.strictEqual(MANIFESTO_PILLARS[1].icon, 'ShieldCheck');
  assert.strictEqual(MANIFESTO_PILLARS[1].badge, '100% Air-Gapped');
  assert.ok(MANIFESTO_PILLARS[1].description.includes('Resumes and personal data'));

  assert.strictEqual(MANIFESTO_PILLARS[2].title, 'Direct-to-Source ATS Ingestion');
  assert.strictEqual(MANIFESTO_PILLARS[2].icon, 'Globe');
  assert.strictEqual(MANIFESTO_PILLARS[2].badge, '14 Verified Channels');
  assert.ok(MANIFESTO_PILLARS[2].description.includes('Queries first-party'));

  assert.strictEqual(MANIFESTO_PILLARS[3].title, 'Client-Side & Free Cloud AI');
  assert.strictEqual(MANIFESTO_PILLARS[3].icon, 'Cpu');
  assert.strictEqual(MANIFESTO_PILLARS[3].badge, 'Zero Server Cost');
  assert.ok(MANIFESTO_PILLARS[3].description.includes('Runs entirely on local'));

  assert.strictEqual(MANIFESTO_PILLARS[4].title, 'Anti-Spam Human-in-the-Loop');
  assert.strictEqual(MANIFESTO_PILLARS[4].icon, 'Award');
  assert.strictEqual(MANIFESTO_PILLARS[4].badge, 'High Callback Ratio');
  assert.ok(MANIFESTO_PILLARS[4].description.includes('Replaces blind bot spam'));

  assert.strictEqual(SUBREDDIT_PRESETS.length, 4);
  assert.strictEqual(SUBREDDIT_PRESETS[0].id, 'cscareerquestions');
  assert.strictEqual(SUBREDDIT_PRESETS[0].name, 'r/cscareerquestions');
  assert.strictEqual(SUBREDDIT_PRESETS[0].audience, 'Job Seekers & Software Engineers');
  assert.strictEqual(SUBREDDIT_PRESETS[0].focus, 'ATS Matching & Anti-Ghost Job Radar');

  assert.strictEqual(SUBREDDIT_PRESETS[1].id, 'LocalLLaMA');
  assert.strictEqual(SUBREDDIT_PRESETS[1].name, 'r/LocalLLaMA');
  assert.strictEqual(SUBREDDIT_PRESETS[1].audience, 'Open-Source AI & Hardware Enthusiasts');
  assert.strictEqual(SUBREDDIT_PRESETS[1].focus, 'Client-Side WebGPU & Privacy-First Architecture');

  assert.strictEqual(SUBREDDIT_PRESETS[2].id, 'developersIndia');
  assert.strictEqual(SUBREDDIT_PRESETS[2].name, 'r/developersIndia');
  assert.strictEqual(SUBREDDIT_PRESETS[2].audience, 'Engineers, New Grads & Remote Seekers');
  assert.strictEqual(SUBREDDIT_PRESETS[2].focus, 'Free Forever ($0) & 1st-Party ATS Discovery');

  assert.strictEqual(SUBREDDIT_PRESETS[3].id, 'jobs');
  assert.strictEqual(SUBREDDIT_PRESETS[3].name, 'r/jobs & r/recruitinghell');
  assert.strictEqual(SUBREDDIT_PRESETS[3].audience, 'General Job Seekers');
  assert.strictEqual(SUBREDDIT_PRESETS[3].focus, 'Anti-SaaS Sovereignty & No Auto-Apply Spam');
});

test('community_growth: social share url generator produces valid encoded URLs and handles defaults', () => {
  const payload = {
    url: 'https://github.com/SVSPraveen/SPrav-Job-AI',
    title: 'SPrav Job AI',
    summary: 'Great free tool for tech jobs',
    hashtags: ['JobSearch', 'TechJobs']
  };

  const linkedInUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.LINKEDIN, payload);
  assert.ok(linkedInUrl.startsWith('https://www.linkedin.com/sharing/share-offsite/'));
  assert.ok(linkedInUrl.includes(encodeURIComponent(payload.url)));

  const twitterUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.TWITTER, payload);
  assert.ok(twitterUrl.startsWith('https://twitter.com/intent/tweet'));
  assert.ok(twitterUrl.includes('JobSearch'));

  const redditUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.REDDIT, payload);
  assert.ok(redditUrl.startsWith('https://reddit.com/submit'));
  assert.ok(redditUrl.includes(encodeURIComponent(payload.url)));

  const whatsappUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.WHATSAPP, payload);
  assert.ok(whatsappUrl.startsWith('https://api.whatsapp.com/send'));
  assert.ok(whatsappUrl.includes(encodeURIComponent('SPrav Job AI\n\nGreat free tool for tech jobs\n\nhttps://github.com/SVSPraveen/SPrav-Job-AI')));

  const telegramUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.TELEGRAM, payload);
  assert.ok(telegramUrl.startsWith('https://t.me/share/url'));
  assert.ok(telegramUrl.includes(encodeURIComponent('SPrav Job AI\n\nGreat free tool for tech jobs')));

  const emailUrl = generateSocialShareUrl(SOCIAL_PLATFORMS.EMAIL, payload);
  assert.ok(emailUrl.startsWith('mailto:?subject='));
  assert.ok(emailUrl.includes(encodeURIComponent('Hi,\n\nI thought you might find this useful for your career search:')));

  // Default platform fallback
  const fallbackUrl = generateSocialShareUrl('unknown_platform', { url: 'https://example.com' });
  assert.strictEqual(fallbackUrl, 'https://example.com');

  // Default parameters when called with no arguments
  const defaultLinkedIn = generateSocialShareUrl(SOCIAL_PLATFORMS.LINKEDIN);
  assert.ok(defaultLinkedIn.includes('https%3A%2F%2Fgithub.com%2FSVSPraveen%2FSPrav-Job-AI'));

  const defaultTwitter = generateSocialShareUrl(SOCIAL_PLATFORMS.TWITTER);
  assert.ok(defaultTwitter.includes('JobSearch%2COpenSource%2CWebGPU%2CCareerAI'));
  assert.ok(defaultTwitter.includes(encodeURIComponent('Found my next tech job using 100% client-side AI with zero fees and total resume privacy!\n\n')));

  const defaultReddit = generateSocialShareUrl(SOCIAL_PLATFORMS.REDDIT);
  assert.ok(defaultReddit.includes(encodeURIComponent('SPrav Job AI — 100% Free Autonomous Career Intelligence & In-Browser ATS Matcher')));
});

test('community_growth: buildShowHnPost generates comprehensive markdown with custom options', () => {
  // Defaults
  const defaultPost = buildShowHnPost();
  assert.ok(defaultPost.includes('# Show HN: SPrav Job AI'));
  assert.ok(defaultPost.includes('SVS Praveen'));
  assert.ok(defaultPost.includes('14 verified channels'));
  assert.ok(defaultPost.includes('https://github.com/SVSPraveen/SPrav-Job-AI'));

  // Custom options
  const post = buildShowHnPost({ author: 'Custom Author', appName: 'Custom App', repoUrl: 'https://custom.app', channelsCount: 20 });
  assert.ok(post.includes('# Show HN: Custom App'));
  assert.ok(post.includes('Custom Author'));
  assert.ok(post.includes('20 verified channels'));
  assert.ok(post.includes('https://custom.app'));
  assert.ok(post.includes('$0'));
  assert.ok(post.includes('WebGPU'));
  assert.ok(post.includes('Anti-Ghost Job'));
  
  const forbidden = ['te' + 'al', 'simpl' + 'ify', 'lazy' + 'apply', 'hun' + 'tr', 'job' + 'right', 'novo' + 'resume', 'res' + 'ume.io', 'ze' + 'ty'];
  forbidden.forEach(brand => assert.strictEqual(post.toLowerCase().includes(brand), false, `Must not contain ${brand}`));
});

test('community_growth: buildRedditPost supports all targeted subreddits and custom options', () => {
  const forbidden = ['te' + 'al', 'simpl' + 'ify', 'lazy' + 'apply', 'hun' + 'tr', 'job' + 'right', 'novo' + 'resume', 'res' + 'ume.io', 'ze' + 'ty'];
  
  // Test each specific subreddit title and content
  const llamaPost = buildRedditPost('LocalLLaMA', { repoUrl: 'https://test.dev' });
  assert.ok(llamaPost.title.includes('WebGPU (Qwen 2.5 Coder)'));
  assert.ok(llamaPost.content.includes('Hi r/LocalLLaMA'));
  assert.ok(llamaPost.content.includes('https://test.dev'));

  const cscqPost = buildRedditPost('cscareerquestions', { repoUrl: 'https://test.dev' });
  assert.ok(cscqPost.title.includes('detect ghost jobs'));
  assert.ok(cscqPost.content.includes('The 2026 tech job market'));

  const devIndiaPost = buildRedditPost('developersIndia', { repoUrl: 'https://test.dev' });
  assert.ok(devIndiaPost.title.includes('Indian devs'));
  assert.ok(devIndiaPost.content.includes('Hi r/developersIndia'));

  // Default fallback post for unrecognized subreddit or 'jobs'
  const defaultPost = buildRedditPost('jobs');
  assert.ok(defaultPost.title.includes('A completely free, privacy-first career intelligence app'));
  assert.ok(defaultPost.content.includes('Job seekers today deal with subscription paywalls'));
  assert.ok(defaultPost.content.includes('https://github.com/SVSPraveen/SPrav-Job-AI'));

  const unknownPost = buildRedditPost('other_sub');
  assert.strictEqual(unknownPost.title, defaultPost.title);

  SUBREDDIT_PRESETS.forEach(preset => {
    const post = buildRedditPost(preset.id, { repoUrl: 'https://test.dev' });
    assert.ok(post.title && post.title.length > 10, `Title missing for ${preset.id}`);
    assert.ok(post.content && post.content.length > 50, `Content missing for ${preset.id}`);
    forbidden.forEach(brand => {
      assert.strictEqual(post.title.toLowerCase().includes(brand), false);
      assert.strictEqual(post.content.toLowerCase().includes(brand), false);
    });
  });
});

test('community_growth: buildLinkedInPost generates authentic narrative and tags', () => {
  const forbidden = ['te' + 'al', 'simpl' + 'ify', 'lazy' + 'apply', 'hun' + 'tr', 'job' + 'right', 'novo' + 'resume', 'res' + 'ume.io', 'ze' + 'ty'];
  
  // Default post
  const defaultPost = buildLinkedInPost();
  assert.ok(defaultPost.includes('SVS Praveen'));
  assert.ok(defaultPost.includes('https://github.com/SVSPraveen/SPrav-Job-AI'));

  // Custom post
  const post = buildLinkedInPost({ author: 'Praveen SVS', repoUrl: 'https://sprav.ai' });
  assert.ok(post.includes('Praveen SVS'));
  assert.ok(post.includes('https://sprav.ai'));
  assert.ok(post.includes('100% Free Forever ($0)'));
  assert.ok(post.includes('#JobSearch'));
  forbidden.forEach(brand => assert.strictEqual(post.toLowerCase().includes(brand), false));
});

test('community_growth: generateEmbedBadgeMarkdown produces valid shields.io links', () => {
  const defaultBadge = generateEmbedBadgeMarkdown();
  assert.ok(defaultBadge.markdown.includes('SPrav Job AI'));
  assert.ok(defaultBadge.badgeUrl.includes('SPrav_Job_AI'));
  assert.ok(defaultBadge.badgeUrl.includes('Career_Intelligence'));
  assert.ok(defaultBadge.badgeUrl.includes('6366f1'));
  assert.ok(defaultBadge.html.includes('https://github.com/SVSPraveen/SPrav-Job-AI'));

  const poweredBadge = generateEmbedBadgeMarkdown('powered');
  assert.ok(poweredBadge.markdown.includes('img.shields.io'));
  assert.ok(poweredBadge.html.includes('<a href='));
  assert.ok(poweredBadge.badgeUrl, 'badgeUrl property must be present');
  assert.ok(poweredBadge.badgeUrl.includes('SPrav_Job_AI'), 'powered: label uses underscores');
  assert.ok(poweredBadge.badgeUrl.includes('Career_Intelligence'), 'powered: message uses underscores');
  assert.ok(poweredBadge.badgeUrl.includes('6366f1'));

  const privacyBadge = generateEmbedBadgeMarkdown('privacy');
  assert.ok(privacyBadge.markdown.includes('img.shields.io'));
  assert.ok(privacyBadge.badgeUrl.includes('Candidate_Privacy'), 'privacy: label uses underscores');
  assert.ok(privacyBadge.badgeUrl.includes('100%25_Client--Side_Vault'), 'privacy: message uses %25 and -- for dash');
  assert.ok(privacyBadge.badgeUrl.includes('10b981'), 'privacy: correct color');

  const freeBadge = generateEmbedBadgeMarkdown('open');
  assert.ok(freeBadge.markdown.includes('img.shields.io'));
  assert.ok(freeBadge.badgeUrl.includes('License'), 'open: label is License');
  assert.ok(freeBadge.badgeUrl.includes('100%25_Free_Forever_%28$0%29'), 'open: message has correct encoding');
  assert.ok(freeBadge.badgeUrl.includes('8b5cf6'), 'open: correct color');
});

test('community_growth: exportLaunchKit produces structured bundle with all presets', () => {
  const kit = exportLaunchKit({ author: 'Custom Author' });
  assert.strictEqual(kit.appName, 'SPrav Job AI');
  assert.strictEqual(kit.version, '2.4.0 Pro Edition');
  assert.ok(Array.isArray(kit.manifesto));
  assert.strictEqual(kit.manifesto.length, 5);
  assert.ok(kit.showHn.includes('Custom Author'));
  assert.ok(kit.linkedIn.includes('Custom Author'));
  assert.ok(kit.reddit.localLlama.title.includes('WebGPU'));
  assert.ok(kit.reddit.csCareerQuestions.title.includes('ghost jobs'));
  assert.ok(kit.reddit.developersIndia.title.includes('Indian devs'));
  assert.ok(kit.reddit.generalJobs.title.includes('privacy-first'));
  assert.ok(kit.badges.poweredBy.badgeUrl.includes('Career_Intelligence'));
  assert.ok(kit.badges.clientSidePrivacy.badgeUrl.includes('Candidate_Privacy'));
  assert.ok(kit.badges.freeForever.badgeUrl.includes('License'));
  assert.ok(kit.exportTimestamp);
});

