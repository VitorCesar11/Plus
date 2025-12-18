document.addEventListener("DOMContentLoaded", () => {
  // ABAS CLIENTE / ADMIN
  const tabs = document.querySelectorAll(".auth-tab")
  const adminFields = document.getElementById("adminFields")
  const userTypeInput = document.getElementById("userType")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")

      const tipo = tab.dataset.tab
      userTypeInput.value = tipo

      if (adminFields) {
        adminFields.style.display = tipo === "admin" ? "block" : "none"
      }
    })
  })

  // MÁSCARA CPF 
  const cpf = document.getElementById("cpf")
  cpf?.addEventListener("input", () => {
    let v = cpf.value.replace(/\D/g, "")
    v = v.replace(/(\d{3})(\d)/, "$1.$2")
    v = v.replace(/(\d{3})(\d)/, "$1.$2")
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    cpf.value = v
  })

  // MÁSCARA TELEFONE
  const tel = document.getElementById("telefone")
  tel?.addEventListener("input", () => {
    let v = tel.value.replace(/\D/g, "")
    v = v.replace(/^(\d{2})(\d)/, "($1) $2")
    v = v.replace(/(\d)(\d{4})$/, "$1-$2")
    tel.value = v
  })

  // FORÇA SENHA
  const senha = document.getElementById("senha")
  const bar = document.querySelector(".strength-bar")
  const text = document.querySelector(".strength-text")

  senha?.addEventListener("input", () => {
    let f = 0
    if (senha.value.length >= 6) f++
    if (/[A-Z]/.test(senha.value)) f++
    if (/[0-9]/.test(senha.value)) f++
    if (/[^A-Za-z0-9]/.test(senha.value)) f++

    bar.style.width = `${f * 25}%`

    text.textContent = f <= 1 ? "Senha fraca" : f === 2 ? "Senha média" : "Senha forte"
  })
})
 