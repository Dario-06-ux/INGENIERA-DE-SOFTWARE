// js/app.js – Lógica Frontend Completa del Sistema de Inventario
// ------------------------------------------------------------

// Claves para LocalStorage
const KEY_PRODUCTS = 'inv_products';
const KEY_CATEGORIES = 'inv_categories';
const KEY_PROVIDERS = 'inv_providers';
const KEY_SESSION = 'inv_logged_in';

// Estado de la Aplicación
let state = {
  products: [],
  categories: [],
  providers: []
};

// Referencias a Gráficos
let chartCategoriesInstance = null;
let chartStatusInstance = null;

// Umbral de stock bajo
const LOW_STOCK_THRESHOLD = 5;

// ==================== FUNCIONES DE UTILIDAD ====================

function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 11);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  // Clases según el tipo
  let bgClasses = 'bg-slate-800 border-slate-700';
  let iconClasses = 'text-slate-400';
  let icon = 'fa-info-circle';

  if (type === 'success') {
    bgClasses = 'bg-emerald-950 border-emerald-800 text-emerald-100';
    iconClasses = 'text-emerald-400';
    icon = 'fa-circle-check';
  } else if (type === 'error') {
    bgClasses = 'bg-red-950 border-red-800 text-red-100';
    iconClasses = 'text-red-400';
    icon = 'fa-circle-exclamation';
  } else if (type === 'warning') {
    bgClasses = 'bg-amber-950 border-amber-800 text-amber-100';
    iconClasses = 'text-amber-400';
    icon = 'fa-triangle-exclamation';
  }

  toast.className = `flex items-center gap-3 p-4 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 ${bgClasses}`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} ${iconClasses} text-lg"></i>
    <span class="text-sm font-medium">${message}</span>
  `;

  container.appendChild(toast);

  // Animación entrada
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Animación salida y eliminación
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Guardar y cargar datos del LocalStorage
function saveData() {
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(state.products));
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(state.categories));
  localStorage.setItem(KEY_PROVIDERS, JSON.stringify(state.providers));
}

function loadData() {
  const rawProducts = localStorage.getItem(KEY_PRODUCTS);
  const rawCategories = localStorage.getItem(KEY_CATEGORIES);
  const rawProviders = localStorage.getItem(KEY_PROVIDERS);

  if (rawProducts && rawCategories && rawProviders) {
    state.products = JSON.parse(rawProducts);
    state.categories = JSON.parse(rawCategories);
    state.providers = JSON.parse(rawProviders);
  } else {
    // Cargar datos semilla si no existen
    seedInitialData();
  }
}

function seedInitialData() {
  state.categories = [
    { id: 'cat_1', name: 'Electrónica' },
    { id: 'cat_2', name: 'Ropa' },
    { id: 'cat_3', name: 'Hogar' },
    { id: 'cat_4', name: 'Juguetes' },
    { id: 'cat_5', name: 'Papelería' }
  ];

  state.providers = [
    { id: 'prov_1', name: 'Tech Imports S.A.', contact: 'contacto@techimports.com' },
    { id: 'prov_2', name: 'Textiles del Sur', contact: 'ventas@textilessur.com' },
    { id: 'prov_3', name: 'Distribuidora Hogar S.L.', contact: 'hogar@distribuidora.es' }
  ];

  state.products = [
    { id: 'prod_1', name: 'Laptop Pro 15', code: 'LAP-1024', categoryId: 'cat_1', providerId: 'prov_1', price: 999.99, quantity: 8 },
    { id: 'prod_2', name: 'Camisa Formal Slim', code: 'CAM-809', categoryId: 'cat_2', providerId: 'prov_2', price: 34.50, quantity: 15 },
    { id: 'prod_3', name: 'Cafetera Espresso', code: 'CAF-500', categoryId: 'cat_3', providerId: 'prov_3', price: 149.90, quantity: 3 },
    { id: 'prod_4', name: 'Smartphone Z3', code: 'TEL-882', categoryId: 'cat_1', providerId: 'prov_1', price: 499.00, quantity: 0 },
    { id: 'prod_5', name: 'Cuaderno Universitario', code: 'CUA-012', categoryId: 'cat_5', providerId: 'prov_3', price: 2.25, quantity: 50 },
    { id: 'prod_6', name: 'Muñeco de Acción Colección', code: 'JUG-301', categoryId: 'cat_4', providerId: 'prov_2', price: 24.99, quantity: 5 }
  ];

  saveData();
}

// Reloj en tiempo real
function updateClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) + ' - ' + now.toLocaleTimeString('es-ES');
}

// ==================== GESTIÓN DE SESIÓN ====================

function checkSession() {
  const isLoggedIn = localStorage.getItem(KEY_SESSION) === 'true';
  const loginScreen = document.getElementById('login-screen');
  const mainDashboard = document.getElementById('main-dashboard');

  if (isLoggedIn) {
    loginScreen.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
    // Inicializar visualización del dashboard
    switchView('dashboard');
    updateDashboardStats();
    updateSelectors();
  } else {
    loginScreen.classList.remove('hidden');
    mainDashboard.classList.add('hidden');
  }
}

// Formulario de login
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;

  if (email === 'admin@gmail.com' && pass === 'password') {
    localStorage.setItem(KEY_SESSION, 'true');
    showToast('¡Inicio de sesión exitoso! Bienvenido.', 'success');
    checkSession();
  } else {
    showToast('Credenciales incorrectas. Intenta de nuevo.', 'error');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
  localStorage.setItem(KEY_SESSION, 'false');
  showToast('Has cerrado sesión correctamente.', 'info');
  checkSession();
});

// ==================== NAVEGACIÓN SPA ====================

const viewTitles = {
  dashboard: 'Dashboard General',
  productos: 'Módulo de Inventario',
  categorias: 'Gestión de Categorías',
  proveedores: 'Directorio de Proveedores'
};

function switchView(viewName) {
  // Ocultar todas las vistas
  document.getElementById('view-dashboard').classList.add('hidden');
  document.getElementById('view-productos').classList.add('hidden');
  document.getElementById('view-categorias').classList.add('hidden');
  document.getElementById('view-proveedores').classList.add('hidden');

  // Mostrar la vista objetivo
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  // Actualizar título de Navbar
  document.getElementById('view-title').textContent = viewTitles[viewName] || 'InventoryPro';

  // Actualizar estado activo del sidebar
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.view === viewName) {
      link.className = 'nav-link w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-left text-primary bg-primary/10';
    } else {
      link.className = 'nav-link w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-left text-slate-400 hover:text-white hover:bg-slate-800/50';
    }
  });

  // Ejecutar actualización de datos correspondiente
  if (viewName === 'dashboard') {
    updateDashboardStats();
  } else if (viewName === 'productos') {
    renderProducts();
  } else if (viewName === 'categorias') {
    renderCategories();
  } else if (viewName === 'proveedores') {
    renderProviders();
  }
}

// Configurar clics de navegación
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function() {
    const view = this.dataset.view;
    switchView(view);
    
    // Ocultar en móvil
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('flex');
  });
});

// Hamburguesa móvil
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('hidden');
  sidebar.classList.add('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
});

document.getElementById('close-sidebar-btn').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('hidden');
  sidebar.classList.remove('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
});


// ==================== GESTIÓN DE MODALES ====================

const modalBackdrop = document.getElementById('modal-backdrop');

function showModal(modalId) {
  modalBackdrop.classList.remove('hidden');
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModals() {
  modalBackdrop.classList.add('hidden');
  document.getElementById('modal-product').classList.add('hidden');
  document.getElementById('modal-category').classList.add('hidden');
  document.getElementById('modal-provider').classList.add('hidden');
}

// Vincular botones de cerrar y cancelar en todos los modales
document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
  btn.addEventListener('click', hideModals);
});
modalBackdrop.addEventListener('click', hideModals);


// ==================== ACTUALIZAR SELECTORES ====================

function updateSelectors() {
  // Llenar selectores del modal de producto
  const selectCat = document.getElementById('form-product-category');
  const selectProv = document.getElementById('form-product-provider');

  // Selector de filtro de productos
  const filterCat = document.getElementById('product-filter-category');

  if (selectCat) {
    selectCat.innerHTML = '<option value="" disabled selected>Selecciona Categoría</option>' +
      state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (selectProv) {
    selectProv.innerHTML = '<option value="" disabled selected>Selecciona Proveedor</option>' +
      state.providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  if (filterCat) {
    filterCat.innerHTML = '<option value="all">Todas las Categorías</option>' +
      state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}


// ==================== RENDERS & CRUD: DASHBOARD ====================

function updateDashboardStats() {
  const totalProducts = state.products.length;
  const totalCategories = state.categories.length;
  const totalProviders = state.providers.length;

  let totalValue = 0;
  let totalStock = 0;
  let lowStockCount = 0;
  let outStockCount = 0;

  state.products.forEach(p => {
    totalValue += (p.price * p.quantity);
    totalStock += p.quantity;
    if (p.quantity === 0) {
      outStockCount++;
    } else if (p.quantity <= LOW_STOCK_THRESHOLD) {
      lowStockCount++;
    }
  });

  // Pintar en DOM
  document.getElementById('stat-total-products').textContent = totalProducts;
  document.getElementById('stat-total-categories').textContent = totalCategories;
  document.getElementById('stat-total-providers').textContent = totalProviders;
  document.getElementById('stat-total-value').textContent = '$' + totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('stat-total-stock').textContent = totalStock.toLocaleString('es-ES');
  document.getElementById('stat-low-stock').textContent = lowStockCount;
  document.getElementById('stat-out-stock').textContent = outStockCount;

  // Renderizar gráficos
  renderDashboardCharts(lowStockCount, outStockCount, totalProducts - lowStockCount - outStockCount);
}

function renderDashboardCharts(lowStock, outStock, normalStock) {
  // Gráfico 1: Stock por Categoría (Barra)
  const categoryLabels = [];
  const categoryStockData = [];
  
  state.categories.forEach(c => {
    categoryLabels.push(c.name);
    // Sumar stock de productos de esta categoría
    const sum = state.products
      .filter(p => p.categoryId === c.id)
      .reduce((acc, curr) => acc + curr.quantity, 0);
    categoryStockData.push(sum);
  });

  const barCtx = document.getElementById('chart-categories').getContext('2d');
  if (chartCategoriesInstance) {
    chartCategoriesInstance.destroy();
  }
  chartCategoriesInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: categoryLabels,
      datasets: [{
        label: 'Stock Físico',
        data: categoryStockData,
        backgroundColor: '#10b981', // emerald
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#334155' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });

  // Gráfico 2: Distribución por Estado de Stock (Dona)
  const doughnutCtx = document.getElementById('chart-status').getContext('2d');
  if (chartStatusInstance) {
    chartStatusInstance.destroy();
  }
  chartStatusInstance = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Disponible', 'Bajo Stock', 'Agotado'],
      datasets: [{
        data: [normalStock, lowStock, outStock],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 1,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
        }
      }
    }
  });
}


// ==================== RENDERS & CRUD: PRODUCTOS ====================

function renderProducts() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  const searchQuery = document.getElementById('product-search').value.toLowerCase();
  const selectedCat = document.getElementById('product-filter-category').value;
  const selectedStatus = document.getElementById('product-filter-status').value;

  // Filtrar
  const filtered = state.products.filter(p => {
    // Buscar por nombre o código
    const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.code.toLowerCase().includes(searchQuery);
    
    // Categoría
    const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;

    // Estado
    let status = 'disponible';
    if (p.quantity === 0) status = 'agotado';
    else if (p.quantity <= LOW_STOCK_THRESHOLD) status = 'bajo';

    const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-500 font-medium">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 text-slate-600 block"></i>
          No se encontraron productos coincidentes.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(p => {
    const category = state.categories.find(c => c.id === p.categoryId);
    const provider = state.providers.find(prov => prov.id === p.providerId);
    
    const catName = category ? category.name : 'Sin categoría';
    const provName = provider ? provider.name : 'Sin proveedor';

    // Badge de estado
    let badgeHtml = '';
    if (p.quantity === 0) {
      badgeHtml = `<span class="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><i class="fa-solid fa-circle text-[6px]"></i> Agotado</span>`;
    } else if (p.quantity <= LOW_STOCK_THRESHOLD) {
      badgeHtml = `<span class="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><i class="fa-solid fa-circle text-[6px]"></i> Bajo Stock</span>`;
    } else {
      badgeHtml = `<span class="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><i class="fa-solid fa-circle text-[6px]"></i> Disponible</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/30 transition duration-150';
    tr.innerHTML = `
      <td class="py-3.5 px-6 font-semibold text-white">${p.name}</td>
      <td class="py-3.5 px-6 font-mono text-xs text-slate-400">${p.code}</td>
      <td class="py-3.5 px-6 text-slate-300">${catName}</td>
      <td class="py-3.5 px-6 text-slate-400">${provName}</td>
      <td class="py-3.5 px-6 text-right font-medium text-emerald-400">$${p.price.toFixed(2)}</td>
      <td class="py-3.5 px-6 text-center font-bold">${p.quantity}</td>
      <td class="py-3.5 px-6 text-center">${badgeHtml}</td>
      <td class="py-3.5 px-6 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="editProduct('${p.id}')" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center border border-slate-700/60" title="Editar">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button onclick="deleteProduct('${p.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition flex items-center justify-center border border-red-500/20" title="Eliminar">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Acciones CRUD Productos
document.getElementById('add-product-btn').addEventListener('click', () => {
  document.getElementById('form-product').reset();
  document.getElementById('form-product-id').value = '';
  document.getElementById('modal-product-title').textContent = 'Añadir Producto';
  updateSelectors();
  showModal('modal-product');
});

document.getElementById('form-product').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = document.getElementById('form-product-id').value;
  const name = document.getElementById('form-product-name').value.trim();
  const code = document.getElementById('form-product-code').value.trim();
  const categoryId = document.getElementById('form-product-category').value;
  const providerId = document.getElementById('form-product-provider').value;
  const price = parseFloat(document.getElementById('form-product-price').value);
  const quantity = parseInt(document.getElementById('form-product-stock').value);

  if (!name || !code || !categoryId || !providerId || isNaN(price) || isNaN(quantity)) {
    showToast('Por favor, rellene todos los campos requeridos.', 'error');
    return;
  }

  // Validar código duplicado
  const codeDup = state.products.find(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== id);
  if (codeDup) {
    showToast(`El código de producto (SKU) "${code}" ya está en uso.`, 'error');
    return;
  }

  if (id) {
    // Editar
    const index = state.products.findIndex(p => p.id === id);
    if (index !== -1) {
      state.products[index] = { id, name, code, categoryId, providerId, price, quantity };
      showToast('Producto actualizado exitosamente.', 'success');
    }
  } else {
    // Crear nuevo
    state.products.push({
      id: generateId(),
      name, code, categoryId, providerId, price, quantity
    });
    showToast('Producto agregado exitosamente.', 'success');
  }

  saveData();
  hideModals();
  renderProducts();
});

