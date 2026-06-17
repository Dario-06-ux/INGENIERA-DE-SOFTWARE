// js/app.js – Inventory Dashboard (vanilla JS)
// ------------------------------------------------------------
// Constants & State
const STORAGE_KEY = 'inventoryProducts';
let products = [];
let filteredProducts = [];
let lowStockThreshold = 5; // fixed (configurable not required per user)

// DOM Elements
const totalProductsEl = document.getElementById('total-products');
const inStockEl = document.getElementById('in-stock');
const lowStockEl = document.getElementById('low-stock');
const totalValueEl = document.getElementById('total-value');
const productTbody = document.getElementById('product-tbody');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const stockFilter = document.getElementById('stock-filter');
const addBtn = document.getElementById('add-product-btn');
const modalOverlay = document.getElementById('modal-overlay');
const productModal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const productForm = document.getElementById('product-form');
const toastContainer = document.getElementById('toast-container');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

// ------------------------------------------------------------
// Utility Functions
function uuid() {
  // simple unique id generator
  return '_' + Math.random().toString(36).substr(2, 9);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(isEdit = false, product = null) {
  console.log('openModal called, isEdit:', isEdit);
  productModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
  modalTitle.textContent = isEdit ? 'Editar Producto' : 'Agregar Producto';
  // reset form and focus first field
  productForm.reset();
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').focus();
  if (isEdit && product) {
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-code').value = product.code;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-quantity').value = product.quantity;
    document.getElementById('product-id').value = product.id;
  }
}

function closeModal() {
  productModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    products = JSON.parse(data);
  } else {
    // first load – seed with sample data
    products = [
      { id: uuid(), name: 'Camiseta', code: 'CAM001', category: 'Ropa', price: 19.99, quantity: 12 },
      { id: uuid(), name: 'Laptop', code: 'LAP123', category: 'Electrónica', price: 899.99, quantity: 4 },
      { id: uuid(), name: 'Taza', code: 'TAZ045', category: 'Hogar', price: 5.5, quantity: 0 },
    ];
    saveToStorage();
  }
}

function getUniqueCategories() {
  const set = new Set();
  products.forEach(p => set.add(p.category));
  return Array.from(set);
}

function populateCategoryFilter() {
  const categories = getUniqueCategories();
  // reset options
  categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

function calculateDashboard() {
  const total = products.length;
  const inStock = products.filter(p => p.quantity > 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  totalProductsEl.textContent = total;
  inStockEl.textContent = inStock;
  lowStockEl.textContent = lowStock;
  totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
}

function renderTable(list) {
  productTbody.innerHTML = '';
  if (list.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.style.textAlign = 'center';
    cell.textContent = 'No hay productos que coincidan.';
    row.appendChild(cell);
    productTbody.appendChild(row);
    return;
  }

  list.forEach(p => {
    const row = document.createElement('tr');
    if (p.quantity === 0) row.classList.add('out-of-stock');
    else if (p.quantity <= lowStockThreshold) row.classList.add('low-stock');

    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.code}</td>
      <td>${p.category}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>
        <span class="action-icon" data-action="edit" data-id="${p.id}">✏️</span>
        <span class="action-icon" data-action="delete" data-id="${p.id}">🗑️</span>
      </td>
    `;
    productTbody.appendChild(row);
  });
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedStock = stockFilter.value;

  filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.code.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    let matchesStock = true;
    if (selectedStock === 'low') matchesStock = p.quantity > 0 && p.quantity <= lowStockThreshold;
    else if (selectedStock === 'out') matchesStock = p.quantity === 0;
    else if (selectedStock === 'all') matchesStock = true;
    return matchesSearch && matchesCategory && matchesStock;
  });

  renderTable(filteredProducts);
}

function exportCSV() {
  const header = ['Nombre', 'Código', 'Categoría', 'Precio', 'Cantidad'];
  const rows = products.map(p => [p.name, p.code, p.category, p.price, p.quantity]);
  const csvContent = [header, ...rows]
    .map(e => e.map(v => `"${v}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'inventario.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ------------------------------------------------------------
// Event Listeners
addBtn.addEventListener('click', () => {
  console.log('Add button clicked');
  openModal(false);
});
modalOverlay.addEventListener('click', closeModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-product-btn').addEventListener('click', closeModal);

productForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const code = document.getElementById('product-code').value.trim();
  const category = document.getElementById('product-category').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const quantity = parseInt(document.getElementById('product-quantity').value, 10);

  console.log('Form submit:', { id, name, code, category, price, quantity });
  if (!name || !code || !category || isNaN(price) || isNaN(quantity)) {
    showToast('Datos inválidos', 'error');
    return;
  }

  if (id) {
    // edit existing
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { id, name, code, category, price, quantity };
      showToast('Producto actualizado', 'success');
    }
  } else {
    // add new
    console.log('Adding new product');
    const newProduct = { id: uuid(), name, code, category, price, quantity };
    products.push(newProduct);
    console.log('Products after push:', products);
    showToast('Producto agregado', 'success');
  }

  saveToStorage();
  populateCategoryFilter();
  calculateDashboard();
  applyFilters();
  closeModal();
});

// Delegated actions for edit/delete icons
productTbody.addEventListener('click', e => {
  const target = e.target;
  if (target.dataset.action === 'edit') {
    const prod = products.find(p => p.id === target.dataset.id);
    if (prod) openModal(true, prod);
  } else if (target.dataset.action === 'delete') {
    const prod = products.find(p => p.id === target.dataset.id);
    if (prod && confirm(`¿Eliminar "${prod.name}"?`)) {
      products = products.filter(p => p.id !== prod.id);
      saveToStorage();
      populateCategoryFilter();
      calculateDashboard();
      applyFilters();
      showToast('Producto eliminado', 'warning');
    }
  }
});

searchInput.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
stockFilter.addEventListener('change', applyFilters);

document.getElementById('export-csv').addEventListener('click', exportCSV);

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  // persist theme
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});

// ------------------------------------------------------------
// Initialization
function init() {
  // load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark');

  loadFromStorage();
  populateCategoryFilter();
  calculateDashboard();
  applyFilters();
}

document.addEventListener('DOMContentLoaded', init);

// End of app.js
