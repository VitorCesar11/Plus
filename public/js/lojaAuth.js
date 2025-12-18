document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const token = localStorage.getItem("token")

  const loginLink = document.getElementById("loginLink")
  const userNameDisplay = document.getElementById("userNameDisplay")

  // NÃO LOGADO
  if (!user || !token) {
    userNameDisplay.textContent = "Entrar / Cadastrar"
    loginLink.href = "login.html"
    return
  }

  // LOGADO
  userNameDisplay.textContent = `Olá, ${user.nome}`
  loginLink.href = "#"

  // Clique quando logado → logout
  loginLink.addEventListener("click", (e) => {
    e.preventDefault()

    const sair = confirm("Deseja sair da sua conta?")
    if (!sair) return

    localStorage.clear()
    window.location.reload()
  })
})
