import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LineChart } from '@/components/insights'
import { StoryTimeline } from '@/components/StoryTimeline'

describe('StoryTimeline', () => {
  it('starts on the monthly view', () => {
    render(<StoryTimeline />)
    expect(screen.getByText('Your story, told a month at a time')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'August' })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Monthly' }) as HTMLInputElement).checked).toBe(true)
  })

  it('switches granularity', () => {
    render(<StoryTimeline />)
    fireEvent.click(screen.getByRole('radio', { name: 'Weekly' }))
    expect(screen.getByText('Your story, told a week at a time')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Aug 18 – 24' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'August' })).toBeNull()
  })
})

describe('LineChart', () => {
  const points = [
    { label: 'Mon', score: 0 },
    { label: 'Tue', score: 50 },
    { label: 'Wed', score: 100 },
  ]

  it('labels the chart for screen readers', () => {
    render(<LineChart id="t" label="Mood this week" points={points} color="sage" />)
    expect(screen.getByLabelText('Mood this week')).toBeTruthy()
  })

  it('draws one dot per point, spread across the width', () => {
    const { container } = render(
      <LineChart id="t" label="Mood" points={points} color="sage" dots />,
    )
    const dots = [
      ...container.querySelectorAll<HTMLElement>('span[aria-hidden="true"].rounded-full'),
    ]
    expect(dots).toHaveLength(3)
    const lefts = dots.map((dot) => Number.parseFloat(dot.style.left))
    expect(lefts[0]).toBeLessThan(lefts[1])
    expect(lefts[1]).toBeLessThan(lefts[2])
    // A higher score sits higher on the chart.
    const tops = dots.map((dot) => Number.parseFloat(dot.style.top))
    expect(tops[2]).toBeLessThan(tops[1])
    expect(tops[1]).toBeLessThan(tops[0])
  })
})
