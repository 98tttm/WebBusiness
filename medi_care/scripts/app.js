const API_BASE = window.__MEDICARE_API__ || "http://localhost:5000/api";
const STORAGE_KEYS = {
  token: "medicare:token",
  user: "medicare:user",
  guestCart: "medicare:guest-cart",
  recent: "medicare:recent-products",
};

const state = {
  view: "homepage",
  searchTerm: "",
  priceFilter: "all",
  originFilter: new Set(),
  sortBy: "popular",
  selectedProductId: null,
  detailQty: 1,
  categories: [],
  categoryTree: [],
  categoryMap: new Map(),
  categorySlugMap: new Map(),
  activeCategoryId: null,
  listProducts: [],
  listPagination: { total: 0, page: 1, pages: 1 },
  listParams: { page: 1, limit: 48 },
  listHasMore: true,
  dealProducts: [],
  featuredProducts: [],
  originOptions: [],
  cartItems: [],
  cartSource: "guest",
  user: null,
  token: null,
  recentProductIds: [],
  isLoadingList: false,
  isLoadingDetail: false,
  pendingPhone: "",
  pendingOtpCode: "",
};

const cache = {
  products: new Map(),
};

const blogPosts = [
  {
    id: "blog-1",
    title: "5 buoc tang de khang mua giao mua",
    tag: "Dinh duong",
    summary: "Bo sung vitamin va dinh duong hop ly de tang cuong he mien dich cho ca gia dinh.",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=420&q=80",
  },
  {
    id: "blog-2",
    title: "Checklist kiem soat huyet ap tai nha",
    tag: "Suc khoe tim mach",
    summary: "Huong dan su dung thiet bi do huyet ap tai nha chinh xac va an toan.",
    image: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=420&q=80",
  },
  {
    id: "blog-3",
    title: "Cham soc da nhay cam mua dong",
    tag: "Lam dep",
    summary: "Bi quyet chon duong chat va thoi gian duong da hop ly cho nguoi co lan da nhay cam.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=420&q=80",
  },
];

const brandLogos = [
  { id: "brand-ensure", name: "Ensure" },
  { id: "brand-brauer", name: "Brauer" },
  { id: "brand-japanwell", name: "JapanWell" },
  { id: "brand-procare", name: "Procare" },
  { id: "brand-alibaba", name: "Morinza" },
  { id: "brand-vinfa", name: "VinFa" },
];

const refs = {
  views: document.querySelectorAll("[data-view]"),
  navButtons: document.querySelectorAll("[data-nav-target]"),
  toast: document.getElementById("appToast"),
  cartCount: document.querySelector("[data-cart-count]"),
  dealContainer: document.querySelector("[data-home-deals]"),
  categoryTabs: document.querySelector("[data-category-tabs]"),
  categoryGrid: document.querySelector("[data-category-grid]"),
  brandStrip: document.querySelector("[data-brand-strip]"),
  featuredRow: document.querySelector("[data-featured-row]"),
  blogGrid: document.querySelector("[data-blog-grid]"),
  listGrid: document.querySelector("[data-list-grid]"),
  listRecent: document.querySelector("[data-recent-row]"),
  listTitle: document.getElementById("listTitle"),
  sortSelect: document.getElementById("sortSelect"),
  originFilter: document.querySelector("[data-filter-origin]"),
  searchBox: document.getElementById("searchBox"),
  accountButton: document.querySelector("[data-action='account']"),
  detail: {
    image: document.querySelector("[data-detail-image]"),
    thumbs: document.querySelector("[data-detail-thumbs]"),
    brand: document.querySelector("[data-detail-brand]"),
    name: document.querySelector("[data-detail-name]"),
    price: document.querySelector("[data-detail-price]"),
    oldPrice: document.querySelector("[data-detail-oldprice]"),
    description: document.querySelector("[data-detail-description]"),
    code: document.querySelector("[data-detail-code]"),
    category: document.querySelector("[data-detail-category]"),
    origin: document.querySelector("[data-detail-origin]"),
    ingredients: document.querySelector("[data-detail-ingredients]"),
    unit: document.querySelector("[data-detail-unit]"),
    usage: document.querySelector("[data-detail-usage]"),
    warnings: document.querySelector("[data-detail-warnings]"),
    active: document.querySelector("[data-detail-active]"),
    herbs: document.querySelector("[data-detail-herbs]"),
    qty: document.querySelector("[data-detail-qty]"),
  },
  detailRelated: document.querySelector("[data-detail-related]"),
  cart: {
    items: document.querySelector("[data-cart-items]"),
    total: document.querySelector("[data-cart-total]"),
    savings: document.querySelector("[data-cart-savings]"),
    grand: document.querySelector("[data-cart-grand]"),
    recommend: document.querySelector("[data-cart-recommend]"),
  },
  modals: {
    auth: document.getElementById("authModal"),
    checkout: document.getElementById("checkoutModal"),
  },
  body: document.body,
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Math.max(value || 0, 0));
}

function pseudoNumber(seed, min, max) {
  const text = String(seed || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;
  }
  const normalized = Math.abs(hash) / 0xffffffff;
  return Math.floor(normalized * (max - min + 1) + min);
}

function showToast(message) {
  if (!refs.toast) return;
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => refs.toast.classList.remove("is-visible"), 2400);
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Request failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function handleApiError(error, context) {
  console.error(`API error during ${context}:`, error);
  showToast(error.message || `Không thể hoàn thành yêu cầu (${context}).`);
}

