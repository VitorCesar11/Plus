const API_BASE_URL = "http://localhost:3000"

let produtos = []
let categoriaAtiva = null

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ loja.js carregado")
  console.log("API_BASE_URL:", API_BASE_URL)

  carregarProdutos()
  configurarFiltrosCategorias()
  configurarOrdenacao()
  configurarPesquisa()
  updateCartCount()
})

/* CATEGORIAS */

function configurarFiltrosCategorias() {
  const btnTodas = document.querySelector(".nav-btn.active")
  if (btnTodas) {
    btnTodas.addEventListener("click", () => {
      categoriaAtiva = null
      atualizarBotoesAtivos(null)
      aplicarFiltrosEOrdenacao()
    })
  }

  const navLinks = document.querySelectorAll(".nav-link")
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      categoriaAtiva = link.dataset.category
      atualizarBotoesAtivos(categoriaAtiva)
      aplicarFiltrosEOrdenacao()
    })
  })
}

function atualizarBotoesAtivos(categoria) {
  document.querySelector(".nav-btn.active")?.classList.remove("active")
  document.querySelectorAll(".nav-link.active").forEach((l) => l.classList.remove("active"))

  if (categoria === null) {
    document.querySelector(".nav-btn")?.classList.add("active")
  } else {
    document.querySelector(`[data-category="${categoria}"]`)?.classList.add("active")
  }
}

function filtrarPorCategoria(categoria) {
  return produtos.filter((p) => {
    const nome = (p.categoria_nome || p.categoria || "").toLowerCase()
    return nome.replace(/\s+/g, "") === categoria.toLowerCase()
  })
}

/* ORDENAÇÃO */

function configurarOrdenacao() {
  const sortSelect = document.getElementById("sortSelect")
  if (!sortSelect) return

  sortSelect.addEventListener("change", () => {
    aplicarFiltrosEOrdenacao()
  })
}

function configurarPesquisa() {
  const searchInput = document.getElementById("searchInput")
  if (!searchInput) return

  searchInput.addEventListener("input", () => {
    aplicarFiltrosEOrdenacao()
  })
}


function ordenarProdutos(lista, tipo) {
  const copia = [...lista]

  switch (tipo) {
    case "menor-preco":
      return copia.sort((a, b) => Number(a.preco_venda) - Number(b.preco_venda))

    case "maior-preco":
      return copia.sort((a, b) => Number(b.preco_venda) - Number(a.preco_venda))

    case "recentes":
      return copia.sort((a, b) => {
        const aData = new Date(a.data_criacao || a.id)
        const bData = new Date(b.data_criacao || b.id)
        return bData - aData
      })

    case "relevantes":
    default:
      return copia
  }
}

function aplicarFiltrosEOrdenacao() {
  const sortSelect = document.getElementById("sortSelect")
  const searchInput = document.getElementById("searchInput")

  const tipoOrdenacao = sortSelect?.value || "relevantes"
  const termoBusca = searchInput?.value.toLowerCase().trim() || ""

  let lista = [...produtos]

  // Filtro por categoria
  if (categoriaAtiva) {
    lista = filtrarPorCategoria(categoriaAtiva)
  }

  // Filtro por pesquisa
  if (termoBusca) {
    lista = lista.filter((p) =>
      p.nome.toLowerCase().includes(termoBusca)
    )
  }

  // Ordenação
  lista = ordenarProdutos(lista, tipoOrdenacao)

  renderizarProdutos(lista)
}


/* PRODUTOS */

async function carregarProdutos() {
  const grid = document.getElementById("productsGrid")
  const empty = document.getElementById("emptyState")
  const loading = document.getElementById("loading")

  try {
    const res = await fetch(`${API_BASE_URL}/api/produtos`)
    const data = await res.json()

    loading.style.display = "none"
    produtos = Array.isArray(data) ? data : []

    if (produtos.length === 0) {
      empty.style.display = "block"
      grid.style.display = "none"
      return
    }

    empty.style.display = "none"
    grid.style.display = "grid"
    aplicarFiltrosEOrdenacao()
  } catch (e) {
    console.error("Erro ao carregar produtos:", e)
    loading.style.display = "none"
    empty.style.display = "block"
  }
}

function renderizarProdutos(lista) {
  const grid = document.getElementById("productsGrid")
  grid.innerHTML = ""

  if (lista.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px">
        <h3>Nenhum produto encontrado</h3>
      </div>
    `
    return
  }

  lista.forEach((p) => {
    const card = document.createElement("div")
    card.className = "product-card"
    card.onclick = () => (window.location.href = `produto.html?id=${p.id}`)

    card.innerHTML = `
      <img 
  src="${p.imagem_url || "/roupa.jpg"}"
  alt="${p.nome}"
  style="
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  "
  onerror="this.src='/roupa.jpg'"
>

      <h3>${p.nome}</h3>
      <p>${p.categoria_nome || p.categoria}</p>
      <strong>R$ ${Number(p.preco_venda).toFixed(2).replace(".", ",")}</strong>
    `
    grid.appendChild(card)
  })
}

/* CARRINHO */

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("vestplus_cart") || "[]")
  const count = cart.reduce((t, i) => t + (i.quantidade || 1), 0)
  const el = document.getElementById("cartCount")
  if (el) el.textContent = count
}

window.addEventListener("cartUpdated", updateCartCount)
