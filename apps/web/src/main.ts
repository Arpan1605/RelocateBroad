import { AsyncPipe, JsonPipe } from '@angular/common';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { ApplicationConfig, Component, Injectable, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, RouterLink, RouterOutlet } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { providePrimeNG } from 'primeng/config';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { catchError, map, of, shareReplay } from 'rxjs';

type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  postedDate: string;
  matchScore: number;
  skills: string[];
  url: string;
  status: ApplicationStatus;
}

const fallbackJobs: Job[] = [
  {
    id: 'sap-product-designer',
    company: 'SAP',
    title: 'Product Designer',
    location: 'Berlin',
    postedDate: new Date().toISOString(),
    matchScore: 92,
    skills: ['Figma', 'Design Systems', 'Product Thinking'],
    url: 'https://jobs.sap.com',
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
    status: 'interview'
  }
];

@Injectable({ providedIn: 'root' })
class JobsService {
  private readonly http = inject(HttpClient);

  readonly jobs$ = this.http.get<{ data: Job[] }>('http://localhost:4000/api/jobs').pipe(
    map((response) => response.data),
    catchError(() => of(fallbackJobs)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

function formatPostedDate(postedDate: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(postedDate));
}

@Component({
  selector: 'rb-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, ButtonModule],
  template: `
    <div class="min-h-screen">
      <aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 lg:block">
        <div class="mb-10">
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-brand">RelocateBoard</p>
          <h1 class="mt-3 text-2xl font-bold text-ink">Germany Job Radar</h1>
        </div>
        <nav class="space-y-2">
          <a routerLink="/" class="block rounded-2xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-100">Dashboard</a>
          <a routerLink="/jobs" class="block rounded-2xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-100">Jobs</a>
          <a routerLink="/tracker" class="block rounded-2xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-100">Tracker</a>
          <a routerLink="/settings" class="block rounded-2xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-100">Settings</a>
        </nav>
      </aside>

      <main class="lg:ml-64">
        <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-500">Personal-first SaaS MVP</p>
              <h2 class="text-xl font-bold text-ink">Find, score, and track Germany roles</h2>
            </div>
            <button pButton label="Import Job" icon="pi pi-plus" class="hidden sm:inline-flex"></button>
          </div>
        </header>
        <section class="p-6">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `
})
class AppComponent {}

@Component({
  selector: 'rb-dashboard',
  standalone: true,
  imports: [AsyncPipe, CardModule, ProgressBarModule, TagModule],
  template: `
    <div class="grid gap-6">
      <section class="grid gap-4 md:grid-cols-5">
        @for (metric of metrics; track metric.label) {
          <p-card>
            <p class="text-sm text-slate-500">{{ metric.label }}</p>
            <p class="mt-2 text-3xl font-bold text-ink">{{ metric.value }}</p>
          </p-card>
        }
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <p-card>
          <ng-template pTemplate="title">Top Match</ng-template>
          @if (topJob$ | async; as topJob) {
            <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-lg font-semibold">{{ topJob.company }}</p>
                <h3 class="mt-1 text-3xl font-bold">{{ topJob.title }}</h3>
                <p class="mt-2 text-slate-500">{{ topJob.location }} · Posted {{ formatDate(topJob.postedDate) }}</p>
              </div>
              <div class="min-w-52">
                <p class="mb-2 text-sm font-medium text-slate-600">Match Score: {{ topJob.matchScore }}%</p>
                <p-progressBar [value]="topJob.matchScore"></p-progressBar>
              </div>
            </div>
          }
        </p-card>

        <p-card>
          <ng-template pTemplate="title">Profile Fit</ng-template>
          <div class="space-y-3">
            <p-tag value="UX/UI Designer" severity="info"></p-tag>
            <p-tag value="Angular" severity="success"></p-tag>
            <p-tag value="English roles" severity="secondary"></p-tag>
          </div>
        </p-card>
      </section>
    </div>
  `
})
class DashboardComponent {
  private readonly jobsService = inject(JobsService);

  readonly topJob$ = this.jobsService.jobs$.pipe(map((jobList) => jobList[0]));
  readonly formatDate = formatPostedDate;
  readonly metrics = [
    { label: 'New Today', value: 18 },
    { label: 'New This Week', value: 74 },
    { label: 'Saved', value: 23 },
    { label: 'Applied', value: 12 },
    { label: 'Interviews', value: 2 }
  ];
}

@Component({
  selector: 'rb-jobs',
  standalone: true,
  imports: [AsyncPipe, ButtonModule, CardModule, ChipModule, ProgressBarModule],
  template: `
    <div class="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside class="rounded-3xl bg-white p-5 shadow-sm">
        <h3 class="font-bold">Filters</h3>
        <div class="mt-5 space-y-5">
          <div>
            <p class="mb-3 text-sm font-medium text-slate-500">Roles</p>
            <div class="flex flex-wrap gap-2">
              @for (role of roles; track role) {
                <p-chip [label]="role"></p-chip>
              }
            </div>
          </div>
          <div>
            <p class="mb-3 text-sm font-medium text-slate-500">Locations</p>
            <div class="flex flex-wrap gap-2">
              @for (location of locations; track location) {
                <p-chip [label]="location"></p-chip>
              }
            </div>
          </div>
        </div>
      </aside>

      <section class="grid gap-4">
        @if (jobs$ | async; as jobs) {
          @for (job of jobs; track job.id) {
            <p-card>
              <div class="grid gap-5 md:grid-cols-[1fr_220px] md:items-center">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{{ job.company }}</p>
                  <h3 class="mt-2 text-2xl font-bold">{{ job.title }}</h3>
                  <p class="mt-1 text-slate-500">{{ job.location }} · Posted {{ formatDate(job.postedDate) }}</p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    @for (skill of job.skills; track skill) {
                      <span class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">✔ {{ skill }}</span>
                    }
                  </div>
                </div>
                <div>
                  <p class="mb-2 text-sm font-medium text-slate-600">Match Score: {{ job.matchScore }}%</p>
                  <p-progressBar [value]="job.matchScore"></p-progressBar>
                  <div class="mt-4 flex gap-2">
                    <a pButton label="Apply" icon="pi pi-external-link" [href]="job.url" target="_blank"></a>
                    <button pButton label="Save" severity="secondary" icon="pi pi-bookmark"></button>
                  </div>
                </div>
              </div>
            </p-card>
          } @empty {
            <p-card>
              <p class="text-slate-500">No jobs found yet. Import your first Germany role to begin.</p>
            </p-card>
          }
        }
      </section>
    </div>
  `
})
class JobsComponent {
  private readonly jobsService = inject(JobsService);

  readonly jobs$ = this.jobsService.jobs$;
  readonly formatDate = formatPostedDate;
  readonly roles = ['Product Designer', 'UX Designer', 'UI Designer', 'UX/UI Designer', 'Angular Developer', 'Frontend Developer'];
  readonly locations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Remote', 'English Only'];
}

@Component({
  selector: 'rb-tracker',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (columns$ | async; as columns) {
      <div class="grid gap-4 xl:grid-cols-5">
        @for (column of columns; track column.status) {
          <section class="min-h-96 rounded-3xl bg-white p-4 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-bold">{{ column.label }}</h3>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{{ column.jobs.length }}</span>
            </div>
            <div class="space-y-3">
              @for (job of column.jobs; track job.id) {
                <article class="rounded-2xl border border-slate-200 p-4">
                  <p class="text-sm font-semibold text-brand">{{ job.company }}</p>
                  <h4 class="mt-1 font-bold">{{ job.title }}</h4>
                  <p class="mt-1 text-sm text-slate-500">{{ job.location }}</p>
                  <p class="mt-3 text-sm font-semibold">{{ job.matchScore }}% match</p>
                </article>
              }
            </div>
          </section>
        }
      </div>
    }
  `
})
class TrackerComponent {
  private readonly jobsService = inject(JobsService);

  readonly columns$ = this.jobsService.jobs$.pipe(
    map((jobList) => [
      { label: 'Saved', status: 'saved', jobs: jobList.filter((job) => job.status === 'saved') },
      { label: 'Applied', status: 'applied', jobs: jobList.filter((job) => job.status === 'applied') },
      { label: 'Interview', status: 'interview', jobs: jobList.filter((job) => job.status === 'interview') },
      { label: 'Offer', status: 'offer', jobs: jobList.filter((job) => job.status === 'offer') },
      { label: 'Rejected', status: 'rejected', jobs: jobList.filter((job) => job.status === 'rejected') }
    ])
  );
}

@Component({
  selector: 'rb-settings',
  standalone: true,
  imports: [JsonPipe],
  template: `
    <section class="max-w-3xl rounded-3xl bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Matching Profile</p>
      <h3 class="mt-2 text-2xl font-bold">Your Germany relocation profile</h3>
      <pre class="mt-5 overflow-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">{{ profile | json }}</pre>
    </section>
  `
})
class SettingsComponent {
  readonly profile = {
    experience: 5,
    role: 'UX/UI Designer',
    skills: ['Figma', 'Adobe XD', 'Angular', 'HTML', 'CSS', 'Design Systems'],
    scoring: {
      roleMatch: '40%',
      skillsMatch: '30%',
      experienceMatch: '20%',
      languageMatch: '10%'
    }
  };
}

const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: Aura
      }
    }),
    provideRouter([
      { path: '', component: DashboardComponent },
      { path: 'jobs', component: JobsComponent },
      { path: 'tracker', component: TrackerComponent },
      { path: 'settings', component: SettingsComponent }
    ])
  ]
};

bootstrapApplication(AppComponent, appConfig).catch((error) => console.error(error));