function persistSession() {
  if (state.token) {
    localStorage.setItem(STORAGE_KEYS.token, state.token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }
  if (state.user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}

function loadSession() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const user = localStorage.getItem(STORAGE_KEYS.user);
    const guestCart = localStorage.getItem(STORAGE_KEYS.guestCart);
    const recent = localStorage.getItem(STORAGE_KEYS.recent);

    if (token) state.token = token;
    if (user) state.user = JSON.parse(user);
    if (guestCart) {
      try {
        const parsed = JSON.parse(guestCart);
        if (Array.isArray(parsed)) {
          state.cartItems = parsed;
        }
      } catch {
        state.cartItems = [];
      }
    }
    if (recent) {
      try {
        const parsed = JSON.parse(recent);
        if (Array.isArray(parsed)) {
          state.recentProductIds = parsed;
        }
      } catch {
        state.recentProductIds = [];
      }
    }
  } catch (error) {
    console.warn("Failed to load session", error);
  }
}

function persistGuestCart() {
  if (state.cartSource === "guest") {
    const payload = state.cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    localStorage.setItem(STORAGE_KEYS.guestCart, JSON.stringify(payload));
  }
}

function persistRecent() {
  localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(state.recentProductIds));
}

function switchView(view) {
  state.view = view;
  refs.views.forEach((section) => section.classList.toggle("view--active", section.id === view));
  refs.navButtons.forEach((btn) => {
    const target = btn.getAttribute("data-nav-target");
    if (target) {
      btn.classList.toggle("is-active", target === view);
    }
  });
  if (view === "productdetails") {
    ensureDetailProduct();
  }
  if (view === "cart") {
    renderCart();
  }
}

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  refs.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  setTimeout(() => {
    modal.hidden = true;
    if (!document.querySelector(".modal.is-open")) {
      refs.body.classList.remove("modal-open");
    }
  }, 200);
}

function updateAccountButton() {
  if (!refs.accountButton) return;
  if (state.user) {
    refs.accountButton.querySelector("span:nth-child(2)")?.replaceWith((() => {
      const span = document.createElement("span");
      span.textContent = state.user.name || formatPhone(state.user.phone || "") || "Tai khoan";
      return span;
    })());
  } else {
    refs.accountButton.querySelector("span:nth-child(2)")?.replaceWith((() => {
      const span = document.createElement("span");
      span.textContent = "Tai khoan";
      return span;
    })());
  }
}

function mapCategoryTree(tree) {
  state.categories = tree;
  state.categoryTree = tree;
  state.categoryMap = new Map();
  state.categorySlugMap = new Map();
  const queue = [...tree];
  while (queue.length) {
    const node = queue.shift();
    state.categoryMap.set(node._id, node);
    if (node.slug) {
      state.categorySlugMap.set(node.slug, node._id);
    }
    (node.children || []).forEach((child) => queue.push(child));
  }
}

function deriveCategoryPath(categoryId) {
  const names = [];
  let current = state.categoryMap.get(categoryId);
  while (current) {
    names.unshift(current.name);
    if (!current.parentId) break;
    current = state.categoryMap.get(current.parentId);
  }
  return names.join(" > ") || "Khac";
}

function mapProduct(raw) {
  if (!raw) return null;
  const originalPrice = (raw.price || 0) + (raw.discount || 0);
  const discountPercent =
    originalPrice > 0 ? Math.round(((raw.discount || 0) / originalPrice) * 100) : 0;
  const image =
    raw.image ||
    (Array.isArray(raw.gallery) && raw.gallery.length ? raw.gallery[0] : null) ||
    "https://images.unsplash.com/photo-1580281658629-33e1a1315f3b?auto=format&fit=crop&w=360&q=80";
  const gallery = Array.isArray(raw.gallery) && raw.gallery.length ? raw.gallery : [image];
  const categoryName = deriveCategoryPath(raw.categoryId);
  const id = raw._id || raw.id;

  return {
    id,
    name: raw.name || "San pham chua ro ten",
    price: raw.price || 0,
    oldPrice: discountPercent > 0 ? originalPrice : null,
    discountPercent,
    discountValue: raw.discount || 0,
    brand: raw.brand || "Không rõ",
    origin: raw.country || "Viet Nam",
    unit: raw.unit || raw.measureUnitName || "",
    categoryId: raw.categoryId,
    categoryPath: categoryName,
    code: raw.code || (id ? id.slice(-6).toUpperCase() : "N/A"),
    ingredients: raw.ingredients || "Đang cập nhật",
    description: raw.description || raw.usage || "",
    usage: raw.usage || "",
    warnings: raw.warnings || "",
    activeIngredients: Array.isArray(raw.activeIngredientIds) ? raw.activeIngredientIds : [],
    herbIngredients: Array.isArray(raw.herbIds) ? raw.herbIds : [],
    image,
    gallery,
    rating: pseudoNumber(id, 40, 49) / 10,
    sold: pseudoNumber(`${id}-sold`, 35, 420),
    stock: raw.stock || 0,
    prescriptionRequired: raw.prescriptionRequired || "Không",
  };
}

function rememberProduct(productId) {
  const existingIndex = state.recentProductIds.indexOf(productId);
  if (existingIndex !== -1) {
    state.recentProductIds.splice(existingIndex, 1);
  }
  state.recentProductIds.unshift(productId);
  if (state.recentProductIds.length > 6) {
    state.recentProductIds.pop();
  }
  persistRecent();
  renderRecentRows();
}

async function ensureProduct(productId) {
  if (cache.products.has(productId)) {
    return cache.products.get(productId);
  }
  const response = await apiFetch(`/products/${productId}`);
  const product = mapProduct(response?.data);
  if (product) {
    cache.products.set(product.id, product);
  }
  return product;
}

