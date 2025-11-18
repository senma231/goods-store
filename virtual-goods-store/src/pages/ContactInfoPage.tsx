import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { ArrowLeft, Mail, User, FileText } from 'lucide-react';

export function ContactInfoPage() {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [isGuestOrder, setIsGuestOrder] = useState(false);
  const [guestContactQQ, setGuestContactQQ] = useState('');
  const [guestContactWechat, setGuestContactWechat] = useState('');

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  // 如果购物车为空，返回首页
  if (cartItems.length === 0) {
    navigate('/');
    return null;
  }

  const handleContinue = () => {
    if (!contactEmail) {
      alert('请输入联系邮箱');
      return;
    }

    // 跳转到订单确认页面
    navigate('/order-confirm', {
      state: {
        contactEmail,
        contactName,
        notes,
        isGuestOrder,
        guestContactQQ,
        guestContactWechat
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回购物车
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">填写联系信息</h1>

        <div className="space-y-6">
          {/* 订单摘要 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">订单摘要</h2>
            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product?.name} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between text-xl font-bold">
                <span>总计</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 联系信息表单 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">联系信息</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    邮箱 *
                  </div>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  用于接收订单信息和虚拟商品
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    姓名（可选）
                  </div>
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入您的姓名"
                />
              </div>

              {/* 游客模式选项 */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="guestMode"
                    checked={isGuestOrder}
                    onChange={(e) => setIsGuestOrder(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="guestMode" className="text-sm font-medium text-gray-700">
                    游客模式（无需注册，凭查询码查询订单）
                  </label>
                </div>

                {isGuestOrder && (
                  <div className="space-y-4 pl-7 border-l-2 border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        QQ号（可选）
                      </label>
                      <input
                        type="text"
                        value={guestContactQQ}
                        onChange={(e) => setGuestContactQQ(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="您的QQ号"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        微信号（可选）
                      </label>
                      <input
                        type="text"
                        value={guestContactWechat}
                        onChange={(e) => setGuestContactWechat(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="您的微信号"
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 提示：下单成功后，系统会生成6位查询码，请妥善保存用于查询订单状态和下载商品。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    备注（可选）
                  </div>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="订单备注"
                />
              </div>
            </div>
          </div>

          {/* 继续按钮 */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium text-lg hover:bg-blue-700 transition"
          >
            继续 - 确认订单
          </button>
        </div>
      </div>
    </div>
  );
}