window.editProduct = function(id) {
  const p = state.products.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('form-product-id').value = p.id;
  document.getElementById('form-product-name').value = p.name;
  document.getElementById('form-product-code').value = p.code;
  
  updateSelectors();

  document.getElementById('form-product-category').value = p.categoryId;
  document.getElementById('form-product-provider').value = p.providerId;
  document.getElementById('form-product-price').value = p.price;
  document.getElementById('form-product-stock').value = p.quantity;

  document.getElementById('modal-product-title').textContent = 'Editar Producto';
  showModal('modal-product');
};

window.deleteProduct = function(id) {
  const p = state.products.find(prod => prod.id === id);
  if (!p) return;

  if (confirm(`¿Estás seguro de eliminar el producto "${p.name}"?`)) {
    state.products = state.products.filter(prod => prod.id !== id);
    saveData();
    renderProducts();
    showToast('Producto eliminado exitosamente.', 'warning');
  }
};

// Eventos de filtros y búsqueda
document.getElementById('product-search').addEventListener('input', renderProducts);
document.getElementById('product-filter-category').addEventListener('change', renderProducts);
document.getElementById('product-filter-status').addEventListener('change', renderProducts);

// Exportar a CSV
document.getElementById('export-csv-btn').addEventListener('click', function() {
  if (state.products.length === 0) {
    showToast('No hay productos para exportar.', 'error');
    return;
  }

  const csvRows = [];
  // Cabecera
  csvRows.push(['Nombre', 'Codigo (SKU)', 'Categoria', 'Proveedor', 'Precio', 'Cantidad'].join(','));

  state.products.forEach(p => {
    const cat = state.categories.find(c => c.id === p.categoryId);
    const prov = state.providers.find(pr => pr.id === p.providerId);
    
    const catName = cat ? cat.name : 'Sin Categoria';
    const provName = prov ? prov.name : 'Sin Proveedor';

    csvRows.push([
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.code.replace(/"/g, '""')}"`,
      `"${catName.replace(/"/g, '""')}"`,
      `"${provName.replace(/"/g, '""')}"`,
      p.price.toFixed(2),
      p.quantity
    ].join(','));
  });

  const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(csvBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Archivo CSV exportado.', 'success');
});