function renderDeals() {
  if (!refs.dealContainer) return;
  const cards = state.dealProducts.map((product) => createProductCard(product)).join("");
  refs.dealContainer.innerHTML = cards || `<p>Chua co du lieu uu dai.</p>`;
}

function renderCategories() {
  if (!refs.categoryGrid) return;
  const roots = state.categoryTree || [];

  if (refs.categoryTabs) {
    const tabItems = [
      { id: null, name: "Tất cả" },
      ...roots.slice(0, 6).map((cat) => ({ id: cat._id, name: cat.name })),
    ];
    refs.categoryTabs.innerHTML = tabItems
      .map(
        (tab) => `
          <button class="tab ${tab.id === state.activeCategoryId ? "tab--active" : ""}" data-category-id="${tab.id ?? ""}">
            ${tab.name}
          </button>
        `
      )
      .join("");
  }

  if (!roots.length) {
    refs.categoryGrid.innerHTML = "<p>Chưa có danh mục.</p>";
    return;
  }

  const lines = roots
    .map((cat) => {
      const childIds = (cat.children || []).map((child) => child._id);
      const isActive =
        state.activeCategoryId === cat._id || childIds.includes(state.activeCategoryId);
      const children = (cat.children || [])
        .slice(0, 8)
        .map(
          (child) => `
            <button class="category-line__child ${state.activeCategoryId === child._id ? "is-active" : ""}" data-category-id="${child._id}">
              ${child.name}
            </button>
          `
        )
        .join("");
      return `
        <article class="category-line ${isActive ? "is-active" : ""}">
          <button class="category-line__header" data-category-id="${cat._id}">
            <span>${cat.name}</span>
            <span aria-hidden="true">→</span>
          </button>
          ${children ? `<div class="category-line__children">${children}</div>` : ""}
        </article>
      `;
    })
    .join("");

  refs.categoryGrid.innerHTML = `<div class="category-list">${lines}</div>`;
}

async function applyCategoryFilter(categoryId) {
  state.activeCategoryId = categoryId || null;
  state.listParams.page = 1;
  state.listHasMore = true;
  renderCategories();
  await loadListProducts({ reset: true });
  if (state.listProducts.length) {
    state.selectedProductId = state.listProducts[0].id;
    if (state.view === "productdetails") {
      ensureDetailProduct();
    }
  }
  switchView("listproduct");
}

function renderBrands() {
  if (!refs.brandStrip) return;
  refs.brandStrip.innerHTML = brandLogos
    .map((brand) => `<span class="brand-chip">${brand.name}</span>`)
    .join("");
}

function renderFeatured() {
  if (!refs.featuredRow) return;
  const cards = state.featuredProducts.map((product) => createProductCard(product)).join("");
  refs.featuredRow.innerHTML = cards || `<p>Đang cập nhật dữ liệu nổi bật.</p>`;
}

function renderBlogs() {
  if (!refs.blogGrid) return;
  refs.blogGrid.innerHTML = blogPosts
    .map(
      (blog) => `
      <article class="blog-card">
        <img src="${blog.image}" alt="${blog.title}" loading="lazy" />
        <span class="pill">${blog.tag}</span>
        <h3>${blog.title}</h3>
        <p>${blog.summary}</p>
        <button class="text-link" data-action="read-blog" data-blog="${blog.id}">Doc tiep</button>
      </article>
    `
    )
    .join("");
}

function buildOriginFilters() {
  if (!refs.originFilter) return;
  const options = state.originOptions.slice(0, 10);
  refs.originFilter.innerHTML = options
    .map(
      (origin) => `
      <label class="checkbox">
        <input type="checkbox" value="${origin}" data-filter-origin />
        <span>${origin}</span>
      </label>
    `
    )
    .join("");
  refs.originFilter
    .querySelectorAll("input[data-filter-origin]")
    .forEach((input) => {
      input.checked = state.originFilter.has(input.value);
    });
}

function createProductCard(product, options = {}) {
  const { compact = false } = options;
  const saleBadge =
    product.discountPercent && product.discountPercent > 0
      ? `<span class="pill">-${product.discountPercent}%</span>`
      : "";
  const oldPrice =
    product.oldPrice && product.oldPrice > product.price
      ? `<span class="price--strike">${formatCurrency(product.oldPrice)}</span>`
      : "";
  return `
    <article class="product-card" data-product="${product.id}">
      <img src="${product.image}" alt="${product.name}" loading="lazy" />
      <span class="pill">${product.brand}</span>
      <h3>${product.name}</h3>
      <div>
        <span class="price">${formatCurrency(product.price)}</span>
        ${oldPrice}
      </div>
      ${saleBadge}
      <div class="card-actions">
        <button class="btn btn--secondary" data-role="view-product" data-product="${product.id}">Xem chi tiet</button>
        ${
          compact
            ? ""
            : `<button class="btn btn--primary" data-role="add-cart" data-product="${product.id}">Chon mua</button>`
        }
      </div>
    </article>
  `;
}

function renderPillBadges(items = []) {
  if (!items || !items.length) {
    return '<span class="pill pill--muted">Chua cap nhat</span>';
  }
  return items
    .filter(Boolean)
    .map((item) => `<span class="pill pill--soft">${item}</span>`)
    .join('');
}

function formatRichContent(value, fallback = "Chua cap nhat") {
  if (!value) {
    return fallback;
  }
  const stripped = value.replace(/<\/?[^>]+(>|$)/g, " " );
  const parts = stripped
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) {
    return fallback;
  }
  return parts.map((part) => `<span>${part}</span>`).join("<br>");
}

