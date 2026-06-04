import { useRef, useEffect } from 'react';
import { Dish } from '@/hooks/useMenuData';

interface VideoCardProps {
  dish: Dish;
  isActive: boolean;
  onAddToCart: (dish: Dish) => void;
  brandColor: string;
}

export function VideoCard({ dish, isActive, onAddToCart, brandColor }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Autoplay Logic ───
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isActive) {
      // Play when snapped into view
      videoRef.current.play().catch(err => console.log("Autoplay blocked by browser:", err));
    } else {
      // Pause and reset when scrolled out of view
      videoRef.current.pause();
      videoRef.current.currentTime = 0; 
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-zinc-900 overflow-hidden flex items-end">
      
      {/* 🎬 Video Background */}
      <video
        ref={videoRef}
        src={dish.video_url}
        poster={dish.thumbnail_url ?? undefined}
        loop
        muted
        playsInline // Crucial for iOS autoplay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient Dark Overlay (Protects text readability) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      {/* ℹ️ Dish Info & Call to Action */}
      <div className="relative z-10 w-full p-6 pb-28">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-3xl font-extrabold text-white drop-shadow-md">
            {dish.name}
            {dish.is_veg ? (
               <span className="inline-block ml-2 w-3 h-3 border border-green-500 bg-green-500/20 rounded-sm"></span>
            ) : (
               <span className="inline-block ml-2 w-3 h-3 border border-red-500 bg-red-500/20 rounded-sm"></span>
            )}
          </h2>
          <p className="text-2xl font-black drop-shadow-md" style={{ color: brandColor }}>
            ₹{(dish.price / 100).toFixed(0)}
          </p>
        </div>

        <p className="text-zinc-300 text-sm mb-6 line-clamp-2 drop-shadow-sm">
          {dish.description}
        </p>

        <button
          onClick={() => onAddToCart(dish)}
          className="w-full py-3.5 rounded-xl font-bold text-black text-lg transition-transform active:scale-95 shadow-xl"
          style={{ backgroundColor: brandColor }}
        >
          + Add to Order
        </button>
      </div>
    </div>
  );
}