export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  gallery_urls?: string[];
  video_url?: string;
  is_active: boolean;
  is_featured: boolean;
  delivery_method: 'auto' | 'manual';
  stock_type: 'unlimited' | 'limited';
  total_stock: number;
  available_stock: number;
  sold_count: number;
  view_count: number;
  sort_order: number;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  total_amount: number;
  payment_method?: 'stripe' | 'usdt' | 'wechat' | 'alipay';
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded';
  contact_email?: string;
  contact_name?: string;
  notes?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface VirtualAsset {
  id: string;
  product_id: string;
  asset_type: 'code' | 'file' | 'link' | 'text';
  asset_value: string;
  status: 'available' | 'sold' | 'reserved';
  order_id?: string;
  sold_at?: string;
  created_at: string;
}

export interface Delivery {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string;
  virtual_asset_id: string;
  delivered_at: string;
  created_at: string;
}
