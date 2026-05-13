import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyReservationsList } from '../MyReservationsList'

describe('MyReservationsList', () => {
  it('renderiza notas largas con estilos defensivos de wrapping', () => {
    const longNote = 'a'.repeat(150)

    render(
      <MyReservationsList
        reservations={[
          {
            id: 1,
            space: { id: 2, name: 'Sala Norte' },
            user: { id: 7, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@test.com' },
            residence_id: 1,
            start_time: '2099-06-01T10:00:00Z',
            end_time: '2099-06-01T11:00:00Z',
            status: 'active',
            notes: longNote,
            created_at: '2099-05-30T10:00:00Z',
            updated_at: '2099-05-30T10:00:00Z',
          },
        ]}
        loading={false}
        cancellingId={null}
        onCancel={vi.fn()}
      />,
    )

    const noteText = screen.getByText(/^Nota:/i)
    expect(noteText.textContent).toContain(longNote)
    expect(noteText).toHaveClass(
      'max-w-full',
      'whitespace-pre-wrap',
      'break-words',
      '[overflow-wrap:anywhere]',
      '[word-break:break-word]',
    )
  })
})
