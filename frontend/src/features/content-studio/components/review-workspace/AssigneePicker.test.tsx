import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { AssigneePicker } from './AssigneePicker'

const useUsersMock = vi.fn()
const assignMutate = vi.fn()
const unassignMutate = vi.fn()

vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: (...args: unknown[]) => useUsersMock(...args),
}))
vi.mock('../../hooks/use-asset-assignment', () => ({
  useAssignReviewer: () => ({ mutate: assignMutate, isPending: false }),
  useUnassignReviewer: () => ({ mutate: unassignMutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const users = [
  { id: 'user-1', name: 'Ada Lovelace' },
  { id: 'user-2', name: 'Grace Hopper' },
]

describe('AssigneePicker', () => {
  beforeEach(() => {
    assignMutate.mockReset()
    unassignMutate.mockReset()
    useUsersMock.mockReturnValue({ data: users })
  })

  it('shows an assign dropdown when there is no current assignee', async () => {
    const screen = await render(
      <AssigneePicker
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        assignee={null}
      />
    )

    await expect
      .element(screen.getByText('Assign a reviewer'))
      .toBeInTheDocument()
  })

  it('assigns the selected user', async () => {
    const screen = await render(
      <AssigneePicker
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        assignee={null}
      />
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Grace Hopper'))

    expect(assignMutate).toHaveBeenCalledWith(
      {
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: { assigneeId: 'user-2', note: undefined },
      },
      expect.anything()
    )
  })

  it('shows the current assignee and unassigns on click', async () => {
    const screen = await render(
      <AssigneePicker
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        assignee={{ id: 'user-2', name: 'Grace Hopper' }}
      />
    )

    await expect.element(screen.getByText('Grace Hopper')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Unassign' }))

    expect(unassignMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1' },
      expect.anything()
    )
  })
})
