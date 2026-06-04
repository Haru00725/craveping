import { CartItem } from '@/hooks/useOrderCart';

export function buildOrderWhatsAppURL(
  ownerPhone: string,
  tableNum: string | null,
  items: CartItem[],
  totalPaise: number
): string {
  // Format items into clean bullet points, converting paise back to rupees
  const lines = items.map(
    (i) => `• ${i.dish.name} x${i.quantity} — ₹${(i.dish.price * i.quantity) / 100}`
  );
  
  const tableDisplay = tableNum ? `Table ${tableNum}` : 'Takeaway / Unknown Table';

  // Construct the exact message layout from your blueprint
  const message = [
    `🍽️ New Order - ${tableDisplay}`,
    `━━━━━━━━━━━━━━━`,
    ...lines,
    `━━━━━━━━━━━━━━━`,
    `Total: ₹${totalPaise / 100}`,
    `via Craveping VideoMenu`
  ].join('\n');

  // URL encode the message and append it to the wa.me deep link
  return `https://wa.me/${ownerPhone}?text=${encodeURIComponent(message)}`;
}