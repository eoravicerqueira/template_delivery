const products = [
  {
    id: 1,
    name: "X-Salada",
    category: "Lanches",
    price: 24.9,
    description: "Pão macio, hambúrguer, queijo, alface, tomate e molho especial.",
    tag: "Clássico",
  },
  {
    id: 2,
    name: "X-Bacon",
    category: "Lanches",
    price: 27.5,
    description: "Hambúrguer artesanal com queijo, bacon crocante e cebola caramelizada.",
    tag: "Mais pedido",
  },
  {
    id: 3,
    name: "Pizza de Mussarela",
    category: "Pizzas",
    price: 48.0,
    description: "Massa fina, molho de tomate e mussarela gratinada por cima.",
    tag: "Tradicional",
  },
  {
    id: 4,
    name: "Pizza de Calabresa",
    category: "Pizzas",
    price: 54.0,
    description: "Calabresa fatiada, cebola e azeitonas pretas.",
    tag: "Saborosa",
  },
  {
    id: 5,
    name: "Refrigerante 350ml",
    category: "Bebidas",
    price: 6.5,
    description: "Coca-Cola geladinha para acompanhar seu pedido.",
    tag: "Refrescante",
  },
  {
    id: 6,
    name: "Suco Natural",
    category: "Bebidas",
    price: 9.9,
    description: "Suco de laranja ou limão fresco, feito na hora.",
    tag: "Saudável",
  },
  {
    id: 7,
    name: "Batata Frita",
    category: "Acompanhamentos",
    price: 15.0,
    description: "Porção de batata frita crocante à perfeição.",
    tag: "Crocrante",
  },
  {
    id: 8,
    name: "Bolo de Chocolate",
    category: "Sobremesas",
    price: 18.0,
    description: "Fatia de bolo com cobertura cremosa e chocolate meio amargo.",
    tag: "Doce",
  },
];

const cart = JSON.parse(localStorage.getItem("deliveryCart")) || {};
let selectedCategory = "all";
let searchTerm = "";

const productGrid = document.getElementById("productGrid");
const categoryFilters = document.getElementById("categoryFilters");
const cartItemsContainer = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartPanel = document.getElementById("cartPanel");
const toast = document.getElementById("toast");
const searchInput = document.getElementById("searchInput");

const categories = ["all", ...new Set(products.map((product) => product.category))];

function formatPrice(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function saveCart() {
  localStorage.setItem("deliveryCart", JSON.stringify(cart));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toast.timeoutId);
  toast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function renderCategoryFilters() {
  categoryFilters.innerHTML = categories
    .map(
      (category) =>
        `<button class="filter-button ${selectedCategory === category ? "active" : ""}" data-category="${category}">${
          category === "all" ? "Tudo" : category
        }</button>`
    )
    .join("");

  categoryFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderCategoryFilters();
      renderProducts();
    });
  });
}

function filterProducts() {
  return products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const visibleProducts = filterProducts();

  if (visibleProducts.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <p>Nenhum item encontrado.</p>
        <small>Tente outro filtro ou palavra-chave.</small>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
      <article class="product-card">
        <div class="product-top">
          <h3>${product.name}</h3>
          <span>${formatPrice(product.price)}</span>
        </div>
        <p class="product-description">${product.description}</p>
        <div class="product-meta">
          <span class="tag">${product.category}</span>
          <span class="tag">${product.tag}</span>
        </div>
        <button class="add-button" data-id="${product.id}">Adicionar ao carrinho</button>
      </article>
    `
    )
    .join("");

  productGrid.querySelectorAll(".add-button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      addToCart(id);
    });
  });
}

function renderCart() {
  const productIds = Object.keys(cart).map(Number);

  if (productIds.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-state">
        <p>Seu carrinho está vazio.</p>
        <small>Adicione produtos para começar o pedido.</small>
      </div>
    `;
    checkoutBtn.disabled = true;
    cartTotal.textContent = formatPrice(0);
    cartCount.textContent = "0";
    return;
  }

  const lines = productIds.map((productId) => {
    const product = products.find((item) => item.id === productId);
    const quantity = cart[productId];
    const subtotal = product.price * quantity;

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-title">${product.name}</div>
          <div class="cart-item-meta">
            <span>${formatPrice(product.price)}</span>
            <span>Quantidade: ${quantity}</span>
            <span>Subtotal: ${formatPrice(subtotal)}</span>
          </div>
          <div class="quantity-control">
            <button class="quantity-decrease" data-id="${product.id}">−</button>
            <span>${quantity}</span>
            <button class="quantity-increase" data-id="${product.id}">+</button>
          </div>
        </div>
        <button class="remove-item" data-id="${product.id}">Remover</button>
      </div>
    `;
  });

  cartItemsContainer.innerHTML = lines.join("");

  cartItemsContainer.querySelectorAll(".quantity-increase").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      changeQuantity(id, cart[id] + 1);
    });
  });

  cartItemsContainer.querySelectorAll(".quantity-decrease").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      changeQuantity(id, cart[id] - 1);
    });
  });

  cartItemsContainer.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      removeFromCart(id);
    });
  });

  const total = productIds.reduce((sum, productId) => {
    const product = products.find((item) => item.id === productId);
    return sum + product.price * cart[productId];
  }, 0);

  cartTotal.textContent = formatPrice(total);
  cartCount.textContent = productIds.reduce((sum, productId) => sum + cart[productId], 0);
  checkoutBtn.disabled = false;
}

function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart();
  renderCart();
  showToast("Produto adicionado ao carrinho");
}

function changeQuantity(productId, quantity) {
  if (quantity <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = quantity;
  }
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  delete cart[productId];
  saveCart();
  renderCart();
  showToast("Produto removido do carrinho");
}

function toggleCart(open) {
  cartPanel.classList.toggle("open", open);
}

function handleCheckout() {
  if (Object.keys(cart).length === 0) return;
  showToast("Pedido finalizado! Obrigado.");
  Object.keys(cart).forEach((key) => delete cart[key]);
  saveCart();
  renderCart();
}

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderProducts();
});

openCartBtn.addEventListener("click", () => toggleCart(true));
closeCartBtn.addEventListener("click", () => toggleCart(false));
checkoutBtn.addEventListener("click", handleCheckout);

renderCategoryFilters();
renderProducts();
renderCart();
