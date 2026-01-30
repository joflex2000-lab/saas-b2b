// API Configuration - uses environment variables
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Helper to build API endpoints
export const apiEndpoints = {
    // Base
    backend: API_URL,

    // Auth
    token: `${API_URL}/api/token/`,
    tokenRefresh: `${API_URL}/api/token/refresh/`,

    // Public (No auth required)
    publicProducts: `${API_URL}/api/public/products/`,
    publicCategories: `${API_URL}/api/public/categories/`,

    // User Profile
    userProfile: `${API_URL}/api/me/`,

    // Products (Authenticated)
    products: `${API_URL}/api/products/`,
    adminProducts: `${API_URL}/api/admin/products/`,
    adminProduct: (id: number) => `${API_URL}/api/admin/products/${id}/`,
    productImport: `${API_URL}/api/products/import/`,

    // Categories
    categories: `${API_URL}/api/categories/`,
    adminCategories: `${API_URL}/api/admin/categories/`,
    adminCategory: (id: number) => `${API_URL}/api/admin/categories/${id}/`,
    adminCategoryAssign: (id: number) => `${API_URL}/api/admin/categories/${id}/assign-products/`,
    adminCategoryRemoveProducts: (id: number) => `${API_URL}/api/admin/categories/${id}/remove-products/`,

    // Orders
    orders: `${API_URL}/api/orders/`,
    myOrders: `${API_URL}/api/orders/my-orders/`,
    adminOrders: `${API_URL}/api/admin/orders/`,
    adminOrder: (id: number) => `${API_URL}/api/admin/orders/${id}/`,
    orderInvoice: (id: number) => `${API_URL}/api/orders/${id}/invoice/`,

    // Users
    adminUsers: `${API_URL}/api/admin/users/`,
    adminUser: (id: number) => `${API_URL}/api/admin/users/${id}/`,
    userImport: `${API_URL}/api/admin/users/import/`,
    clientImportPreview: `${API_URL}/api/admin/users/import/preview/`,
    clientImportConfirm: `${API_URL}/api/admin/users/import/confirm/`,
    deleteAllUsers: `${API_URL}/api/admin/users/delete-all/`,

    // Exports
    exportProducts: `${API_URL}/api/export/products/`,
    exportOrders: `${API_URL}/api/export/orders/`,

    // Payments
    paymentCheckout: `${API_URL}/api/payments/checkout/`,

    // Integrations
    integrations: `${API_URL}/api/integrations/`,
    mlAuthUrl: `${API_URL}/api/integrations/ml/auth-url/`,
    mlCallback: `${API_URL}/api/integrations/ml/callback/`,

    // Direct Backend Admin Links (Bridges)
    adminToolsImport: `${API_URL}/admin-tools/import/`,

    // API Imports
    productImportAPI: `${API_URL}/api/admin/products/import/`,
    categoryImportAPI: `${API_URL}/api/admin/categories/import/`,
};
