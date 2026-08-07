import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type {
  PaymentMethodPosSourceTotal,
  PosSourceChannelBreakdown,
  PosSourcePaymentMethodBreakdown,
  PosSourceTotal,
} from '../../../types/restaurant-ops'
import { PosSourcePerformanceSection } from './pos-source-performance-section'

describe('PosSourcePerformanceSection', () => {
  it('renders nothing when neither channels nor payment methods have ever been tagged with a POS source (single-POS restaurants)', async () => {
    const posSourceTotals: PosSourceTotal[] = [
      { posSourceId: null, posSourceName: null, amount: '300.00', transactionCount: 0, percentOfChannelEntriesTotal: '100.0' },
    ]
    const paymentMethodPosSourceTotals: PaymentMethodPosSourceTotal[] = [
      { posSourceId: null, posSourceName: null, amount: '300.00', transactionCount: 0, percentOfPaymentMethodEntriesTotal: '100.0' },
    ]
    const screen = await render(
      <PosSourcePerformanceSection
        posSourceTotals={posSourceTotals}
        channelsByPosSource={[]}
        paymentMethodPosSourceTotals={paymentMethodPosSourceTotals}
        paymentMethodsByPosSource={[]}
      />
    )

    await expect.element(screen.getByText('Sales by POS Source')).not.toBeInTheDocument()
  })

  it('renders the channel POS source breakdown when at least one channel entry is tagged — Example B (multiple POS terminals)', async () => {
    const posSourceTotals: PosSourceTotal[] = [
      { posSourceId: 'pos-1', posSourceName: 'POS 1', amount: '420.30', transactionCount: 40, percentOfChannelEntriesTotal: '35.4' },
      { posSourceId: 'pos-2', posSourceName: 'POS 2', amount: '768.07', transactionCount: 40, percentOfChannelEntriesTotal: '64.6' },
    ]
    const channelsByPosSource: PosSourceChannelBreakdown[] = [
      {
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        channels: [
          {
            salesChannelId: 'mypos-id',
            channelName: 'MyPOS / In-house',
            amount: '420.30',
            percentOfChannelEntriesTotal: '35.4',
            activeDays: 1,
            averageAmountPerActiveDay: '420.30',
          },
        ],
      },
      {
        posSourceId: 'pos-2',
        posSourceName: 'POS 2',
        channels: [
          {
            salesChannelId: 'wolt-id',
            channelName: 'Wolt',
            amount: '486.49',
            percentOfChannelEntriesTotal: '41.0',
            activeDays: 1,
            averageAmountPerActiveDay: '486.49',
          },
          {
            salesChannelId: 'bolt-id',
            channelName: 'Bolt',
            amount: '281.58',
            percentOfChannelEntriesTotal: '23.7',
            activeDays: 1,
            averageAmountPerActiveDay: '281.58',
          },
        ],
      },
    ]

    const screen = await render(
      <PosSourcePerformanceSection
        posSourceTotals={posSourceTotals}
        channelsByPosSource={channelsByPosSource}
        paymentMethodPosSourceTotals={[]}
        paymentMethodsByPosSource={[]}
      />
    )

    await expect.element(screen.getByText('Sales by POS Source')).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'POS 1' })).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'POS 2' })).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'Wolt' })).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'Bolt' })).toBeInTheDocument()
    await expect.element(screen.getByText('By POS Source + Payment Method')).not.toBeInTheDocument()
  })

  it('renders the payment method POS source breakdown independently, even with no channel POS source usage — POS 1: Cash/Card, POS 2: Wolt/Bolt', async () => {
    const paymentMethodPosSourceTotals: PaymentMethodPosSourceTotal[] = [
      { posSourceId: 'pos-1', posSourceName: 'POS 1', amount: '420.30', transactionCount: 40, percentOfPaymentMethodEntriesTotal: '35.4' },
      { posSourceId: 'pos-2', posSourceName: 'POS 2', amount: '768.07', transactionCount: 40, percentOfPaymentMethodEntriesTotal: '64.6' },
    ]
    const paymentMethodsByPosSource: PosSourcePaymentMethodBreakdown[] = [
      {
        posSourceId: 'pos-1',
        posSourceName: 'POS 1',
        paymentMethods: [
          {
            salesPaymentMethodId: 'cash-id',
            paymentMethodName: 'Cash',
            amount: '200.00',
            transactionCount: 20,
            percentOfPaymentMethodEntriesTotal: '16.8',
          },
          {
            salesPaymentMethodId: 'card-id',
            paymentMethodName: 'Card',
            amount: '220.30',
            transactionCount: 20,
            percentOfPaymentMethodEntriesTotal: '18.6',
          },
        ],
      },
      {
        posSourceId: 'pos-2',
        posSourceName: 'POS 2',
        paymentMethods: [
          {
            salesPaymentMethodId: 'wolt-id',
            paymentMethodName: 'Wolt',
            amount: '486.49',
            transactionCount: 25,
            percentOfPaymentMethodEntriesTotal: '41.0',
          },
        ],
      },
    ]

    const screen = await render(
      <PosSourcePerformanceSection
        posSourceTotals={[]}
        channelsByPosSource={[]}
        paymentMethodPosSourceTotals={paymentMethodPosSourceTotals}
        paymentMethodsByPosSource={paymentMethodsByPosSource}
      />
    )

    await expect.element(screen.getByText('Sales by POS Source')).toBeInTheDocument()
    await expect.element(screen.getByText('By POS Source + Payment Method')).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'Cash' })).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'Card' })).toBeInTheDocument()
    await expect.element(screen.getByText('By POS Source + Channel')).not.toBeInTheDocument()
  })

  it('labels the unassigned bucket clearly when it appears alongside a real POS source', async () => {
    const posSourceTotals: PosSourceTotal[] = [
      { posSourceId: null, posSourceName: null, amount: '100.00', transactionCount: 0, percentOfChannelEntriesTotal: '50.0' },
      { posSourceId: 'pos-1', posSourceName: 'POS 1', amount: '100.00', transactionCount: 0, percentOfChannelEntriesTotal: '50.0' },
    ]

    const screen = await render(
      <PosSourcePerformanceSection
        posSourceTotals={posSourceTotals}
        channelsByPosSource={[]}
        paymentMethodPosSourceTotals={[]}
        paymentMethodsByPosSource={[]}
      />
    )

    await expect.element(screen.getByText('Not assigned to a POS source')).toBeInTheDocument()
  })
})
