
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  Bell,
  Briefcase,
  Calendar,
  Layout,
  UserCheck, Users,
  Utensils
} from 'lucide-react';
import { Header } from '../../components/header';
import { StatCard, StatCardProps } from '../../components/statCard';

const metricsData: StatCardProps[] = [
  {
    label: 'Residentes', value: '156', trend: '+8%',
    icon: Users, theme: 'blue',
    onClick: () => console.log('Navegando a Residentes...'),
  },
  {
    label: 'Habitaciones', value: '92%', trend: '+3%',
    icon: BedDouble, theme: 'green',
    onClick: () => console.log('Abriendo disponibilidad...'),
  },
  {
    label: 'Incidencias', value: '12', trend: '-15%',
    icon: AlertCircle, theme: 'red',
    onClick: () => alert('Revisando incidencias críticas'),
  },
  {
    label: 'Visitantes', value: '23', trend: '+12%',
    icon: UserCheck, theme: 'purple',
    onClick: () => console.log('Registro de visitas'),
  },
  {
    label: 'Espacios Comunes', value: '8', trend: '+2',
    icon: Layout, theme: 'orange',
    onClick: () => console.log('Reservas de espacios'),
  },
  {
    label: 'Menú Comedor', value: 'Ver', trend: 'Hoy',
    icon: Utensils, theme: 'blue',
    onClick: () => console.log('Abriendo menú del día'),
  },
  {
    label: 'Estadísticas', value: 'Análisis', trend: '+5%',
    icon: BarChart3, theme: 'green',
    onClick: () => console.log('Ver informes detallados'),
  },
  {
    label: 'Personal', value: '42', trend: 'Estable',
    icon: Briefcase, theme: 'purple',
    onClick: () => console.log('Gestión de empleados'),
  },
  {
    label: 'Eventos', value: '3', trend: 'Esta sem.',
    icon: Calendar, theme: 'orange',
    onClick: () => console.log('Calendario de eventos'),
  },
  {
    label: 'Avisos', value: '5', trend: 'Nuevos',
    icon: Bell, theme: 'red',
    onClick: () => console.log('Tablón de anuncios'),
  },
];

const today = new Date().toLocaleDateString('es-ES', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

export default function ManagementDashboard() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f4ef',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Gradiente de fondo decorativo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(47,168,122,0.07) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(59,125,216,0.07) 0%, transparent 50%)
        `,
      }} />

      {/* Header fijo */}
      <Header />

      {/* Contenido */}
      <main style={{ paddingTop: '52px', position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 32px 60px',
        }}>

          {/* Intro */}
          <div style={{ marginBottom: '32px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 600,
              color: '#9c9690', textTransform: 'uppercase',
              letterSpacing: '1px', marginBottom: '6px',
            }}>
              {todayCapitalized}
            </p>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 'clamp(26px, 3vw, 34px)',
              color: '#1c1a17', lineHeight: 1.1, margin: 0,
            }}>
              Buenos días, <em style={{ color: '#2fa87a', fontStyle: 'italic' }}>Administrador</em>
            </h1>
          </div>

          {/* Grid de StatCards — CSS Grid puro */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {metricsData.map((metric, index) => (
              <StatCard key={index} {...metric} />
            ))}
          </div>

          

        </div>
      </main>
    </div>
  );
}
