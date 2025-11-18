import { useState } from 'react';
// import { supabase } from '@/lib/supabase';
import { orders as ordersApi } from '@/lib/api';
import { Search, Package, CreditCard, Download, FileText, Link as LinkIcon } from 'lucide-react';

export function GuestOrderQueryPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [queryToken, setQueryToken] = useState('');
  const [useToken, setUseToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    if (!orderNumber || (!contactEmail && !queryToken)) {
      setError('请输入订单号和邮箱或查询码');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const { order } = await ordersApi.guestQuery(
        orderNumber,
        useToken ? undefined : contactEmail,
        useToken ? queryToken : undefined
      );

      if (order) {
        setOrderData(order);
      } else {
        setError('未找到订单信息');
      }
    } catch (err: any) {
      console.error('订单查询失败:', err);
      setError(err.message || '订单查询失败，请检查订单号和联系方式');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      processing: '处理中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      unpaid: '未支付',
      pending: '支付中',
      paid: '已支付',
      failed: '支付失败'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">订单查询</h1>

        {/* 查询表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                订单号 *
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如: ORD1731346800000ABC123"
              />
            </div>

            <div className="flex items-center space-x-3 py-2">
              <input
                type="checkbox"
                id="useToken"
                checked={useToken}
                onChange={(e) => setUseToken(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="useToken" className="text-sm text-gray-700">
                使用查询码查询（游客订单）
              </label>
            </div>

            {useToken ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  查询码 *
                </label>
                <input
                  type="text"
                  value={queryToken}
                  onChange={(e) => setQueryToken(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8位查询码"
                  maxLength={8}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系邮箱 *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleQuery}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>{loading ? '查询中...' : '查询订单'}</span>
            </button>
          </div>
        </div>

        {/* 订单详情 */}
        {orderData && (
          <div className="space-y-6">
            {/* 订单信息 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Package className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-bold">订单信息</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">订单号</p>
                  <p className="font-medium">{orderData.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">订单状态</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    orderData.order_status === 'completed' ? 'bg-green-100 text-green-800' :
                    orderData.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusText(orderData.order_status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">支付状态</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    orderData.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    orderData.payment_status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getPaymentStatusText(orderData.payment_status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">订单金额</p>
                  <p className="font-bold text-lg text-blue-600">
                    ${orderData.total_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">下单时间</p>
                  <p className="font-medium">
                    {new Date(orderData.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                {orderData.payment_method && (
                  <div>
                    <p className="text-sm text-gray-500">支付方式</p>
                    <p className="font-medium">{orderData.payment_method.toUpperCase()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 虚拟商品发货信息 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Download className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-bold">虚拟商品</h2>
              </div>

              {orderData.deliveries && orderData.deliveries.length > 0 ? (
                <div className="space-y-4">
                  {orderData.deliveries.map((delivery: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-start space-x-3">
                        {delivery.virtual_assets.asset_type === 'code' && (
                          <FileText className="w-5 h-5 text-blue-600 mt-1" />
                        )}
                        {delivery.virtual_assets.asset_type === 'link' && (
                          <LinkIcon className="w-5 h-5 text-purple-600 mt-1" />
                        )}
                        {delivery.virtual_assets.asset_type === 'file' && (
                          <Download className="w-5 h-5 text-green-600 mt-1" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              {delivery.virtual_assets.asset_type === 'code' ? '激活码' :
                               delivery.virtual_assets.asset_type === 'link' ? '下载链接' :
                               delivery.virtual_assets.asset_type === 'file' ? '文件' :
                               '虚拟资产'}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(delivery.virtual_assets.asset_value);
                                alert('已复制到剪贴板');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              复制
                            </button>
                          </div>
                          <div className="font-mono text-sm bg-white p-3 rounded border border-gray-300 break-all">
                            {delivery.virtual_assets.asset_value}
                          </div>
                          {delivery.sent_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              发货时间: {new Date(delivery.sent_at).toLocaleString('zh-CN')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  {orderData.payment_status === 'paid' ? (
                    <div className="text-yellow-600">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">订单处理中</p>
                      <p className="text-sm text-gray-500 mt-1">
                        您的订单已支付成功，虚拟商品正在发货中，请稍候刷新页面查看
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">暂无发货信息</p>
                      <p className="text-sm text-gray-500 mt-1">
                        完成支付后，虚拟商品将自动发货
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 支付信息 */}
            {orderData.payment && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <CreditCard className="w-6 h-6 text-purple-600 mr-2" />
                  <h2 className="text-xl font-bold">支付信息</h2>
                </div>

                <div className="space-y-3">
                  {orderData.payment.payment_address && (
                    <div>
                      <p className="text-sm text-gray-500">支付地址</p>
                      <p className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200 break-all">
                        {orderData.payment.payment_address}
                      </p>
                    </div>
                  )}
                  {orderData.payment.payment_chain && (
                    <div>
                      <p className="text-sm text-gray-500">区块链网络</p>
                      <p className="font-medium">{orderData.payment.payment_chain}</p>
                    </div>
                  )}
                  {orderData.payment.transaction_id && (
                    <div>
                      <p className="text-sm text-gray-500">交易ID</p>
                      <p className="font-mono text-sm">{orderData.payment.transaction_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