function renderListGrid() {
  if (!refs.listGrid) return;
  const loadMoreButton = document.querySelector('[data-action="load-more"]');
  const categoryLabel = state.activeCategoryId ? deriveCategoryPath(state.activeCategoryId) : "Tat ca san pham";
  if (state.isLoadingList) {
    refs.listGrid.innerHTML = '<div class="skeleton-grid">Dang tai du lieu...</div>';
    if (loadMoreButton) {
      loadMoreButton.disabled = true;
    }
    return;
  }
  if (!state.listProducts.length) {
    refs.listGrid.innerHTML = '<p>Khong tim thay san pham phu hop.</p>';
    refs.listTitle.textContent = `${categoryLabel} - Khong co san pham`;
    if (loadMoreButton) {
      loadMoreButton.hidden = true;
    }
    return;
  }
  refs.listGrid.innerHTML = state.listProducts.map((product) => createProductCard(product)).join('');
  refs.listTitle.textContent = `${categoryLabel} - ${state.listPagination.total} san pham`;
  if (loadMoreButton) {
    loadMoreButton.hidden = !state.listHasMore;
    loadMoreButton.disabled = state.isLoadingList;
  }
}

function renderRecentRows() {
  const recentProducts = state.recentProductIds
    .map((id) => cache.products.get(id))
    .filter(Boolean)
    .slice(0, 6);
  const cards = recentProducts.map((product) => createProductCard(product, { compact: true })).join("");
  if (refs.listRecent) refs.listRecent.innerHTML = cards;
  if (refs.cart.recommend) refs.cart.recommend.innerHTML = cards;
}

function populateDetail(product) {
  if (!product || !refs.detail) return;
  const { detail } = refs;
  detail.image.src = product.gallery?.[0] || product.image;
  detail.image.alt = product.name;
  detail.brand.textContent = product.brand;
  detail.name.textContent = product.name;
  detail.price.textContent = formatCurrency(product.price);
  detail.oldPrice.textContent = product.oldPrice ? formatCurrency(product.oldPrice) : "";
  detail.description.innerHTML = formatRichContent(product.description || product.usage, "Đang cập nhật mo ta san pham.");
  detail.code.textContent = product.code || product.id;
  detail.category.textContent = product.categoryPath;
  detail.origin.textContent = product.origin;
  if (detail.unit) {
    detail.unit.textContent = product.unit || "Đang cập nhật";
  }
  if (detail.ingredients) {
    detail.ingredients.innerHTML = formatRichContent(product.ingredients, "Đang cập nhật");
  }
  if (detail.usage) {
    detail.usage.innerHTML = formatRichContent(product.usage, "Chưa có thông tin cách dùng.");
  }
  if (detail.warnings) {
    detail.warnings.innerHTML = formatRichContent(product.warnings, "Chưa có lưu ý đặc biệt.");
  }
  if (detail.active) {
    detail.active.innerHTML = renderPillBadges(product.activeIngredients);
  }
  if (detail.herbs) {
    detail.herbs.innerHTML = renderPillBadges(product.herbIngredients);
  }
  detail.qty.textContent = state.detailQty;
  if (refs.detail.thumbs) {
    refs.detail.thumbs.innerHTML = product.gallery
      .map(
        (src, index) => `
        <img src="${src}" alt="${product.name}" data-thumb="${src}" class="${index === 0 ? "is-active" : ""}" />
      `
      )
      .join("");
  }
}

async function ensureDetailProduct() {
  if (!state.selectedProductId && state.listProducts.length) {
    state.selectedProductId = state.listProducts[0].id;
  }
  if (!state.selectedProductId) return;
  state.isLoadingDetail = true;
  const product = await ensureProduct(state.selectedProductId);
  state.isLoadingDetail = false;
  if (product) {
    populateDetail(product);
    renderRelated(product.id, product.categoryId);
  }
}

async function renderRelated(productId) {
  if (!refs.detailRelated) return;
  try {
    const response = await apiFetch(`/products/${productId}/related?limit=6`);
    const related = (response?.data || []).map((raw) => {
      if (!cache.products.has(raw._id)) {
        cache.products.set(raw._id, mapProduct(raw));
      }
      return cache.products.get(raw._id);
  });
  refs.detailRelated.innerHTML = related.map((product) => createProductCard(product, { compact: true })).join("");
} catch (error) {
    handleApiError(error, "tai san pham goi y");
  }
}

function updateCartCount() {
  const count = state.cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  if (refs.cartCount) {
    refs.cartCount.textContent = count;
  }
}

