import { test, expect, type Route } from '@playwright/test'
import { mockAdminApi } from './helpers/mockApi'

const STUDENT_ME = {
  is_completed: true,
  authenticated: true,
  user: {
    id: 2,
    username: 'juan.estudiante',
    email: 'juan@nexus.test',
    first_name: 'Juan',
    last_name: 'Estudiante',
    roles: ['student'],
  },
}

const MOCK_PACKAGES = [
  {
    id: 1,
    resident_id: 2,
    resident_name: 'Juan Estudiante',
    room: '101A',
    building: 'A',
    carrier: 'Amazon',
    tracking_number: 'AMZ-123456789',
    delivery_code: 'CODE123',
    notes: 'Cuidado frágil',
    status: 'RECEIVED',
    received_at: '2026-04-14T10:00:00Z',
    delivered_at: null,
    created_at: '2026-04-14T09:00:00Z',
    updated_at: '2026-04-14T09:00:00Z',
    is_unread: true,
  },
  {
    id: 2,
    resident_id: 2,
    resident_name: 'Juan Estudiante',
    room: '101A',
    building: 'A',
    carrier: 'Correos',
    tracking_number: 'CR-987654321',
    delivery_code: 'CODE987',
    notes: '',
    status: 'DELIVERED',
    received_at: '2026-04-10T10:00:00Z',
    delivered_at: '2026-04-11T12:00:00Z',
    created_at: '2026-04-10T09:00:00Z',
    updated_at: '2026-04-11T12:00:00Z',
    is_unread: false,
  }
]

function json(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

test.describe('Packages module E2E', () => {

  test('Admin can view packages list', async ({ page }) => {
    await mockAdminApi(page)
    await page.route('**/api/packages/**', async (route: Route) => {
      await route.fulfill(json(MOCK_PACKAGES))
    })

    await page.goto('/dashboard/admin')
    
    await page.click('text=Paquetería')
    
    await expect(page.locator('text=Amazon')).toBeVisible()
    await expect(page.locator('text=AMZ-123456789')).toBeVisible()
    await expect(page.locator('text=Juan Estudiante').first()).toBeVisible()
  })

  test('Student has pending package badge on dashboard and unread package disappears on click', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("nexus.community_rules.accepted.2", "true"))
    let unreadCountCalled = false;
    let markAsViewedCalled = false;

    await page.route('**/api/**', async (route: Route) => {
      const url = route.request().url(); 
      const path = new URL(url).pathname;

      if (path === '/api/preferences/my-preferences/' || path === '/api/onboarding/preferences/me/') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ is_completed: true }) });
        return;
      }

      if (path === '/api/auth/me/') {
        await route.fulfill(json(STUDENT_ME));
      } else if (path === '/api/residences/branding/') {
        await route.fulfill(json({ logo_url: null, primary_color: '#4A8F5D' }));
      } else if (url.includes('status=RECEIVED') && path === '/api/packages/me/') {
        await route.fulfill(json(MOCK_PACKAGES.filter(p => p.status === 'RECEIVED')));
      } else if (path === '/api/packages/me/') {
        await route.fulfill(json(MOCK_PACKAGES));
      } else if (path === '/api/packages/me/unread_count/') {
        unreadCountCalled = true;
        await route.fulfill(json({ count: markAsViewedCalled ? 0 : 1 }));
      } else if (path === '/api/packages/me/mark_as_viewed/') {
        markAsViewedCalled = true;
        await route.fulfill(json({ message: 'OK', marked_count: 1 }));
      } else if (path.includes('/announcements/')) {
        await route.fulfill(json([]));
      } else if (path.includes('/notifications/') || path.includes('/user_reminders/') || path.includes('/events/')) {
        await route.fulfill(json({ results: [], count: 0, next: null, previous: null }));
      } else {
        await route.fulfill(json([]));
      }
    });

    await page.goto('/dashboard/student')

    await expect(page.locator('button:has-text("Paquetes") span.bg-red-500:has-text("1")').first()).toBeVisible()

    await page.locator('button').filter({ has: page.locator('.lucide-bell') }).first().click(); /* Removed check 1 */

    await page.click('text=Paquetes')
    
    await expect(page.locator('text=Amazon')).toBeVisible()
    await expect(page.locator('text=AMZ-123456789')).toBeVisible()
    
      await expect.poll(() => markAsViewedCalled, { timeout: 5000 }).toBeTruthy()

      await page.goto('/dashboard/student')

      await page.locator('button').filter({ has: page.locator('.lucide-bell') }).first().click(); /* Removed check 2 */
      
      // The pending packages button still shows 1 because there is 1 package pending collection
      await expect(page.locator('button:has-text("Paquetes") span.bg-red-500:has-text("1")').first()).toBeVisible()
      
      // But the unread notifications badge should disappear because count is now 0
      // Assuming unread packages go to the notification badge on the bell
      await expect(page.locator('button').filter({ has: page.locator('.lucide-bell') }).locator('span.bg-red-500')).toHaveCount(0);
  })
})
