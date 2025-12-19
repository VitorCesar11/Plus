document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const msg = document.getElementById("formMessage")
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const btnText = submitBtn.querySelector("span")
  const btnIcon = submitBtn.querySelector("svg")

  msg.textContent = ""
  msg.className = "form-message"
  submitBtn.disabled = true
  btnText.textContent = "Entrando..."
  btnIcon.style.display = "none"

  const email = document.getElementById("email")
  const senha = document.getElementById("senha")

  const payload = {
    email: email.value,
    senha: senha.value,
  }

  try {
    // ✅ CORREÇÃO AQUI: Removido 'http://localhost:3000'
    // Agora ele busca automaticamente no servidor correto (Render ou Local)
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      let errorMessage = "E-mail ou senha incorretos"

      if (data.erro) {
        const erro = data.erro.toLowerCase()

        if (erro.includes("email") && erro.includes("não encontrado")) {
          errorMessage = "E-mail não cadastrado. Verifique ou crie uma conta."
        } else if (erro.includes("senha")) {
          errorMessage = "Senha incorreta. Tente novamente ou recupere sua senha."
        } else if (erro.includes("bloqueado") || erro.includes("suspenso")) {
          errorMessage = "Conta temporariamente bloqueada. Entre em contato com o suporte."
        } else {
          errorMessage = `${data.erro}`
        }
      }

      showMessage(msg, errorMessage, "error")
      resetButton(submitBtn, btnText, btnIcon)
      return
    }

    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    localStorage.setItem("userType", data.user.tipo)
    localStorage.setItem("userId", data.user.id)

    showMessage(msg, "Login realizado! Bem-vindo de volta.", "success")

    setTimeout(() => {
      if (data.user.tipo === "admin") {
        window.location.href = "admin.html"
      } else {
        window.location.href = "loja.html"
      }
    }, 800)
  } catch (err) { // Adicionei 'err' para ver o erro no console se precisar
    console.error("Erro no login:", err);
    showMessage(msg, "Erro ao conectar ao servidor. Verifique sua conexão.", "error")
    resetButton(submitBtn, btnText, btnIcon)
  }
})

function showMessage(element, text, type) {
  element.textContent = text
  element.className = `form-message ${type}`
  element.style.animation = "slideIn 0.3s ease-out"
}

function resetButton(btn, textEl, iconEl) {
  btn.disabled = false
  textEl.textContent = "Entrar"
  iconEl.style.display = "block"
}