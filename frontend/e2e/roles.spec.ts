import { expect, test, type Page } from '@playwright/test'
import { mockAdminApi } from './helpers/mockApi'

type RoleRecord = {
  id: number
  name: string
  description: string
  is_system_default: boolean
  residence: number | null
  permissions: string[]
}

async function mockRolesApi(page: Page) {
  const roles: RoleRecord[] = [
    {
      id: 1,
      name: 'Admin',
      description: 'Rol sistema',
      is_system_default: true,
      residence: null,
      permissions: ['full_access'],
    },
    {
      id: 2,
      name: 'Student',
      description: 'Rol sistema',
      is_system_default: true,
      residence: null,
      permissions: [],
    },
    {
      id: 3,
      name: 'Conserjeria',
      description: 'Gestión de accesos',
      is_system_default: false,
      residence: 1,
      permissions: ['rooms'],
    },
  ]

  await page.route('**/api/membership/roles/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname

    if (path === '/api/membership/roles/' || path === '/api/membership/roles') {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(roles),
        })
        return
      }

      if (method === 'POST') {
        const payload = JSON.parse(request.postData() || '{}')
        const nextRole: RoleRecord = {
          id: roles.reduce((max, role) => Math.max(max, role.id), 0) + 1,
          name: payload.name,
          description: payload.description || '',
          is_system_default: false,
          residence: 1,
          permissions: payload.permissions || [],
        }
        roles.push(nextRole)

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(nextRole),
        })
        return
      }
    }

    const detailMatch = path.match(/^\/api\/membership\/roles\/(\d+)\/?$/)
    if (detailMatch) {
      const roleId = Number(detailMatch[1])
      const role = roles.find((item) => item.id === roleId)

      if (!role) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found.' }) })
        return
      }

      if (method === 'PATCH' || method === 'PUT') {
        const payload = JSON.parse(request.postData() || '{}')
        role.name = payload.name ?? role.name
        role.description = payload.description ?? role.description
        role.permissions = payload.permissions ?? role.permissions

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(role),
        })
        return
      }

      if (method === 'DELETE') {
        const index = roles.findIndex((item) => item.id === roleId)
        if (index >= 0) {
          roles.splice(index, 1)
        }

        await route.fulfill({ status: 204, body: '' })
        return
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(role),
        })
        return
      }
    }

    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Unhandled route in roles mock' }) })
  })
}

function roleCard(page: Page, roleName: string) {
  return page.locator('div.bg-white').filter({ has: page.getByRole('heading', { name: roleName }) }).first()
}

test.describe('Roles — gestión de acceso', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
    await mockRolesApi(page)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Roles/i }).first().click()
    await expect(page.getByText('Directorio completo de roles y permisos')).toBeVisible()
  })

  test('admin crea un rol con permisos y lo ve en el listado', async ({ page }) => {
    await page.getByRole('button', { name: /Nuevo Rol/i }).click()

    await page.getByPlaceholder('Ej: Mantenimiento').fill('Mantenimiento')
    await page.getByPlaceholder('Describe las funciones...').fill('Equipo técnico')

    const permissionsToggle = page.getByRole('button', { name: /Seleccionar módulos permitidos|módulo/i })
    await permissionsToggle.click()
    await page.getByLabel('Avisos').check()
    await page.getByLabel('Roles').check()
    await permissionsToggle.click()

    await page.getByRole('button', { name: /^Guardar$/i }).dispatchEvent('click')

    await expect(page.getByRole('heading', { name: 'Mantenimiento' })).toBeVisible()
  })

  test('edita un rol custom y persiste nombre/permisos', async ({ page }) => {
    const conserjeriaCard = roleCard(page, 'Conserjeria')

    await conserjeriaCard.locator('button').first().click()
    await page.getByRole('button', { name: 'Editar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar Rol' })).toBeVisible()

    await page.getByPlaceholder('Ej: Mantenimiento').fill('Conserjeria Plus')
    const permissionsToggle = page.getByRole('button', { name: /Seleccionar módulos permitidos|módulo/i })
    await permissionsToggle.click()
    await page.getByLabel('Roles').check()
    await permissionsToggle.click()

    await page.getByRole('button', { name: /^Guardar$/i }).dispatchEvent('click')

    await expect(page.getByRole('heading', { name: 'Conserjeria Plus' })).toBeVisible()
    await expect(
      roleCard(page, 'Conserjeria Plus').locator('span', { hasText: 'Roles' }),
    ).toBeVisible()
  })

  test('no permite editar rol de sistema porque no muestra acciones de edición', async ({ page }) => {
    const adminCard = roleCard(page, 'Admin')
    await expect(adminCard.locator('button')).toHaveCount(0)
  })

  test('elimina rol custom tras confirmar y desaparece del listado', async ({ page }) => {
    const conserjeriaCard = roleCard(page, 'Conserjeria')

    page.once('dialog', (dialog) => dialog.accept())
    await conserjeriaCard.locator('button').first().click()
    await page.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByRole('heading', { name: 'Conserjeria' })).not.toBeVisible()
  })
})
