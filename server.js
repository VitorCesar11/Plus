const path = require("path")
const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("./db")

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET
const CODIGO_ACESSO_ADMIN = "VEST-ADMIN-2025"

// ADM FIXO
const ADMIN_FIXO = {
  email: "admin@vestplus.com",
  senha: "admin123",
  nome: "Administrador",
  tipo: "admin",
  id: 0,
}

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json({ limit: "50mb" }))

// SERVIR ARQUIVOS ESTÁTICOS (FRONT)
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

// TOKEN
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.usuario = decoded
    next()
  } catch {
    return res.status(401).json({ erro: "Token inválido" })
  }
}

// CADASTRO USUÁRIO
app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { nome, email, senha, cpf, tipo, codigoAdmin } = req.body

    if (!nome || !email || !senha || !cpf) {
      return res.status(400).json({ erro: "Campos obrigatórios faltando" })
    }

    if (email === ADMIN_FIXO.email) {
      return res.status(400).json({ erro: "Email não permitido" })
    }

    // REGRA DE ADMIN
    if (tipo === "admin") {
      if (codigoAdmin !== CODIGO_ACESSO_ADMIN) {
        return res.status(403).json({ erro: "Código de acesso admin inválido" })
      }
    }

    const [emailExiste] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    )
    if (emailExiste.length > 0) {
      return res.status(400).json({ erro: "E-mail já cadastrado" })
    }

    const [cpfExiste] = await db.query(
      "SELECT id FROM usuarios WHERE cpf = ?",
      [cpf]
    )
    if (cpfExiste.length > 0) {
      return res.status(400).json({ erro: "CPF já cadastrado" })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    await db.query(
      "INSERT INTO usuarios (nome, email, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?)",
      [nome, email, senhaHash, cpf, tipo === "admin" ? "admin" : "cliente"]
    )

    res.json({ mensagem: "Usuário cadastrado com sucesso" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})


// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("LOGIN RECEBIDO:", req.body)

    const { email, senha } = req.body

    if (email === ADMIN_FIXO.email && senha === ADMIN_FIXO.senha) {
      const token = jwt.sign({ id: ADMIN_FIXO.id, tipo: ADMIN_FIXO.tipo }, JWT_SECRET, { expiresIn: "1d" })

      return res.json({
        token,
        user: {
          id: ADMIN_FIXO.id,
          nome: ADMIN_FIXO.nome,
          tipo: ADMIN_FIXO.tipo,
        },
      })
    }

    const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email])

    if (rows.length === 0) {
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const usuario = rows[0]
    const ok = await bcrypt.compare(senha, usuario.senha)

    if (!ok) {
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, JWT_SECRET, { expiresIn: "1d" })

    res.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        tipo: usuario.tipo,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

// GET PRODUTOS
app.get("/api/produtos", async (req, res) => {
  try {
    const [produtos] = await db.query(
      `SELECT p.*, c.nome as categoria_nome 
       FROM produtos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.ativo = 1`,
    )
    res.json(produtos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: "Erro ao buscar produtos" })
  }
})

// GET BY ID
app.get("/api/produtos/:id", async (req, res) => {
  try {
    const { id } = req.params
    console.log("Buscando produto com ID:", id)

    const [produtos] = await db.query(
      `SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
       FROM produtos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.id = ? AND p.ativo = 1`,
      [id],
    )

    if (produtos.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" })
    }

    console.log("Produto encontrado:", produtos[0].nome)
    res.json(produtos[0])
  } catch (err) {
    console.error("Erro ao buscar produto:", err)
    res.status(500).json({ erro: "Erro ao buscar produto" })
  }
})

