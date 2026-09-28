import * as Sentry from '@sentry/react';
import {
  getOptionalServicesChoice,
  OPTIONAL_SERVICES_CONSENT_EVENT,
  type OptionalServicesChoice,
} from './optional-services';

let sentryInitialized = false;
let sentryInitializationPending = false;
const isReplaySafePage =
  window.location.search.length === 0 &&
  !/^\/(?:admin|login|registrieren|konto|passwort-zuruecksetzen)(?:\/|$)/.test(window.location.pathname);

function stripUrlParameters(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export async function initializeSentry(consentGranted = getOptionalServicesChoice() === 'accepted'): Promise<void> {
  if (!consentGranted || sentryInitialized || sentryInitializationPending) return;

  sentryInitializationPending = true;

  try {
    const response = await fetch('/api/public-config', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;

    const config = (await response.json()) as { sentryDsn?: unknown };
    if (typeof config.sentryDsn !== 'string' || config.sentryDsn.length === 0) return;
    if (getOptionalServicesChoice() !== 'accepted') return;

    Sentry.init({
      dsn: config.sentryDsn,
      environment: import.meta.env.MODE,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: { request: false, response: false },
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
      integrations: [
        Sentry.browserTracingIntegration(),
        ...(isReplaySafePage
          ? [
              Sentry.replayIntegration({
                maskAllText: true,
                maskAllInputs: true,
                blockAllMedia: true,
              }),
            ]
          : []),
      ],
      tracePropagationTargets: [/^https?:\/\/[^/]+\/api(?:\/|$)/],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: isReplaySafePage ? 0.05 : 0,
      replaysOnErrorSampleRate: isReplaySafePage ? 1 : 0,
      beforeSend(event) {
        if (event.request?.url) {
          event.request.url = stripUrlParameters(event.request.url);
        }

        for (const breadcrumb of event.breadcrumbs ?? []) {
          const data = breadcrumb.data;
          if (!data) continue;

          for (const key of ['url', 'from', 'to']) {
            const value = data[key];
            if (typeof value === 'string') {
              data[key] = stripUrlParameters(value);
            }
          }
        }

        return event;
      },
    });

    sentryInitialized = true;
  } catch {
    // Sentry must not affect availability if its config endpoint is unavailable.
  } finally {
    sentryInitializationPending = false;
  }
}

export function applyOptionalServicesChoice(choice: OptionalServicesChoice): void {
  if (choice === 'accepted') {
    void initializeSentry(true);
    return;
  }

  if (sentryInitialized) {
    sentryInitialized = false;
    void Sentry.close(2000);
  }
}

if (typeof window !== 'undefined') {
  void initializeSentry();
  window.addEventListener(OPTIONAL_SERVICES_CONSENT_EVENT, (event) => {
    applyOptionalServicesChoice((event as CustomEvent<OptionalServicesChoice>).detail);
  });
}
