import React, { useEffect, useRef, useState } from 'react';

const Catodrom = () => {
  const containerRef = useRef(null);
  const homeCatRef = useRef(null);
  const floatingCatRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [outside, setOutside] = useState(false);
  const [catPos, setCatPos] = useState({ x: 0, y: 78 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const velocityY = useRef(0);
  const animFrame = useRef(null);

  const CAT_WIDTH = 130;
  const CAT_HEIGHT = 100;
  const FLOOR_OFFSET = 78;

  // Пути к картинкам из папки public/photo
  const bgFon = `${process.env.PUBLIC_URL}/photo/fon.png`;
  const bgFon2 = `${process.env.PUBLIC_URL}/photo/fon2.png`; // если нужен для адаптива
  const catHomeImg = `${process.env.PUBLIC_URL}/photo/кот2.png`;
  const catFloatingImg = `${process.env.PUBLIC_URL}/photo/кот1.png`;
  const catDraggingImg = `${process.env.PUBLIC_URL}/photo/2.png`;

  const getPointer = (e) => (e.touches ? e.touches[0] : e);

  const updateCatPosition = (x, y) => {
    if (floatingCatRef.current) {
      floatingCatRef.current.style.left = `${x}px`;
      floatingCatRef.current.style.top = `${y}px`;
    }
  };

  const startGravity = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    const gravity = 0.45;
    const damping = 0.92;
    const floorY = window.innerHeight - CAT_HEIGHT - FLOOR_OFFSET;

    const animate = () => {
      if (dragging) return;
      if (catPos.y < floorY) {
        velocityY.current += gravity;
        velocityY.current *= damping;
        const newY = catPos.y + velocityY.current;
        if (newY >= floorY) {
          setCatPos((prev) => ({ ...prev, y: floorY }));
          updateCatPosition(catPos.x, floorY);
          sessionStorage.setItem('catOutside', 'true');
          sessionStorage.setItem('catX', catPos.x);
          sessionStorage.setItem('catY', floorY);
          return;
        }
        setCatPos((prev) => ({ ...prev, y: newY }));
        updateCatPosition(catPos.x, newY);
        sessionStorage.setItem('catOutside', 'true');
        sessionStorage.setItem('catX', catPos.x);
        sessionStorage.setItem('catY', newY);
        animFrame.current = requestAnimationFrame(animate);
      }
    };
    animFrame.current = requestAnimationFrame(animate);
  };

  const magnetHome = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    setDragging(false);
    velocityY.current = 0;
    if (floatingCatRef.current) {
      floatingCatRef.current.classList.remove('dragging');
      floatingCatRef.current.style.display = 'none';
      // Возвращаем обычную картинку
      floatingCatRef.current.style.backgroundImage = `url(${catFloatingImg})`;
    }
    if (homeCatRef.current) homeCatRef.current.style.display = 'block';
    setOutside(false);
    setCatPos({ x: 0, y: FLOOR_OFFSET });
    sessionStorage.setItem('catOutside', 'false');
  };

  const startDrag = (e) => {
    e.preventDefault();
    const point = getPointer(e);
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    document.body.style.userSelect = 'none';
    if (!outside) {
      const rect = homeCatRef.current.getBoundingClientRect();
      setCatPos({ x: rect.left, y: rect.top });
      if (floatingCatRef.current) {
        floatingCatRef.current.style.display = 'block';
        updateCatPosition(rect.left, rect.top);
      }
      if (homeCatRef.current) homeCatRef.current.style.display = 'none';
      setOutside(true);
      sessionStorage.setItem('catOutside', 'true');
    }
    const rect = floatingCatRef.current.getBoundingClientRect();
    dragOffset.current = { x: point.clientX - rect.left, y: point.clientY - rect.top };
    setDragging(true);
    if (floatingCatRef.current) {
      floatingCatRef.current.classList.add('dragging');
      // Меняем картинку на "перетаскивание"
      floatingCatRef.current.style.backgroundImage = `url(${catDraggingImg})`;
    }

    const onMove = (moveEvent) => {
      if (!dragging) return;
      moveEvent.preventDefault();
      const p = getPointer(moveEvent);
      let newX = p.clientX - dragOffset.current.x;
      let newY = p.clientY - dragOffset.current.y;
      newX = Math.max(0, Math.min(newX, window.innerWidth - CAT_WIDTH));
      newY = Math.max(0, Math.min(newY, window.innerHeight - CAT_HEIGHT));
      setCatPos({ x: newX, y: newY });
      updateCatPosition(newX, newY);
      sessionStorage.setItem('catX', newX);
      sessionStorage.setItem('catY', newY);
    };
    const onStop = (stopEvent) => {
      setDragging(false);
      document.body.style.userSelect = '';
      // Возвращаем обычную картинку, если не в домике
      if (floatingCatRef.current) {
        floatingCatRef.current.classList.remove('dragging');
        floatingCatRef.current.style.backgroundImage = `url(${catFloatingImg})`;
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onStop);
      document.removeEventListener('touchend', onStop);
      const p = getPointer(stopEvent);
      const homeRect = containerRef.current.getBoundingClientRect();
      if (
        p.clientX >= homeRect.left &&
        p.clientX <= homeRect.right &&
        p.clientY >= homeRect.top &&
        p.clientY <= homeRect.bottom
      ) {
        magnetHome();
      } else {
        velocityY.current = 1;
        startGravity();
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onStop);
    document.addEventListener('touchend', onStop);
  };

  // Устанавливаем фоны один раз при монтировании
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.backgroundImage = `url(${bgFon})`;
      containerRef.current.style.backgroundSize = 'cover';
      containerRef.current.style.backgroundPosition = 'center';
    }
    if (homeCatRef.current) {
      homeCatRef.current.style.backgroundImage = `url(${catHomeImg})`;
      homeCatRef.current.style.backgroundSize = 'cover';
      homeCatRef.current.style.backgroundPosition = 'center';
    }
    if (floatingCatRef.current) {
      floatingCatRef.current.style.backgroundImage = `url(${catFloatingImg})`;
      floatingCatRef.current.style.backgroundSize = 'cover';
      floatingCatRef.current.style.backgroundPosition = 'center';
    }
  }, [bgFon, catHomeImg, catFloatingImg]);

  // Восстановление позиции кота после перезагрузки
  useEffect(() => {
    const restore = () => {
      const wasOutside = sessionStorage.getItem('catOutside') === 'true';
      if (!wasOutside) {
        setOutside(false);
        if (homeCatRef.current) homeCatRef.current.style.display = 'block';
        if (floatingCatRef.current) floatingCatRef.current.style.display = 'none';
        return;
      }
      setOutside(true);
      if (homeCatRef.current) homeCatRef.current.style.display = 'none';
      if (floatingCatRef.current) floatingCatRef.current.style.display = 'block';
      const savedX = parseFloat(sessionStorage.getItem('catX'));
      const savedY = parseFloat(sessionStorage.getItem('catY'));
      const x = isNaN(savedX) ? 120 : savedX;
      const y = isNaN(savedY) ? window.innerHeight - 220 : savedY;
      setCatPos({ x, y });
      updateCatPosition(x, y);
    };
    restore();
    window.addEventListener('resize', () => {
      if (outside) {
        const newY = Math.min(catPos.y, window.innerHeight - CAT_HEIGHT);
        setCatPos((prev) => ({ ...prev, y: newY }));
        updateCatPosition(catPos.x, newY);
      }
    });
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  useEffect(() => {
    if (outside && !dragging) startGravity();
  }, [outside, dragging, catPos.y]);

  return (
    <div className="catodom-container" ref={containerRef}>
      <div
        className="cat-placeholder"
        ref={homeCatRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      ></div>
      <div
        className="floating-cat"
        ref={floatingCatRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{ display: 'none' }}
      ></div>
    </div>
  );
};

export default Catodrom;