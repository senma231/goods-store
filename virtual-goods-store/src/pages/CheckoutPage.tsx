import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
// import { supabase } from '@/lib/supabase';
import { orders as ordersApi, payments as paymentsApi, siteSettings } from '@/lib/api';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { AlertCircle, Clock, QrCode, CheckCircle, Copy, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Stripe Promise - 将从后端动态加载
let stripePromise: Promise<Stripe | null> | null = null;

// 获取 Stripe 公钥并初始化
const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      console.log('正在获取 Stripe 公钥...');
      const { publishable_key } = await paymentsApi.getStripePublishableKey();
      console.log('Stripe 公钥获取成功:', publishable_key ? '已配置' : '未配置');

      if (publishable_key) {
        stripePromise = loadStripe(publishable_key);
      } else {
        console.warn('Stripe 公钥未配置，请在系统设置中配置 stripe_publishable_key');
        // 返回 null 而不是抛出错误，让页面可以继续加载
        stripePromise = Promise.resolve(null);
      }
    } catch (error) {
      console.error('获取 Stripe 公钥失败:', error);
      // 返回 null 而不是抛出错误
      stripePromise = Promise.resolve(null);
    }
  }
  return stripePromise;
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': { color: '#aab7c4' },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: { color: '#9e2146' },
  },
};

interface PaymentComponentProps {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  queryToken?: string;
  contactEmail: string;
  isGuestOrder: boolean;
  onSuccess: () => void;
}

