let produtos = []
let produtoEditando = null

const API_URL = "http://localhost:3000/api"

document.addEventListener("DOMContentLoaded", () => {
  verificarAuth()
  configurarTabs()
  carregarProdutos()
  configurarFormularios()
  configurarFiltros()
  setupImagePreview()

  document.getElementById("logout-btn").addEventListener("click", logout)
})

function verificarAuth() {
  const token = localStorage.getItem("token")
  const userType = localStorage.getItem("userType")

  if (!token || userType !== "admin") {
    alert("Acesso restrito")
    window.location.href = "login.html"
  }
}

function logout(e) {
  e.preventDefault()
  localStorage.removeItem("token")
  localStorage.removeItem("userType")
  localStorage.removeItem("userId")
  window.location.href = "login.html"
}

function configurarTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn")
  const tabContents = document.querySelectorAll(".tab-content")

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab

      tabBtns.forEach((b) => b.classList.remove("active"))
      tabContents.forEach((c) => c.classList.remove("active"))

      btn.classList.add("active")
      document.getElementById(`tab-${tab}`).classList.add("active")

      if (tab === "inventario") {
        carregarProdutos()
      } else if (tab === "acerto") {
        carregarProdutosSelect()
      }
    })
  })
}

async function carregarProdutos() {
  try {
    const response = await fetch(`${API_URL}/produtos`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (response.ok) {
      produtos = await response.json()
    } else {
      throw new Error("API error")
    }
  } catch (error) {
    console.error("Erro ao carregar produtos:", error)
    mostrarToast("Erro ao carregar produtos. Tente novamente.", "error")
    produtos = []
  }

  renderizarInventario()
  atualizarContadores()
  carregarProdutosSelect()
}

function renderizarInventario() {
  const tbody = document.getElementById("inventory-body")
  const emptyState = document.getElementById("empty-inventory")

  if (produtos.length === 0) {
    tbody.innerHTML = ""
    emptyState.classList.add("active")
    return
  }

  emptyState.classList.remove("active")

  tbody.innerHTML = produtos
    .map((produto) => {
      const status = calcularStatus(produto)
      return `
            <tr>
                <td>${produto.codigo || "-"}</td>
                <td><a href="#">${produto.nome}</a></td>
                <td>${formatarCategoria(produto.categoria_nome || "Sem categoria")}</td>
                <td>${produto.tamanhos || "-"}</td>
                <td>${produto.cor || "-"}</td>
                <td><strong>${produto.estoque_atual || produto.quantidade || 0}</strong></td>
                <td>${produto.estoque_minimo || 5} / ${produto.estoque_maximo || 100}</td>
                <td><span class="status-badge ${status.classe}">${status.texto}</span></td>
                <td>R$ ${Number.parseFloat(produto.preco_venda).toFixed(2)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editarProduto(${produto.id})" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick="excluirProduto(${produto.id})" title="Excluir">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `
    })
    .join("")
}

function carregarProdutosSelect() {
  const select = document.getElementById("produto_acerto")
  select.innerHTML = '<option value="">Selecione um produto...</option>'

  produtos.forEach((produto) => {
    select.innerHTML += `<option value="${produto.id}">${produto.codigo || produto.id} - ${produto.nome}</option>`
  })
}

function formatarCategoria(categoria) {
  const categorias = {
    blusas: "Blusas",
    BLUSAS: "Blusas",
    bermudas: "Bermudas",
    BERMUDAS: "Bermudas",
    tenis: "Tênis",
    TÊNIS: "Tênis",
    vestidos: "Vestidos",
    VESTIDOS: "Vestidos",
    sapatos: "Sapatos",
    SAPATOS: "Sapatos",
  }
  return categorias[categoria] || categoria
}

function configurarFormularios() {
  document.getElementById("form-entrada").addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    const imagemFile = formData.get("imagem")
    let imagemUrl = "/roupa.jpg"

    if (imagemFile && imagemFile.size > 0) {
      imagemUrl = await converterImagemParaBase64(imagemFile)
    }

    const produto = {
      codigo: formData.get("codigo"),
      nome: formData.get("nome"),
      categoria_id: formData.get("categoria"),
      tamanhos: formData.get("tamanho"),
      cor: formData.get("cor"),
      quantidade: Number.parseInt(formData.get("quantidade")),
      estoque_atual: Number.parseInt(formData.get("quantidade")),
      preco_venda: Number.parseFloat(formData.get("preco_venda")),
      preco_compra: Number.parseFloat(formData.get("preco_compra")),
      estoque_minimo: Number.parseInt(formData.get("estoque_minimo")),
      estoque_maximo: Number.parseInt(formData.get("estoque_maximo")),
      descricao: formData.get("descricao"),
      imagem_url: imagemUrl,
      ativo: 1,
    }

    try {
      const response = await fetch(`${API_URL}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(produto),
      })

      if (response.ok) {
        mostrarToast("Produto cadastrado com sucesso!", "success")
        e.target.reset()
        const preview = document.getElementById("preview-imagem")
        if (preview) {
          preview.style.display = "none"
          preview.src = ""
        }
        carregarProdutos()
      } else {
        const error = await response.json()
        mostrarToast(error.message || "Erro ao cadastrar", "error")
      }
    } catch (error) {
      console.error("Erro:", error)
      mostrarToast("Erro de conexão com servidor", "error")
    }
  })

  document.getElementById("form-acerto").addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    const produtoId = Number.parseInt(formData.get("produto_id"))
    const tipoAcerto = formData.get("tipo_acerto")
    const quantidade = Number.parseInt(formData.get("quantidade"))

    const produtoIndex = produtos.findIndex((p) => p.id === produtoId)
    if (produtoIndex === -1) {
      mostrarToast("Produto não encontrado", "error")
      return
    }

    const produto = produtos[produtoIndex]
    const estoqueAtual = produto.estoque_atual || produto.quantidade

    if (tipoAcerto === "entrada") {
      produto.estoque_atual = estoqueAtual + quantidade
    } else if (tipoAcerto === "saida") {
      if (quantidade > estoqueAtual) {
        mostrarToast("Quantidade maior que o estoque disponível", "error")
        return
      }
      produto.estoque_atual = estoqueAtual - quantidade
    } else if (tipoAcerto === "ajuste") {
      produto.estoque_atual = quantidade
    }

    try {
      const response = await fetch(`${API_URL}/produtos/${produtoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(produto),
      })

      if (response.ok) {
        mostrarToast("Acerto realizado com sucesso!", "success")
        e.target.reset()
        carregarProdutos()
      } else {
        mostrarToast("Erro ao atualizar estoque", "error")
      }
    } catch (error) {
      console.error("Erro:", error)
      mostrarToast("Erro de conexão com servidor", "error")
    }
  })

  document.getElementById("form-editar").addEventListener("submit", async (e) => {
    e.preventDefault()

    if (!produtoEditando) return

    const formData = new FormData(e.target)

    const produtoIndex = produtos.findIndex((p) => p.id === produtoEditando)
    if (produtoIndex === -1) {
      mostrarToast("Produto não encontrado", "error")
      return
    }

    const imagemFile = formData.get("imagem_edit")
    let imagemUrl = produtos[produtoIndex].imagem_url || "/roupa.jpg"

    if (imagemFile && imagemFile.size > 0) {
      imagemUrl = await converterImagemParaBase64(imagemFile)
    }

    const produtoAtualizado = {
      ...produtos[produtoIndex],
      nome: formData.get("nome"),
      preco_venda: Number.parseFloat(formData.get("preco_venda")),
      categoria_id: formData.get("categoria"),
      cor: formData.get("cor"),
      tamanhos: formData.get("tamanhos"),
      imagem_url: imagemUrl,
    }

    try {
      const response = await fetch(`${API_URL}/produtos/${produtoEditando}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(produtoAtualizado),
      })

      if (response.ok) {
        mostrarToast("Produto atualizado com sucesso!", "success")
        fecharModal()
        carregarProdutos()
      } else {
        mostrarToast("Erro ao atualizar produto", "error")
      }
    } catch (error) {
      console.error("Erro:", error)
      mostrarToast("Erro de conexão com servidor", "error")
    }
  })
}

function configurarFiltros() {
  const buscaInput = document.getElementById("busca-produto")
  const filtroCategoria = document.getElementById("filtro-categoria")
  const filtroStatus = document.getElementById("filtro-status")

  const aplicarFiltros = () => {
    const busca = buscaInput.value.toLowerCase()
    const categoria = filtroCategoria.value
    const status = filtroStatus.value

    const produtosFiltrados = produtos.filter((produto) => {
      const matchBusca =
        (produto.nome || "").toLowerCase().includes(busca) || (produto.codigo || "").toLowerCase().includes(busca)
      const matchCategoria = !categoria || (produto.categoria_nome || "").toLowerCase() === categoria.toLowerCase()
      const statusProduto = calcularStatus(produto)
      const matchStatus =
        !status || statusProduto.classe === status || (status === "baixo" && statusProduto.classe === "sem-estoque")

      return matchBusca && matchCategoria && matchStatus
    })

    renderizarInventarioFiltrado(produtosFiltrados)
  }

  buscaInput.addEventListener("input", aplicarFiltros)
  filtroCategoria.addEventListener("change", aplicarFiltros)
  filtroStatus.addEventListener("change", aplicarFiltros)
}

function renderizarInventarioFiltrado(produtosFiltrados) {
  const tbody = document.getElementById("inventory-body")
  const emptyState = document.getElementById("empty-inventory")

  if (produtosFiltrados.length === 0) {
    tbody.innerHTML = ""
    emptyState.classList.add("active")
    return
  }

  emptyState.classList.remove("active")

  tbody.innerHTML = produtosFiltrados
    .map((produto) => {
      const status = calcularStatus(produto)
      return `
            <tr>
                <td>${produto.codigo || "-"}</td>
                <td><a href="#">${produto.nome}</a></td>
                <td>${formatarCategoria(produto.categoria_nome || "Sem categoria")}</td>
                <td>${produto.tamanhos || "-"}</td>
                <td>${produto.cor || "-"}</td>
                <td><strong>${produto.estoque_atual || produto.quantidade || 0}</strong></td>
                <td>${produto.estoque_minimo || 5} / ${produto.estoque_maximo || 100}</td>
                <td><span class="status-badge ${status.classe}">${status.texto}</span></td>
                <td>R$ ${Number.parseFloat(produto.preco_venda).toFixed(2)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editarProduto(${produto.id})" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick="excluirProduto(${produto.id})" title="Excluir">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `
    })
    .join("")
}

function editarProduto(id) {
  const produto = produtos.find((p) => p.id === id)
  if (!produto) return

  produtoEditando = id

  document.getElementById("edit-id").value = produto.id
  document.getElementById("edit-nome").value = produto.nome
  document.getElementById("edit-preco").value = produto.preco_venda

  const categoriaSlugMap = {
    1: "blusas",
    2: "bermudas",
    3: "tenis",
    4: "vestidos",
    5: "sapatos",
  }

  document.getElementById("edit-categoria").value = categoriaSlugMap[produto.categoria_id] || "blusas"
  document.getElementById("edit-cor").value = produto.cor || ""
  document.getElementById("edit-tamanhos").value = produto.tamanhos || ""

  document.getElementById("modal-editar").classList.add("active")
}

async function excluirProduto(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return

  try {
    const response = await fetch(`${API_URL}/produtos/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (response.ok) {
      mostrarToast("Produto excluído com sucesso!", "success")
      carregarProdutos()
    } else {
      mostrarToast("Erro ao excluir produto", "error")
    }
  } catch (error) {
    console.error("Erro:", error)
    mostrarToast("Erro de conexão com servidor", "error")
  }
}

function fecharModal() {
  document.getElementById("modal-editar").classList.remove("active")
  produtoEditando = null
}

function mostrarToast(mensagem, tipo = "success") {
  const toastExistente = document.querySelector(".toast")
  if (toastExistente) {
    toastExistente.remove()
  }

  const toast = document.createElement("div")
  toast.className = `toast ${tipo} active`
  toast.textContent = mensagem
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

document.getElementById("modal-editar").addEventListener("click", (e) => {
  if (e.target.id === "modal-editar") {
    fecharModal()
  }
})

function converterImagemParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

function setupImagePreview() {
  const inputImagem = document.getElementById("imagem")
  const previewImagem = document.getElementById("preview-imagem")

  if (inputImagem && previewImagem) {
    inputImagem.addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          previewImagem.src = event.target.result
          previewImagem.style.display = "block"
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const inputImagemEdit = document.getElementById("imagem_edit")
  const previewImagemEdit = document.getElementById("preview-imagem-edit")

  if (inputImagemEdit && previewImagemEdit) {
    inputImagemEdit.addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          previewImagemEdit.src = event.target.result
          previewImagemEdit.style.display = "block"
        }
        reader.readAsDataURL(file)
      }
    })
  }
}

function calcularStatus(produto) {
  const estoque = produto.estoque_atual || produto.quantidade
  const minimo = produto.estoque_minimo || 5
  const maximo = produto.estoque_maximo || 100

  if (estoque === 0) {
    return { classe: "sem-estoque", texto: "Sem Estoque" }
  } else if (estoque <= minimo * 0.5) {
    return { classe: "critico", texto: "Crítico" }
  } else if (estoque <= minimo) {
    return { classe: "baixo", texto: "Baixo" }
  } else if (estoque > maximo) {
    return { classe: "excesso", texto: "Excesso" }
  } else {
    return { classe: "normal", texto: "Normal" }
  }
}

function atualizarContadores() {
  let critico = 0,
    baixo = 0,
    normal = 0

  produtos.forEach((produto) => {
    const status = calcularStatus(produto)
    if (status.classe === "critico" || status.classe === "sem-estoque") critico++
    else if (status.classe === "baixo") baixo++
    else if (status.classe === "normal") normal++
  })

  document.getElementById("count-critico").textContent = critico
  document.getElementById("count-baixo").textContent = baixo
  document.getElementById("count-normal").textContent = normal
  document.getElementById("count-total").textContent = produtos.length
}
