import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Trash2, ShoppingBag } from 'lucide-react';

export function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, loading } = useCart();

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('购物车为空');
      return;
    }
    navigate('/contact-info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            购物车是空的
          </h2>
          <p className="text-gray-600 mb-6">快去选购心仪的商品吧</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            去购物
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">购物车</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm p-6 flex gap-6"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product?.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400 text-2xl">
                        {item.product?.name[0]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">
                    {item.product?.name}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    ${item.product?.price}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 border rounded hover:bg-gray-100 transition"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 border rounded hover:bg-gray-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">订单摘要</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>商品数量</span>
                  <span>{cartItems.length} 件</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>商品总计</span>
                  <span>
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)} 个
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-xl font-bold">
                  <span>总计</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                去结算
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full mt-3 border border-gray-300 text-gray-700 py-4 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                继续购物
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
