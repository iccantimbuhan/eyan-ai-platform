import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { CashReconciliation, SalesPaymentMethodEntry } from '../../../types/restaurant-ops'
import { CashReconciliationCard } from './cash-reconciliation-card'

function entry(overrides: Partial<SalesPaymentMethodEntry> = {}): SalesPaymentMethodEntry {
  return {
    id: 'entry-1',
    salesPaymentMethodId: 'method-1',
    paymentMethodName: 'Cash',
    posSourceId: null,
    posSourceName: null,
    amount: '100.00',
    transactionCount: null,
    isCashEquivalent: true,
    createdAt: '2026-08-08T00:00:00.000Z',
    ...overrides,
  }
}

function cashReconciliation(overrides: Partial<CashReconciliation> = {}): CashReconciliation {
  return {
    physicalCashBasis: '0.00',
    cardElectronicTotal: '0.00',
    totalPaymentMethods: '0.00',
    manualDiscounts: '0.00',
    cashDiscountTotal: null,
    electronicDiscountTotal: null,
    discountPosSourceId: null,
    discountPosSourceName: null,
    cashByPosSource: [],
    expectedCash: '0.00',
    actualCashCounted: null,
    discrepancy: null,
    status: 'NOT_COUNTED',
    ...overrides,
  }
}

