import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <div className="nav-shell">
        <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} end>
          <i className="fa-solid fa-house"></i><span>Главная</span>
        </NavLink>
        <NavLink to="/items" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-box-open"></i><span>Мои передачи</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fa-regular fa-user"></i><span>Профиль</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;