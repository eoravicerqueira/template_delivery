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
const cartSubtotal = document.getElementById("cartSubtotal");
const cartDeliveryFee = document.getElementById("cartDeliveryFee");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const deliveryCepInput = document.getElementById("deliveryCepInput");
const deliveryInfo = document.getElementById("deliveryInfo");
const checkoutBtn = document.getElementById("checkoutBtn");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartPanel = document.getElementById("cartPanel");
const toast = document.getElementById("toast");
const searchInput = document.getElementById("searchInput");

const restaurantConfig = {
  restaurantName: "Delivery App",
  companyCep: "77018540",
  deliveryRate: 1,
};
let companyLocation = null;
let currentDeliveryDistance = 5;
let currentDeliveryFee = 5;
let currentDestinationCep = "";

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

async function loadRestaurantConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      throw new Error("Não foi possível carregar a configuração");
    }
    const config = await response.json();
    restaurantConfig.companyCep = config.companyCep || restaurantConfig.companyCep;
    restaurantConfig.deliveryRate = Number(config.deliveryRate) || restaurantConfig.deliveryRate;
    restaurantConfig.restaurantName = config.restaurantName || restaurantConfig.restaurantName;
  } catch (error) {
    console.warn("Falha ao carregar configuração local, usando padrão.", error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toast.timeoutId);
  toast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

async function getCoordinatesFromCep(cep) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new Error("CEP inválido");
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&postalcode=${encodeURIComponent(
    digits
  )}&limit=1&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "pt-BR",
      "User-Agent": "delivery-app-template/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao buscar coordenadas");
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error("CEP não encontrado");
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
  };
}

async function getRouteDistanceKm(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&alternatives=false&steps=false`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Falha ao calcular rota");
  }

  const data = await response.json();
  if (!data.routes || !data.routes.length) {
    throw new Error("Rota não encontrada");
  }

  const distanceMeters = data.routes[0].distance;
  return Math.max(1, Math.round(distanceMeters / 1000));
}

function getDeliveryFee(distanceKm) {
  return Math.max(restaurantConfig.deliveryRate, Math.round(distanceKm * restaurantConfig.deliveryRate));
}

async function initializeCompanyLocation() {
  if (companyLocation) return companyLocation;
  try {
    companyLocation = await getCoordinatesFromCep(restaurantConfig.companyCep);
  } catch (error) {
    companyLocation = { lat: -10.2409, lon: -48.3248 };
  }
  return companyLocation;
}

function validateCepField(input) {
  const digits = input.value.trim().replace(/\D/g, "");
  const valid = digits.length === 8;
  input.classList.toggle("invalid", !valid && digits.length > 0);
  return valid ? digits : null;
}

async function updateDeliverySummary(subtotal) {
  const destinationCep = validateCepField(deliveryCepInput);
  currentDestinationCep = deliveryCepInput.value.trim().replace(/\D/g, "");
  await initializeCompanyLocation();

  const deliveryRateText = `R$ ${restaurantConfig.deliveryRate.toFixed(2).replace(".", ",")} / km`;
  let distance = 5;
  let fee = getDeliveryFee(distance);
  let infoText = `Origem: CEP ${restaurantConfig.companyCep} · Taxa: ${deliveryRateText}`;

  if (destinationCep) {
    try {
      const destinationLocation = await getCoordinatesFromCep(destinationCep);
      distance = await getRouteDistanceKm(companyLocation, destinationLocation);
      fee = getDeliveryFee(distance);
      infoText = `Origem: CEP ${restaurantConfig.companyCep} · Destino: CEP ${destinationCep} · Distância: ${distance} km · ${deliveryRateText}`;
      deliveryCepInput.classList.remove("invalid");
    } catch (error) {
      infoText = `Origem: CEP ${restaurantConfig.companyCep} · CEP de entrega inválido ou indisponível · ${deliveryRateText}`;
      showToast(error.message);
      deliveryCepInput.classList.add("invalid");
    }
  } else {
    infoText = `Origem: CEP ${restaurantConfig.companyCep} · Informe o CEP de entrega para cálculo real · ${deliveryRateText}`;
    deliveryCepInput.classList.remove("invalid");
  }

  currentDeliveryDistance = distance;
  currentDeliveryFee = fee;
  cartDeliveryFee.textContent = formatPrice(fee);
  deliveryInfo.textContent = infoText;
  cartTotal.textContent = formatPrice(subtotal + fee);
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
        <div class="product-image">
          ${product.image ? `<img src="${product.image}" alt="${product.name}" />` : `<div class="product-placeholder">Imagem do produto</div>`}
        </div>
        <div class="product-top">
          <h3>${product.name}</h3>
          <span>${formatPrice(product.price)}</span>
        </div>
        <p class="product-description">${product.description}</p>
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
    cartSubtotal.textContent = formatPrice(0);
    cartDeliveryFee.textContent = formatPrice(0);
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

  cartSubtotal.textContent = formatPrice(total);
  cartCount.textContent = productIds.reduce((sum, productId) => sum + cart[productId], 0);
  checkoutBtn.disabled = false;
  updateDeliverySummary(total);
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

deliveryCepInput.addEventListener("input", () => {
  deliveryCepInput.classList.remove("invalid");
  renderCart();
});

openCartBtn.addEventListener("click", () => toggleCart(true));
closeCartBtn.addEventListener("click", () => toggleCart(false));
checkoutBtn.addEventListener("click", handleCheckout);

loadRestaurantConfig().finally(() => {
  renderCategoryFilters();
  renderProducts();
  renderCart();
});
