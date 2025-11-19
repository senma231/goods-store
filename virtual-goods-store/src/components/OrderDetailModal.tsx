import { X, Package, Mail, Calendar, CreditCard, FileText, Trash2, Send } from 'lucide-react';
import { useState } from 'react';

interface OrderDetailModalProps {
  order: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderDetailModal({ order, onClose, onUpdate }: OrderDetailModalProps) {
  const [notes, setNotes] = useState(order.notes || '');
  const [saving, setSaving] = useState(false);
  const [showManualDelivery, setShowManualDelivery] = useState(false);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) throw new Error('保存失败');

      alert('备注已保存');
      onUpdate();
    } catch (error) {
      console.error('保存备注失败:', error);
      alert('保存备注失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个订单吗？此操作不可撤销。')) return;

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      alert('订单已删除');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('删除订单失败:', error);
      alert(error.message || '删除订单失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">订单详情</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm text-gray-500">订单号</label>
              <p className="font-mono font-semibold">{order.order_number}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">订单状态</label>
              <p className="font-semibold">{getStatusText(order.status)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">支付状态</label>
              <p className="font-semibold">{getPaymentStatusText(order.payment_status)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">支付方式</label>
              <p className="font-semibold">{order.payment_method?.toUpperCase() || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">联系邮箱</label>
              <p className="font-semibold">{order.contact_email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">联系人</label>
              <p className="font-semibold">{order.contact_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">订单金额</label>
              <p className="font-semibold text-lg text-blue-600">¥{order.total_amount}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">创建时间</label>
              <p className="font-semibold">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          {/* 订单商品 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              订单商品
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">商品名称</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">数量</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">单价</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">¥{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 发货记录 */}
          {order.deliveries && order.deliveries.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Send className="w-5 h-5" />
                发货记录
              </h3>
              <div className="space-y-3">
                {order.deliveries.map((delivery: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">发货时间：</span>
                        <span className="font-medium">{new Date(delivery.sent_at).toLocaleString('zh-CN')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">发货方式：</span>
                        <span className="font-medium">{delivery.delivery_method === 'manual' ? '手动发货' : '自动发货'}</span>
                      </div>
                      {delivery.virtual_assets && (
                        <>
                          <div>
                            <span className="text-gray-500">资产类型：</span>
                            <span className="font-medium">{delivery.virtual_assets.asset_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">资产内容：</span>
                            <span className="font-mono font-medium bg-white px-2 py-1 rounded">
                              {delivery.virtual_assets.asset_value}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 手动发货按钮 */}
          {order.payment_status === 'paid' && (!order.deliveries || order.deliveries.length === 0) && (
            <div>
              <button
                onClick={() => setShowManualDelivery(true)}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                手动发货
              </button>
            </div>
          )}

          {/* 订单备注 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              订单备注
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="添加订单备注..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存备注'}
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t">
            {(order.payment_status !== 'paid' || order.status === 'refunded') && (
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                删除订单
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 手动发货弹窗 */}
      {showManualDelivery && (
        <ManualDeliveryModal
          order={order}
          onClose={() => setShowManualDelivery(false)}
          onSuccess={() => {
            setShowManualDelivery(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

// 手动发货弹窗组件
function ManualDeliveryModal({ order, onClose, onSuccess }: { order: any; onClose: () => void; onSuccess: () => void }) {
  const [deliveries, setDeliveries] = useState(
    order.items?.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      asset_type: 'code',
      asset_value: ''
    })) || []
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // 验证所有商品都填写了发货内容
    const emptyDeliveries = deliveries.filter(d => !d.asset_value.trim());
    if (emptyDeliveries.length > 0) {
      alert('请填写所有商品的发货内容');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/manual-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          deliveries: deliveries.map(d => ({
            product_id: d.product_id,
            asset_type: d.asset_type,
            asset_value: d.asset_value
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '发货失败');
      }

      alert('发货成功！');
      onSuccess();
    } catch (error: any) {
      console.error('手动发货失败:', error);
      alert(error.message || '手动发货失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">手动发货</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {deliveries.map((delivery, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">{delivery.product_name} (x{delivery.quantity})</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">资产类型</label>
                  <select
                    value={delivery.asset_type}
                    onChange={(e) => {
                      const newDeliveries = [...deliveries];
                      newDeliveries[index].asset_type = e.target.value;
                      setDeliveries(newDeliveries);
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="code">激活码</option>
                    <option value="account">账号密码</option>
                    <option value="link">下载链接</option>
                    <option value="text">文本内容</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发货内容</label>
                  <textarea
                    value={delivery.asset_value}
                    onChange={(e) => {
                      const newDeliveries = [...deliveries];
                      newDeliveries[index].asset_value = e.target.value;
                      setDeliveries(newDeliveries);
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono"
                    rows={3}
                    placeholder="输入发货内容..."
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '发货中...' : '确认发货'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