// CADASTRO PRODUTO
app.post("/api/produtos", verificarToken, async (req, res) => {
  try {
    console.log("PRODUTO RECEBIDO:", req.body)

    const {
      codigo,
      nome,
      categoria_id,
      categoria,
      tamanhos,
      cor,
      quantidade,
      estoque_atual,
      preco_venda,
      preco_compra,
      estoque_minimo,
      estoque_maximo,
      descricao,
      imagem_url,
      ativo,
    } = req.body

    // CONVERSÃO DE CATEGORIA
    let categoriaFinal = categoria_id || categoria

    if (isNaN(categoriaFinal)) {
      const [cat] = await db.query("SELECT id FROM categorias WHERE nome = ? OR slug = ?", [
        String(categoriaFinal).toUpperCase(),
        String(categoriaFinal).toLowerCase(),
      ])

      if (cat.length === 0) {
        return res.status(400).json({ erro: "Categoria inválida" })
      }

      categoriaFinal = cat[0].id
    }

    console.log("✅ CATEGORIA FINAL (ID):", categoriaFinal)

    const [result] = await db.query(
      `INSERT INTO produtos (
        codigo, nome, categoria_id, tamanhos, cor,
        quantidade, estoque_atual,
        preco_venda, preco_compra,
        estoque_minimo, estoque_maximo,
        descricao, imagem_url, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        nome,
        categoriaFinal,
        tamanhos,
        cor,
        quantidade,
        estoque_atual || quantidade,
        preco_venda,
        preco_compra,
        estoque_minimo,
        estoque_maximo,
        descricao,
        imagem_url,
        ativo ?? 1,
      ],
    )

    console.log("PRODUTO CADASTRADO ID:", result.insertId)

    res.json({
      mensagem: "Produto cadastrado com sucesso",
      id: result.insertId,
    })
  } catch (err) {
    console.error("ERRO PRODUTO:", err)
    res.status(500).json({ erro: "Erro ao cadastrar produto" })
  }
})

// UPDATE PRODUTO
app.put("/api/produtos/:id", verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    console.log("ATUALIZANDO PRODUTO:", id, req.body)

    const {
      codigo,
      nome,
      categoria_id,
      categoria,
      tamanhos,
      cor,
      quantidade,
      estoque_atual,
      preco_venda,
      preco_compra,
      estoque_minimo,
      estoque_maximo,
      descricao,
      imagem_url,
      ativo,
    } = req.body

    // Converter categoria_id
    let categoriaFinal = categoria_id || categoria

    if (categoriaFinal && isNaN(categoriaFinal)) {
      const [cat] = await db.query("SELECT id FROM categorias WHERE nome = ? OR slug = ?", [
        String(categoriaFinal).toUpperCase(),
        String(categoriaFinal).toLowerCase(),
      ])

      if (cat.length === 0) {
        return res.status(400).json({ erro: "Categoria inválida" })
      }

      categoriaFinal = cat[0].id
    }

    console.log("✅ CATEGORIA FINAL (UPDATE):", categoriaFinal)

    await db.query(
      `UPDATE produtos SET 
        codigo = COALESCE(?, codigo),
        nome = COALESCE(?, nome), 
        categoria_id = COALESCE(?, categoria_id), 
        tamanhos = COALESCE(?, tamanhos), 
        cor = COALESCE(?, cor),
        quantidade = COALESCE(?, quantidade),
        estoque_atual = COALESCE(?, estoque_atual),
        preco_venda = COALESCE(?, preco_venda), 
        preco_compra = COALESCE(?, preco_compra),
        estoque_minimo = COALESCE(?, estoque_minimo), 
        estoque_maximo = COALESCE(?, estoque_maximo),
        descricao = COALESCE(?, descricao), 
        imagem_url = COALESCE(?, imagem_url), 
        ativo = COALESCE(?, ativo)
      WHERE id = ?`,
      [
        codigo,
        nome,
        categoriaFinal,
        tamanhos,
        cor,
        quantidade,
        estoque_atual,
        preco_venda,
        preco_compra,
        estoque_minimo,
        estoque_maximo,
        descricao,
        imagem_url,
        ativo,
        id,
      ],
    )

    console.log("PRODUTO ATUALIZADO ID:", id)

    res.json({
      mensagem: "Produto atualizado com sucesso",
      id: id,
    })
  } catch (err) {
    console.error("ERRO UPDATE:", err)
    res.status(500).json({ erro: "Erro ao atualizar produto" })
  }
})

// DELETE PRODUTO
app.delete("/api/produtos/:id", verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    await db.query("UPDATE produtos SET ativo = 0 WHERE id = ?", [id])
    res.json({ mensagem: "Produto excluído com sucesso" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: "Erro ao excluir produto" })
  }
})

// SERVER
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`)
})
