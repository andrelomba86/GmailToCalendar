;(function () {
  const ROOT_ID = 'gmail-to-calendar-root'
  const BUTTON_ID = 'gmail-to-calendar-button'
  const PANEL_ID = 'gmail-to-calendar-panel'
  const PANEL_OVERLAY_ID = 'gmail-to-calendar-overlay'
  const STYLE_ID = 'gmail-to-calendar-style'

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return
    }

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      #${ROOT_ID} {
        display: flex !important;
        gap: 12px !important;
        align-items: center !important;
        margin: 8px 0 !important;
      }

      .gtc-trigger-button {
        width: 36px !important;
        height: 36px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: #5f6368 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, color 120ms ease !important;
      }

      .gtc-trigger-button:hover {
        background: rgba(32, 33, 36, 0.08) !important;
        color: #202124 !important;
      }

      .gtc-trigger-button:focus-visible {
        outline: 2px solid #0b57d0 !important;
        outline-offset: 2px !important;
      }

      .gtc-trigger-icon {
        width: 20px !important;
        height: 20px !important;
        display: block !important;
      }

      .gtc-button {
        border: 0 !important;
        border-radius: 999px !important;
        padding: 10px 16px !important;
        background: #0f766e !important;
        color: #fff !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        box-shadow: none !important;
      }

      .gtc-button:hover {
        background: #115e59 !important;
      }

      .gtc-panel {
        border: 1px solid #d2d6db !important;
        border-radius: 18px !important;
        background: linear-gradient(180deg, #fffdfa 0%, #f8fafb 100%) !important;
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12) !important;
        padding: 18px !important;
        margin: 0 !important;
        font-family: Arial, sans-serif !important;
        color: #1f2937 !important;
        max-width: 760px !important;
        width: min(92vw, 760px) !important;
        max-height: 82vh !important;
        overflow: auto !important;
      }

      .gtc-modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: rgba(15, 23, 42, 0.45) !important;
        backdrop-filter: blur(2px) !important;
        display: grid !important;
        place-items: center !important;
        padding: 18px !important;
      }

      .gtc-close {
        border: 0 !important;
        border-radius: 999px !important;
        padding: 8px 12px !important;
        background: #dbe8e6 !important;
        color: #0f5c56 !important;
        font-size: 12px !important;
        cursor: pointer !important;
        margin-left: auto !important;
        display: block !important;
      }

      .gtc-panel h3 {
        margin: 0 0 8px !important;
        font-size: 16px !important;
      }

      .gtc-panel p {
        margin: 0 0 12px !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      .gtc-list {
        display: grid !important;
        gap: 10px !important;
        margin: 14px 0 !important;
      }

      .gtc-item {
        display: grid !important;
        gap: 4px !important;
        padding: 12px !important;
        border-radius: 14px !important;
        border: 1px solid #dbe4ea !important;
        background: #ffffff !important;
      }

      .gtc-item label {
        display: flex !important;
        gap: 10px !important;
        align-items: start !important;
        cursor: pointer !important;
      }

      .gtc-meta {
        color: #4b5563 !important;
        font-size: 12px !important;
      }

      .gtc-actions {
        display: flex !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
        margin-top: 10px !important;
      }

      .gtc-secondary {
        background: #e6f2f1 !important;
        color: #0f5c56 !important;
      }

      .gtc-message {
        font-size: 13px !important;
        margin-top: 10px !important;
      }

      .gtc-error {
        color: #b42318 !important;
      }

      .gtc-success {
        color: #146c43 !important;
      }
    `

    document.head.appendChild(style)
  }

  function cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim()
  }

  function monthIndexFromPortugueseName(name) {
    const months = {
      janeiro: 0,
      fevereiro: 1,
      marco: 2,
      março: 2,
      abril: 3,
      maio: 4,
      junho: 5,
      julho: 6,
      agosto: 7,
      setembro: 8,
      outubro: 9,
      novembro: 10,
      dezembro: 11,
    }

    return months[name.toLowerCase()] ?? -1
  }

  function formatDisplayDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  }

  function toAllDayDate(date) {
    return date.toISOString().slice(0, 10)
  }

  function parseExplicitDates(text, baseDate, subject) {
    const results = []
    const seen = new Set()
    const lowerText = text.toLowerCase()
    const explicitPatterns = [
      /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+as\s+(\d{1,2})(?::(\d{2}))?)?/gi,
      /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?(?:\s+as\s+(\d{1,2})(?::(\d{2}))?)?/gi,
    ]

    explicitPatterns.forEach((pattern, patternIndex) => {
      let match
      while ((match = pattern.exec(lowerText))) {
        let year = baseDate.getFullYear()
        let month = 0
        const day = Number(match[1])
        let hour = null
        let minute = 0

        if (patternIndex === 0) {
          month = Number(match[2]) - 1
          if (match[3]) {
            year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
          }
          if (match[4]) {
            hour = Number(match[4])
            minute = Number(match[5] || 0)
          }
        } else {
          month = monthIndexFromPortugueseName(match[2])
          if (match[3]) {
            year = Number(match[3])
          }
          if (match[4]) {
            hour = Number(match[4])
            minute = Number(match[5] || 0)
          }
        }

        const detected = new Date(year, month, day, hour ?? 9, minute, 0, 0)
        if (Number.isNaN(detected.getTime())) {
          continue
        }

        if (!match[3] && detected < baseDate) {
          detected.setFullYear(detected.getFullYear() + 1)
        }

        const key = `${detected.toISOString()}-${match[0]}`
        if (seen.has(key)) {
          continue
        }

        seen.add(key)
        results.push({
          id: `deadline-${results.length + 1}`,
          title: subject || 'Prazo detectado no Gmail',
          sourceText: match[0],
          confidence: 'high',
          selected: true,
          allDay: hour === null,
          date: hour === null ? toAllDayDate(detected) : undefined,
          endDate:
            hour === null
              ? toAllDayDate(new Date(detected.getFullYear(), detected.getMonth(), detected.getDate() + 1))
              : undefined,
          dateTime: hour === null ? undefined : detected.toISOString(),
          endDateTime:
            hour === null ? undefined : new Date(detected.getTime() + 60 * 60 * 1000).toISOString(),
          displayDate:
            hour === null
              ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(detected)
              : formatDisplayDate(detected),
        })
      }
    })

    return results
  }

  function nextWeekday(baseDate, weekday) {
    const current = new Date(baseDate)
    current.setHours(9, 0, 0, 0)
    const diff = (weekday + 7 - current.getDay()) % 7 || 7
    current.setDate(current.getDate() + diff)
    return current
  }

  function parseRelativeDates(text, baseDate, subject, initialIndex) {
    const results = []
    const lowerText = text.toLowerCase()
    const mappings = [
      {
        tokens: ['amanha', 'amanhã'],
        resolver: () =>
          new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 9, 0, 0, 0),
      },
      {
        tokens: ['hoje'],
        resolver: () => new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 9, 0, 0, 0),
      },
      {
        tokens: ['proxima semana', 'próxima semana'],
        resolver: () =>
          new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7, 9, 0, 0, 0),
      },
      { tokens: ['ate sexta', 'até sexta'], resolver: () => nextWeekday(baseDate, 5) },
      { tokens: ['ate segunda', 'até segunda'], resolver: () => nextWeekday(baseDate, 1) },
      { tokens: ['ate terca', 'até terca', 'até terça'], resolver: () => nextWeekday(baseDate, 2) },
      { tokens: ['ate quarta', 'até quarta'], resolver: () => nextWeekday(baseDate, 3) },
      { tokens: ['ate quinta', 'até quinta'], resolver: () => nextWeekday(baseDate, 4) },
    ]

    mappings.forEach((mapping, index) => {
      const foundToken = mapping.tokens.find(token => lowerText.includes(token))
      if (!foundToken) {
        return
      }

      const detected = mapping.resolver()
      results.push({
        id: `deadline-${initialIndex + index + 1}`,
        title: subject || 'Prazo detectado no Gmail',
        sourceText: foundToken,
        confidence: 'medium',
        selected: true,
        allDay: true,
        date: toAllDayDate(detected),
        endDate: toAllDayDate(new Date(detected.getFullYear(), detected.getMonth(), detected.getDate() + 1)),
        dateTime: undefined,
        endDateTime: undefined,
        displayDate: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(detected),
      })
    })

    return results
  }

  function dedupeDeadlines(deadlines) {
    const seen = new Set()
    return deadlines.filter(deadline => {
      const key = `${deadline.sourceText}-${deadline.date || deadline.dateTime}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  function parseDeadlines(email) {
    const baseDate = email.baseDate ? new Date(email.baseDate) : new Date()
    const explicit = parseExplicitDates(email.bodyText, baseDate, email.subject)
    const relative = parseRelativeDates(email.bodyText, baseDate, email.subject, explicit.length)
    return dedupeDeadlines([...explicit, ...relative])
  }

  function extractCurrentEmail() {
    const subject =
      cleanText(document.querySelector('h2[data-thread-perm-id]')?.textContent) ||
      cleanText(document.querySelector('h2.hP')?.textContent) ||
      cleanText(document.title.replace(/\s+-\s+Gmail$/, ''))

    const from =
      cleanText(document.querySelector('span[email]')?.getAttribute('email')) ||
      cleanText(document.querySelector('span[email]')?.textContent) ||
      ''

    const messageBodies = Array.from(document.querySelectorAll('div[role="listitem"] div.a3s, div.a3s'))
    const bodyText = cleanText(messageBodies.map(node => node.innerText || node.textContent || '').join(' '))

    const timeElement = document.querySelector('time[datetime]')
    const baseDate = timeElement?.getAttribute('datetime') || new Date().toISOString()

    return {
      subject,
      from,
      bodyText,
      snippet: bodyText.slice(0, 600),
      baseDate,
      link: window.location.href,
    }
  }

  function sendMessage(type, payload) {
    return chrome.runtime.sendMessage({ type, payload }).then(response => {
      if (!response?.ok) {
        throw new Error(response?.error || 'Falha de comunicacao com a extensao.')
      }

      return response.data
    })
  }

  function renderPanel(deadlines, email, mountPoint) {
    let existing = document.getElementById(PANEL_ID)
    if (existing) {
      existing.remove()
    }

    let existingOverlay = document.getElementById(PANEL_OVERLAY_ID)
    if (existingOverlay) {
      existingOverlay.remove()
    }

    const overlay = document.createElement('div')
    overlay.id = PANEL_OVERLAY_ID
    overlay.className = 'gtc-modal-overlay'

    const panel = document.createElement('section')
    panel.id = PANEL_ID
    panel.className = 'gtc-panel'

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'gtc-close'
    closeButton.textContent = 'Fechar'
    closeButton.addEventListener('click', () => {
      overlay.remove()
    })

    const heading = document.createElement('h3')
    heading.textContent = 'Prazos detectados'

    const intro = document.createElement('p')
    intro.textContent = deadlines.length
      ? 'Revise os itens abaixo antes de criar os eventos na agenda configurada.'
      : 'Nenhum prazo foi detectado nesse email.'

    panel.append(closeButton, heading, intro)

    const list = document.createElement('div')
    list.className = 'gtc-list'

    deadlines.forEach(deadline => {
      const item = document.createElement('div')
      item.className = 'gtc-item'

      const label = document.createElement('label')
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = deadline.selected
      checkbox.dataset.deadlineId = deadline.id

      const text = document.createElement('div')
      text.innerHTML = `
        <strong>${deadline.title}</strong>
        <div class="gtc-meta">${deadline.displayDate}</div>
        <div class="gtc-meta">Trecho: ${deadline.sourceText}</div>
        <div class="gtc-meta">Confianca: ${deadline.confidence === 'high' ? 'alta' : 'media'}</div>
      `

      label.append(checkbox, text)
      item.append(label)
      list.append(item)
    })

    panel.append(list)

    const actions = document.createElement('div')
    actions.className = 'gtc-actions'

    const createButton = document.createElement('button')
    createButton.className = 'gtc-button'
    createButton.textContent = 'Criar eventos'
    createButton.disabled = !deadlines.length

    const refreshButton = document.createElement('button')
    refreshButton.className = 'gtc-button gtc-secondary'
    refreshButton.textContent = 'Reanalisar email'

    const message = document.createElement('div')
    message.className = 'gtc-message'

    createButton.addEventListener('click', async () => {
      message.textContent = 'Criando eventos...'
      message.className = 'gtc-message'

      const selectedDeadlines = deadlines.map(deadline => ({
        ...deadline,
        selected: Boolean(panel.querySelector(`input[data-deadline-id="${deadline.id}"]`)?.checked),
      }))

      try {
        const result = await sendMessage('CREATE_EVENTS', {
          email,
          deadlines: selectedDeadlines,
        })
        message.textContent = `${result.createdCount} evento(s) criado(s) com sucesso.`
        message.className = 'gtc-message gtc-success'
      } catch (error) {
        message.textContent = error.message
        message.className = 'gtc-message gtc-error'
      }
    })

    refreshButton.addEventListener('click', () => {
      const freshEmail = extractCurrentEmail()
      const freshDeadlines = parseDeadlines(freshEmail)
      renderPanel(freshDeadlines, freshEmail, mountPoint)
    })

    actions.append(createButton, refreshButton)
    panel.append(actions, message)
    overlay.appendChild(panel)
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        overlay.remove()
      }
    })

    mountPoint.appendChild(overlay)
  }

  function ensureRoot(mountPoint) {
    let root = document.getElementById(ROOT_ID)
    if (!root) {
      root = document.createElement('div')
      root.id = ROOT_ID
      mountPoint.insertAdjacentElement('afterend', root)
    }

    if (!document.getElementById(BUTTON_ID)) {
      const button = document.createElement('button')
      button.id = BUTTON_ID
      button.type = 'button'
      button.className = 'gtc-trigger-button'
      button.title = 'Detectar prazos e enviar para agenda'
      button.setAttribute('aria-label', 'Detectar prazos e enviar para agenda')
      button.innerHTML = `
        <svg class="gtc-trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v3H2V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm15 9v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-6h20Zm-5.293 1.293L11 18l-3.707-3.707 1.414-1.414L11 15.172l4.293-4.293 1.414 1.414Z"
          />
        </svg>
      `
      button.addEventListener('click', () => {
        const email = extractCurrentEmail()
        const deadlines = parseDeadlines(email)
        const panelMountPoint = document.body

        renderPanel(deadlines, email, panelMountPoint)
      })
      root.appendChild(button)
    }
  }

  function findMountPoint() {
    return document.querySelector('div.gK') || document.querySelector('h2.hP')
  }

  function boot() {
    ensureStyles()
    const mountPoint = findMountPoint()
    if (!mountPoint) {
      return
    }

    ensureRoot(mountPoint)
  }

  const observer = new MutationObserver(() => {
    boot()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  boot()
})()
