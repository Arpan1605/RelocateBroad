import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiKey = process.env.RESEND_API_KEY;
const notificationEmail = process.env.NOTIFICATION_EMAIL;
const fromEmail = process.env.FROM_EMAIL ?? 'RelocateBoard <onboarding@resend.dev>';
const jobsPath = resolve(process.cwd(), process.argv[2] ?? 'apps/web/public/jobs.json');

if (!apiKey || !notificationEmail) {
  console.log('Skipping email digest because RESEND_API_KEY or NOTIFICATION_EMAIL is missing.');
  process.exit(0);
}

const payload = JSON.parse(await readFile(jobsPath, 'utf8'));
const topJobs = payload.jobs.slice(0, 10);

const html = `
  <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111827;">
    <h1>RelocateBoard daily Germany job digest</h1>
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
    subject: `RelocateBoard: ${topJobs.length} top Germany job matches`,
    html
  })
});

if (!response.ok) {
  throw new Error(`Resend email failed with ${response.status}: ${await response.text()}`);
}

console.log(`Sent daily digest to ${notificationEmail}`);
