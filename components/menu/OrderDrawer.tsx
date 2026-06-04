import { CartItem } from '@/hooks/useOrderCart';

interface OrderDrawerProps {
  items: CartItem[];
  totalPaise: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onSubmitOrder: () => void;
  brandColor: string;
}

export function OrderDrawer({
  items,
  totalPaise,
  isOpen,
  onClose,
  onUpdateQuantity,
  onSubmitOrder,
  brandColor,
}: OrderDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to close the drawer when clicking outside */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 transition-opacity" 
        onClick={onClose}
      />

      {/* The Glassmorphism Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-700/50 rounded-t-3xl p-6 shadow-2xl transform transition-transform duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Your Order</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">
            ✕
          </button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto hide-scrollbar mb-6 space-y-4">
          {items.map((item) => (
            <div key={item.dish.id} className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-white font-semibold">{item.dish.name}</p>
                <p className="text-zinc-400 text-sm">₹{(item.dish.price / 100).toFixed(0)}</p>
              </div>
              
              <div className="flex items-center gap-3 bg-black/50 rounded-full px-3 py-1 border border-zinc-700/50">
                <button 
                  onClick={() => onUpdateQuantity(item.dish.id, -1)}
                  className="text-zinc-300 hover:text-white w-6 h-6 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-white font-medium min-w-[20px] text-center">
                  {item.quantity}
                </span>
                <button 
                  onClick={() => onUpdateQuantity(item.dish.id, 1)}
                  className="text-zinc-300 hover:text-white w-6 h-6 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6 pt-4 border-t border-zinc-700/50">
          <span className="text-zinc-300 font-medium">Total Amount</span>
          <span className="text-2xl font-black text-white">₹{(totalPaise / 100).toFixed(0)}</span>
        </div>

        <button
          onClick={onSubmitOrder}
          className="w-full py-4 rounded-xl font-bold text-black text-lg transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
          style={{ backgroundColor: brandColor }}
        >
          <span>Send via WhatsApp</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </button>
      </div>
    </>
  );
}