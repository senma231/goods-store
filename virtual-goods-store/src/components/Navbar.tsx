import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingCart, User, LogOut, LayoutDashboard, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { siteSettings } from '@/lib/api';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { cartItems } = useCart();
  const [siteName, setSiteName] = useState('虚拟商城');

  useEffect(() => {
    // 加载站点名称
    const loadSiteName = async () => {
      try {
        const { settings } = await siteSettings.getPublic();
        const siteNameSetting = settings.find((s: any) => s.setting_key === 'site_name');
        if (siteNameSetting && siteNameSetting.setting_value) {
          setSiteName(siteNameSetting.setting_value);
        }
      } catch (error) {
        console.error('加载站点名称失败:', error);
      }
    };
    loadSiteName();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            {siteName}
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link
                  to="/cart"
                  className="relative text-gray-700 hover:text-blue-600 transition"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </Link>

                <Link
                  to="/orders"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  订单
                </Link>

                <Link
                  to="/query-order"
                  className="flex items-center gap-1 text-gray-700 hover:text-blue-600 transition"
                >
                  <Search className="w-4 h-4" />
                  <span>查询订单</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>管理后台</span>
                  </Link>
                )}

                <div className="flex items-center gap-4">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                  >
                    <User className="w-5 h-5" />
                    <span>{user.email}</span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>退出</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/cart"
                  className="relative text-gray-700 hover:text-blue-600 transition"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </Link>

                <Link
                  to="/query-order"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  订单查询
                </Link>

                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
