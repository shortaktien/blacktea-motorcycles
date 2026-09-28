export type OptionalServicesChoice = 'accepted' | 'rejected';

export const OPTIONAL_SERVICES_CONSENT_KEY = 'btm-cookie-consent-v2';
export const OPTIONAL_SERVICES_CONSENT_EVENT = 'btm-cookie-consent-changed';

export function getOptionalServicesChoice(): OptionalServicesChoice | null {
  if (typeof window === 'undefined') return null;

  try {
    const choice = window.localStorage.getItem(OPTIONAL_SERVICES_CONSENT_KEY);
    return choice === 'accepted' || choice === 'rejected' ? choice : null;
  } catch {
    return null;
  }
}

export function setOptionalServiceConsent(choice: OptionalServicesChoice): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(OPTIONAL_SERVICES_CONSENT_KEY, choice);
  } catch {
    // A blocked local storage must never break the website or the login flow.
  }

  document.documentElement.dataset.optionalServices = choice === 'accepted' ? 'allowed' : 'blocked';
  window.dispatchEvent(new CustomEvent(OPTIONAL_SERVICES_CONSENT_EVENT, { detail: choice }));
}
