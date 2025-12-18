document.getElementById("cadastroForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const msg = document.getElementById("formMessage")
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const btnText = submitBtn.querySelector("span")
  const btnIcon = submitBtn.querySelector("svg")

  const nome = document.getElementById("nome").value.trim()
  const email = document.getElementById("email").value.trim()
  const cpf = document.getElementById("cpf").value.trim()
  const telefone = document.getElementById("telefone")?.value.trim()
  const tipo = document.getElementById("userType").value
  const codigoAdmin = document.getElementById("codigoAdmin")?.value.trim()
  const senha = document.getElementById("senha").value
  const confirmar = document.getElementById("confirmarSenha").value

  msg.textContent = ""
  msg.className = "form-message"

  if (!nome || !email || !cpf || !senha || !confirmar) {
    showMessage(msg, "Preencha todos os campos obrigatórios.", "error")
    return
  }

  if (senha !== confirmar) {
    showMessage(msg, "As senhas não coincidem.", "error")
    return
  }

  if (tipo === "admin" && !codigoAdmin) {
    showMessage(msg, "Código de acesso admin é obrigatório.", "error")
    return
  }

  submitBtn.disabled = true
  btnText.textContent = "Cadastrando..."
  btnIcon.style.display = "none"

  const payload = {
    nome,
    email,
    senha,
    cpf,
    telefone,
    tipo,
    codigoAdmin: tipo === "admin" ? codigoAdmin : null,
  }

  try {
    const res = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      showMessage(msg, `${data.erro}`, "error")
      resetButton(submitBtn, btnText, btnIcon)
      return
    }

    showMessage(msg, "Cadastro realizado com sucesso! Redirecionando...", "success")

    setTimeout(() => {
      window.location.href = "login.html"
    }, 1500)
  } catch {
    showMessage(msg, "Erro de conexão com o servidor.", "error")
    resetButton(submitBtn, btnText, btnIcon)
  }
})

function showMessage(el, text, type) {
  el.textContent = text
  el.className = `form-message ${type}`
}

function resetButton(btn, textEl, iconEl) {
  btn.disabled = false
  textEl.textContent = "Criar conta"
  iconEl.style.display = "block"
}