// ==================== RENDERS & CRUD: CATEGORÍAS ====================

function renderCategories() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  const search = document.getElementById('category-search').value.toLowerCase();
  const filtered = state.categories.filter(c => c.name.toLowerCase().includes(search));

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-slate-500">
          No hay categorías registradas coincidentes.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(c => {
    // Calcular productos relacionados
    const prodCount = state.products.filter(p => p.categoryId === c.id).length;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/30 transition duration-150';
    tr.innerHTML = `
      <td class="py-3.5 px-6 font-mono text-xs text-slate-400">${c.id}</td>
      <td class="py-3.5 px-6 font-semibold text-white">${c.name}</td>
      <td class="py-3.5 px-6 text-center text-slate-300 font-bold">${prodCount}</td>
      <td class="py-3.5 px-6 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="editCategory('${c.id}')" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center border border-slate-700/60" title="Editar">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button onclick="deleteCategory('${c.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition flex items-center justify-center border border-red-500/20" title="Eliminar">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('add-category-btn').addEventListener('click', () => {
  document.getElementById('form-category').reset();
  document.getElementById('form-category-id').value = '';
  document.getElementById('modal-category-title').textContent = 'Añadir Categoría';
  showModal('modal-category');
});

document.getElementById('form-category').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = document.getElementById('form-category-id').value;
  const name = document.getElementById('form-category-name').value.trim();

  if (!name) return;

  // Evitar duplicados
  const dup = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
  if (dup) {
    showToast(`La categoría "${name}" ya existe.`, 'error');
    return;
  }

  if (id) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.categories[idx].name = name;
      showToast('Categoría modificada con éxito.', 'success');
    }
  } else {
    state.categories.push({ id: 'cat_' + generateId(), name });
    showToast('Categoría agregada con éxito.', 'success');
  }

  saveData();
  hideModals();
  renderCategories();
  updateSelectors();
});

window.editCategory = function(id) {
  const c = state.categories.find(cat => cat.id === id);
  if (!c) return;

  document.getElementById('form-category-id').value = c.id;
  document.getElementById('form-category-name').value = c.name;
  document.getElementById('modal-category-title').textContent = 'Editar Categoría';
  showModal('modal-category');
};

window.deleteCategory = function(id) {
  const c = state.categories.find(cat => cat.id === id);
  if (!c) return;

  // Validar si tiene productos vinculados
  const boundProds = state.products.filter(p => p.categoryId === id);
  if (boundProds.length > 0) {
    showToast(`No puedes eliminar esta categoría porque tiene ${boundProds.length} productos asociados.`, 'error');
    return;
  }

  if (confirm(`¿Deseas eliminar la categoría "${c.name}"?`)) {
    state.categories = state.categories.filter(cat => cat.id !== id);
    saveData();
    renderCategories();
    updateSelectors();
    showToast('Categoría eliminada.', 'warning');
  }
};

document.getElementById('category-search').addEventListener('input', renderCategories);


// ==================== RENDERS & CRUD: PROVEEDORES ====================

function renderProviders() {
  const tbody = document.getElementById('providers-table-body');
  if (!tbody) return;

  const search = document.getElementById('provider-search').value.toLowerCase();
  const filtered = state.providers.filter(p => p.name.toLowerCase().includes(search) || p.contact.toLowerCase().includes(search));

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-slate-500">
          No hay proveedores coincidentes registrados.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(prov => {
    // Productos provistos
    const prodCount = state.products.filter(p => p.providerId === prov.id).length;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/30 transition duration-150';
    tr.innerHTML = `
      <td class="py-3.5 px-6 font-mono text-xs text-slate-400">${prov.id}</td>
      <td class="py-3.5 px-6 font-semibold text-white">${prov.name}</td>
      <td class="py-3.5 px-6 text-slate-300 font-medium">${prov.contact}</td>
      <td class="py-3.5 px-6 text-center font-bold text-slate-300">${prodCount}</td>
      <td class="py-3.5 px-6 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="editProvider('${prov.id}')" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center border border-slate-700/60" title="Editar">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button onclick="deleteProvider('${prov.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition flex items-center justify-center border border-red-500/20" title="Eliminar">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('add-provider-btn').addEventListener('click', () => {
  document.getElementById('form-provider').reset();
  document.getElementById('form-provider-id').value = '';
  document.getElementById('modal-provider-title').textContent = 'Añadir Proveedor';
  showModal('modal-provider');
});

document.getElementById('form-provider').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = document.getElementById('form-provider-id').value;
  const name = document.getElementById('form-provider-name').value.trim();
  const contact = document.getElementById('form-provider-contact').value.trim();

  if (!name || !contact) return;

  const dup = state.providers.find(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== id);
  if (dup) {
    showToast(`El proveedor "${name}" ya existe.`, 'error');
    return;
  }

  if (id) {
    const idx = state.providers.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.providers[idx] = { id, name, contact };
      showToast('Proveedor actualizado con éxito.', 'success');
    }
  } else {
    state.providers.push({ id: 'prov_' + generateId(), name, contact });
    showToast('Proveedor agregado con éxito.', 'success');
  }

  saveData();
  hideModals();
  renderProviders();
  updateSelectors();
});

window.editProvider = function(id) {
  const p = state.providers.find(prov => prov.id === id);
  if (!p) return;

  document.getElementById('form-provider-id').value = p.id;
  document.getElementById('form-provider-name').value = p.name;
  document.getElementById('form-provider-contact').value = p.contact;
  document.getElementById('modal-provider-title').textContent = 'Editar Proveedor';
  showModal('modal-provider');
};

window.deleteProvider = function(id) {
  const p = state.providers.find(prov => prov.id === id);
  if (!p) return;

  // Validar vinculación
  const boundProds = state.products.filter(pr => pr.providerId === id);
  if (boundProds.length > 0) {
    showToast(`No puedes eliminar este proveedor ya que surte ${boundProds.length} productos.`, 'error');
    return;
  }

  if (confirm(`¿Deseas eliminar al proveedor "${p.name}"?`)) {
    state.providers = state.providers.filter(prov => prov.id !== id);
    saveData();
    renderProviders();
    updateSelectors();
    showToast('Proveedor eliminado.', 'warning');
  }
};

document.getElementById('provider-search').addEventListener('input', renderProviders);


// ==================== INICIALIZACIÓN ====================

function init() {
  loadData();
  checkSession();

  // Actualizar reloj cada segundo
  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', init);