// USDT支付组件（增强版）
function USDTPaymentComponent({ orderId, orderNumber, total, queryToken, onSuccess }: PaymentComponentProps) {
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15分钟倒计时
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactEmail, setContactEmail] = useState<string>('');

  useEffect(() => {
    // 获取USDT支付信息和联系邮箱
    const fetchPaymentInfo = async () => {
      try {
        const { payment_id, payment_address, amount, chain, expires_at } =
          await paymentsApi.createUSDTPayment(orderId, total);

        // 解析钱包地址（如果管理员输入的是"链:地址"格式，拆分开）
        let actualChain = chain;
        let actualAddress = payment_address;

        if (payment_address.includes(':')) {
          const parts = payment_address.split(':');
          actualChain = parts[0].trim();
          actualAddress = parts[1].trim();
        }

        setPaymentInfo({
          payment_id,
          payment_address: actualAddress,
          amount,
          chain: actualChain,
          expires_at
        });

        // 获取系统设置中的联系邮箱
        try {
          const { settings } = await siteSettings.getPublic();
          const emailSetting = settings.find((s: any) => s.setting_key === 'contact_email');
          if (emailSetting) {
            setContactEmail(emailSetting.setting_value);
          }
        } catch (error) {
          console.error('获取联系邮箱失败:', error);
        }
      } catch (error: any) {
        console.error('获取支付信息失败:', error);
      }
    };

    fetchPaymentInfo();
  }, [orderId, total]);

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 自动检查支付状态
  useEffect(() => {
    if (!paymentInfo) return;

    const checkPayment = setInterval(async () => {
      try {
        setChecking(true);

        // 调用后端检查支付状态
        const { payment } = await paymentsApi.getPaymentStatus(paymentInfo.payment_id);

        if (payment?.status === 'completed') {
          clearInterval(checkPayment);

          // 确认支付
          try {
            await paymentsApi.confirmPayment(orderId, 'usdt');
            console.log('✅ USDT 支付确认成功');
          } catch (confirmError) {
            console.error('支付确认失败:', confirmError);
          }

          onSuccess();
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      } finally {
        setChecking(false);
      }
    }, 5000); // 每5秒检查一次

    return () => clearInterval(checkPayment);
  }, [paymentInfo, orderId, onSuccess]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyAddress = () => {
    if (paymentInfo?.payment_address) {
      navigator.clipboard.writeText(paymentInfo.payment_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!paymentInfo) {
    return <div className="text-center py-8">加载支付信息...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 倒计时 */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <div className="font-bold text-amber-900">支付倒计时</div>
              <div className="text-sm text-amber-700">请在倒计时结束前完成转账</div>
            </div>
          </div>
          <div className={`text-3xl font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-amber-900'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
        {timeLeft === 0 && (
          <div className="mt-4 text-center text-red-600">
            支付超时，订单已自动取消
          </div>
        )}
      </div>

      {/* 支付信息 */}
      <div className="bg-white border-2 border-blue-300 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-blue-600" />
          USDT 支付信息
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 左侧：二维码 */}
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG
                value={paymentInfo.payment_address}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center">扫描二维码复制地址</p>
          </div>

          {/* 右侧：支付详情 */}
          <div className="space-y-4">
            {/* 网络链 */}
            <div>
              <div className="text-sm text-gray-600 mb-2">网络链</div>
              <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                <div className="font-bold text-xl text-blue-900">{paymentInfo.chain}</div>
              </div>
            </div>

            {/* 收款地址 */}
            <div>
              <div className="text-sm text-gray-600 mb-2">收款地址</div>
              <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs break-all flex-1">
                    {paymentInfo.payment_address}
                  </div>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition"
                    title="复制地址"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 支付金额 */}
            <div>
              <div className="text-sm text-gray-600 mb-2">支付金额</div>
              <div className="bg-green-50 p-3 rounded-lg border-2 border-green-200">
                <div className="font-bold text-2xl text-green-900">${total.toFixed(2)} USDT</div>
              </div>
            </div>
          </div>
        </div>

        {/* 重要提示 */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <div className="font-bold mb-1">重要提示</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>请确保转账金额完全匹配</li>
                <li>请使用正确的网络链（{paymentInfo.chain}）</li>
                <li>转账确认后，虚拟商品将自动发货</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 退款提示 */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-bold mb-1">退款说明</div>
              <p>
                USDT 支付暂不支持自动退款。如需退款，请联系客服：
                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="ml-1 font-medium underline hover:text-blue-900"
                  >
                    {contactEmail}
                  </a>
                ) : (
                  <span className="ml-1 text-gray-600">客服邮箱未配置</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 自动查收状态 */}
      {checking && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div className="text-blue-800">正在自动检查支付状态...</div>
          </div>
        </div>
      )}

      {/* 订单号和查询码 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">订单号</div>
            <div className="font-mono font-bold">{orderNumber}</div>
          </div>
          {queryToken && (
            <div>
              <div className="text-sm text-gray-600">查询码</div>
              <div className="font-mono font-bold text-amber-600">{queryToken}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stripe支付组件
function StripePaymentComponent({ orderId, orderNumber, total, queryToken, contactEmail, onSuccess }: PaymentComponentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setError('Stripe未加载');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. 调用后端创建Payment Intent
      const { client_secret, payment_id } = await paymentsApi.createStripePayment(
        orderId,
        Math.round(total * 100)
      );

      if (!client_secret) {
        throw new Error('无法获取支付密钥');
      }

      const clientSecret = client_secret;

      // 真实Stripe支付
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('卡片信息错误');

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement as any,
          billing_details: {
            email: contactEmail,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || '支付失败');
      }

      if (paymentIntent?.status === 'succeeded') {
        // 调用后端确认支付（备用方案，如果 Webhook 未配置）
        try {
          await paymentsApi.confirmPayment(orderId, 'stripe');
          console.log('✅ 支付确认成功');
        } catch (confirmError) {
          console.error('支付确认失败:', confirmError);
          // 即使确认失败，也继续流程（webhook 会处理）
        }
        onSuccess();
      }
    } catch (error: any) {
      console.error('Stripe支付失败:', error);
      setError(error.message || '支付失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-blue-300 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">信用卡信息</h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              if (e.error) {
                setCardError(e.error.message);
              } else {
                setCardError(null);
              }
            }}
          />
        </div>
        {cardError && (
          <p className="text-red-600 text-sm mt-2">{cardError}</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          💳 测试卡号: 4242 4242 4242 4242 | 过期日期: 任意未来日期 | CVC: 任意3位数字
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={processing || !stripe || !elements}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? '处理中...' : `支付 $${total.toFixed(2)}`}
      </button>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2">
          <div>
            <div className="text-sm text-gray-600">订单号</div>
            <div className="font-mono font-bold">{orderNumber}</div>
          </div>
          {queryToken && (
            <div>
              <div className="text-sm text-gray-600">查询码</div>
              <div className="font-mono font-bold text-amber-600">{queryToken}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 主支付页面
function PaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [queryToken, setQueryToken] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // 使用 ref 防止 React Strict Mode 导致的重复创建订单
  const orderCreatedRef = useRef(false);

  const {
    contactEmail,
    contactName,
    notes,
    isGuestOrder,
    guestContactQQ,
    guestContactWechat,
    paymentMethod
  } = location.state || {};

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  useEffect(() => {
    // 验证必要参数
    if (!contactEmail || !paymentMethod || cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    // 防止重复创建订单（React Strict Mode 会两次调用 useEffect）
    if (orderCreatedRef.current) {
      return;
    }
    orderCreatedRef.current = true;

    // 创建订单
    createOrder();
  }, []);

  const createOrder = async () => {
    setLoading(true);
    try {
      const items = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const { order } = await ordersApi.create({
        items,
        contact_email: contactEmail,
        contact_name: contactName,
        notes,
        payment_method: paymentMethod
      });

      if (!order) throw new Error('订单创建失败');

      setOrderId(order.id);
      setOrderNumber(order.order_number);

      // 后端返回的字段名是 order_query_token
      if (order.order_query_token) {
        setQueryToken(order.order_query_token);
      }
    } catch (error: any) {
      console.error('创建订单失败:', error);
      alert(error.message || '创建订单失败');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    clearCart();
    
    setTimeout(() => {
      if (isGuestOrder) {
        navigate('/query-order');
      } else {
        navigate('/orders');
      }
    }, 3000);
  };

  if (loading || !orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">创建订单中...</div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">支付成功！</h2>
            <p className="text-gray-600 mb-4">虚拟商品已自动发货</p>
            <p className="text-sm text-gray-500">
              {isGuestOrder ? '跳转到订单查询页面...' : '跳转到订单页面...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">支付</h1>

        {paymentMethod === 'stripe' && (
          <StripePaymentComponent
            orderId={orderId}
            orderNumber={orderNumber!}
            total={total}
            paymentMethod={paymentMethod}
            queryToken={queryToken || undefined}
            contactEmail={contactEmail}
            isGuestOrder={isGuestOrder}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {paymentMethod === 'usdt' && (
          <USDTPaymentComponent
            orderId={orderId}
            orderNumber={orderNumber!}
            total={total}
            paymentMethod={paymentMethod}
            queryToken={queryToken || undefined}
            contactEmail={contactEmail}
            isGuestOrder={isGuestOrder}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {(paymentMethod === 'wechat' || paymentMethod === 'alipay') && (
          <div className="text-center py-8 text-gray-500">
            {paymentMethod === 'wechat' ? '微信' : '支付宝'}支付功能开发中...
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const [stripePromiseState, setStripePromiseState] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化 Stripe
    const initStripe = async () => {
      try {
        const promise = await getStripePromise();
        setStripePromiseState(promise);
      } catch (error) {
        console.error('初始化 Stripe 失败:', error);
        setStripePromiseState(Promise.resolve(null));
      } finally {
        setLoading(false);
      }
    };

    initStripe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">加载支付系统...</div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromiseState}>
      <PaymentForm />
    </Elements>
  );
}
