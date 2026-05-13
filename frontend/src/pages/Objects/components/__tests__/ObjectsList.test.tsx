import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ObjectsList } from '../ObjectsList'

describe('ObjectsList (objects)', () => {
  it('renderiza nombre y descripción largas con clases defensivas de overflow', () => {
    const longName = 'N'.repeat(120)
    const longDescription = 'D'.repeat(280)

    render(
      <ObjectsList
        objects={[
          {
            id: 1,
            name: longName,
            description: longDescription,
            location: 'Trastero',
            availability: true,
            stock_total: 3,
            current_reserved_stock: 0,
            current_available_stock: 3,
            image_url: '',
            tags: 'herramientas',
            labels: [],
            rentals_count: 0,
            can_rent: true,
          },
        ]}
        loading={false}
        error={null}
        selectedDate="2026-05-07"
        loadingAvailability={false}
        availabilityByObjectId={{}}
        onReserve={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: longName })).toHaveClass('line-clamp-2', 'break-words')
    expect(screen.getByText(longDescription)).toHaveClass('line-clamp-3', 'break-words')
  })
})
