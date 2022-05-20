import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;
      const productResponse = await api.get(`/products/${productId}`);
      const product: Product = productResponse.data;
      // const opa = await api.get("/products/10");
      // console.log(opa);

      if (!product || !stock) throw new Error();

      const amountStored = cart.find((item) => item.id === productId);

      if (!amountStored) {
        const result = [...cart, { ...product, amount: 1 }];
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(result));
        return setCart(result);
      }

      if (amountStored.amount < stock.amount) {
        const filteredCart = cart.filter((item) => item.id !== productId);
        const result = [
          ...filteredCart,
          { ...amountStored, amount: amountStored.amount + 1 },
        ];

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(result));
        return setCart(result);
      } else {
        throw new EvalError("Quantidade solicitada fora de estoque");
      }
    } catch (err) {
      if (err instanceof EvalError) {
        toast.error(err.message);
      } else {
        toast.error("Erro na adição do produto");
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filteredCart = cart.filter((item) => item.id !== productId);
      if (filteredCart.length === cart.length) throw new Error();
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));
      setCart(filteredCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) throw new Error();

      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      if (!stock) throw new Error();

      if (stock.amount - amount >= 0) {
        const updatedCart = cart.map((item) =>
          item.id === productId ? { ...item, amount } : item
        );
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
        setCart(updatedCart);
      } else {
        throw new EvalError("Quantidade solicitada fora de estoque");
      }
    } catch (err) {
      if (err instanceof EvalError) {
        toast.error(err.message);
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
