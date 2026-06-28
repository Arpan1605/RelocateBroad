import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';

dotenv.config();

const app = express();
const port = Number(process.env['PORT'] ?? 4000);

type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  notes: string;
  appliedDate: string | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  source: string;
  url: string;
  postedDate: string;
  description: string | null;
  salary: string | null;
  language: string | null;
  visaSupport: boolean | null;
  matchScore: number;
  skills: string[];
  status: ApplicationStatus;
}

app.use(cors());
app.use(express.json());

const jobs: Job[] = [
  {
    id: 'sap-product-designer',
    title: 'Product Designer',
    company: 'SAP',
    location: 'Berlin',
    country: 'Germany',
    source: 'Manual Import',
    url: 'https://jobs.sap.com',
    postedDate: new Date().toISOString(),
    description: 'Design enterprise product experiences for international teams.',
    salary: null,
    language: 'English',
    visaSupport: true,
    matchScore: 92,
    skills: ['Figma', 'Design Systems', 'Product Thinking'],
    status: 'saved'
  },
  {
    id: 'n26-ux-designer',
    title: 'UX Designer',
    company: 'N26',
    location: 'Berlin / Remote',
    country: 'Germany',
    source: 'Manual Import',
    url: 'https://n26.com/en/careers',
    postedDate: new Date().toISOString(),
    description: 'Improve mobile banking experiences with product and research teams.',
    salary: null,
    language: 'English',
    visaSupport: null,
    matchScore: 88,
    skills: ['Research', 'Figma', 'Mobile UX'],
    status: 'applied'
  },
  {
    id: 'celonis-frontend',
    title: 'Frontend Developer',
    company: 'Celonis',
    location: 'Munich',
    country: 'Germany',
    source: 'Manual Import',
    url: 'https://www.celonis.com/careers/',
    postedDate: new Date(Date.now() - 86400000).toISOString(),
    description: 'Build Angular product surfaces with a strong design systems mindset.',
    salary: null,
    language: 'English',
    visaSupport: null,
    matchScore: 81,
    skills: ['Angular', 'TypeScript', 'Design Systems'],
    status: 'interview'
  }
];

const applications: Application[] = [
  {
    id: 'app-sap-product-designer',
    jobId: 'sap-product-designer',
    status: 'saved',
    notes: 'Strong fit for design systems and enterprise UX.',
    appliedDate: null
  }
];

const manualJobSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(2),
  location: z.string().min(2),
  url: z.string().url(),
  source: z.string().default('Manual Import'),
  description: z.string().optional(),
  language: z.string().optional(),
  visaSupport: z.boolean().nullable().optional(),
  skills: z.array(z.string()).default([]),
  matchScore: z.number().int().min(0).max(100).default(0)
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'relocateboard-api' });
});

app.get('/api/jobs', (_request, response) => {
  response.json({ data: jobs });
});

app.post('/api/jobs/manual-import', (request, response) => {
  const parsedJob = manualJobSchema.parse(request.body);
  const job: Job = {
    id: `${parsedJob.company}-${parsedJob.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: parsedJob.title,
    company: parsedJob.company,
    location: parsedJob.location,
    country: 'Germany',
    source: parsedJob.source,
    url: parsedJob.url,
    postedDate: new Date().toISOString(),
    description: parsedJob.description ?? null,
    salary: null,
    language: parsedJob.language ?? null,
    visaSupport: parsedJob.visaSupport ?? null,
    matchScore: parsedJob.matchScore,
    skills: parsedJob.skills,
    status: 'saved'
  };

  jobs.unshift(job);
  response.status(201).json({ data: job });
});

app.get('/api/applications', (_request, response) => {
  response.json({ data: applications });
});

app.patch('/api/applications/:id/status', (request, response) => {
  const statusSchema = z.object({
    status: z.enum(['saved', 'applied', 'interview', 'offer', 'rejected'])
  });
  const { status } = statusSchema.parse(request.body);
  const application = applications.find((item) => item.id === request.params.id);

  if (!application) {
    response.status(404).json({ error: 'Application not found' });
    return;
  }

  application.status = status;
  response.json({ data: application });
});

app.listen(port, () => {
  console.log(`RelocateBoard API running on http://localhost:${port}`);
});
