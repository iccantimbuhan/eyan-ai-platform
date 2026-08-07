import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { SalesPaymentMethodEntry } from '../../../types/restaurant-ops'
import { PaymentMethodEntrySection } from './payment-method-entry-section'

const mutateAsync = vi.fn()
const createPosSourceMutateAsync = vi.fn()

vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesPaymentMethods: () => ({
    data: [
      { id: 'cash-id', restaurantId: 'rest-1', name: 'Cash', createdAt: '', updatedAt: '' },
      { id: 'wolt-id', restaurantId: 'rest-1', name: 'Wolt', createdAt: '', updatedAt: '' },
    ],
  }),
  useCreateSalesPaymentMethod: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePosSources: () => ({
    data: [
      { id: 'pos-1-id', restaurantId: 'rest-1', name: 'POS 1', createdAt: '', updatedAt: '' },
      { id: 'pos-2-id', restaurantId: 'rest-1', name: 'POS 2', createdAt: '', updatedAt: '' },
    ],
  }),
  useCreatePosSource: () => ({ mutateAsync: createPosSourceMutateAsync, isPending: false }),
}))

vi.mock('../../../hooks/use-sales', () => ({
  useCreatePaymentMethodEntry: () => ({ mutateAsync, isPending: false }),
  useDeletePaymentMethodEntry: () => ({ mutate: vi.fn(), isPending: false }),
}))

function entry(overrides: Partial<SalesPaymentMethodEntry> = {}): SalesPaymentMethodEntry {
  return {
    id: 'entry-1',
    salesPaymentMethodId: 'cash-id',
    paymentMethodName: 'Cash',
    posSourceId: null,
    posSourceName: null,
    amount: '200.00',
    transactionCount: null,
    createdAt: '',
    ...overrides,
  }
}

describe('PaymentMethodEntrySection', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
    createPosSourceMutateAsync.mockReset()
    createPosSourceMutateAsync.mockResolvedValue({ id: 'new-pos-id', name: 'POS 3' })
  })

  it('shows an empty state when no payment method entries exist yet', async () => {
    const screen = await render(
      <PaymentMethodEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await expect.element(screen.getByText('No payment method entries yet.')).toBeInTheDocument()
  })

  it('renders already-recorded entries', async () => {
    const screen = await render(
      <PaymentMethodEntrySection restaurantId='rest-1' salesId='sales-1' entries={[entry()]} />
    )

    await expect.element(screen.getByText('Cash: €200.00')).toBeInTheDocument()
  })

  it('shows the POS source and transaction count on an entry when present', async () => {
    const screen = await render(
      <PaymentMethodEntrySection
        restaurantId='rest-1'
        salesId='sales-1'
        entries={[entry({ posSourceName: 'POS 1', transactionCount: 20 })]}
      />
    )

    await expect.element(screen.getByText('Cash: €200.00 (POS 1) (20 tx)')).toBeInTheDocument()
  })

  it('shows the same payment method entered separately under two different POS sources on the same day', async () => {
    const screen = await render(
      <PaymentMethodEntrySection
        restaurantId='rest-1'
        salesId='sales-1'
        entries={[
          entry({ id: 'entry-1', salesPaymentMethodId: 'wolt-id', paymentMethodName: 'Wolt', posSourceName: 'POS 1', amount: '100.00' }),
          entry({ id: 'entry-2', salesPaymentMethodId: 'wolt-id', paymentMethodName: 'Wolt', posSourceName: 'POS 2', amount: '50.00' }),
        ]}
      />
    )

    await expect.element(screen.getByText('Wolt: €100.00 (POS 1)')).toBeInTheDocument()
    await expect.element(screen.getByText('Wolt: €50.00 (POS 2)')).toBeInTheDocument()
  })

  it('submits a new payment method entry with no POS source for the given sales record', async () => {
    const screen = await render(
      <PaymentMethodEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await screen.getByRole('combobox', { name: 'Payment method' }).click()
    await screen.getByRole('option', { name: 'Cash' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '200.00')
    await screen.getByRole('button', { name: 'Add payment method entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith({
      salesId: 'sales-1',
      salesPaymentMethodId: 'cash-id',
      amount: 200,
      posSourceId: undefined,
      transactionCount: undefined,
    })
  })

  it('submits a payment method entry with a selected POS source and transaction count — Wolt reported under POS 1', async () => {
    const screen = await render(
      <PaymentMethodEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await screen.getByRole('combobox', { name: 'Payment method' }).click()
    await screen.getByRole('option', { name: 'Wolt' }).click()
    await screen.getByRole('combobox', { name: 'POS source' }).click()
    await screen.getByRole('option', { name: 'POS 1' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '100.00')
    await userEvent.fill(screen.getByPlaceholder('Tx #'), '10')
    await screen.getByRole('button', { name: 'Add payment method entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith({
      salesId: 'sales-1',
      salesPaymentMethodId: 'wolt-id',
      amount: 100,
      posSourceId: 'pos-1-id',
      transactionCount: 10,
    })
  })

  it('allows adding a new POS source inline', async () => {
    const screen = await render(
      <PaymentMethodEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await userEvent.fill(screen.getByPlaceholder('New POS source (e.g. POS 1)'), 'POS 3')
    await screen.getByRole('button', { name: 'Add POS Source' }).click()

    expect(createPosSourceMutateAsync).toHaveBeenCalledWith('POS 3')
  })
})
