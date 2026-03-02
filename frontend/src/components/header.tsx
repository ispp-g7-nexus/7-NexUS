import { Bell, Menu } from 'lucide-react';

export const Header = () => {
  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      height: '52px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      background: 'rgba(247,244,239,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
    }}>

      {/* Izquierda: Logo + Texto */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/logo.png" 
          alt="Logo"
          style={{
            width: '28px',     // Ajustado para que sea ligeramente más visible
            height: '28px',
            objectFit: 'contain',
            borderRadius: '6px' // Opcional, por si tu logo es muy cuadrado
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '13px', fontWeight: 700,
            color: '#1c1a17', letterSpacing: '-0.3px', lineHeight: '1',
          }}>
            Panel de Control
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 500,
            color: '#9c9690', lineHeight: '1',
            letterSpacing: '0.3px', textTransform: 'uppercase',
          }}>
            Administración
          </span>
        </div>
      </div>

      {/* Derecha: Botones */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => console.log('Notificaciones')}
          style={{
            position: 'relative', width: '34px', height: '34px',
            borderRadius: '10px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: '#5a5650',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ede9e2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell size={16} strokeWidth={2} />
          <span style={{
            position: 'absolute', top: '7px', right: '7px',
            width: '7px', height: '7px',
            background: '#e05c5c', borderRadius: '50%',
            border: '1.5px solid #f7f4ef',
          }} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />

        <button
          onClick={() => console.log('Menú')}
          style={{
            width: '34px', height: '34px',
            borderRadius: '10px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: '#5a5650',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ede9e2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Menu size={16} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};
