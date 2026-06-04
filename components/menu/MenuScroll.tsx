import { useEffect, useRef, useState } from 'react';
import { Dish, Category } from '@/hooks/useMenuData';
import { VideoCard } from './VideoCard';
import { CategoryTabs } from './CategoryTabs';

interface MenuScrollProps {
  dishes: Dish[];
  categories: Category[];
  brandColor: string;
  onAddToCart: (dish: Dish) => void;
}

export function MenuScroll({ dishes, categories, brandColor, onAddToCart }: MenuScrollProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Filter dishes based on the selected category tab
  const filteredDishes = activeCategoryId === 'all' 
    ? dishes 
    : dishes.filter(d => d.category_id === activeCategoryId);

  // ─── Intersection Observer for Autoplay ───
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // We want the video to trigger when it is 60% visible on screen
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const dishId = entry.target.getAttribute('data-dish-id');
          if (dishId) setActiveVideoId(dishId);
        }
      });
    }, { threshold: 0.6 });

    // Grab all video containers and observe them
    const elements = document.querySelectorAll('.video-snap-container');
    elements.forEach(el => observer.current?.observe(el));

    return () => observer.current?.disconnect();
  }, [filteredDishes]);

  // Set initial active video to the first one in the list when filter changes
  useEffect(() => {
    if (filteredDishes.length > 0) {
      setActiveVideoId(filteredDishes[0].id);
    }
  }, [activeCategoryId, dishes]);

  return (
    <div className="relative w-full h-[100dvh] bg-black">
      {/* Absolute positioning keeps the tabs floating at the top of the feed */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <CategoryTabs 
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          brandColor={brandColor}
        />
      </div>

      {/* The scrollable, snapping feed container */}
      <div className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar pb-20">
        {filteredDishes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No dishes found in this category.
          </div>
        ) : (
          filteredDishes.map((dish) => (
            <div 
              key={dish.id} 
              data-dish-id={dish.id}
              className="video-snap-container w-full h-[100dvh] snap-start snap-always"
            >
              <VideoCard 
                dish={dish}
                isActive={activeVideoId === dish.id}
                onAddToCart={onAddToCart}
                brandColor={brandColor}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}