import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LeadCaptureForm } from './lead-capture-form'

const mutate = vi.fn()
let mockMutationState: {
  isPending: boolean
  isSuccess: boolean
  reset: () => void
}

vi.mock('../hooks/use-submit-lead', () => ({
  useSubmitLead: () => ({
    mutate,
    isPending: mockMutationState.isPending,
    isSuccess: mockMutationState.isSuccess,
    reset: mockMutationState.reset,
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('LeadCaptureForm', () => {
  let screen: RenderResult

  beforeEach(() => {
    mutate.mockReset()
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      reset: vi.fn(),
    }
  })

  it('renders every field the brief requested, mapped onto the backend contract', async () => {
    screen = await render(<LeadCaptureForm />)

    for (const label of [
      /^Full Name$/i,
      /^Email$/i,
      /^Phone$/i,
      /^Company$/i,
      /^Country$/i,
      /^Website$/i,
      /^Company Size$/i,
      /^Budget$/i,
      /^Service Interested In$/i,
      /^Message$/i,
    ]) {
      await expect.element(screen.getByLabelText(label)).toBeInTheDocument()
    }

    await expect
      .element(screen.getByRole('button', { name: /^Send Message$/i }))
      .toBeInTheDocument()
  })

  it('submits only the populated fields, mapping "Service Interested In" onto industry', async () => {
    screen = await render(<LeadCaptureForm />)

    await userEvent.fill(screen.getByLabelText(/^Full Name$/i), 'Jane Doe')
    await userEvent.fill(screen.getByLabelText(/^Email$/i), 'jane@example.com')
    await userEvent.click(screen.getByRole('button', { name: /^Send Message$/i }))

    expect(mutate).toHaveBeenCalledWith(
      { contactName: 'Jane Doe', email: 'jane@example.com' },
      expect.any(Object)
    )
  })

  it('submits every field when fully filled in', async () => {
    screen = await render(<LeadCaptureForm />)

    await userEvent.fill(screen.getByLabelText(/^Full Name$/i), 'Jane Doe')
    await userEvent.fill(screen.getByLabelText(/^Email$/i), 'jane@example.com')
    await userEvent.fill(screen.getByLabelText(/^Phone$/i), '555-1234')
    await userEvent.fill(screen.getByLabelText(/^Company$/i), 'Acme Inc.')
    await userEvent.fill(screen.getByLabelText(/^Country$/i), 'United States')
    await userEvent.fill(screen.getByLabelText(/^Website$/i), 'https://acme.com')
    await userEvent.fill(
      screen.getByLabelText(/^Service Interested In$/i),
      'AI Automation'
    )
    await userEvent.fill(
      screen.getByLabelText(/^Message$/i),
      'We need help automating our sales pipeline.'
    )
    await userEvent.click(screen.getByRole('button', { name: /^Send Message$/i }))

    expect(mutate).toHaveBeenCalledWith(
      {
        contactName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-1234',
        company: 'Acme Inc.',
        country: 'United States',
        website: 'https://acme.com',
        industry: 'AI Automation',
        message: 'We need help automating our sales pipeline.',
      },
      expect.any(Object)
    )
  })

  it('rejects submission without a valid email', async () => {
    screen = await render(<LeadCaptureForm />)

    await userEvent.fill(screen.getByLabelText(/^Full Name$/i), 'Jane Doe')
    await userEvent.fill(screen.getByLabelText(/^Email$/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /^Send Message$/i }))

    expect(mutate).not.toHaveBeenCalled()
    await expect
      .element(screen.getByText(/valid email/i))
      .toBeInTheDocument()
  })

  it('shows a pending state while submitting', async () => {
    mockMutationState.isPending = true
    screen = await render(<LeadCaptureForm />)

    const pendingButton = screen.getByRole('button', { name: /Sending/i })
    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows a confirmation panel instead of the form once submitted', async () => {
    mockMutationState.isSuccess = true
    screen = await render(<LeadCaptureForm />)

    await expect
      .element(screen.getByText(/Message received\./i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText(/^Full Name$/i))
      .not.toBeInTheDocument()
  })
})
