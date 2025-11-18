import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
// import { supabase } from '@/lib/supabase';
import { settings as settingsApi } from '@/lib/api';
import { CreditCard, CircleDollarSign, MessageSquare, Banknote, ArrowLeft, Shield } from 'lucide-react';

interface PaymentMethod {
  method_type: string;
  display_name: string;
  is_enabled: boolean;
  config: any;
  display_order: number;
}

export function OrderConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');

  // 从路由state获取联系信息
  const {
    contactEmail,
    contactName,
    notes,
    isGuestOrder,
    guestContactQQ,
    guestContactWechat
  } = location.state || {};

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  // 如果没有购物车数据或联系信息，返回购物车页面
  useEffect(() => {
    if (cartItems.length === 0 || !contactEmail) {
      navigate('/cart');
    }
  }, [cartItems, contactEmail, navigate]);

  // 获取可用的支付方式
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        // 暂时使用硬编码的支付方式，后续可以从 settings API 获取
        const defaultPaymentMethods = [
          {
            method_type: 'stripe',
            display_name: 'Stripe 信用卡支付',
            is_enabled: true,
            config: {},
            display_order: 1
          },
          {
            method_type: 'usdt',
            display_name: 'USDT 加密货币支付',
            is_enabled: true,
            config: {},
            display_order: 2
          }
        ];

        setAvailablePaymentMethods(defaultPaymentMethods);
        setSelectedPayment(defaultPaymentMethods[0].method_type);
      } catch (error) {
        console.error('获取支付方式失败:', error);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handleConfirmOrder = () => {
    if (!selectedPayment) {
      alert('请选择支付方式');
      return;
    }

    // 跳转到支付页面，传递所有信息
    navigate('/checkout', {
      state: {
        contactEmail,
        contactName,
        notes,
        isGuestOrder,
        guestContactQQ,
        guestContactWechat,
        paymentMethod: selectedPayment
      }
    });
  };

  const getPaymentIcon = (methodType: string) => {
    switch (methodType) {
      case 'stripe':
        return <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-600" />;
      case 'usdt':
        return <CircleDollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />;
      case 'wechat':
        return <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />;
      case 'alipay':
        return <Banknote className="w-8 h-8 mx-auto mb-2 text-blue-500" />;
      default:
        return <Shield className="w-8 h-8 mx-auto mb-2 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回修改
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">确认订单</h1>

        <div className="space-y-6">
          {/* 订单商品信息 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">订单商品</h2>
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b last:border-b-0">
                  <div className="flex items-center gap-4">
                    {item.product?.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{item.product?.name}</div>
                      <div className="text-sm text-gray-500">数量: {item.quantity}</div>
                    </div>
                  </div>
                  <div className="font-bold text-gray-900">
                    ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-4 text-xl font-bold border-t-2">
                <span>总计</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 联系信息确认 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">联系信息</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium">邮箱：</span>
                <span>{contactEmail}</span>
              </div>
              {contactName && (
                <div className="flex justify-between">
                  <span className="font-medium">姓名：</span>
                  <span>{contactName}</span>
                </div>
              )}
              {isGuestOrder && (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-800">游客模式</div>
                  </div>
                  {guestContactQQ && (
                    <div className="flex justify-between">
                      <span className="font-medium">QQ号：</span>
                      <span>{guestContactQQ}</span>
                    </div>
                  )}
                  {guestContactWechat && (
                    <div className="flex justify-between">
                      <span className="font-medium">微信号：</span>
                      <span>{guestContactWechat}</span>
                    </div>
                  )}
                </>
              )}
              {notes && (
                <div>
                  <div className="font-medium mb-1">备注：</div>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg">{notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* 支付方式选择 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">选择支付方式</h2>
            
            {availablePaymentMethods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无可用的支付方式，请联系管理员
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {availablePaymentMethods.map((method) => (
                  <button
                    key={method.method_type}
                    onClick={() => setSelectedPayment(method.method_type)}
                    className={`p-4 border-2 rounded-lg transition ${
                      selectedPayment === method.method_type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {getPaymentIcon(method.method_type)}
                    <div className="font-medium">{method.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 确认支付按钮 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-gray-900">
                支付金额：<span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
            
            <button
              onClick={handleConfirmOrder}
              disabled={loading || !selectedPayment}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '确认并前往支付'}
            </button>

            <div className="mt-4 text-center text-sm text-gray-500">
              点击后将跳转到支付页面完成支付
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
