import React from 'react';

// Компонент для отображения точек доверия (уровень от 0 до 5)
export const TrustDots = ({ level }) => {
  // level – число, сколько точек должно быть активным
  return (
    <div className="trust-level">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`trust-dot ${i < level ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};