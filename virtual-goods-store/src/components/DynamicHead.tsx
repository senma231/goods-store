import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteSettings } from '@/lib/api';

/**
 * 动态更新页面标题和 meta 标签
 * 从系统设置中读取 SEO 配置
 */
export function DynamicHead() {
  const location = useLocation();

  useEffect(() => {
    const updateHead = async () => {
      try {
        // 获取系统设置
        const { settings } = await siteSettings.getPublic();
        
        // 提取设置值
        const siteName = settings.find((s: any) => s.setting_key === 'site_name')?.setting_value || '虚拟商城';
        const siteDescription = settings.find((s: any) => s.setting_key === 'site_description')?.setting_value || '专业的虚拟商品交易平台';
        const seoTitle = settings.find((s: any) => s.setting_key === 'seo_title')?.setting_value;
        const seoDescription = settings.find((s: any) => s.setting_key === 'seo_description')?.setting_value;
        const seoKeywords = settings.find((s: any) => s.setting_key === 'seo_keywords')?.setting_value;

        // 根据路由生成页面标题
        let pageTitle = siteName;
        const path = location.pathname;

        if (path === '/') {
          pageTitle = seoTitle || `${siteName} - ${siteDescription}`;
        } else if (path === '/login') {
          pageTitle = `登录 - ${siteName}`;
        } else if (path === '/register') {
          pageTitle = `注册 - ${siteName}`;
        } else if (path === '/cart') {
          pageTitle = `购物车 - ${siteName}`;
        } else if (path === '/orders') {
          pageTitle = `我的订单 - ${siteName}`;
        } else if (path === '/admin') {
          pageTitle = `管理后台 - ${siteName}`;
        } else if (path.startsWith('/product/')) {
          pageTitle = `商品详情 - ${siteName}`;
        } else if (path === '/checkout') {
          pageTitle = `支付 - ${siteName}`;
        } else if (path === '/order-confirm') {
          pageTitle = `订单确认 - ${siteName}`;
        } else if (path === '/contact-info') {
          pageTitle = `联系信息 - ${siteName}`;
        } else if (path === '/query-order') {
          pageTitle = `订单查询 - ${siteName}`;
        }

        // 更新页面标题
        document.title = pageTitle;

        // 更新 meta description
        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta) {
          descriptionMeta.setAttribute('content', seoDescription || siteDescription);
        }

        // 更新 meta keywords
        const keywordsMeta = document.querySelector('meta[name="keywords"]');
        if (keywordsMeta && seoKeywords) {
          keywordsMeta.setAttribute('content', seoKeywords);
        }

        // 更新 Open Graph 标题
        const ogTitleMeta = document.querySelector('meta[property="og:title"]');
        if (ogTitleMeta) {
          ogTitleMeta.setAttribute('content', pageTitle);
        }

        // 更新 Open Graph 描述
        const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
        if (ogDescriptionMeta) {
          ogDescriptionMeta.setAttribute('content', seoDescription || siteDescription);
        }

        // 更新 Twitter 标题
        const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitleMeta) {
          twitterTitleMeta.setAttribute('content', pageTitle);
        }

        // 更新 Twitter 描述
        const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescriptionMeta) {
          twitterDescriptionMeta.setAttribute('content', seoDescription || siteDescription);
        }

      } catch (error) {
        console.error('更新页面 meta 信息失败:', error);
      }
    };

    updateHead();
  }, [location.pathname]);

  return null; // 这个组件不渲染任何内容
}

