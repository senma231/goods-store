import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
import { orders as ordersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, OrderItem, Delivery, VirtualAsset } from '@/types';
import { Package, Eye } from 'lucide-react';

interface OrderWithDetails extends Order {
  items?: OrderItem[];
  deliveries?: (Delivery & { asset?: VirtualAsset })[];
}

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  async function loadOrders() {
    if (!user) return;

    setLoading(true);
    try {
      const { orders: ordersData } = await ordersApi.list();

      // 过滤当前用户的订单
      const userOrders = ordersData.filter(order => order.user_id === user.id);

      setOrders(userOrders);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      processing: '处理中',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      refunded: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">我的订单</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        订单号: {order.order_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <span className="text-gray-400">{item.product_name[0]}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-gray-500">
                              ${item.unit_price} x {item.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="font-bold">${item.total_price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      支付方式: {order.payment_method || '未选择'}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      总计: ${order.total_amount}
                    </div>
                  </div>

                  {selectedOrder?.id === order.id && order.deliveries && order.deliveries.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-bold mb-3">虚拟商品信息</h3>
                      <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                        {order.deliveries.map((delivery) => (
                          <div key={delivery.id} className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600 mb-1">
                              类型: {delivery.asset?.asset_type}
                            </div>
                            <div className="font-mono text-sm break-all">
                              {delivery.asset?.asset_value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
