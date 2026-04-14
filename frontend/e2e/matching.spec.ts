import { expect, test, type Page } from '@playwright/test'

/**
 * [NX-S3.106] Chat con matches por consentimiento mutuo
 *
 * Flujo cubierto:
 *  1. Estudiante entra al hub Social → tab Matches y ve un match con botón corazón.
 *  2. Al dar like, si el otro usuario ya dio like, se convierte en mutuo y
 *     aparece el botón "Abrir chat".
 *  3. Al pulsar "Abrir chat" se llama a /api/matching/chats/start y se navega a
 *     la pestaña de chats privados abriendo la conversación.
 */

const STUDENT_ME = {
    authenticated: true,
    user: {
        id: 42,
        username: 'maria.student',
        email: 'maria@nexus.test',
        first_name: 'María',
        last_name: 'Student',
        roles: ['student'],
    },
}

const MATCH_ITEM_INITIAL = {
    membership_id: 99,
    display_name: 'Beto B...',
    score: 0.87,
    updated_at: new Date().toISOString(),
    liked_by_me: false,
    is_mutual: false,
    horario_ritmo: 'madrugador',
    nivel_sociabilidad: 8,
    habito_fumar_vapear: 'no',
    sex: 'masculino',
    age: 22,
    study_location: 'biblioteca',
    weekend_return: 'quedarse',
    outside_plans_importance: 'media',
    desired_activity: 'deporte',
    order_importance: 7,
    noise_tolerance: 5,
    visitors_preference: 'ocasional',
    basic_items_preference: 'compartidos',
    temperature_preference: 'fresco',
}

function json(data: unknown) {
    return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

async function setupStudentMocks(page: Page) {
    // Saltarse la pantalla de normas del community y pretender onboarding listo.
    await page.addInitScript(() => {
        globalThis.localStorage.setItem('nexus.community_rules.accepted.42', 'true')
        globalThis.localStorage.setItem('userRole', 'student')
    })

    // Estado mutable que los handlers mutan en vivo.
    const state: {
        match: typeof MATCH_ITEM_INITIAL
        startChatCalls: number
        likeCalls: number
    } = { match: { ...MATCH_ITEM_INITIAL }, startChatCalls: 0, likeCalls: 0 }

    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url())
        const path = url.pathname
        const method = route.request().method()

        if (path === '/api/auth/me/') {
            return route.fulfill(json(STUDENT_ME))
        }
        if (path === '/api/residences/branding/') {
            return route.fulfill(
                json({
                    logo_url: null,
                    primary_color: '#1B4D1C',
                    secondary_color: '#0F4C81',
                    accent_color: '#2E7D32',
                    custom_css: '',
                    favicon_url: '',
                })
            )
        }
        if (path === '/api/preferences/my-preferences/') {
            return route.fulfill(json({ is_completed: true }))
        }
        if (path === '/api/matching/me/' || path.startsWith('/api/matching/me/')) {
            return route.fulfill(
                json({
                    status: 'ready',
                    message: 'Matches disponibles.',
                    matches: [state.match],
                })
            )
        }
        if (path === '/api/matching/likes/' && method === 'POST') {
            state.likeCalls += 1
            // Respondemos que el otro ya había dado like → mutuo inmediato.
            state.match = { ...state.match, liked_by_me: true, is_mutual: true }
            return route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ is_mutual: true }),
            })
        }
        if (path === '/api/matching/chats/start/' && method === 'POST') {
            state.startChatCalls += 1
            return route.fulfill(json({ conversation_id: 777 }))
        }

        // Stubs neutros para el resto.
        return route.fulfill(json([]))
    })

    return state
}

test.describe('Matching — chat con match mutuo', () => {
    test('da like, aparece "Abrir chat" y navega al chat privado', async ({ page }) => {
        const state = await setupStudentMocks(page)

        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')

        // Abrir tab Social del bottom nav y luego tab Matches del hub.
        await page.getByRole('button', { name: /social/i }).first().click()
        await page.getByRole('button', { name: /^matches$/i }).click()

        // Debe renderizar la tarjeta con el nombre enmascarado.
        await expect(page.getByText('Beto B...')).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(/87% Match/)).toBeVisible()

        // Antes de dar like, el botón "Abrir chat" NO existe.
        await expect(page.getByRole('button', { name: 'Abrir chat', exact: true })).toHaveCount(0)

        // Dar like.
        await page.getByRole('button', { name: 'Dar like', exact: true }).click()

        // El backend devuelve is_mutual=true → debe aparecer "Abrir chat".
        await expect(page.getByRole('button', { name: 'Abrir chat', exact: true })).toBeVisible({
            timeout: 5000,
        })
        expect(state.likeCalls).toBe(1)

        // Abrir chat: dispara POST /chats/start y el estudiante termina en el chat.
        await page.getByRole('button', { name: 'Abrir chat', exact: true }).click()
        await expect.poll(() => state.startChatCalls).toBe(1)
    })
})
