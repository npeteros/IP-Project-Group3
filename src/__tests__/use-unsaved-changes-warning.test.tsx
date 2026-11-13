// The hook works on raw anchors in the DOM, so these tests use plain <a> elements on purpose
// oxlint-disable nextjs/no-html-link-for-pages
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesWarning,
} from '@/src/lib/use-unsaved-changes-warning'

function Harness({ when }: { when: boolean }) {
  useUnsavedChangesWarning(when)
  return (
    <>
      <a href="/journal">Journal</a>
      <a href="/journal/new">Same page</a>
      <a href="/journal/new#top">Same page hash</a>
      <a href="/journal/new?x=1">Same path, other query</a>
      <a href="https://example.com/">External</a>
      <a href="/new-tab" target="_blank">
        New tab
      </a>
      <a href="/file" download>
        Download
      </a>
    </>
  )
}

/**
 * Clicks a link and reports whether the click got through to the link itself. The warning
 * stops a cancelled click before it reaches the link, so `reached` is the "navigation went ahead"
 * signal. The click is cancelled at the link to keep jsdom from trying to navigate.
 */
function click(name: string, init: MouseEventInit = {}) {
  const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent === name)!
  const reached = vi.fn((event: Event) => event.preventDefault())
  link.addEventListener('click', reached)
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
  link.dispatchEvent(event)
  return {
    reached: reached.mock.calls.length > 0,
    cancelled: event.defaultPrevented && reached.mock.calls.length === 0,
  }
}

function beforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useUnsavedChangesWarning', () => {
  describe('with unsaved changes', () => {
    it('shows the browser prompt before the page unloads', () => {
      render(<Harness when />)
      expect(beforeUnload().defaultPrevented).toBe(true)
    })

    it('asks before following an in-app link, and stays put on "Cancel"', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      render(<Harness when />)

      const result = click('Journal')

      expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE)
      expect(result.reached).toBe(false)
      expect(result.cancelled).toBe(true)
    })

    it('lets the link through when the user confirms', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      render(<Harness when />)

      expect(click('Journal').reached).toBe(true)
      expect(confirm).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['a link to this same page', 'Same page'],
      ['a hash on this page', 'Same page hash'],
    ])('does not ask for %s', (_label, name) => {
      // jsdom's location is http://localhost:3000/ so point the page at the link's path first
      window.history.replaceState(null, '', '/journal/new')
      const confirm = vi.spyOn(window, 'confirm')
      render(<Harness when />)

      expect(click(name).reached).toBe(true)
      expect(confirm).not.toHaveBeenCalled()
    })

    it('asks for the same path with a different query string', () => {
      window.history.replaceState(null, '', '/journal/new')
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      render(<Harness when />)

      click('Same path, other query')

      expect(confirm).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['an external link (the browser prompt covers it)', 'External', {}],
      ['a link that opens a new tab', 'New tab', {}],
      ['a download link', 'Download', {}],
      ['a ctrl-click', 'Journal', { ctrlKey: true }],
      ['a cmd-click', 'Journal', { metaKey: true }],
      ['a shift-click', 'Journal', { shiftKey: true }],
      ['a middle-click', 'Journal', { button: 1 }],
    ])('does not ask for %s', (_label, name, init) => {
      const confirm = vi.spyOn(window, 'confirm')
      render(<Harness when />)

      expect(click(name, init).reached).toBe(true)
      expect(confirm).not.toHaveBeenCalled()
    })
  })

  describe('without unsaved changes', () => {
    it('never prompts', () => {
      const confirm = vi.spyOn(window, 'confirm')
      render(<Harness when={false} />)

      expect(beforeUnload().defaultPrevented).toBe(false)
      expect(click('Journal').reached).toBe(true)
      expect(confirm).not.toHaveBeenCalled()
    })
  })

  it('stops warning once the changes are saved', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { rerender } = render(<Harness when />)
    expect(beforeUnload().defaultPrevented).toBe(true)

    rerender(<Harness when={false} />)

    expect(beforeUnload().defaultPrevented).toBe(false)
    expect(click('Journal').reached).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('removes its listeners on unmount', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { unmount } = render(<Harness when />)
    const link = document.createElement('a')
    link.href = '/journal'
    // Keep jsdom from trying to navigate when nothing cancels the click
    link.addEventListener('click', (event) => event.preventDefault())
    document.body.append(link)
    unmount()

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))

    expect(beforeUnload().defaultPrevented).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    link.remove()
  })
})
