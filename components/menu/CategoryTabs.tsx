import { Category } from '@/hooks/useMenuData';

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: string | 'all';
  onSelectCategory: (id: string) => void;
  brandColor: string;
}

export function CategoryTabs({ categories, activeCategoryId, onSelectCategory, brandColor }: CategoryTabsProps) {
  if (!categories.length) return null;

  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 py-3 bg-black sticky top-0 z-20 border-b border-zinc-900">
      <button
        onClick={() => onSelectCategory('all')}
        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
          activeCategoryId === 'all' ? 'text-black' : 'text-zinc-300 bg-zinc-800'
        }`}
        style={activeCategoryId === 'all' ? { backgroundColor: brandColor } : {}}
      >
        All
      </button>
      
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            activeCategoryId === cat.id ? 'text-black' : 'text-zinc-300 bg-zinc-800'
          }`}
          style={activeCategoryId === cat.id ? { backgroundColor: brandColor } : {}}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}