require('dotenv').config();
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

    // Postgres: usa { rows } em vez de [rows]
    const { rows: emailExiste } = await db.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    )
    if (emailExiste.length > 0) {
      return res.status(400).json({ erro: "E-mail já cadastrado" })
    }

    const { rows: cpfExiste } = await db.query(
      "SELECT id FROM usuarios WHERE cpf = $1",
      [cpf]
    )
    if (cpfExiste.length > 0) {
      return res.status(400).json({ erro: "CPF já cadastrado" })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    // Postgres: usa $1, $2, $3...
    await db.query(
      "INSERT INTO usuarios (nome, email, senha, cpf, tipo) VALUES ($1, $2, $3, $4, $5)",
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

    // Postgres: Busca usuário com $1 e desestrutura { rows }
    const { rows } = await db.query("SELECT * FROM usuarios WHERE email = $1", [email])

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
    const { rows: produtos } = await db.query(
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

    const { rows: produtos } = await db.query(
      `SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
       FROM produtos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.id = $1 AND p.ativo = 1`,
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
      const { rows: cat } = await db.query("SELECT id FROM categorias WHERE nome = $1 OR slug = $2", [
        String(categoriaFinal).toUpperCase(),
        String(categoriaFinal).toLowerCase(),
      ])

      if (cat.length === 0) {
        return res.status(400).json({ erro: "Categoria inválida" })
      }

      categoriaFinal = cat[0].id
    }

    console.log("✅ CATEGORIA FINAL (ID):", categoriaFinal)

    // Postgres: Adicionado RETURNING id para pegar o ID gerado
    const result = await db.query(
      `INSERT INTO produtos (
        codigo, nome, categoria_id, tamanhos, cor,
        quantidade, estoque_atual,
        preco_venda, preco_compra,
        estoque_minimo, estoque_maximo,
        descricao, imagem_url, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
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

    const newId = result.rows[0].id;
    console.log("PRODUTO CADASTRADO ID:", newId)

    res.json({
      mensagem: "Produto cadastrado com sucesso",
      id: newId,
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
      const { rows: cat } = await db.query("SELECT id FROM categorias WHERE nome = $1 OR slug = $2", [
        String(categoriaFinal).toUpperCase(),
        String(categoriaFinal).toLowerCase(),
      ])

      if (cat.length === 0) {
        return res.status(400).json({ erro: "Categoria inválida" })
      }

      categoriaFinal = cat[0].id
    }

    console.log("✅ CATEGORIA FINAL (UPDATE):", categoriaFinal)

    // Postgres: Trocamos ? por $1 até $17 (seguindo a ordem exata do array)
    await db.query(
      `UPDATE produtos SET 
        codigo = COALESCE($1, codigo),
        nome = COALESCE($2, nome), 
        categoria_id = COALESCE($3, categoria_id), 
        tamanhos = COALESCE($4, tamanhos), 
        cor = COALESCE($5, cor),
        quantidade = COALESCE($6, quantidade),
        estoque_atual = COALESCE($7, estoque_atual),
        preco_venda = COALESCE($8, preco_venda), 
        preco_compra = COALESCE($9, preco_compra),
        estoque_minimo = COALESCE($10, estoque_minimo), 
        estoque_maximo = COALESCE($11, estoque_maximo),
        descricao = COALESCE($12, descricao), 
        imagem_url = COALESCE($13, imagem_url), 
        ativo = COALESCE($14, ativo)
      WHERE id = $15`,
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
    // Postgres: usa $1
    await db.query("UPDATE produtos SET ativo = 0 WHERE id = $1", [id])
    res.json({ mensagem: "Produto excluído com sucesso" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: "Erro ao excluir produto" })
  }
})

// --- ROTA MÁGICA PARA CRIAR TABELAS (Execute uma vez e depois apague) ---
app.get("/criar-tabelas", async (req, res) => {
  try {
    console.log("Criando tabelas...");

    // 1. Tabela Usuarios
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        cpf VARCHAR(20) UNIQUE,
        tipo VARCHAR(20) DEFAULT 'cliente'
      );
    `);

    // 2. Tabela Categorias
    await db.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        slug VARCHAR(255)
      );
    `);

    // 3. Tabela Produtos
    await db.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50),
        nome VARCHAR(255),
        categoria_id INTEGER REFERENCES categorias(id),
        tamanhos VARCHAR(255),
        cor VARCHAR(100),
        quantidade INTEGER,
        estoque_atual INTEGER,
        preco_venda DECIMAL(10,2),
        preco_compra DECIMAL(10,2),
        estoque_minimo INTEGER,
        estoque_maximo INTEGER,
        descricao TEXT,
        imagem_url TEXT,
        ativo INTEGER DEFAULT 1
      );
    `);

    // Criar Admin Padrão (Opcional)
    const senhaHash = await bcrypt.hash("admin123", 10);
    await db.query(`
      INSERT INTO usuarios (nome, email, senha, cpf, tipo) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) DO NOTHING`,
      ["Admin", "admin@vestplus.com", senhaHash, "000.000.000-00", "admin"]
    );

    res.send("✅ Tabelas Criadas com Sucesso! Agora pode testar o cadastro.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erro ao criar tabelas: " + err.message);
  }
});
// -----------------------------------------------------------------------

// SERVER
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`)
})