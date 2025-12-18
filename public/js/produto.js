const API_BASE_URL = "http://localhost:3000"
let produtoAtual = null
let tamanhoSelecionado = null

document.addEventListener("DOMContentLoaded", () => {
  loadProduto()
  updateCartCount()
})

function getProductId() {
  const params = new URLSearchParams(window.location.search)
  return params.get("id")
}

async function loadProduto() {
  const id = getProductId()
  console.log("ID do produto na URL:", id)

  if (!id) {
    console.error("Nenhum ID fornecido na URL")
    showError("Produto não encontrado")
    document.getElementById("loading").style.display = "none"
    return
  }

  try {
    const apiUrl = `${API_BASE_URL}/api/produtos/${id}`
    console.log("Buscando produto em:", apiUrl)

    const response = await fetch(apiUrl)
    console.log("Status da resposta:", response.status)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    produtoAtual = await response.json()
    console.log("Produto carregado com sucesso:", produtoAtual)

    if (!produtoAtual || !produtoAtual.id) {
      throw new Error("Produto inválido")
    }

    renderProduto()
    loadRelacionados()
  } catch (error) {
    console.error("Erro ao carregar produto:", error)
    showError("Erro ao carregar o produto")
    document.getElementById("loading").style.display = "none"
  }
}

function renderProduto() {
  console.log("Renderizando produto:", produtoAtual.nome)
  const container = document.getElementById("productContainer")

  const tamanhos = produtoAtual.tamanhos ? produtoAtual.tamanhos.split(",").map((t) => t.trim()) : []

  container.innerHTML = `
    <div class="product-detail">
      <div class="product-image">
        <img id="produtoImagem" src="${produtoAtual.imagem_url || "/roupa.jpg"}" alt="${produtoAtual.nome}">
      </div>
      
      <div class="product-info">
        <h1 id="produtoNome">${produtoAtual.nome || "Produto sem nome"}</h1>
        <p class="category" id="produtoCategoria">${produtoAtual.categoria_nome || "Sem categoria"}</p>
        <h2 class="price" id="produtoPreco">R$ ${Number(produtoAtual.preco_venda || 0)
          .toFixed(2)
          .replace(".", ",")}</h2>
        
        <p class="description" id="produtoDescricao">${produtoAtual.descricao || "Sem descrição disponível"}</p>
        
        <div class="product-details">
          ${produtoAtual.cor ? `<div class="color-info" id="produtoCor">Cor: ${produtoAtual.cor}</div>` : ""}
          
          ${
            tamanhos.length > 0
              ? `
            <div class="sizes">
              <h3>Tamanhos disponíveis:</h3>
              <div id="tamanhos" class="sizes-container">
                ${tamanhos.map((tam) => `<button class="size-btn" onclick="selecionarTamanho(this, '${tam}')">${tam}</button>`).join("")}
              </div>
            </div>
          `
              : ""
          }
          
          <button onclick="adicionarAoCarrinho()" class="btn-buy">Adicionar ao Carrinho</button>
        </div>
      </div>
    </div>
  `

  // Esconder loading
  const loadingElement = document.getElementById("loading")
  if (loadingElement) {
    loadingElement.style.display = "none"
  }
}

function selecionarTamanho(btn, tamanho) {
  tamanhoSelecionado = tamanho

  // Remove active class from all buttons
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.classList.remove("active")
  })

  // Add active class to selected button
  btn.classList.add("active")
}

async function loadRelacionados() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/produtos`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const todosProdutos = await response.json()

    const relacionados = todosProdutos
      .filter((p) => p.categoria_id === produtoAtual.categoria_id && p.id !== produtoAtual.id)
      .slice(0, 4)

    if (relacionados.length > 0) {
      const relacionadosContainer = document.getElementById("relatedProducts")
      const relatedSection = document.getElementById("relatedSection")

      relacionadosContainer.innerHTML = relacionados
        .map(
          (produto) => `
        <div class="related-product-card" onclick="window.location.href='produto.html?id=${produto.id}'" style="cursor: pointer;">
          <img src="${produto.imagem_url || "/roupa.jpg"}" alt="${produto.nome}" onerror="this.src='/roupa.jpg'">
          <h4>${produto.nome}</h4>
          <p>R$ ${Number(produto.preco_venda).toFixed(2).replace(".", ",")}</p>
        </div>
      `,
        )
        .join("")

      relatedSection.style.display = "block"
    }
  } catch (error) {
    console.error("Erro ao carregar produtos relacionados:", error)
  }
}

function showError(message) {
  const errorElement = document.createElement("div")
  errorElement.className = "error-message"
  errorElement.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px 20px; border-radius: 5px; z-index: 1000;"
  errorElement.textContent = message
  document.body.appendChild(errorElement)

  setTimeout(() => {
    errorElement.remove()
  }, 3000)
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("vestplus_cart") || "[]")
  const count = cart.reduce((total, item) => total + (item.quantidade || 1), 0)
  const cartCountElement = document.getElementById("cartCount")
  if (cartCountElement) {
    cartCountElement.textContent = count
  }
}

function adicionarAoCarrinho() {
  if (!tamanhoSelecionado) {
    showError("Por favor, selecione um tamanho")
    return
  }

  const carrinho = JSON.parse(localStorage.getItem("vestplus_cart") || "[]")

  const existingItemIndex = carrinho.findIndex(
    (item) => item.id === produtoAtual.id && item.tamanho === tamanhoSelecionado,
  )

  if (existingItemIndex !== -1) {
    carrinho[existingItemIndex].quantidade = (carrinho[existingItemIndex].quantidade || 1) + 1
  } else {
    carrinho.push({
      id: produtoAtual.id,
      nome: produtoAtual.nome,
      preco: produtoAtual.preco_venda,
      tamanho: tamanhoSelecionado,
      imagem: produtoAtual.imagem_url,
      cor: produtoAtual.cor || "",
      quantidade: 1,
    })
  }

  localStorage.setItem("vestplus_cart", JSON.stringify(carrinho))

  updateCartCount()
  window.dispatchEvent(new Event("cartUpdated"))
  mostrarToast("Produto adicionado ao carrinho!")

  tamanhoSelecionado = null
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.classList.remove("active")
  })
}

function mostrarToast(mensagem) {
  const toastExistente = document.querySelector(".toast-notification")
  if (toastExistente) toastExistente.remove()

  const toast = document.createElement("div")
  toast.className = "toast-notification"
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #22c55e;
    color: white;
    padding: 14px 22px;
    border-radius: 10px;
    font-weight: 600;
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    z-index: 1000;
  `
  toast.textContent = mensagem
  document.body.appendChild(toast)

  setTimeout(() => toast.remove(), 3000)
}
