import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ChangePasswordRow,
  DeleteAllData,
  ExportCard,
  LanguageGroup,
  RemindersGroup,
} from '@/components/settings'

describe('LanguageGroup', () => {
  it('warns about AI accuracy only for non-English languages', () => {
    render(<LanguageGroup />)
    expect(screen.queryByText(/AI features are tuned for English/)).toBeNull()
    fireEvent.change(screen.getByLabelText('App language'), { target: { value: 'ja' } })
    expect(screen.getByText(/AI features are tuned for English/)).toBeTruthy()
  })
})

describe('RemindersGroup', () => {
  it('disables the reminder time when reminders are off', () => {
    render(<RemindersGroup />)
    const time = screen.getByLabelText('Reminder time') as HTMLInputElement
    expect(time.disabled).toBe(false)
    fireEvent.click(screen.getByRole('switch', { name: 'Daily reminder' }))
    expect(time.disabled).toBe(true)
  })
})

describe('ChangePasswordRow', () => {
  it('expands into a form and says it is not connected yet', () => {
    render(<ChangePasswordRow />)
    const toggle = screen.getByRole('button', { name: 'Change password' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('New password')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    expect(screen.getByText(/isn.t connected yet/)).toBeTruthy()
  })
})

describe('ExportCard', () => {
  it('names the export after the chosen format', () => {
    render(<ExportCard />)
    expect(screen.getByRole('button', { name: /Export \.md/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'JSON' }))
    expect(screen.getByRole('button', { name: /Export \.json/ })).toBeTruthy()
  })
})

describe('DeleteAllData', () => {
  it('asks for confirmation and never claims to have deleted anything', () => {
    render(<DeleteAllData />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/can.t be undone/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }))
    expect(screen.getByText(/nothing was deleted/)).toBeTruthy()
  })

  it('can be cancelled', () => {
    render(<DeleteAllData />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })
})
