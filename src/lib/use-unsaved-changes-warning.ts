import { useEffect } from 'react'

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave without saving?'

/**
 * Warns before the user leaves a page with unsaved changes (`when` is true).
 *
 * - Closing, reloading or leaving the site shows the browser's own prompt.
 * - Clicking an in-app link asks first and cancels the navigation on "Cancel". The App Router has
 *   no route-change events, so this intercepts the click before Next's `Link` handles it.
 *
 * The browser Back button can't be intercepted this way and still leaves without asking.
 */
export function useUnsavedChangesWarning(when: boolean, message = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!when) return

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      // Chrome only shows the prompt when `returnValue` is set
      event.returnValue = ''
    }

    function onClick(event: MouseEvent) {
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (event.defaultPrevented || event.button !== 0 || modified) return

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const destination = new URL(anchor.href, window.location.href)
      // Other sites trigger `beforeunload` instead, so asking here too would prompt twice
      if (destination.origin !== window.location.origin) return
      // A link to this same page (or a hash on it) doesn't leave anything behind
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return
      }

      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [when, message])
}
