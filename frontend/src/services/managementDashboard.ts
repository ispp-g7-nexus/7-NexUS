const API_URL = import.meta.env.VITE_API_URL || "/api"

export async function getHello() {
  const res = await fetch(`${API_URL}/hello`)
  return res.json()
}
// para hardcodear borrar luego y hacer este file 
export const mockDashboardData = {
  stats: [
    { id: 1, label: 'Residentes', value: '156', trend: '+8%', icon: 'users', color: 'blue' },
    { id: 2, label: 'Habitaciones', value: '92%', trend: '+3%', icon: 'home', color: 'green' },
    { id: 3, label: 'Incidencias', value: '12', trend: '-15%', icon: 'alert', color: 'orange' },
    { id: 4, label: 'Visitantes', value: '23', trend: '+12%', icon: 'user-check', color: 'purple' },
  ],
  
};
