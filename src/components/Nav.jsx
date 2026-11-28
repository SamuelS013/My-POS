import { NavLink } from 'react-router-dom'

const links = [
  {
    to: '/caja',
    label: 'Caja',
    icon: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /><path d="M3 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /></>,
  },
  {
    to: '/ventas',
    label: 'Ventas',
    icon: <><path d="M7 3h10v18l-2-1.5L12 21l-3-1.5L7 21V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  },
  {
    to: '/creditos',
    label: 'Créditos',
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8h5M18.5 5.5v5" /></>,
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  },
]

export default function Nav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-container">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {link.icon}
            </svg>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}