function renderCart() {
  if (!refs.cart.items) return;
  if (!state.cartItems.length) {
    refs.cart.items.innerHTML = `<p>Giá» hÃ ng cá»§a báº¡n Ä‘ang trá»‘ng.</p>`;
    refs.cart.total.textContent = formatCurrency(0);
    refs.cart.savings.textContent = formatCurrency(0);
    refs.cart.grand.textContent = formatCurrency(0);
    return;
  }
  const rows = state.cartItems
    .map((item) => {
      const product = cache.products.get(item.productId) || item.product;
      if (product && !cache.products.has(product.id)) {
        cache.products.set(product.id, mapProduct(product));
      }
      const resolved = cache.products.get(item.productId) || mapProduct(item.product);
      const subtotal = resolved ? resolved.price * item.quantity : 0;
      return `
        <article class="cart-item">
          <img src="${resolved?.image || item.product?.image || ""}" alt="${resolved?.name || ""}" />
          <div>
            <h4>${resolved?.name || "San pham"}</h4>
            <p>${resolved?.brand || ""}</p>
            <div class="cart-item__price">
              <span>${formatCurrency(resolved?.price || 0)}</span>
              <span>x ${item.quantity}</span>
            </div>
            <div class="cart-item__actions">
              <button data-role="qty-minus" data-product="${resolved?.id}">-</button>
              <span>${item.quantity}</span>
              <button data-role="qty-plus" data-product="${resolved?.id}">+</button>
              <button data-role="remove-item" data-product="${resolved?.id}">Bo ra</button>
            </div>
          </div>
          <div class="cart-item__total">${formatCurrency(subtotal)}</div>
        </article>
      `;
    })
    .join("");
  refs.cart.items.innerHTML = rows;

  const totals = state.cartItems.reduce(
    (acc, item) => {
      const product = cache.products.get(item.productId);
      if (!product) return acc;
      const original = product.oldPrice || product.price;
      const lineSubtotal = product.price * item.quantity;
      const lineSavings = (original - product.price) * item.quantity;
      acc.subtotal += original * item.quantity;
      acc.total += lineSubtotal;
      acc.savings += lineSavings > 0 ? lineSavings : 0;
      return acc;
    },
    { subtotal: 0, total: 0, savings: 0 }
  );

  refs.cart.total.textContent = formatCurrency(totals.subtotal);
  refs.cart.savings.textContent = formatCurrency(totals.savings);
  refs.cart.grand.textContent = formatCurrency(totals.total);
}

async function addToCart(productId, quantity = 1) {
  const product = await ensureProduct(productId);
  if (!product) return;

  if (state.user && state.token) {
    try {
      const response = await apiFetch("/cart", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
      const items = response?.data || [];
      state.cartItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      }));
      state.cartSource = "remote";
    state.cartItems.forEach((item) => {
      if (item.product) {
        const mapped = mapProduct(item.product);
        cache.products.set(mapped.id, mapped);
      }
    });
    showToast(`${product.name} da duoc them vao gio hang.`);
  } catch (error) {
    handleApiError(error, "cap nhat gio hang");
  }
} else {
    const existing = state.cartItems.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity = Math.max(existing.quantity + quantity, 1);
    } else {
      state.cartItems.push({ productId, quantity: Math.max(quantity, 1) });
    }
    state.cartSource = "guest";
    persistGuestCart();
    showToast(`${product.name} da duoc them vao gio hang.`);
  }

  updateCartCount();
  renderCart();
  rememberProduct(productId);
}

