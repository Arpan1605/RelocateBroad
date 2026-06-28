import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), process.argv[2] ?? 'apps/web/public/jobs.json');

const profile = {
  roleKeywords: [
    'product designer',
    'ux designer',
    'ui designer',
    'ux/ui designer',
    'frontend developer',
    'angular developer'
  ],
  skills: ['figma', 'adobe xd', 'angular', 'html', 'css', 'design systems', 'typescript', 'user research'],
  preferredLocations: ['berlin', 'munich', 'hamburg', 'frankfurt', 'remote'],
  languages: ['english']
};

const fallbackJobs = [
  {
    id: 'sap-product-designer',
    company: 'SAP',
    title: 'Product Designer',
    location: 'Berlin',
    postedDate: new Date().toISOString(),
    matchScore: 92,
    skills: ['Figma', 'Design Systems', 'Product Thinking'],
    url: 'https://jobs.sap.com',
    source: 'Sample',
    status: 'saved'
  },
  {
    id: 'n26-ux-designer',
    company: 'N26',
    title: 'UX Designer',
    location: 'Berlin / Remote',
    postedDate: new Date().toISOString(),
    matchScore: 88,
    skills: ['Research', 'Figma', 'Mobile UX'],
    url: 'https://n26.com/en/careers',
    source: 'Sample',
    status: 'applied'
  },
  {
    id: 'celonis-frontend',
    company: 'Celonis',
    title: 'Frontend Developer',
    location: 'Munich',
    postedDate: new Date(Date.now() - 86400000).toISOString(),
    matchScore: 81,
    skills: ['Angular', 'TypeScript', 'Design Systems'],
    url: 'https://www.celonis.com/careers/',
    source: 'Sample',
    status: 'interview'
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectSkills(text) {
  const normalizedText = text.toLowerCase();
  const matches = profile.skills.filter((skill) => normalizedText.includes(skill));
  return [...new Set(matches)].map((skill) =>
    skill
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .replace('Ux', 'UX')
      .replace('Ui', 'UI')
  );
}

function calculateMatchScore(job) {
  const haystack = `${job.title} ${job.company} ${job.location} ${job.description ?? ''} ${job.skills.join(' ')}`.toLowerCase();
  const roleMatch = profile.roleKeywords.some((keyword) => haystack.includes(keyword)) ? 40 : 0;
  const skillMatches = profile.skills.filter((skill) => haystack.includes(skill)).length;
  const skillsMatch = Math.min(30, Math.round((skillMatches / Math.max(profile.skills.length, 1)) * 30));
  const locationMatch = profile.preferredLocations.some((location) => haystack.includes(location)) ? 20 : 0;
  const languageMatch = profile.languages.some((language) => haystack.includes(language)) ? 10 : 6;

  return Math.min(100, roleMatch + skillsMatch + locationMatch + languageMatch);
}

function isRelevant(job) {
  const haystack = `${job.title} ${job.company} ${job.location} ${job.description ?? ''}`.toLowerCase();
  const roleRelevant = profile.roleKeywords.some((keyword) => haystack.includes(keyword));
  const locationRelevant = profile.preferredLocations.some((location) => haystack.includes(location)) || haystack.includes('germany');
  return roleRelevant && locationRelevant;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RelocateBoard/0.1 (+https://github.com/Arpan1605/RelocateBroad)',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function fetchArbeitnowJobs() {
  const payload = await fetchJson('https://www.arbeitnow.com/api/job-board-api');
  const rows = Array.isArray(payload.data) ? payload.data : [];

  return rows.map((job) => {
    const description = stripHtml(job.description ?? '');
    const skills = [...new Set([...(Array.isArray(job.tags) ? job.tags : []), ...detectSkills(`${job.title} ${description}`)])].slice(0, 6);
    const normalizedJob = {
      id: `arbeitnow-${job.slug ?? slugify(job.url ?? `${job.company_name}-${job.title}`)}`,
      company: job.company_name ?? 'Unknown company',
      title: job.title ?? 'Untitled role',
      location: job.location ?? 'Germany',
      postedDate: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
      matchScore: 0,
      skills,
      url: job.url,
      source: 'Arbeitnow',
      status: 'saved',
      description
    };
    return { ...normalizedJob, matchScore: calculateMatchScore(normalizedJob) };
  });
}

async function fetchRemoteOkJobs() {
  const payload = await fetchJson('https://remoteok.com/api');
  const rows = Array.isArray(payload) ? payload.filter((job) => job?.id && job?.url) : [];

  return rows.map((job) => {
    const description = stripHtml(job.description ?? '');
    const tags = Array.isArray(job.tags) ? job.tags : [];
    const skills = [...new Set([...tags, ...detectSkills(`${job.position} ${description} ${tags.join(' ')}`)])].slice(0, 6);
    const normalizedJob = {
      id: `remoteok-${job.id}`,
      company: job.company ?? 'Remote company',
      title: job.position ?? 'Remote role',
      location: job.location || 'Remote',
      postedDate: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      matchScore: 0,
      skills,
      url: job.url,
      source: 'Remote OK',
      status: 'saved',
      description
    };
    return { ...normalizedJob, matchScore: calculateMatchScore(normalizedJob) };
  });
}

async function main() {
  const settledSources = await Promise.allSettled([fetchArbeitnowJobs(), fetchRemoteOkJobs()]);
  const liveJobs = settledSources.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const dedupedJobs = [...new Map(liveJobs.filter(isRelevant).map((job) => [job.url, job])).values()]
    .sort((first, second) => second.matchScore - first.matchScore || new Date(second.postedDate) - new Date(first.postedDate))
    .slice(0, 80);

  const jobs = dedupedJobs.length > 0 ? dedupedJobs : fallbackJobs;
  const payload = {
    generatedAt: new Date().toISOString(),
    sources: ['Arbeitnow', 'Remote OK'],
    profile: {
      role: 'UX/UI Designer',
      skills: ['Figma', 'Adobe XD', 'Angular', 'HTML', 'CSS', 'Design Systems']
    },
    jobs
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${jobs.length} jobs to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