describe('CashReconciliationCard', () => {
  // The approved business rule's own worked scenario: POS 1 (Trust Pay/Card
  // Payment + Cash Draw) absorbs the €61.35 discount; POS 2 (Bolt Cash)
  // must NOT visually or mathematically show that discount applied to it.
  it('shows the discount applied only under the discount-scoped POS bucket, never the other one', async () => {
    const paymentMethods = [
      entry({
        id: 'pm-1',
        paymentMethodName: 'Trust Pay/Card Payment',
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        amount: '321.00',
      }),
      entry({
        id: 'pm-2',
        paymentMethodName: 'Cash Draw',
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        amount: '259.65',
      }),
      entry({
        id: 'pm-3',
        paymentMethodName: 'Bolt Cash',
        posSourceId: 'pos-2',
        posSourceName: 'POS 2',
        amount: '251.98',
      }),
    ]

    const cash = cashReconciliation({
      physicalCashBasis: '832.63',
      manualDiscounts: '61.35',
      discountPosSourceId: 'pos-1',
      discountPosSourceName: 'POS 1',
      cashByPosSource: [
        { posSourceId: 'pos-1', posSourceName: 'POS 1', grossCashBasis: '580.65', discountApplied: '61.35', expectedCash: '519.30' },
        { posSourceId: 'pos-2', posSourceName: 'POS 2', grossCashBasis: '251.98', discountApplied: '0.00', expectedCash: '251.98' },
      ],
      expectedCash: '771.28',
      actualCashCounted: '324.73',
      discrepancy: '-446.55',
      status: 'SHORT',
    })

    const screen = await render(
      <CashReconciliationCard cashReconciliation={cash} paymentMethods={paymentMethods} />
    )

    await expect.element(screen.getByText('Discountable Physical Cash — POS 1')).toBeInTheDocument()
    await expect.element(screen.getByText('Non-Discountable Physical Cash — POS 2')).toBeInTheDocument()

    // POS 1's own gross/discount/expected trio.
    await expect.element(screen.getByText('€580.65')).toBeInTheDocument()
    await expect.element(screen.getByText('−€61.35')).toBeInTheDocument()
    await expect.element(screen.getByText('€519.30')).toBeInTheDocument()

    // POS 2 shows only its gross figure (once for the Bolt Cash line item,
    // once for the "POS 2 Cash Basis" total) — never a discounted line.
    await expect.element(screen.getByText('€251.98').first()).toBeInTheDocument()

    await expect.element(screen.getByText('€771.28')).toBeInTheDocument()
    await expect.element(screen.getByText('€324.73')).toBeInTheDocument()
    await expect.element(screen.getByText('€-446.55')).toBeInTheDocument()
    await expect.element(screen.getByText('Short')).toBeInTheDocument()
  })

  it('labels every bucket neutrally, with no discount line anywhere, when the discount is not scoped to a POS source (legacy/global)', async () => {
    const paymentMethods = [
      entry({ id: 'pm-1', paymentMethodName: 'Cash', posSourceId: null, posSourceName: null, amount: '100.00' }),
    ]
    const cash = cashReconciliation({
      physicalCashBasis: '100.00',
      manualDiscounts: '10.00',
      discountPosSourceId: null,
      discountPosSourceName: null,
      cashByPosSource: [
        { posSourceId: null, posSourceName: null, grossCashBasis: '100.00', discountApplied: '0.00', expectedCash: '100.00' },
      ],
      expectedCash: '90.00',
    })

    const screen = await render(
      <CashReconciliationCard cashReconciliation={cash} paymentMethods={paymentMethods} />
    )

    await expect.element(screen.getByText('Physical Cash — Not assigned to a POS source')).toBeInTheDocument()
    await expect.element(screen.getByText('Manual Discounts Today (all POS sources)')).toBeInTheDocument()
    await expect.element(screen.getByText('€90.00')).toBeInTheDocument()
  })

  // ADR-0043 second amendment — the current restaurant's exact worked
  // example: a combined discount split into a cash portion (reduces
  // physical cash) and an electronic portion (shown next to the card
  // payment method, never subtracted from cash).
  it('shows only the cash-discount portion reducing cash, and the electronic portion next to card/electronic payments', async () => {
    const paymentMethods = [
      entry({
        id: 'pm-1',
        paymentMethodName: 'Cash Draw',
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        amount: '122.20',
        isCashEquivalent: true,
      }),
      entry({
        id: 'pm-2',
        paymentMethodName: 'Trust Pay/Card Payment',
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        amount: '199.00',
        isCashEquivalent: false,
      }),
      entry({
        id: 'pm-3',
        paymentMethodName: 'Bolt Cash',
        posSourceId: 'pos-2',
        posSourceName: 'POS 2',
        amount: '251.98',
        isCashEquivalent: true,
      }),
    ]

    const cash = cashReconciliation({
      physicalCashBasis: '374.18',
      cardElectronicTotal: '199.00',
      totalPaymentMethods: '573.18',
      manualDiscounts: '61.35',
      cashDiscountTotal: '49.45',
      electronicDiscountTotal: '11.90',
      discountPosSourceId: 'pos-1',
      discountPosSourceName: 'POS 1',
      cashByPosSource: [
        { posSourceId: 'pos-1', posSourceName: 'POS 1', grossCashBasis: '122.20', discountApplied: '49.45', expectedCash: '72.75' },
        { posSourceId: 'pos-2', posSourceName: 'POS 2', grossCashBasis: '251.98', discountApplied: '0.00', expectedCash: '251.98' },
      ],
      expectedCash: '324.73',
      actualCashCounted: '324.73',
      discrepancy: '0.00',
      status: 'BALANCED',
    })

    const screen = await render(
      <CashReconciliationCard cashReconciliation={cash} paymentMethods={paymentMethods} />
    )

    // Only the cash-discount portion (€49.45) shows as reducing POS 1's cash
    // — never the full combined €61.35.
    await expect.element(screen.getByText('Cash Discount Applied')).toBeInTheDocument()
    await expect.element(screen.getByText('−€49.45')).toBeInTheDocument()
    await expect.element(screen.getByText('€72.75')).toBeInTheDocument()

    // The electronic portion (€11.90) is shown separately, next to the
    // card/electronic payment method, never subtracted from cash.
    await expect.element(screen.getByText('Trust Pay/Card Payment')).toBeInTheDocument()
    await expect.element(screen.getByText('Electronic Discount')).toBeInTheDocument()
    await expect.element(screen.getByText('−€11.90')).toBeInTheDocument()

    await expect.element(screen.getByText('€324.73').first()).toBeInTheDocument()
    await expect.element(screen.getByText('€0.00')).toBeInTheDocument()
    await expect.element(screen.getByText('Balanced')).toBeInTheDocument()
  })

  it('shows the empty state when no payment methods are classified as physical cash', async () => {
    const screen = await render(
      <CashReconciliationCard cashReconciliation={cashReconciliation()} paymentMethods={[]} />
    )

    await expect
      .element(screen.getByText(/No payment methods are classified as physical cash yet/))
      .toBeInTheDocument()
  })
})
