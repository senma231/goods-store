import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
import { products as productsApi, orders as ordersApi, categories as categoriesApi, siteSettings, notificationChannels, virtualAssetsApi, auth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  BarChart,
  Upload,
  CreditCard,
  Bell,
  Settings,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Plus,
  RefreshCw,
  FolderTree,
  Copy,
  AlertTriangle,
  Mail,
  FileText,
  Link as LinkIcon,
  Download,
  Send
} from 'lucide-react';
import type { Product, Order } from '@/types';

interface PaymentMethod {
  id: string;
  method_type: string;
  display_name: string;
  is_enabled: boolean;
  config: any;
  display_order: number;
}

interface SystemStats {
  totalOrders: number;
  totalRevenue: string;
  pendingOrders: number;
  totalProducts: number;
  activeProducts: number;
  totalUsers: number;
  recentOrders: number;
}

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'assets' | 'payments' | 'notifications' | 'settings'>('dashboard');

  // 导入表单状态
  const [importProductId, setImportProductId] = useState('');
  const [importAssets, setImportAssets] = useState('');

  // 虚拟资产管理状态
  const [selectedAssetProductId, setSelectedAssetProductId] = useState('');
  const [virtualAssets, setVirtualAssets] = useState<any[]>([]);
  const [assetStats, setAssetStats] = useState<any>(null);
  const [assetFilterStatus, setAssetFilterStatus] = useState<string>('all');
  const [loadingAssets, setLoadingAssets] = useState(false);

  // 库存预警状态
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  // 发货失败订单状态
  const [failedDeliveryOrders, setFailedDeliveryOrders] = useState<any[]>([]);

  // 邮件配置状态
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    from_name: '虚拟商品商城'
  });

  // 商品编辑状态
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // 分类管理状态
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
    is_active: true
  });

  // 通知渠道管理状态
  const [channels, setChannels] = useState<any[]>([]);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: '',
    channel_type: 'telegram',
    is_enabled: true,
    config: {} as any,
    events: [] as string[],
    description: ''
  });

  // 网站设置状态
  const [siteSettingsData, setSiteSettingsData] = useState<any[]>([]);
  const [showSettingForm, setShowSettingForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any | null>(null);
  const [settingForm, setSettingForm] = useState({
    setting_key: '',
    setting_value: '',
    setting_type: 'string',
    description: '',
    category: 'general'
  });

  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    original_price: '',
    image_url: '',
    delivery_method: 'auto',
    stock_type: 'unlimited',
    total_stock: 0,
    available_stock: 0,
    is_active: true,
    is_featured: false
  });

  // 支付配置编辑状态
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>({});

  // 删除确认对话框状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    productId: string;
    productName: string;
  }>({
    show: false,
    productId: '',
    productName: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadAllData();
    loadCategories();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedAssetProductId) {
      loadVirtualAssets();
      loadAssetStats();
    }
  }, [selectedAssetProductId, assetFilterStatus]);

  async function loadAllData() {
    setLoading(true);
    try {
      // 先加载基础数据
      const [productsResult, ordersResult] = await Promise.all([
        productsApi.list(),
        ordersApi.list(),
        loadPaymentMethods(),
        loadNotificationChannels(),
        loadSiteSettings()
      ]);

      const productsData = productsResult.products || [];
      const ordersData = ordersResult.orders || [];

      setProducts(productsData);
      setOrders(ordersData);

      // 基础数据加载完成后再计算统计数据
      calculateStats(ordersData, productsData);

      // 加载库存预警（需要在products设置后）
      setTimeout(() => {
        loadLowStockProducts();
      }, 100);

      // 加载发货失败的订单
      loadFailedDeliveries();
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const { products: data } = await productsApi.list();
      setProducts(data || []);
    } catch (error) {
      console.error('加载商品失败:', error);
    }
  }

  async function loadOrders() {
    try {
      const { orders: data } = await ordersApi.list();
      setOrders(data || []);
    } catch (error) {
      console.error('加载订单失败:', error);
    }
  }

  async function loadPaymentMethods() {
    try {
      // 暂时使用硬编码的支付方式
      const defaultMethods = [
        {
          id: '1',
          method_type: 'stripe',
          display_name: 'Stripe 信用卡支付',
          is_enabled: true,
          config: {},
          display_order: 1
        },
        {
          id: '2',
          method_type: 'usdt',
          display_name: 'USDT 加密货币支付',
          is_enabled: true,
          config: {},
          display_order: 2
        }
      ];
      setPaymentMethods(defaultMethods);
    } catch (error) {
      console.error('加载支付方式失败:', error);
    }
  }

  function calculateStats(ordersData: any[], productsData: any[]) {
    try {
      // 计算总销售额
      const totalRevenue = ordersData
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
        .toFixed(2);

      const statsData = {
        totalOrders: ordersData.length,
        totalRevenue,
        pendingOrders: ordersData.filter(o => o.payment_status === 'pending').length,
        totalProducts: productsData.length,
        activeProducts: productsData.filter(p => p.is_active).length,
        totalUsers: 0,
        recentOrders: ordersData.filter(o => {
          const created = new Date(o.created_at);
          const now = new Date();
          const diff = now.getTime() - created.getTime();
          return diff < 24 * 60 * 60 * 1000; // 24小时内
        }).length
      };
      setStats(statsData);
    } catch (error) {
      console.error('计算统计数据失败:', error);
    }
  }

  async function loadCategories() {
    try {
      const { categories: data } = await categoriesApi.adminList();
      setCategories(data || []);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  async function loadNotificationChannels() {
    try {
      const { channels: data } = await notificationChannels.list();
      setChannels(data || []);
    } catch (error) {
      console.error('加载通知渠道失败:', error);
    }
  }

  async function loadSiteSettings() {
    try {
      const { settings: data } = await siteSettings.adminList();
      setSiteSettingsData(data || []);
    } catch (error) {
      console.error('加载网站设置失败:', error);
    }
  }

  const handleOpenProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category_id: product.category_id,
        slug: product.slug,
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price.toString(),
        original_price: product.original_price?.toString() || '',
        image_url: product.image_url || '',
        delivery_method: product.delivery_method || 'auto',
        stock_type: product.stock_type,
        total_stock: product.total_stock || 0,
        available_stock: product.available_stock || 0,
        is_active: product.is_active,
        is_featured: product.is_featured
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category_id: '',
        slug: '',
        description: '',
        short_description: '',
        price: '',
        original_price: '',
        image_url: '',
        delivery_method: 'auto',
        stock_type: 'unlimited',
        total_stock: 0,
        available_stock: 0,
        is_active: true,
        is_featured: false
      });
    }
    setShowProductForm(true);
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    try {
      if (!productForm.name || !productForm.category_id || !productForm.price) {
        alert('请填写必填字段：商品名称、分类、价格');
        return;
      }

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        original_price: productForm.original_price ? parseFloat(productForm.original_price) : null,
        slug: productForm.slug || productForm.name.toLowerCase().replace(/\s+/g, '-')
      };

      if (editingProduct) {
        // 更新商品
        await productsApi.update(editingProduct.id, productData);
        alert('商品更新成功');
      } else {
        // 新增商品
        await productsApi.create(productData);
        alert('商品添加成功');
      }

      handleCloseProductForm();
      loadProducts();
    } catch (error: any) {
      console.error('保存商品失败:', error);
      alert(error.message || '保存失败，请重试');
    }
  };

  const handleShowDeleteConfirm = (productId: string, productName: string) => {
    setDeleteConfirm({
      show: true,
      productId,
      productName
    });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({
      show: false,
      productId: '',
      productName: ''
    });
  };

  const handleConfirmDelete = async () => {
    const { productId } = deleteConfirm;

    try {
      await productsApi.delete(productId);
      alert('商品删除成功');
      handleCancelDelete();
      loadProducts();
    } catch (error: any) {
      console.error('删除商品失败:', error);
      alert(error.message || '删除失败');
    }
  };

  // 分类管理函数
  const handleOpenCategoryForm = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        sort_order: category.sort_order || 0,
        is_active: Boolean(category.is_active)
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        sort_order: 0,
        is_active: true
      });
    }
    setShowCategoryForm(true);
  };

  const handleCloseCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      sort_order: 0,
      is_active: true
    });
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, categoryForm);
        alert('分类更新成功');
      } else {
        await categoriesApi.create(categoryForm);
        alert('分类创建成功');
      }
      handleCloseCategoryForm();
      loadCategories();
    } catch (error: any) {
      console.error('保存分类失败:', error);
      alert(error.message || '保存失败，请重试');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`确定要删除分类"${name}"吗？`)) return;

    try {
      await categoriesApi.delete(id);
      alert('分类删除成功');
      loadCategories();
    } catch (error: any) {
      console.error('删除分类失败:', error);
      alert(error.message || '删除失败');
    }
  };

  const handleOpenPaymentConfig = async (method: PaymentMethod) => {
    setEditingPaymentMethod(method);

    // 从数据库加载配置
    try {
      if (method.method_type === 'stripe') {
        const secretKey = await siteSettings.adminGet('stripe_secret_key').catch(() => ({ setting: null }));
        const publishableKey = await siteSettings.adminGet('stripe_publishable_key').catch(() => ({ setting: null }));
        const webhookSecret = await siteSettings.adminGet('stripe_webhook_secret').catch(() => ({ setting: null }));

        setPaymentConfig({
          secret_key: secretKey?.setting?.setting_value || '',
          publishable_key: publishableKey?.setting?.setting_value || '',
          webhook_secret: webhookSecret?.setting?.setting_value || '',
          environment: publishableKey?.setting?.setting_value?.startsWith('pk_live') ? 'production' : 'test'
        });
      } else if (method.method_type === 'usdt') {
        // 加载多链钱包地址配置
        const trc20Address = await siteSettings.adminGet('usdt_wallet_address_trc20').catch(() => ({ setting: null }));
        const erc20Address = await siteSettings.adminGet('usdt_wallet_address_erc20').catch(() => ({ setting: null }));
        const bep20Address = await siteSettings.adminGet('usdt_wallet_address_bep20').catch(() => ({ setting: null }));
        const defaultChain = await siteSettings.adminGet('usdt_default_chain').catch(() => ({ setting: null }));

        setPaymentConfig({
          trc20_address: trc20Address?.setting?.setting_value || '',
          erc20_address: erc20Address?.setting?.setting_value || '',
          bep20_address: bep20Address?.setting?.setting_value || '',
          chain_type: defaultChain?.setting?.setting_value || 'TRC20',
          min_confirmations: 1,
          payment_timeout: 30
        });
      } else {
        setPaymentConfig(method.config || {});
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      setPaymentConfig(method.config || {});
    }
  };

  const handleClosePaymentConfig = () => {
    setEditingPaymentMethod(null);
    setPaymentConfig({});
  };

  const handleSavePaymentConfig = async () => {
    if (!editingPaymentMethod) return;

    try {
      if (editingPaymentMethod.method_type === 'stripe') {
        // 保存 Stripe 配置到 site_settings
        if (paymentConfig.secret_key) {
          await siteSettings.createOrUpdate({
            setting_key: 'stripe_secret_key',
            setting_value: paymentConfig.secret_key,
            setting_type: 'string',
            category: 'payment',
            description: 'Stripe API 密钥'
          });
        }

        if (paymentConfig.publishable_key) {
          await siteSettings.createOrUpdate({
            setting_key: 'stripe_publishable_key',
            setting_value: paymentConfig.publishable_key,
            setting_type: 'string',
            category: 'payment',
            description: 'Stripe 公钥'
          });
        }

        if (paymentConfig.webhook_secret) {
          await siteSettings.createOrUpdate({
            setting_key: 'stripe_webhook_secret',
            setting_value: paymentConfig.webhook_secret,
            setting_type: 'string',
            category: 'payment',
            description: 'Stripe Webhook 密钥'
          });
        }
      } else if (editingPaymentMethod.method_type === 'usdt') {
        // 保存 USDT 配置到 site_settings - 支持多链钱包地址

        // 保存 TRC20 地址
        if (paymentConfig.trc20_address) {
          await siteSettings.createOrUpdate({
            setting_key: 'usdt_wallet_address_trc20',
            setting_value: paymentConfig.trc20_address,
            setting_type: 'string',
            category: 'payment',
            description: 'USDT TRC20 收款钱包地址'
          });
        }

        // 保存 ERC20 地址
        if (paymentConfig.erc20_address) {
          await siteSettings.createOrUpdate({
            setting_key: 'usdt_wallet_address_erc20',
            setting_value: paymentConfig.erc20_address,
            setting_type: 'string',
            category: 'payment',
            description: 'USDT ERC20 收款钱包地址'
          });
        }

        // 保存 BEP20 地址
        if (paymentConfig.bep20_address) {
          await siteSettings.createOrUpdate({
            setting_key: 'usdt_wallet_address_bep20',
            setting_value: paymentConfig.bep20_address,
            setting_type: 'string',
            category: 'payment',
            description: 'USDT BEP20 收款钱包地址'
          });
        }

        // 保存默认链类型
        if (paymentConfig.chain_type) {
          await siteSettings.createOrUpdate({
            setting_key: 'usdt_default_chain',
            setting_value: paymentConfig.chain_type,
            setting_type: 'string',
            category: 'payment',
            description: 'USDT 默认链类型'
          });
        }
      }

      alert('支付配置保存成功');
      handleClosePaymentConfig();
      loadPaymentMethods();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      alert(error.message || '保存失败');
    }
  };

  const handleImportAssets = async () => {
    if (!importProductId || !importAssets) {
      alert('请选择商品并填写虚拟资产');
      return;
    }

    try {
      // 解析虚拟资产数据
      const lines = importAssets.trim().split('\n').filter(line => line.trim());
      const assets: { type: string; value: string }[] = [];

      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length === 2) {
          assets.push({
            type: parts[0].trim(),
            value: parts[1].trim()
          });
        } else {
          // 如果没有指定类型，默认为code
          assets.push({
            type: 'code',
            value: line.trim()
          });
        }
      }

      if (assets.length === 0) {
        alert('没有有效的虚拟资产数据');
        return;
      }

      // 按类型分组批量导入
      const assetsByType = assets.reduce((acc, asset) => {
        if (!acc[asset.type]) {
          acc[asset.type] = [];
        }
        acc[asset.type].push(asset.value);
        return acc;
      }, {} as Record<string, string[]>);

      let totalImported = 0;
      for (const [assetType, assetValues] of Object.entries(assetsByType)) {
        const result = await virtualAssetsApi.batchAdd({
          product_id: importProductId,
          asset_type: assetType,
          asset_values: assetValues
        });
        totalImported += assetValues.length;
      }

      alert(`成功导入 ${totalImported} 个虚拟资产`);
      setImportAssets('');
      setImportProductId('');
      loadProducts();
    } catch (error: any) {
      console.error('导入失败:', error);
      alert(error.message || '导入失败，请重试');
    }
  };

  const handleToggleProductActive = async (productId: string, isActive: boolean) => {
    try {
      await productsApi.update(productId, { is_active: !isActive });
      alert(isActive ? '商品已下架' : '商品已上架');
      loadProducts();
    } catch (error: any) {
      console.error('操作失败:', error);
      alert(error.message || '操作失败');
    }
  };

  // 虚拟资产管理函数
  async function loadVirtualAssets() {
    if (!selectedAssetProductId) return;

    setLoadingAssets(true);
    try {
      const status = assetFilterStatus === 'all' ? undefined : assetFilterStatus;
      const { assets } = await virtualAssetsApi.getByProduct(selectedAssetProductId, status);
      setVirtualAssets(assets || []);
    } catch (error) {
      console.error('加载虚拟资产失败:', error);
      setVirtualAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }

  async function loadAssetStats() {
    if (!selectedAssetProductId) return;

    try {
      const { stats } = await virtualAssetsApi.getStats(selectedAssetProductId);
      setAssetStats(stats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }

  async function handleDeleteVirtualAsset(assetId: string) {
    if (!confirm('确认删除此虚拟资产？已售出的资产无法删除。')) {
      return;
    }

    try {
      await virtualAssetsApi.delete(assetId);
      alert('删除成功');
      loadVirtualAssets();
      loadAssetStats();
    } catch (error: any) {
      console.error('删除失败:', error);
      alert(error.message || '删除失败');
    }
  }

  // 加载库存预警数据
  async function loadLowStockProducts() {
    try {
      const lowStockThreshold = 10;
      const lowStock: any[] = [];

      // 遍历所有商品，检查库存
      for (const product of products) {
        try {
          const { stats } = await virtualAssetsApi.getStats(product.id);
          if (stats && stats.available < lowStockThreshold) {
            lowStock.push({
              ...product,
              availableStock: stats.available,
              totalStock: stats.total
            });
          }
        } catch (error) {
          console.error(`获取商品 ${product.id} 库存失败:`, error);
        }
      }

      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('加载库存预警失败:', error);
    }
  }

  // 加载发货失败的订单
  async function loadFailedDeliveries() {
    try {
      const { orders: failedOrders } = await ordersApi.getFailedDeliveries();
      setFailedDeliveryOrders(failedOrders || []);
    } catch (error) {
      console.error('加载失败发货列表失败:', error);
    }
  }

  // 重试发货
  async function handleRetryDelivery(orderId: string, orderNumber: string) {
    if (!confirm(`确认重试订单 ${orderNumber} 的发货？`)) {
      return;
    }

    try {
      await ordersApi.retryDelivery(orderId);
      alert('重试发货成功！');
      loadOrders();
      loadFailedDeliveries();
    } catch (error: any) {
      console.error('重试发货失败:', error);
      alert(error.message || '重试发货失败');
    }
  }

  const handleTogglePaymentMethod = async (methodType: string, isEnabled: boolean) => {
    try {
      // TODO: 实现支付方式切换 API
      alert('支付方式切换功能待实现');
      // await paymentMethodsApi.toggle(methodType, !isEnabled);
      // loadPaymentMethods();
    } catch (error: any) {
      console.error('操作失败:', error);
      alert(error.message || '操作失败');
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    if (!confirm('确认要退款此订单吗？此操作不可撤销。')) {
      return;
    }

    try {
      await ordersApi.refund(orderId);
      alert('退款处理成功');
      loadOrders();
    } catch (error: any) {
      console.error('退款失败:', error);
      alert(error.message || '退款失败');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确认要取消此订单吗？')) {
      return;
    }

    try {
      await ordersApi.cancel(orderId);
      alert('订单已取消');
      loadOrders();
    } catch (error: any) {
      console.error('取消订单失败:', error);
      alert(error.message || '取消订单失败');
    }
  };

  // 状态中文映射
  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  };

  const getOrderStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    };
    return statusMap[status] || status;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <button
            onClick={loadAllData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>仪表盘</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>商品管理</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FolderTree className="w-5 h-5" />
            <span>分类管理</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <BarChart className="w-5 h-5" />
            <span>订单管理</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'assets'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>库存管理</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>支付配置</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>通知配置</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>系统设置</span>
          </button>
        </div>

        {/* 仪表盘 */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">总订单数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">总销售额</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">${stats.totalRevenue}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">待处理订单</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <BarChart className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">活跃商品</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeProducts}/{stats.totalProducts}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">快速统计</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">总用户数</span>
                    <span className="font-bold">{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">最近7天订单</span>
                    <span className="font-bold">{stats.recentOrders}</span>
                  </div>
                </div>
              </div>

              {/* 库存预警 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    库存预警
                  </h3>
                  {lowStockProducts.length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      {lowStockProducts.length} 个商品
                    </span>
                  )}
                </div>

                {lowStockProducts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">所有商品库存充足</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            可用库存: <span className="text-red-600 font-bold">{product.availableStock}</span> / 总库存: {product.totalStock}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAssetProductId(product.id);
                            setActiveTab('assets');
                          }}
                          className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                        >
                          补充库存
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 商品管理 */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">商品列表</h2>
                <button
                  onClick={() => handleOpenProductForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  新增商品
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">库存</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">销量</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                            )}
                            <div className="font-medium text-gray-900">{product.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {product.id.substring(0, 8)}...
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(product.id);
                                alert('商品ID已复制');
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              title="复制完整ID"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">${product.price}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">
                            {product.stock_type === 'unlimited' ? (
                              <span className="text-green-600 font-semibold">9999+</span>
                            ) : (
                              <span className={product.available_stock < 10 ? 'text-red-600 font-semibold' : ''}>
                                {product.available_stock}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{product.sold_count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.is_active ? '上架' : '下架'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenProductForm(product)}
                              className="text-blue-600 hover:text-blue-800"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleProductActive(product.id, product.is_active)}
                              className="text-amber-600 hover:text-amber-800"
                              title={product.is_active ? '下架' : '上架'}
                            >
                              {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleShowDeleteConfirm(product.id, product.name)}
                              className="text-red-600 hover:text-red-800"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 商品表单模态框 */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">{editingProduct ? '编辑商品' : '新增商品'}</h3>
                    <button onClick={handleCloseProductForm} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
                        <input
                          type="text"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="输入商品名称"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                        <select
                          value={productForm.category_id}
                          onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">选择分类</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL别名</label>
                        <input
                          type="text"
                          value={productForm.slug}
                          onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="自动生成"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">价格 * ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">原价 ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={productForm.original_price}
                          onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">图片URL</label>
                        <input
                          type="text"
                          value={productForm.image_url}
                          onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">发货方式</label>
                        <select
                          value={productForm.delivery_method}
                          onChange={(e) => setProductForm({ ...productForm, delivery_method: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="auto">自动发货</option>
                          <option value="manual">手动发货</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {productForm.delivery_method === 'auto'
                            ? '支付成功后自动从库存管理中分配虚拟资产'
                            : '需要管理员手动发货'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">库存类型</label>
                        <select
                          value={productForm.stock_type}
                          onChange={(e) => setProductForm({ ...productForm, stock_type: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="unlimited">无限库存</option>
                          <option value="limited">有限库存</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {productForm.stock_type === 'unlimited'
                            ? '前端显示为"9999+"，不限制购买数量'
                            : '库存数量关联库存管理中的真实库存'}
                        </p>
                      </div>

                      {productForm.stock_type === 'limited' && (
                        <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>💡 有限库存说明：</strong>
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                            <li>库存数量由"库存管理"中的可用资产数量决定</li>
                            <li>自动发货商品：库存 = 可用资产数量</li>
                            <li>手动发货商品：需要手动设置库存数量</li>
                            <li>库存不足时，用户无法购买</li>
                          </ul>
                        </div>
                      )}

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">简短描述</label>
                        <input
                          type="text"
                          value={productForm.short_description}
                          onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="一行简短描述"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
                        <textarea
                          value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder="详细描述商品特点"
                        />
                      </div>

                      <div className="col-span-2 flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={productForm.is_active}
                            onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">上架</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={productForm.is_featured}
                            onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">推荐</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t flex justify-end gap-3">
                    <button
                      onClick={handleCloseProductForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveProduct}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">分类列表</h2>
              <button
                onClick={() => handleOpenCategoryForm()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>新建分类</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标识符</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排序</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{category.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{category.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{category.sort_order}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {category.is_active ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenCategoryForm(category)}
                            className="text-blue-600 hover:text-blue-800"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            className="text-red-600 hover:text-red-800"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分类表单模态框 */}
            {showCategoryForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">{editingCategory ? '编辑分类' : '新建分类'}</h3>
                    <button onClick={handleCloseCategoryForm} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分类名称 *</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="输入分类名称"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标识符 (slug)</label>
                      <input
                        type="text"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="留空自动生成"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="输入分类描述"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                      <input
                        type="number"
                        value={categoryForm.sort_order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="category-is-active"
                        checked={categoryForm.is_active}
                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="category-is-active" className="ml-2 block text-sm text-gray-900">
                        启用分类
                      </label>
                    </div>
                  </div>

                  <div className="p-6 border-t flex justify-end gap-3">
                    <button
                      onClick={handleCloseCategoryForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveCategory}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>保存</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 订单管理 */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* 发货失败订单提醒 */}
            {failedDeliveryOrders.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold text-red-900">发货失败订单</h3>
                  <span className="px-2 py-1 bg-red-200 text-red-900 text-xs font-medium rounded-full">
                    {failedDeliveryOrders.length} 个订单
                  </span>
                </div>
                <div className="space-y-3">
                  {failedDeliveryOrders.map((order) => (
                    <div key={order.order_id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">{order.order_number}</span>
                            <span className="text-sm text-gray-500">{order.contact_email}</span>
                            <span className="text-sm font-medium text-gray-900">${order.total_amount}</span>
                          </div>
                          <div className="text-sm text-red-600">
                            <span className="font-medium">错误:</span> {order.error_message || '发货失败'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            失败时间: {new Date(order.failed_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRetryDelivery(order.order_id, order.order_number)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          重试发货
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 订单列表 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">订单列表</h2>
              </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付方式</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${order.total_amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.payment_method || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                          order.payment_status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getPaymentStatusText(order.payment_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          order.status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getOrderStatusText(order.status || 'pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString('zh-CN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.payment_status === 'paid' && order.status !== 'refunded' && (
                          <button
                            onClick={() => handleRefundOrder(order.id)}
                            className="text-red-600 hover:text-red-800 mr-3"
                            title="退款"
                          >
                            退款
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-gray-600 hover:text-gray-800"
                            title="取消"
                          >
                            取消
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {/* 支付配置 */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">支付方式配置</h2>
              
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{method.display_name}</h3>
                        <p className="text-sm text-gray-500">类型: {method.method_type}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={method.is_enabled}
                            onChange={() => handleTogglePaymentMethod(method.method_type, method.is_enabled)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">{method.is_enabled ? '已启用' : '已禁用'}</span>
                        </label>
                        <button
                          onClick={() => handleOpenPaymentConfig(method)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          配置
                        </button>
                      </div>
                    </div>

                    {method.config && Object.keys(method.config).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <p className="text-gray-600">已配置参数：</p>
                        <ul className="mt-1 space-y-1">
                          {Object.keys(method.config).map((key) => (
                            <li key={key} className="text-gray-700">
                              • {key}: {typeof method.config[key] === 'string' && method.config[key].length > 20 
                                ? method.config[key].substring(0, 20) + '...' 
                                : Array.isArray(method.config[key]) 
                                ? `${method.config[key].length} 项`
                                : method.config[key]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 提示：启用的支付方式将在前端结算页面显示给用户选择。请先配置相关API密钥后再启用。
                </p>
              </div>
            </div>

            {/* 支付配置模态框 */}
            {editingPaymentMethod && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">{editingPaymentMethod.display_name} - 配置</h3>
                    <button onClick={handleClosePaymentConfig} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* Stripe配置 */}
                    {editingPaymentMethod.method_type === 'stripe' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Secret Key</label>
                          <input
                            type="password"
                            value={paymentConfig.secret_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, secret_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="sk_test_... 或 sk_live_..."
                          />
                          <p className="text-xs text-gray-500 mt-1">从Stripe后台获取</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Publishable Key</label>
                          <input
                            type="text"
                            value={paymentConfig.publishable_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, publishable_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="pk_test_... 或 pk_live_..."
                          />
                          <p className="text-xs text-gray-500 mt-1">用于前端支付</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">环境</label>
                          <select
                            value={paymentConfig.environment || 'test'}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, environment: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="test">测试环境</option>
                            <option value="production">生产环境</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret (可选)</label>
                          <input
                            type="password"
                            value={paymentConfig.webhook_secret || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, webhook_secret: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="whsec_..."
                          />
                        </div>
                      </div>
                    )}

                    {/* USDT配置 */}
                    {editingPaymentMethod.method_type === 'usdt' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-800">
                            💡 <strong>多链钱包配置说明：</strong>
                          </p>
                          <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                            <li>为每条链配置独立的钱包地址</li>
                            <li>用户选择不同链时，会显示对应的钱包地址</li>
                            <li>推荐使用 TRC20（手续费最低）</li>
                          </ul>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">TRC20 钱包地址 (波场)</label>
                          <input
                            type="text"
                            value={paymentConfig.trc20_address || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, trc20_address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="T开头的地址，如: TAbcdefg..."
                          />
                          <p className="text-xs text-gray-500 mt-1">推荐使用，手续费最低（约 1 USDT）</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ERC20 钱包地址 (以太坊)</label>
                          <input
                            type="text"
                            value={paymentConfig.erc20_address || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, erc20_address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x开头的地址，如: 0xabcdef..."
                          />
                          <p className="text-xs text-gray-500 mt-1">手续费较高（约 5-20 USDT）</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">BEP20 钱包地址 (币安智能链)</label>
                          <input
                            type="text"
                            value={paymentConfig.bep20_address || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, bep20_address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x开头的地址，如: 0xabcdef..."
                          />
                          <p className="text-xs text-gray-500 mt-1">手续费适中（约 0.5-2 USDT）</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">默认链类型</label>
                          <select
                            value={paymentConfig.chain_type || 'TRC20'}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, chain_type: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="TRC20">TRC20 (波场) - 推荐</option>
                            <option value="ERC20">ERC20 (以太坊)</option>
                            <option value="BEP20">BEP20 (币安智能链)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">用户默认看到的链类型</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">最小确认数</label>
                          <input
                            type="number"
                            value={paymentConfig.min_confirmations || 1}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, min_confirmations: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">区块链API密钥 (可选)</label>
                          <input
                            type="password"
                            value={paymentConfig.api_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, api_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="用于查询交易状态"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">支付超时(分钟)</label>
                          <input
                            type="number"
                            value={paymentConfig.payment_timeout || 30}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, payment_timeout: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="5"
                          />
                        </div>
                      </div>
                    )}

                    {/* 微信支付配置 */}
                    {editingPaymentMethod.method_type === 'wechat' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">应用ID (App ID)</label>
                          <input
                            type="text"
                            value={paymentConfig.app_id || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, app_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="wx..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">商户号 (Merchant ID)</label>
                          <input
                            type="text"
                            value={paymentConfig.merchant_id || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, merchant_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="1234567890"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">API密钥 (API Key)</label>
                          <input
                            type="password"
                            value={paymentConfig.api_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, api_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="32位密钥"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">API证书 (可选)</label>
                          <textarea
                            value={paymentConfig.certificate || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, certificate: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="API证书内容"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">回调URL</label>
                          <input
                            type="text"
                            value={paymentConfig.notify_url || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, notify_url: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="https://yourdomain.com/api/wechat-callback"
                          />
                        </div>
                      </div>
                    )}

                    {/* 支付宝配置 */}
                    {editingPaymentMethod.method_type === 'alipay' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">应用ID (App ID)</label>
                          <input
                            type="text"
                            value={paymentConfig.app_id || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, app_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="2021..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">应用私钥 (Private Key)</label>
                          <textarea
                            value={paymentConfig.private_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, private_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="-----BEGIN PRIVATE KEY-----..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">支付宝公钥 (Alipay Public Key)</label>
                          <textarea
                            value={paymentConfig.alipay_public_key || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, alipay_public_key: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">网关地址</label>
                          <select
                            value={paymentConfig.gateway_url || 'https://openapi.alipay.com/gateway.do'}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, gateway_url: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="https://openapi.alipay.com/gateway.do">正式环境</option>
                            <option value="https://openapi.alipaydev.com/gateway.do">沙箱环境</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">回调URL</label>
                          <input
                            type="text"
                            value={paymentConfig.notify_url || ''}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, notify_url: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="https://yourdomain.com/api/alipay-callback"
                          />
                        </div>
                      </div>
                    )}

                    {/* 其他支付方式提示 */}
                    {!['stripe', 'usdt', 'wechat', 'alipay'].includes(editingPaymentMethod.method_type) && (
                      <div className="text-center py-8 text-gray-500">
                        此支付方式暂无可配置项
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t flex justify-end gap-3">
                    <button
                      onClick={handleClosePaymentConfig}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSavePaymentConfig}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      保存配置
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* 虚拟资产管理 */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* 批量导入区域 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                批量导入虚拟资产
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择商品</label>
                  <select
                    value={importProductId}
                    onChange={(e) => setImportProductId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择商品</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (ID: {product.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    虚拟资产（每行一个）
                  </label>
                  <textarea
                    value={importAssets}
                    onChange={(e) => setImportAssets(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={8}
                    placeholder="格式: type|value&#10;例如:&#10;code|ABC123DEF456&#10;code|XYZ789GHI012&#10;link|https://example.com/download/abc"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    支持格式: type|value (type可选: code, file, link, text)
                  </p>
                </div>

                <button
                  onClick={handleImportAssets}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  导入虚拟资产
                </button>
              </div>
            </div>

            {/* 商品选择 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">库存查看与管理</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择商品</label>
              <select
                value={selectedAssetProductId}
                onChange={(e) => setSelectedAssetProductId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择商品</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (ID: {product.id.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            {selectedAssetProductId && assetStats && (
              <>
                {/* 库存统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">总库存</p>
                        <p className="text-2xl font-bold text-gray-900">{assetStats.total || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">可用库存</p>
                        <p className={`text-2xl font-bold ${(assetStats.available || 0) < 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {assetStats.available || 0}
                        </p>
                      </div>
                      <Package className={`w-8 h-8 ${(assetStats.available || 0) < 10 ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    {(assetStats.available || 0) < 10 && (
                      <div className="mt-2 flex items-center text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span>库存不足</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">已售出</p>
                        <p className="text-2xl font-bold text-gray-600">{assetStats.sold || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-gray-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">预留中</p>
                        <p className="text-2xl font-bold text-yellow-600">{assetStats.reserved || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* 筛选器 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">状态筛选:</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAssetFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg transition ${
                          assetFilterStatus === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        全部 ({assetStats.total || 0})
                      </button>
                      <button
                        onClick={() => setAssetFilterStatus('available')}
                        className={`px-4 py-2 rounded-lg transition ${
                          assetFilterStatus === 'available'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        可用 ({assetStats.available || 0})
                      </button>
                      <button
                        onClick={() => setAssetFilterStatus('sold')}
                        className={`px-4 py-2 rounded-lg transition ${
                          assetFilterStatus === 'sold'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        已售出 ({assetStats.sold || 0})
                      </button>
                    </div>
                  </div>
                </div>

                {/* 资产列表 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                      {products.find(p => p.id === selectedAssetProductId)?.name} - 虚拟资产列表
                    </h2>
                    <span className="text-sm text-gray-500">
                      共 {virtualAssets.length} 条记录
                    </span>
                  </div>

                  {loadingAssets ? (
                    <div className="p-8 text-center text-gray-500">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>加载中...</p>
                    </div>
                  ) : virtualAssets.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无虚拟资产</p>
                      <p className="text-sm mt-1">请在"批量导入"标签页中导入虚拟资产</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">资产内容</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {virtualAssets.map((asset) => (
                            <tr key={asset.id} className={asset.status === 'sold' ? 'bg-gray-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {asset.asset_type === 'code' && <FileText className="w-4 h-4 text-blue-600" />}
                                  {asset.asset_type === 'link' && <LinkIcon className="w-4 h-4 text-purple-600" />}
                                  {asset.asset_type === 'file' && <Download className="w-4 h-4 text-green-600" />}
                                  <span className="text-sm text-gray-900">{asset.asset_type}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded max-w-md truncate block">
                                    {asset.asset_value}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(asset.asset_value);
                                      alert('已复制到剪贴板');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                  >
                                    复制
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  asset.status === 'available' ? 'bg-green-100 text-green-800' :
                                  asset.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                                  asset.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {asset.status === 'available' ? '可用' :
                                   asset.status === 'sold' ? '已售出' :
                                   asset.status === 'reserved' ? '预留中' :
                                   asset.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-500">
                                  {new Date(asset.created_at).toLocaleString('zh-CN')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {asset.status !== 'sold' && (
                                  <button
                                    onClick={() => handleDeleteVirtualAsset(asset.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {!selectedAssetProductId && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg">请先选择一个商品</p>
              </div>
            )}
          </div>
        )}

        {/* 通知渠道管理 */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">通知渠道管理</h2>
                <p className="text-gray-600 mt-1">配置 Webhook 通知渠道，接收订单、支付等事件通知</p>
              </div>
              <button
                onClick={() => {
                  setShowChannelForm(true);
                  setEditingChannel(null);
                  setChannelForm({
                    name: '',
                    channel_type: 'telegram',
                    is_enabled: true,
                    config: {},
                    events: [],
                    description: ''
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                新建渠道
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>还没有配置通知渠道</p>
                <p className="text-sm mt-2">点击"新建渠道"开始配置 Webhook 通知</p>
              </div>
            ) : (
              <div className="space-y-4">
                {channels.map((channel) => {
                  const channelTypeNames: Record<string, string> = {
                    telegram: 'Telegram',
                    feishu: '飞书',
                    serverchan: 'Server酱',
                    webhook: '自定义 Webhook'
                  };

                  return (
                    <div key={channel.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{channel.name}</h3>
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              {channelTypeNames[channel.channel_type] || channel.channel_type}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              channel.is_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {channel.is_enabled ? '启用' : '禁用'}
                            </span>
                          </div>
                          {channel.description && (
                            <p className="text-gray-600 mb-2">{channel.description}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            <div>监听事件: {channel.events.length > 0 ? channel.events.join(', ') : '无'}</div>
                            <div className="mt-1">创建时间: {new Date(channel.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const result = await notificationChannels.test(channel.id);
                                if (result.success) {
                                  alert('✅ ' + result.message);
                                } else {
                                  alert('❌ ' + result.message + (result.error ? '\n错误: ' + result.error : ''));
                                }
                              } catch (error: any) {
                                console.error('测试失败:', error);
                                alert('❌ 测试失败: ' + (error.message || '未知错误'));
                              }
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="发送测试通知"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingChannel(channel);
                              setChannelForm({
                                name: channel.name,
                                channel_type: channel.channel_type,
                                is_enabled: channel.is_enabled,
                                config: channel.config,
                                events: channel.events,
                                description: channel.description || ''
                              });
                              setShowChannelForm(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('确认删除此通知渠道？')) {
                                try {
                                  await notificationChannels.delete(channel.id);
                                  loadNotificationChannels();
                                } catch (error) {
                                  console.error('删除失败:', error);
                                  alert('删除失败');
                                }
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 通知渠道表单对话框 */}
            {showChannelForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">
                    {editingChannel ? '编辑通知渠道' : '新建通知渠道'}
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">渠道名称</label>
                        <input
                          type="text"
                          value={channelForm.name}
                          onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                          placeholder="例如：订单通知"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">渠道类型</label>
                        <select
                          value={channelForm.channel_type}
                          onChange={(e) => {
                            setChannelForm({ ...channelForm, channel_type: e.target.value, config: {} });
                          }}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="telegram">Telegram</option>
                          <option value="feishu">飞书</option>
                          <option value="serverchan">Server酱</option>
                          <option value="webhook">自定义 Webhook</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">描述</label>
                      <input
                        type="text"
                        value={channelForm.description}
                        onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                        placeholder="可选"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    {/* Telegram 配置 */}
                    {channelForm.channel_type === 'telegram' && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium">Telegram 配置</h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">Bot Token</label>
                          <input
                            type="text"
                            value={channelForm.config.bot_token || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, bot_token: e.target.value } })}
                            placeholder="从 @BotFather 获取"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Chat ID</label>
                          <input
                            type="text"
                            value={channelForm.config.chat_id || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, chat_id: e.target.value } })}
                            placeholder="接收消息的聊天 ID"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 飞书配置 */}
                    {channelForm.channel_type === 'feishu' && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium">飞书配置</h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">Webhook URL</label>
                          <input
                            type="text"
                            value={channelForm.config.webhook_url || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, webhook_url: e.target.value } })}
                            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Secret (可选)</label>
                          <input
                            type="text"
                            value={channelForm.config.secret || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, secret: e.target.value } })}
                            placeholder="签名密钥"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Server酱配置 */}
                    {channelForm.channel_type === 'serverchan' && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium">Server酱配置</h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">SendKey</label>
                          <input
                            type="text"
                            value={channelForm.config.send_key || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, send_key: e.target.value } })}
                            placeholder="从 Server酱 获取"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 自定义 Webhook 配置 */}
                    {channelForm.channel_type === 'webhook' && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium">自定义 Webhook 配置</h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">Webhook URL</label>
                          <input
                            type="text"
                            value={channelForm.config.webhook_url || ''}
                            onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, webhook_url: e.target.value } })}
                            placeholder="https://your-webhook-url.com/notify"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 事件选择 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">监听事件</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'order_created', label: '新订单创建' },
                          { value: 'payment_success', label: '支付成功' },
                          { value: 'payment_failed', label: '支付失败' },
                          { value: 'order_completed', label: '订单完成' },
                          { value: 'order_refunded', label: '订单退款' },
                        ].map((event) => (
                          <label key={event.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={channelForm.events.includes(event.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setChannelForm({ ...channelForm, events: [...channelForm.events, event.value] });
                                } else {
                                  setChannelForm({ ...channelForm, events: channelForm.events.filter(ev => ev !== event.value) });
                                }
                              }}
                            />
                            <span className="text-sm">{event.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={channelForm.is_enabled}
                          onChange={(e) => setChannelForm({ ...channelForm, is_enabled: e.target.checked })}
                        />
                        <span className="text-sm font-medium">启用此渠道</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={async () => {
                        try {
                          if (editingChannel) {
                            await notificationChannels.update(editingChannel.id, channelForm);
                          } else {
                            await notificationChannels.create(channelForm);
                          }
                          setShowChannelForm(false);
                          loadNotificationChannels();
                        } catch (error) {
                          console.error('保存失败:', error);
                          alert('保存失败');
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setShowChannelForm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 网站设置 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* 账号管理 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">账号管理</h2>
              <p className="text-gray-600 mb-6">管理您的管理员账号信息和密码</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 账号信息 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    账号信息
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">邮箱</label>
                      <p className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">角色</label>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        管理员
                      </span>
                    </div>
                  </div>
                </div>

                {/* 修改密码 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    修改密码
                  </h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const currentPassword = formData.get('currentPassword') as string;
                    const newPassword = formData.get('newPassword') as string;
                    const confirmPassword = formData.get('confirmPassword') as string;

                    if (newPassword !== confirmPassword) {
                      alert('两次输入的新密码不一致');
                      return;
                    }

                    if (newPassword.length < 6) {
                      alert('新密码长度至少为 6 位');
                      return;
                    }

                    try {
                      await auth.changePassword(currentPassword, newPassword);
                      alert('密码修改成功,请重新登录');
                      await auth.signOut();
                      navigate('/login');
                    } catch (error: any) {
                      alert(error.message || '密码修改失败');
                    }
                  }} className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">当前密码</label>
                      <input
                        type="password"
                        name="currentPassword"
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">新密码</label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      修改密码
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* 网站设置 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">网站设置</h2>
                  <p className="text-gray-600 mt-1">配置网站全局设置，包括站点信息、SEO、广告等</p>
                </div>
                <button
                  onClick={() => {
                    setShowSettingForm(true);
                    setEditingSetting(null);
                    setSettingForm({
                      setting_key: '',
                      setting_value: '',
                      setting_type: 'string',
                      description: '',
                      category: 'general'
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  新建设置
                </button>
              </div>

            {/* 按分类显示设置 */}
            {['general', 'seo', 'ads', 'contact'].map((category) => {
              const categoryNames: Record<string, string> = {
                general: '基本信息',
                seo: 'SEO 设置',
                ads: '广告设置',
                contact: '联系方式'
              };

              const categorySettings = siteSettingsData.filter(s => s.category === category);

              if (categorySettings.length === 0) return null;

              return (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">{categoryNames[category]}</h3>
                  <div className="space-y-3">
                    {categorySettings.map((setting) => (
                      <div key={setting.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{setting.setting_key}</h4>
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                {setting.setting_type}
                              </span>
                            </div>
                            {setting.description && (
                              <p className="text-sm text-gray-500 mb-2">{setting.description}</p>
                            )}
                            <div className="text-sm">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                                {setting.setting_value || '(未设置)'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingSetting(setting);
                                setSettingForm({
                                  setting_key: setting.setting_key,
                                  setting_value: setting.setting_value || '',
                                  setting_type: setting.setting_type,
                                  description: setting.description || '',
                                  category: setting.category
                                });
                                setShowSettingForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('确认删除此设置？')) {
                                  try {
                                    await siteSettings.delete(setting.setting_key);
                                    loadSiteSettings();
                                  } catch (error) {
                                    console.error('删除失败:', error);
                                    alert('删除失败');
                                  }
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {siteSettingsData.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>还没有配置网站设置</p>
                <p className="text-sm mt-2">点击"新建设置"开始配置</p>
              </div>
            )}

            {/* 设置表单对话框 */}
            {showSettingForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">
                    {editingSetting ? '编辑设置' : '新建设置'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">设置键名</label>
                      <input
                        type="text"
                        value={settingForm.setting_key}
                        onChange={(e) => setSettingForm({ ...settingForm, setting_key: e.target.value })}
                        disabled={!!editingSetting}
                        placeholder="例如：site_name"
                        className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">创建后不可修改</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">设置值</label>
                      {settingForm.setting_type === 'string' && (
                        <input
                          type="text"
                          value={settingForm.setting_value}
                          onChange={(e) => setSettingForm({ ...settingForm, setting_value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      )}
                      {settingForm.setting_type === 'number' && (
                        <input
                          type="number"
                          value={settingForm.setting_value}
                          onChange={(e) => setSettingForm({ ...settingForm, setting_value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      )}
                      {settingForm.setting_type === 'boolean' && (
                        <select
                          value={settingForm.setting_value}
                          onChange={(e) => setSettingForm({ ...settingForm, setting_value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      )}
                      {settingForm.setting_type === 'json' && (
                        <textarea
                          value={settingForm.setting_value}
                          onChange={(e) => setSettingForm({ ...settingForm, setting_value: e.target.value })}
                          rows={4}
                          placeholder='{"key": "value"}'
                          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">描述</label>
                      <input
                        type="text"
                        value={settingForm.description}
                        onChange={(e) => setSettingForm({ ...settingForm, description: e.target.value })}
                        placeholder="可选"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">类型</label>
                        <select
                          value={settingForm.setting_type}
                          onChange={(e) => setSettingForm({ ...settingForm, setting_type: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="string">字符串</option>
                          <option value="number">数字</option>
                          <option value="boolean">布尔值</option>
                          <option value="json">JSON</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">分类</label>
                        <select
                          value={settingForm.category}
                          onChange={(e) => setSettingForm({ ...settingForm, category: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="general">基本信息</option>
                          <option value="seo">SEO 设置</option>
                          <option value="ads">广告设置</option>
                          <option value="contact">联系方式</option>
                        </select>
                      </div>
                    </div>

                    {/* 常用设置快捷选择 */}
                    {!editingSetting && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">常用设置快捷选择：</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'site_name', desc: '站点名称', category: 'general' },
                            { key: 'site_description', desc: '站点描述', category: 'general' },
                            { key: 'seo_title', desc: 'SEO 标题', category: 'seo' },
                            { key: 'seo_keywords', desc: 'SEO 关键词', category: 'seo' },
                            { key: 'google_analytics', desc: 'Google Analytics ID', category: 'ads' },
                            { key: 'contact_email', desc: '联系邮箱', category: 'contact' },
                          ].map((preset) => (
                            <button
                              key={preset.key}
                              onClick={() => setSettingForm({
                                ...settingForm,
                                setting_key: preset.key,
                                description: preset.desc,
                                category: preset.category
                              })}
                              className="px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100"
                            >
                              {preset.desc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={async () => {
                        try {
                          await siteSettings.createOrUpdate(settingForm);
                          setShowSettingForm(false);
                          loadSiteSettings();
                        } catch (error) {
                          console.error('保存失败:', error);
                          alert('保存失败');
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setShowSettingForm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* 删除确认对话框 */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold text-gray-900">确认删除</h3>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700">
                  确定要删除商品 <span className="font-bold">"{deleteConfirm.productName}"</span> 吗？
                </p>
                <p className="text-red-600 text-sm mt-2">
                  此操作不可撤销，请谨慎操作。
                </p>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
