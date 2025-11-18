import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products as productsApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;

      setLoading(true);
      try {
        const { product: data } = await productsApi.getBySlug(slug);
        setProduct(data);
      } catch (error) {
        console.error('加载商品失败:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addToCart(product.id, quantity);
      alert('已添加到购物车');
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败，请重试');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    try {
      await addToCart(product.id, quantity);
      navigate('/checkout');
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">商品不存在</h2>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-gray-400 text-6xl">
                    {product.name[0]}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>

              {product.short_description && (
                <p className="text-xl text-gray-600 mb-6">
                  {product.short_description}
                </p>
              )}

              <div className="flex items-baseline gap-4 mb-6">
                <div className="text-5xl font-bold text-blue-600">
                  ${product.price}
                </div>
                {product.original_price && (
                  <div className="text-2xl text-gray-400 line-through">
                    ${product.original_price}
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="font-medium">库存状态:</span>
                  <span>
                    {product.stock_type === 'unlimited'
                      ? '无限库存'
                      : `${product.available_stock} 件`}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-gray-600">
                  <span className="font-medium">已售:</span>
                  <span>{product.sold_count} 件</span>
                </div>

                <div className="flex items-center gap-4 text-gray-600">
                  <span className="font-medium">浏览:</span>
                  <span>{product.view_count} 次</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <label className="font-medium text-gray-700">数量:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-100 transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-10 text-center border rounded-lg"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-100 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-3 bg-white text-blue-600 border-2 border-blue-600 py-4 rounded-xl text-lg font-medium hover:bg-blue-50 transition"
                >
                  <ShoppingCart className="w-6 h-6" />
                  <span>加入购物车</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="flex-1 flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-xl text-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/30"
                >
                  <ShoppingCart className="w-6 h-6" />
                  <span>立即购买</span>
                </button>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="border-t p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                商品详情
              </h2>
              <div className="prose max-w-none text-gray-700">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
