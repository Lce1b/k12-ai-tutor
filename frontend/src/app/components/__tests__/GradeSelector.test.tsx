/**
 * Tests for GradeSelector component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GradeSelector from '../GradeSelector'

describe('GradeSelector', () => {
  it('renders all four grade options', () => {
    render(<GradeSelector grade="middle" onGradeChange={() => {}} />)

    expect(screen.getByText('小学低年级')).toBeInTheDocument()
    expect(screen.getByText('小学高年级')).toBeInTheDocument()
    expect(screen.getByText('初中')).toBeInTheDocument()
    expect(screen.getByText('高中')).toBeInTheDocument()
  })

  it('renders grade descriptions', () => {
    render(<GradeSelector grade="middle" onGradeChange={() => {}} />)

    expect(screen.getByText('1-3年级')).toBeInTheDocument()
    expect(screen.getByText('4-6年级')).toBeInTheDocument()
    expect(screen.getByText('7-9年级')).toBeInTheDocument()
    expect(screen.getByText('10-12年级')).toBeInTheDocument()
  })

  it('renders grade icons', () => {
    render(<GradeSelector grade="middle" onGradeChange={() => {}} />)

    expect(screen.getByText('🌱')).toBeInTheDocument()
    expect(screen.getByText('🌿')).toBeInTheDocument()
    expect(screen.getByText('🌳')).toBeInTheDocument()
    expect(screen.getByText('🌲')).toBeInTheDocument()
  })

  it('calls onGradeChange when a grade button is clicked', () => {
    const handleChange = vi.fn()
    render(<GradeSelector grade="middle" onGradeChange={handleChange} />)

    fireEvent.click(screen.getByText('高中'))
    expect(handleChange).toHaveBeenCalledWith('high')
  })

  it('calls onGradeChange for primary low', () => {
    const handleChange = vi.fn()
    render(<GradeSelector grade="middle" onGradeChange={handleChange} />)

    fireEvent.click(screen.getByText('小学低年级'))
    expect(handleChange).toHaveBeenCalledWith('primary_low')
  })

  it('renders title section header', () => {
    render(<GradeSelector grade="middle" onGradeChange={() => {}} />)

    expect(screen.getByText('年级选择')).toBeInTheDocument()
  })

  it('active grade has visually different styling', () => {
    const { container } = render(<GradeSelector grade="primary_low" onGradeChange={() => {}} />)

    // The first button should have the active class
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(4)
    // First button (primary_low) has active classes
    expect(buttons[0].className).toContain('bg-edu-primary')
  })
})
