// API 客户端 - 替代 Supabase
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

// 获取认证令牌
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// 获取会话ID（用于游客购物车）
function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const sessionId = getSessionId();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

// 认证 API
export const auth = {
  async signUp(email: string, password: string, fullName?: string) {
    const data = await request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async signIn(email: string, password: string) {
    const data = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async signOut() {
    localStorage.removeItem('auth_token');
    await request('/auth/logout', { method: 'POST' });
  },

  async getUser() {
    return request<{ user: any }>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async updateProfile(data: { full_name?: string; email?: string }) {
    return request<{ user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// 商品 API
export const products = {
  async list(params?: { category?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return request<{ products: any[]; pagination: any }>(`/products?${query}`);
  },

  async getBySlug(slug: string) {
    return request<{ product: any }>(`/products/slug/${slug}`);
  },

  async getById(id: string) {
    return request<{ product: any }>(`/products/${id}`);
  },

  async create(data: any) {
    return request<{ product: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return request<{ product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// 分类 API
export const categories = {
  async list() {
    return request<{ categories: any[] }>('/categories');
  },

  async adminList() {
    return request<{ categories: any[] }>('/categories/admin/all');
  },

  async create(data: any) {
    return request<{ category: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return request<{ category: any }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async getBySlug(slug: string) {
    return request<{ category: any }>(`/categories/slug/${slug}`);
  },
};

// 购物车 API
export const cart = {
  async get() {
    return request<{ items: any[] }>('/cart');
  },

  async add(productId: string, quantity: number = 1) {
    return request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  },

  async update(itemId: string, quantity: number) {
    return request(`/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  async remove(itemId: string) {
    return request(`/cart/${itemId}`, { method: 'DELETE' });
  },

  async clear() {
    return request('/cart', { method: 'DELETE' });
  },
};

// 订单 API
export const orders = {
  async list() {
    return request<{ orders: any[] }>('/orders');
  },

  async create(data: {
    items: Array<{ product_id: string; quantity: number }>;
    contact_email: string;
    contact_name?: string;
    payment_method?: string;
  }) {
    return request<{ order: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async query(orderNumber: string, contactEmail?: string, queryToken?: string) {
    return request<{ order: any }>('/orders/query', {
      method: 'POST',
      body: JSON.stringify({ order_number: orderNumber, contact_email: contactEmail, query_token: queryToken }),
    });
  },

  async getMyOrders() {
    return request<{ orders: any[] }>('/orders/my-orders');
  },

  async getById(id: string) {
    return request<{ order: any }>(`/orders/${id}`);
  },

  async guestQuery(orderNumber: string, contactEmail?: string, queryToken?: string) {
    return request<{ order: any }>('/orders/guest-query', {
      method: 'POST',
      body: JSON.stringify({
        order_number: orderNumber,
        contact_email: contactEmail,
        query_token: queryToken,
      }),
    });
  },

  async retryDelivery(orderId: string) {
    return request<{ success: boolean; message: string; deliveries: any[] }>(`/orders/${orderId}/retry-delivery`, {
      method: 'POST',
    });
  },

  async getFailedDeliveries() {
    return request<{ success: boolean; orders: any[] }>('/orders/failed-deliveries');
  },

  async cancel(orderId: string) {
    return request<{ success: boolean; message: string }>(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },

  async refund(orderId: string) {
    return request<{ success: boolean; message: string }>(`/orders/${orderId}/refund`, {
      method: 'POST',
    });
  },

  async updateNotes(orderId: string, notes: string) {
    return request<{ success: boolean; message: string }>(`/orders/${orderId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  async delete(orderId: string) {
    return request<{ success: boolean; message: string }>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  },

  async manualDelivery(orderId: string, deliveries: Array<{ product_id: string; asset_type: string; asset_value: string }>) {
    return request<{ success: boolean; message: string; deliveries: any[] }>(`/orders/${orderId}/manual-delivery`, {
      method: 'POST',
      body: JSON.stringify({ deliveries }),
    });
  },
};

// 支付 API
export const payments = {
  async getStripePublishableKey() {
    return request<{ publishable_key: string }>('/payments/stripe/publishable-key');
  },

  async createStripePayment(orderId: string, amount: number) {
    return request<{ client_secret: string; payment_id: string }>('/payments/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, amount }),
    });
  },

  async createUSDTPayment(orderId: string, amount: number, chain: string = 'TRC20') {
    return request<{ payment_id: string; payment_address: string; amount: number; chain: string; expires_at: string }>(
      '/payments/usdt/create-payment',
      {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, amount, chain }),
      }
    );
  },

  async getPaymentStatus(paymentId: string) {
    return request<{ payment: any }>(`/payments/${paymentId}/status`);
  },

  async confirmPayment(orderId: string, paymentMethod: string) {
    return request<{ success: boolean; message: string }>('/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, payment_method: paymentMethod }),
    });
  },
};

// 通知渠道 API (Webhook)
export const notificationChannels = {
  async list() {
    return request<{ channels: any[] }>('/notification-channels');
  },

  async create(data: any) {
    return request<{ channel: any }>('/notification-channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return request<{ channel: any }>(`/notification-channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return request<{ message: string }>(`/notification-channels/${id}`, {
      method: 'DELETE',
    });
  },

  async test(id: string) {
    return request<{ success: boolean; message: string; error?: string }>(`/notification-channels/${id}/test`, {
      method: 'POST',
    });
  },
};

// 网站设置 API
export const siteSettings = {
  async getPublic() {
    return request<{ settings: Record<string, any> }>('/settings/public');
  },

  async adminList(category?: string) {
    const params = category ? `?category=${category}` : '';
    return request<{ settings: any[] }>(`/settings/admin/all${params}`);
  },

  async adminGet(key: string) {
    return request<{ setting: any }>(`/settings/admin/${key}`);
  },

  async createOrUpdate(data: any) {
    return request<{ setting: any }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(key: string) {
    return request<{ message: string }>(`/settings/${key}`, {
      method: 'DELETE',
    });
  },
};

// 虚拟资产 API
export const virtualAssetsApi = {
  async getByProduct(productId: string, status?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params}` : '';
    return request<{ assets: any[] }>(`/virtual-assets/product/${productId}${query}`);
  },

  async batchAdd(data: { product_id: string; asset_type: string; asset_values: string[] }) {
    return request<{ message: string; assets: any[] }>('/virtual-assets/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async add(data: { product_id: string; asset_type: string; asset_value: string }) {
    return request<{ asset: any }>('/virtual-assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return request<{ message: string }>(`/virtual-assets/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats(productId: string) {
    return request<{ stats: any }>(`/virtual-assets/stats/${productId}`);
  },
};

// 保持向后兼容
export const settings = siteSettings;
export const notifications = notificationChannels;