async function updateCartItem(productId, quantity) {
  if (quantity < 0) quantity = 0;
  if (state.user && state.token) {
    try {
      const response = await apiFetch(`/cart/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      const items = response?.data || [];
      state.cartItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      }));
    state.cartItems.forEach((item) => {
      if (item.product) {
        const mapped = mapProduct(item.product);
        cache.products.set(mapped.id, mapped);
      }
    });
  } catch (error) {
    handleApiError(error, "cap nhat gio hang");
  }
} else {
    const entry = state.cartItems.find((item) => item.productId === productId);
    if (entry) {
      if (quantity === 0) {
        state.cartItems = state.cartItems.filter((item) => item.productId !== productId);
      } else {
        entry.quantity = quantity;
      }
    }
    persistGuestCart();
  }
  updateCartCount();
  renderCart();
}

async function removeCartItem(productId) {
  if (state.user && state.token) {
    try {
    await apiFetch(`/cart/${productId}`, {
      method: "DELETE",
    });
    state.cartItems = state.cartItems.filter((item) => item.productId !== productId);
  } catch (error) {
    handleApiError(error, "xoa san pham khoi gio");
  }
} else {
    state.cartItems = state.cartItems.filter((item) => item.productId !== productId);
    persistGuestCart();
  }
  updateCartCount();
  renderCart();
}

async function hydrateRemoteCart() {
  try {
    const response = await apiFetch("/cart");
    const items = response?.data || [];
    state.cartItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
    }));
  state.cartItems.forEach((item) => {
    if (item.product) {
      const mapped = mapProduct(item.product);
      cache.products.set(mapped.id, mapped);
    }
  });
  state.cartSource = "remote";
} catch (error) {
    handleApiError(error, "dong bo gio hang");
  }
}

async function hydrateGuestCartDetails() {
  const enriched = [];
  for (const item of state.cartItems) {
    const product = await ensureProduct(item.productId);
    if (product) {
      enriched.push({ productId: item.productId, quantity: item.quantity, product });
    }
  }
  state.cartItems = enriched;
}

async function handleCheckoutForm(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    shippingAddress: {
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      street: formData.get("street"),
      ward: formData.get("ward"),
      district: formData.get("district"),
      city: formData.get("city"),
    },
    paymentMethod: formData.get("paymentMethod") || "cod",
  };
  if (!state.user || !state.token) {
    showToast("Vui long dang nhap de thanh toan.");
    closeModal(refs.modals.checkout);
    showAuthModal();
    return;
  }
  try {
    const response = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (response?.data) {
      state.cartItems = [];
      updateCartCount();
      renderCart();
      showToast("Dat hang thanh cong! Chung toi se lien he xac nhan.");
  }
  closeModal(refs.modals.checkout);
} catch (error) {
    handleApiError(error, "dat hang");
  }
}

function handleNavClick(event) {
  const button = event.target.closest("[data-nav-target]");
  if (!button) return;
  const target = button.getAttribute("data-nav-target");
  if (target) {
    switchView(target);
  }
}

async function handleActionClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.getAttribute("data-action");
  switch (action) {
    case "account":
      showAuthModal();
      break;
    case "open-health":
      showToast("Chuc nang dang cap nhat. Vui long quay lai sau.");
      break;
    case "need-medicine":
    case "consult-pharmacist":
    case "track-order":
    case "home-recommend":
      showToast("Duoc si MediCare se lien he trong thoi gian som nhat.");
      break;
    case "shop-now":
      switchView("listproduct");
      break;
    case "cta":
      switchView("productdetails");
      break;
    case "load-more":
      if (!state.listHasMore || state.isLoadingList) return;
      state.listParams.page += 1;
      await loadListProducts();
      break;
    case "checkout":
      if (!state.cartItems.length) {
        showToast("Gio hang dang trong. Vui long them san pham truoc.");
        return;
      }
      if (!state.user) {
        showAuthModal();
        return;
      }
      openModal(refs.modals.checkout);
      break;
    default:
      break;
  }
}

async function handleProductClick(event) {
  const productButton = event.target.closest("[data-role]");
  if (!productButton) return;
  const role = productButton.getAttribute("data-role");
  const productId = productButton.getAttribute("data-product") || state.selectedProductId;
  if (!productId) return;
  switch (role) {
    case "view-product":
      state.selectedProductId = productId;
      state.detailQty = 1;
      switchView("productdetails");
      await ensureDetailProduct();
      rememberProduct(productId);
      break;
    case "add-cart":
      await addToCart(productId, 1);
      break;
    case "buy-now":
      await addToCart(productId, state.detailQty);
      switchView("cart");
      break;
    default:
      break;
  }
}

function handleDetailButtons(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  if (action === "increase") {
    state.detailQty += 1;
  } else if (action === "decrease") {
    state.detailQty = Math.max(1, state.detailQty - 1);
  } else {
    return;
  }
  refs.detail.qty.textContent = state.detailQty;
}

function handleThumbClick(event) {
  const img = event.target.closest("[data-thumb]");
  if (!img || !refs.detail.thumbs) return;
  refs.detail.thumbs.querySelectorAll("img").forEach((thumb) => thumb.classList.remove("is-active"));
  img.classList.add("is-active");
  refs.detail.image.src = img.dataset.thumb;
}

async function handleCartActions(event) {
  const button = event.target.closest("[data-role]");
  if (!button) return;
  const productId = button.getAttribute("data-product");
  if (!productId) return;
  if (button.dataset.role === "qty-plus") {
    const currentQty = state.cartItems.find((item) => item.productId === productId)?.quantity || 0;
    await updateCartItem(productId, currentQty + 1);
  } else if (button.dataset.role === "qty-minus") {
    const currentQty = state.cartItems.find((item) => item.productId === productId)?.quantity || 0;
    await updateCartItem(productId, currentQty - 1);
  } else if (button.dataset.role === "remove-item") {
    await removeCartItem(productId);
  }
}

async function handleFilterChange(event) {
  if (event.target.matches("[name=\"price\"]")) {
    state.priceFilter = event.target.value;
    await loadListProducts({ reset: true });
  }
  if (event.target.matches("input[data-filter-origin]")) {
    const origin = event.target.value;
    if (event.target.checked) {
      state.originFilter.add(origin);
    } else {
      state.originFilter.delete(origin);
    }
    await loadListProducts({ reset: true });
  }
}

async function handleSortChange() {
  state.sortBy = refs.sortSelect.value;
  await loadListProducts({ reset: true });
}

async function handleSearch(event) {
  event.preventDefault();
  state.searchTerm = refs.searchBox.value.trim();
  await loadListProducts({ reset: true });
}

function handleSearchInput(event) {
  state.searchTerm = event.target.value.trim();
}

async function handleSearchDebounced(event) {
  handleSearchInput(event);
  clearTimeout(handleSearchDebounced.timer);
  handleSearchDebounced.timer = setTimeout(() => {
    loadListProducts({ reset: true });
  }, 350);
}

async function handleTabClick(event) {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  const value = tab.getAttribute("data-category-id");
  await applyCategoryFilter(value || null);
}

async function handleCategoryGridClick(event) {
  const trigger = event.target.closest("[data-category-id]");
  if (!trigger) return;
  const value = trigger.getAttribute("data-category-id");
  await applyCategoryFilter(value || null);
}

function prepareAuthModal() {
  if (!refs.modals.auth) return;
  const modal = refs.modals.auth;
  modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]") || event.target === modal) {
      closeModal(modal);
    }
  });
  modal.querySelector("[data-action='request-otp']")?.addEventListener("click", handleRequestOtp);
  modal.querySelector("[data-action='verify-otp']")?.addEventListener("click", handleVerifyOtp);
  modal.querySelector("[data-action='auth-edit-phone']")?.addEventListener("click", () => {
    const otpInput = modal.querySelector("[data-auth-otp-input]");
    if (otpInput) otpInput.value = "";
    state.pendingPhone = "";
    state.pendingOtpCode = "";
    setAuthStep("phone");
  });
  modal.querySelector("[data-auth-profile]")?.addEventListener("submit", handleProfileSubmit);
  modal.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    logout();
    closeModal(modal);
  });
}

function setAuthStep(step) {
  if (!refs.modals.auth) return;
  refs.modals.auth.querySelectorAll("[data-auth-step]").forEach((node) => {
    node.hidden = node.getAttribute("data-auth-step") !== step;
  });
  const accountPanel = refs.modals.auth.querySelector("[data-auth-account]");
  if (accountPanel) {
    accountPanel.hidden = true;
  }
}

function showAccountPanel() {
  if (!refs.modals.auth) return;
  refs.modals.auth.querySelectorAll("[data-auth-step]").forEach((node) => {
    node.hidden = true;
  });
  const accountPanel = refs.modals.auth.querySelector("[data-auth-account]");
  if (accountPanel) {
    accountPanel.hidden = false;
    accountPanel.querySelector("[data-account-name]").textContent = state.user?.name || state.user?.phone || "";
    accountPanel.querySelector("[data-account-phone]").textContent = formatPhone(state.user?.phone || "");
    const profileForm = accountPanel.querySelector("[data-auth-profile]");
    if (profileForm) {
      if (profileForm.elements.name) profileForm.elements.name.value = state.user?.name || "";
      if (profileForm.elements.email) profileForm.elements.email.value = state.user?.email || "";
    }
  }
}

function showAuthModal() {
  if (!refs.modals.auth) return;
  const phoneInput = refs.modals.auth.querySelector("[data-auth-phone-input]");
  const otpInput = refs.modals.auth.querySelector("[data-auth-otp-input]");
  if (phoneInput) {
    phoneInput.value = state.user?.phone || state.pendingPhone || "";
  }
  if (otpInput) {
    otpInput.value = "";
  }
  if (state.user) {
    showAccountPanel();
  } else if (state.pendingPhone) {
    setAuthStep("otp");
    const phoneDisplay = refs.modals.auth.querySelector("[data-auth-phone-display]");
    if (phoneDisplay) {
      phoneDisplay.textContent = formatPhone(state.pendingPhone);
    }
  } else {
    setAuthStep("phone");
  }
  openModal(refs.modals.auth);
}

function formatPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  return phone;
}

async function handleRequestOtp() {
  if (!refs.modals.auth) return;
  const phoneInput = refs.modals.auth.querySelector("[data-auth-phone-input]");
  const phone = phoneInput?.value.trim();
  if (!phone) {
    showToast("Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i");
    return;
  }
  try {
    const response = await apiFetch("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    state.pendingPhone = phone;
    state.pendingOtpCode = response?.debugCode || "";
    const phoneDisplay = refs.modals.auth.querySelector("[data-auth-phone-display]");
    if (phoneDisplay) {
      phoneDisplay.textContent = formatPhone(phone);
    }
    const otpInput = refs.modals.auth.querySelector("[data-auth-otp-input]");
    if (otpInput) otpInput.value = "";
    setAuthStep("otp");
    if (state.pendingOtpCode) {
      console.info("[OTP]", state.pendingOtpCode);
      showToast(`MÃ£ OTP (demo): ${state.pendingOtpCode}`);
    } else {
      showToast("ÄÃ£ gá»­i mÃ£ OTP");
    }
  } catch (error) {
    handleApiError(error, "gui ma OTP");
  }
}

async function handleVerifyOtp() {
  if (!refs.modals.auth) return;
  if (!state.pendingPhone) {
    showToast("Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i");
    setAuthStep("phone");
    return;
  }
  const otpInput = refs.modals.auth.querySelector("[data-auth-otp-input]");
  const code = otpInput?.value.trim();
  if (!code) {
    showToast("Vui lÃ²ng nháº­p mÃ£ OTP");
    return;
  }
  try {
    const response = await apiFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: state.pendingPhone, code }),
    });
    await handleAuthSuccess(response);
    showAccountPanel();
  } catch (error) {
    handleApiError(error, "xac thuc OTP");
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!state.user || !state.token) {
    showToast("Vui lÃ²ng Ä‘Äƒng nháº­p");
    return;
  }
  const formData = new FormData(event.target);
  const payload = {
    name: (formData.get("name") || "").trim(),
    email: (formData.get("email") || "").trim(),
  };
  try {
    const response = await apiFetch("/account", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (response?.data) {
      state.user = { ...state.user, ...response.data };
      persistSession();
      updateAccountButton();
      showAccountPanel();
      showToast("ÄÃ£ lÆ°u thÃ´ng tin cÃ¡ nhÃ¢n");
    }
  } catch (error) {
    handleApiError(error, "cap nhat thong tin");
  }
}

async function handleAuthSuccess(response) {
  const data = response?.data;
  if (!data) return;
  state.token = data.token;
  state.user = data.user;
  state.pendingPhone = "";
  state.pendingOtpCode = "";
  persistSession();
  updateAccountButton();
  await hydrateRemoteCart();
  updateCartCount();
  renderCart();
  showToast(`Xin chao ${state.user?.name || formatPhone(state.user?.phone || "") || "khach hang"}!`);
}

function logout() {
  state.token = null;
  state.user = null;
  state.cartSource = "guest";
  state.pendingPhone = "";
  state.pendingOtpCode = "";
  persistSession();
  updateAccountButton();
  state.cartItems = [];
  persistGuestCart();
  updateCartCount();
  renderCart();
  showToast("Ban da dang xuat.");
}

function prepareCheckoutModal() {
  if (!refs.modals.checkout) return;
  refs.modals.checkout.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]") || event.target === refs.modals.checkout) {
      closeModal(refs.modals.checkout);
    }
  });
  refs.modals.checkout.querySelector("form")?.addEventListener("submit", handleCheckoutForm);
}

function mapSortKey(sortBy) {
  switch (sortBy) {
    case "price-asc":
      return "price_asc";
    case "price-desc":
      return "price_desc";
    case "discount":
      return "discount";
    case "popular":
    default:
      return "popular";
  }
}

function mapPriceFilter(priceFilter) {
  if (priceFilter === "all") return {};
  const [min, max] = priceFilter.split("-").map(Number);
  return {
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) ? max : undefined,
  };
}

async function loadCategories() {
  try {
    const response = await apiFetch("/categories/tree");
    const tree = response?.data || [];
    mapCategoryTree(tree);
    renderCategories();
  } catch (error) {
    handleApiError(error, "tai danh muc");
  }
}

async function loadDeals() {
  try {
    const response = await apiFetch("/products?sort=discount&limit=8");
    state.dealProducts = (response?.data || []).map((item) => {
      const mapped = mapProduct(item);
      cache.products.set(mapped.id, mapped);
      return mapped;
    });
    renderDeals();
  } catch (error) {
    handleApiError(error, "tai san pham uu dai");
  }
}

async function loadFeatured() {
  try {
    const response = await apiFetch("/products/featured?limit=6");
    state.featuredProducts = (response?.data || []).map((item) => {
      const mapped = mapProduct(item);
      cache.products.set(mapped.id, mapped);
      return mapped;
    });
    renderFeatured();
  } catch (error) {
    handleApiError(error, "tai san pham noi bat");
  }
}

async function loadListProducts({ reset = false } = {}) {
  if (reset) {
    state.listParams.page = 1;
    state.listProducts = [];
    state.listHasMore = true;
    state.listPagination = { total: 0, page: 1, pages: 1 };
  }
  if (!state.listHasMore && state.listParams.page > 1) {
    return;
  }
  state.isLoadingList = true;
  renderListGrid();
  try {
    const params = new URLSearchParams();
    params.set("limit", state.listParams.limit);
    params.set("page", state.listParams.page);
    params.set("sort", mapSortKey(state.sortBy));
    if (state.searchTerm) params.set("q", state.searchTerm);
    const priceRange = mapPriceFilter(state.priceFilter);
    if (priceRange.minPrice !== undefined) params.set("minPrice", priceRange.minPrice);
    if (priceRange.maxPrice !== undefined) params.set("maxPrice", priceRange.maxPrice);
    if (state.originFilter.size) {
      state.originFilter.forEach((origin) => params.append("origin", origin));
    }
    if (state.activeCategoryId) {
      params.set("categoryId", state.activeCategoryId);
    }
    const response = await apiFetch(`/products?${params.toString()}`);
    const data = response?.data || [];
    const mappedProducts = data.map((item) => {
      const mapped = mapProduct(item);
      cache.products.set(mapped.id, mapped);
      return mapped;
    });
    if (state.listParams.page === 1) {
      state.listProducts = mappedProducts;
      state.selectedProductId = state.listProducts[0]?.id || null;
    } else {
      state.listProducts = [...state.listProducts, ...mappedProducts];
    }
    state.listPagination = response?.pagination || {
      total: state.listProducts.length,
      page: state.listParams.page,
      pages: state.listParams.page,
    };
    state.listHasMore = state.listParams.page < (state.listPagination.pages || 1);
    if (state.listParams.page === 1 && state.view === "productdetails" && state.selectedProductId) {
      await ensureDetailProduct();
    }
    const originSet =
      state.listParams.page === 1 ? new Set() : new Set(state.originOptions);
    mappedProducts.forEach((item) => {
      if (item.origin) originSet.add(item.origin);
    });
    state.originOptions = Array.from(originSet).sort();
    buildOriginFilters();
  } catch (error) {
    handleApiError(error, "tai danh sach san pham");
    state.listProducts = [];
    state.listPagination = { total: 0, page: 1, pages: 1 };
    state.listHasMore = false;
  } finally {
    state.isLoadingList = false;
    renderListGrid();
  }
}

async function hydrateSession() {
  loadSession();
  updateAccountButton();
  if (state.token && state.user) {
    try {
      await apiFetch("/auth/me");
      await hydrateRemoteCart();
    } catch (error) {
      console.warn("Stored session invalid", error);
      state.token = null;
      state.user = null;
      persistSession();
      await hydrateGuestCartDetails();
    }
  } else {
    await hydrateGuestCartDetails();
  }
  updateCartCount();
  renderCart();
}

async function bootstrap() {
  prepareAuthModal();
  prepareCheckoutModal();
  renderBrands();
  renderBlogs();
  await hydrateSession();
  await Promise.all([loadCategories(), loadDeals(), loadFeatured()]);
  await loadListProducts({ reset: true });
  renderRecentRows();
  ensureDetailProduct();
}

function registerEvents() {
  document.addEventListener("click", handleNavClick);
  document.addEventListener("click", handleActionClick);
  document.addEventListener("click", handleProductClick);
  document.addEventListener("click", handleCartActions);
  document.addEventListener("click", handleDetailButtons);
  document.addEventListener("click", handleThumbClick);
  document.addEventListener("change", handleFilterChange);
  document.querySelector(".search")?.addEventListener("submit", handleSearch);
  refs.sortSelect?.addEventListener("change", handleSortChange);
  refs.searchBox?.addEventListener("input", handleSearchDebounced);
  refs.categoryTabs?.addEventListener("click", handleTabClick);
  refs.categoryGrid?.addEventListener("click", handleCategoryGridClick);
  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const slug = event.currentTarget.getAttribute("data-category-filter");
      if (slug === "goc-suc-khoe") {
        switchView("homepage");
        return;
      }
      const categoryId = state.categorySlugMap.get(slug) || null;
      await applyCategoryFilter(categoryId);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  registerEvents();
  await bootstrap();
});
























