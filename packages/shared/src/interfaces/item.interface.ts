export interface Item {
  id: string;
  name: string;
  image?: string;
  /** Unit price (amount in cents per unit). Line total = price.amount * quantity */
  price: {
    amount: number;
    currency: string;
  };
  quantity: number;
}