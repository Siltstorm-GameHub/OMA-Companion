"use client";
import { useEffect, useState, Children, isValidElement } from "react";

export function BannerCarousel({ children, interval = 7000 }: { children: React.ReactNode; interval?: number }) {
  const slides = Children.toArray(children).filter(isValidElement);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, slides.length, interval]);

  if (slides.length === 0) return null;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div key={index} className="animate-fade-in">
        {slides[index]}
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Banner ${i + 1} anzeigen`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-teal-400" : "w-1.5 bg-white/15 hover:bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
