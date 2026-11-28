import profileIcon from '../assets/icons/perfil-white.png';

export default function Header() {
  return (
    <header className="main-header">
      <div className="header-container">
        <div className="brand-info">
          <h1 className="brand-title">Mi POS</h1>
          <p className="brand-sub">Sistema de Ventas</p>
        </div>
        <div className="header-menu">
          <button className="header-boton" type="button" aria-label="Perfil">
            <img src={profileIcon} className="header-icon" alt="" />
          </button>
        </div>
      </div>
    </header>
  )
}