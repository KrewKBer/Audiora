import React, { useEffect, useRef } from "react";

const COLORS = [
  'rgba(18,113,255,0.7)',
  'rgba(221,74,255,0.7)',
  'rgba(100,220,255,0.7)',
  'rgba(200,50,50,0.7)',
  'rgba(180,180,50,0.7)',
  'rgba(140,100,255,0.7)',
  'rgba(0,255,163,0.7)',
  'rgba(255,0,120,0.7)'
];
const BLOB_COUNT = 6;
const MIN_SIZE = 300;
const MAX_SIZE = 600;
const SPEED = 0.1; // px per ms

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

const GradientBackground = () => {
  const blobsRef = useRef([]);
  const animRef = useRef();
  const containerRef = useRef();

  // Initialize blobs
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    blobsRef.current = Array.from({ length: BLOB_COUNT }).map((_, i) => {
      const size = randomBetween(MIN_SIZE, MAX_SIZE);
      return {
        x: randomBetween(0, width - size),
        y: randomBetween(0, height - size),
        dx: randomBetween(-2, 2) * SPEED,
        dy: randomBetween(-2, 2) * SPEED,
        size,
        color: COLORS[i % COLORS.length],
      };
    });
  }, []);

  // Animation loop
  useEffect(() => {
    let last = performance.now();
    function animate(now) {
      const dt = now - last;
      last = now;
      const width = window.innerWidth;
      const height = window.innerHeight;
      blobsRef.current.forEach(blob => {
        blob.x += blob.dx * dt;
        blob.y += blob.dy * dt;
        // Bounce off edges
        if (blob.x < 0) {
          blob.x = 0;
          blob.dx *= -1;
        } else if (blob.x + blob.size > width) {
          blob.x = width - blob.size;
          blob.dx *= -1;
        }
        if (blob.y < 0) {
          blob.y = 0;
          blob.dy *= -1;
        } else if (blob.y + blob.size > height) {
          blob.y = height - blob.size;
          blob.dy *= -1;
        }
      });
      if (containerRef.current) {
        // Update DOM positions
        Array.from(containerRef.current.children).forEach((el, i) => {
          const blob = blobsRef.current[i];
          el.style.transform = `translate(${blob.x}px, ${blob.y}px)`;
          el.style.width = `${blob.size}px`;
          el.style.height = `${blob.size}px`;
          el.style.background = `radial-gradient(circle at 60% 40%, ${blob.color} 0%, rgba(0,0,0,0) 70%)`;
        });
      }
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Re-init on resize
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      blobsRef.current.forEach(blob => {
        blob.x = Math.min(blob.x, width - blob.size);
        blob.y = Math.min(blob.y, height - blob.size);
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="gradient-bg-root">
      <div ref={containerRef} className="bouncing-blobs-container">
        {Array.from({ length: BLOB_COUNT }).map((_, i) => (
          <div key={i} className="bouncing-blob" />
        ))}
      </div>
    </div>
  );
};

export default GradientBackground;
