let cart = []

document.addEventListener("DOMContentLoaded", () => {
  checkAuth()
  loadCart()
  updateCartCount()
})

function checkAuth() {
  const token = localStorage.getItem("token")

  if (token) {
    let userName = localStorage.getItem("userName")

    if (!userName) {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      userName = user.nome || user.email?.split("@")[0] || "Minha Conta"
    }

    document.getElementById("userNameDisplay").textContent = userName

    document.getElementById("loginLink").removeAttribute("href")
  }
}




function loadCart() {
  const loading = document.getElementById("loading")
  const cartItems = document.getElementById("cartItems")
  const emptyCart = document.getElementById("emptyCart")
  const cartSummary = document.getElementById("cartSummary")

  cart = JSON.parse(localStorage.getItem("vestplus_cart") || "[]")

  loading.style.display = "none"

  if (cart.length === 0) {
    cartItems.style.display = "none"
    cartSummary.style.display = "none"
    emptyCart.style.display = "block"
  } else {
    emptyCart.style.display = "none"
    cartItems.style.display = "flex"
    cartSummary.style.display = "block"
    renderCartItems()
    updateSummary()
  }
}

function renderCartItems() {
  const container = document.getElementById("cartItems")

  container.innerHTML = cart
    .map(
      (item, index) => `
        <div class="cart-item" data-index="${index}">
            <div class="cart-item-image">
                <img src="${item.imagem || item.imagem_url || "/roupa.jpg"}" 
                     alt="${item.nome}"
                     onerror="this.src='/roupa.jpg'"
                     style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.nome}</h3>
                <p class="cart-item-meta">
                    ${item.cor ? `Cor: ${item.cor}` : ""} 
                    ${item.tamanho ? `| Tam: ${item.tamanho}` : ""}
                </p>
                <div class="cart-item-quantity">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">−</button>
                        <span class="quantity-value">${item.quantidade}</span>
                        <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                    </div>
                </div>
                <p class="cart-item-price">R$ ${formatPrice(item.preco * item.quantidade)}</p>
                <div class="cart-item-actions">
                    <button class="btn-alterar" onclick="alterarItem(${index})">Alterar</button>
                    <button class="btn-remover" onclick="removerItem(${index})">Remover</button>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}

function changeQuantity(index, delta) {
  const newQty = cart[index].quantidade + delta

  if (newQty < 1) {
    removerItem(index)
    return
  }

  cart[index].quantidade = newQty
  saveCart()
  renderCartItems()
  updateSummary()
  updateCartCount()

  mostrarToast("Quantidade atualizada")
}

function alterarItem(index) {
  const item = cart[index]
  window.location.href = `produto.html?id=${item.id}`
}

function removerItem(index) {
  if (confirm("Deseja remover este item do carrinho?")) {
    cart.splice(index, 1)
    saveCart()
    if (cart.length === 0) {
      document.getElementById("cartItems").style.display = "none"
      document.getElementById("cartSummary").style.display = "none"
      document.getElementById("emptyCart").style.display = "block"
    } else {
      renderCartItems()
      updateSummary()
    }
    updateCartCount()
    mostrarToast("Item removido do carrinho")
  }
}

function saveCart() {
  localStorage.setItem("vestplus_cart", JSON.stringify(cart))
  window.dispatchEvent(new Event("cartUpdated"))
}

function updateSummary() {
  const subtotal = cart.reduce((total, item) => total + item.preco * item.quantidade, 0)
  const frete = 0
  const total = subtotal + frete

  document.getElementById("subtotal").textContent = `R$ ${formatPrice(subtotal)}`
  document.getElementById("total").textContent = `R$ ${formatPrice(total)}`
}

document.getElementById("btnFinalizar")?.addEventListener("click", async () => {
  const token = localStorage.getItem("token")

  if (!token) {
    alert("Faça login para finalizar a compra.")
    window.location.href = "login.html"
    return
  }

  cart = []
  localStorage.removeItem("vestplus_cart")
  document.getElementById("cartItems").style.display = "none"
  document.getElementById("cartSummary").style.display = "none"
  document.getElementById("emptyCart").style.display = "block"
  updateCartCount()

  alert("Compra finalizada com sucesso! Obrigado por comprar na VEST+")
})

function mostrarToast(mensagem) {
  const toastExistente = document.querySelector(".toast-notification")
  if (toastExistente) toastExistente.remove()

  const toast = document.createElement("div")
  toast.className = "toast-notification"
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #22c55e; /* VERDE */
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `
  toast.textContent = mensagem
  document.body.appendChild(toast)

  setTimeout(() => toast.remove(), 3000)
}

function formatPrice(value) {
  return Number.parseFloat(value).toFixed(2).replace(".", ",")
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("vestplus_cart") || "[]")
  const count = cart.reduce((total, item) => total + item.quantidade, 0)
  const cartCountElement = document.getElementById("cartCount")
  if (cartCountElement) {
    cartCountElement.textContent = count
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "vestplus_cart") {
    loadCart()
    updateCartCount()
  }
})
