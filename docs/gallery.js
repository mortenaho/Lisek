(() => {
  const lightbox = document.getElementById('lightbox')
  if (!lightbox) return

  const cards = [...document.querySelectorAll('.gallery-card')]
  const imgEl = document.getElementById('lightbox-img')
  const captionEl = document.getElementById('lightbox-caption')
  const counterEl = document.getElementById('lightbox-counter')
  const thumbsEl = document.getElementById('lightbox-thumbs')
  const backdrop = lightbox.querySelector('.lightbox-backdrop')
  const btnClose = lightbox.querySelector('.lightbox-close')
  const btnPrev = lightbox.querySelector('.lightbox-prev')
  const btnNext = lightbox.querySelector('.lightbox-next')

  const items = cards.map((card) => ({
    src: card.dataset.full || '',
    thumb: card.dataset.thumb || card.querySelector('img')?.src || '',
    alt: card.querySelector('img')?.alt || '',
    caption: card.querySelector('.gallery-card-caption')?.textContent?.trim() || ''
  }))

  let index = 0
  let lastFocus = null
  let thumbsBuilt = false

  function buildThumbs() {
    if (thumbsBuilt) return
    thumbsEl.innerHTML = items
      .map(
        (item, i) =>
          `<button type="button" class="lightbox-thumb${i === index ? ' is-active' : ''}" data-index="${i}" aria-label="View ${item.alt}">
            <img src="${item.thumb}" alt="" width="72" height="45" decoding="async">
          </button>`
      )
      .join('')
    thumbsBuilt = true
  }

  function updateActiveThumb() {
    thumbsEl.querySelectorAll('.lightbox-thumb').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index)
    })
  }

  function show(i) {
    index = (i + items.length) % items.length
    const item = items[index]
    imgEl.src = item.src
    imgEl.alt = item.alt
    captionEl.textContent = item.caption
    counterEl.textContent = `${index + 1} / ${items.length}`
    if (thumbsBuilt) updateActiveThumb()
    btnPrev.disabled = items.length <= 1
    btnNext.disabled = items.length <= 1
  }

  function open(i) {
    lastFocus = document.activeElement
    buildThumbs()
    show(i)
    lightbox.hidden = false
    lightbox.setAttribute('aria-hidden', 'false')
    document.body.classList.add('lightbox-open')
    btnClose.focus()
  }

  function close() {
    lightbox.hidden = true
    lightbox.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('lightbox-open')
    imgEl.removeAttribute('src')
    if (lastFocus instanceof HTMLElement) lastFocus.focus()
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', () => open(i))
  })

  thumbsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.lightbox-thumb')
    if (!btn) return
    show(Number(btn.dataset.index))
  })

  btnClose.addEventListener('click', close)
  backdrop.addEventListener('click', close)
  btnPrev.addEventListener('click', () => show(index - 1))
  btnNext.addEventListener('click', () => show(index + 1))

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return
    if (e.key === 'Escape') close()
    if (e.key === 'ArrowLeft') show(index - 1)
    if (e.key === 'ArrowRight') show(index + 1)
  })

  // Defer gallery image decode until section is near viewport
  const gallery = document.querySelector('.gallery-section')
  if (gallery && 'IntersectionObserver' in window) {
    const imgs = gallery.querySelectorAll('img[loading="lazy"]')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const img = entry.target
          io.unobserve(img)
        })
      },
      { rootMargin: '200px 0px' }
    )
    imgs.forEach((img) => io.observe(img))
  }
})()
