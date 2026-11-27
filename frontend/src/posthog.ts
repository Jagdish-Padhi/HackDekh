import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST
export const isPostHogEnabled = Boolean(posthogKey && posthogHost)

if (!posthogKey || !posthogHost) {
  if (import.meta.env.DEV) {
    const missingVariable = !posthogKey ? 'VITE_POSTHOG_KEY' : 'VITE_POSTHOG_HOST'
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    )
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-08-30',
    logs: {
      serviceName: 'hackdekh-frontend',
      environment: import.meta.env.MODE,
    },
  })
}

export const posthogLog = posthog.logger

export default posthog
