import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, Category } from '@/types';
import { ShoppingCart, Star } from 'lucide-react';

export function HomePage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { categories: categoriesData } = await categoriesApi.list();
        setCategories(categoriesData);

        const params: any = { active: 'true' };
        if (selectedCategory !== 'all') {
          params.category = selectedCategory;
        }

        const { products: productsData } = await productsApi.list(params);
        setProducts(productsData);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCategory]);

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      alert('已添加到购物车');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-4">虚拟商品交易平台</h1>
          <p className="text-xl text-blue-100">
            安全快捷的虚拟商品购买体验，支持多种支付方式
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-2 rounded-full transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              全部商品
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full transition ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden"
              >
                <Link to={`/product/${product.slug}`}>
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-400 text-4xl">
                          {product.name[0]}
                        </span>
                      </div>
                    )}
                    {product.is_featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>精选</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="font-bold text-lg mb-2 hover:text-blue-600 transition">
                      {product.name}
                    </h3>
                  </Link>

                  {product.short_description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.short_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        ${product.price}
                      </div>
                      {product.original_price && (
                        <div className="text-sm text-gray-400 line-through">
                          ${product.original_price}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(product.id)}
                      className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    已售 {product.sold_count} | 库存{' '}
                    {product.stock_type === 'unlimited'
                      ? '无限'
                      : product.available_stock}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
