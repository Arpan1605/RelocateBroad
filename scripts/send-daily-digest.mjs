import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiKey = process.env.RESEND_API_KEY;
const notificationEmail = process.env.NOTIFICATION_EMAIL;
const fromEmail = process.env.FROM_EMAIL ?? 'RelocateBoard <onboarding@resend.dev>';
const scriptArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const jobsPath = resolve(process.cwd(), scriptArgs[0] ?? 'apps/web/public/jobs.json');
const previousJobsPath = resolve(process.cwd(), scriptArgs[1] ?? 'previous-jobs.json');

if (!apiKey || !notificationEmail) {
  console.log('Skipping email alert because RESEND_API_KEY or NOTIFICATION_EMAIL is missing.');
  process.exit(0);
}

const payload = JSON.parse(await readFile(jobsPath, 'utf8'));
const previousPayload = await readPreviousPayload();

if (!previousPayload) {
  console.log('Skipping email alert because no previous deployed feed was available for comparison.');
  process.exit(0);
}

const previousJobIds = new Set((previousPayload.jobs ?? []).map((job) => job.id));
const newJobs = (payload.jobs ?? []).filter((job) => !previousJobIds.has(job.id));
const topJobs = newJobs.slice(0, 10);

if (topJobs.length === 0) {
  console.log('Skipping email alert because there are no new jobs.');
  process.exit(0);
}

const html = `
  <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111827;">
    <h1>RelocateBoard found ${topJobs.length} new Germany job match${topJobs.length === 1 ? '' : 'es'}</h1>
    <p>Generated at ${new Date(payload.generatedAt).toLocaleString('en')}</p>
    <p>Sources: ${payload.sources.join(', ')}</p>
    ${topJobs
      .map(
        (job) => `
          <article style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #2563eb; font-weight: 700;">${job.company}</p>
            <h2 style="margin: 4px 0 8px;">${job.title}</h2>
            <p style="margin: 0 0 8px; color: #4b5563;">${job.location} · ${job.source} · ${job.matchScore}% match</p>
            <p style="margin: 0 0 12px;">${job.skills.slice(0, 4).join(', ')}</p>
            <a href="${job.url}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 14px; border-radius: 10px; text-decoration: none;">Apply</a>
          </article>
        `
      )
      .join('')}
  </div>
`;

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: fromEmail,
    to: notificationEmail,
    subject: `RelocateBoard: ${topJobs.length} new Germany job match${topJobs.length === 1 ? '' : 'es'}`,
    html
  })
});

if (!response.ok) {
  throw new Error(`Resend email failed with ${response.status}: ${await response.text()}`);
}

console.log(`Sent ${topJobs.length} new-job alert${topJobs.length === 1 ? '' : 's'} to ${notificationEmail}`);

async function readPreviousPayload() {
  try {
    return JSON.parse(await readFile(previousJobsPath, 'utf8'));
  } catch {
    return null;
  }
}
