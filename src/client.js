/**
 * Persian RTL — browser half.
 *
 * Installs one global stylesheet, a direction resolver for chat prose and text
 * inputs, an Alt+R toggle, and the Settings section that edits the three
 * preferences. Everything is registered inside `apply` so unloading the plugin
 * (or the profile patch) removes every trace: stylesheet, listeners,
 * observer, document attributes, and the `dir` attributes it wrote.
 */

window.__ModuleLoader__.load({
  id: 'deepseek-rtl',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'settings.persianRtl'
    const PLUGIN_ID = 'deepseek-rtl'
    const STORAGE_KEY = 'dsh.persian-rtl.v1'

    /** Document-root attribute: the feature is on. */
    const HTML_RTL = 'data-dsh-rtl'
    /** Document-root attribute: the bundled Vazirmatn list leads the text stack. */
    const HTML_FONT = 'data-dsh-rtl-font'
    /** Written on every element this plugin changed, so cleanup restores exactly those. */
    const MARK = 'data-dsh-rtl-dir'

    /**
     * Paragraph-level blocks whose direction follows their own text. User
     * messages are inline runs inside the bubble, so the bubble is a block too;
     * list containers are blocks because their markers move with them.
     */
    const BLOCK_SELECTOR = 'p,li,blockquote,ul,ol,h1,h2,h3,h4,h5,h6,dd,dt,td,th,figcaption,summary,[data-message-bubble]'
    /** Editable text surfaces: the composer (Lexical), textareas, rich editors. */
    const INPUT_SELECTOR = '[data-composer-input],textarea,[contenteditable="true"]'
    /** Content that keeps its own direction: code, math, and anything opted out. */
    const SKIP_SELECTOR = 'pre,code,kbd,samp,.katex,.katex-display,math,[data-dsh-rtl-skip]'
    /** The conversation transcript, published by the Chat view. */
    const SCOPE_SELECTOR = '[data-chat-flow]'

    const RTL_RE = /[\u0591-\u07FF\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
    /** Latin letters and digits: the counterweight a right-to-left block is measured against. */
    const LATIN_RE = /[A-Za-z0-9]/
    const STRONG_RE = /[A-Za-z\u0591-\u07FF\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
    const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

    /** The header panel's width and the smallest gap it keeps from a window edge. */
    const PANEL_WIDTH = 272
    const PANEL_MARGIN = 8

    /** The bundled Vazirmatn face: `tools/build-client.mjs` inlines the base64 URL. */
    const RTL_CSS = `
@font-face {
  font-family: 'Vazirmatn';
  src: url("__VAZIRMATN_FONT_URL__") format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* Vazirmatn leads the text stack; the theme's own choice stays as the tail,
   so a character Vazirmatn lacks still resolves exactly as before. */
html[${HTML_FONT}] body {
  --dsw-font-family: 'Vazirmatn', var(--dsh-font-family-text, var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default);
}

/* Alignment follows the paragraph's own direction. Code, math, and opted-out
   content never inherit it. */
html[${HTML_RTL}] [${MARK}][dir='rtl'] {
  text-align: right;
}

/* The host sheet indents lists and quotes physically (padding/border on the
   left); a right-to-left block needs that gutter mirrored. */
html[${HTML_RTL}] :is(ul, ol)[${MARK}][dir='rtl'] {
  padding-left: 0;
  padding-right: 18px;
}

html[${HTML_RTL}] blockquote[${MARK}][dir='rtl'] {
  border-left: 0;
  border-right: 2px solid var(--dsw-alias-label-caption);
  padding-left: 0;
  padding-right: 14px;
}

html[${HTML_RTL}] :is(pre, code, kbd, samp) {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
}

html[${HTML_RTL}] :is(.katex, .katex-display, math) {
  direction: ltr;
  unicode-bidi: isolate;
}

/* The conversation header's toggle, sized and coloured like the host's own
   header icon buttons; the tinted state is the "on" reading. */
.dpr-header-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

@media (hover: hover) {
  .dpr-header-toggle:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
}

.dpr-header-toggle[data-on='true'] {
  color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-state-business-tertiary);
}

.dpr-header-toggle:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

/* The panel anchored to that control: the same elevated, translucent menu
   surface the host's own header popovers use, outside every header clip. */
.dpr-panel {
  position: fixed;
  z-index: 1100;
  box-sizing: border-box;
  width: 272px;
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
  padding: 12px 14px 14px;
  border: 0;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-elevation-prominent);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  color: var(--dsw-alias-label-primary);
  pointer-events: auto;
}

.dpr-panelHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dpr-panelTitle {
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}

.dpr-panelBody {
  display: flex;
  flex-direction: column;
}

.dpr-rowCompact {
  gap: 12px;
  padding: 10px 0;
}

.dpr-rowCompact .dpr-title {
  font-size: 13px;
  line-height: 20px;
}

.dpr-rowCompact .dpr-desc {
  font-size: 11px;
  line-height: 16px;
}
`
    const STYLE_TEXT = RTL_CSS

    const PAGE_CSS = `
.dpr-page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; color: var(--dsw-alias-label-primary); }
.dpr-heading { margin: 0; font-size: 16px; font-weight: 500; line-height: 24px; color: var(--dsw-alias-label-primary); }
.dpr-lead { margin: 0; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-tertiary); }
.dpr-card { display: flex; flex-direction: column; }
.dpr-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }
.dpr-row:last-child { border-bottom: none; padding-bottom: 2px; }
.dpr-rowText { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dpr-title { font-size: 14px; font-weight: 400; line-height: 22px; color: var(--dsw-alias-label-primary); }
.dpr-desc { font-size: 12px; font-weight: 400; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dpr-row[data-off='true'] .dpr-rowText { opacity: 0.55; }
.dpr-switch { box-sizing: border-box; position: relative; flex: 0 0 auto; width: 36px; height: 20px; padding: 2px; border: 0; border-radius: 999px; corner-shape: round; background: var(--dsw-alias-border-l3); cursor: pointer; }
.dpr-switch[aria-checked='true'] { background: var(--dsw-alias-brand-primary); }
.dpr-switch:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.dpr-switch:disabled { cursor: default; opacity: 0.5; }
.dpr-thumb { display: block; width: 16px; height: 16px; border-radius: 50%; corner-shape: round; background: var(--dsw-alias-label-primary-foreground); transition: transform 120ms ease; }
.dpr-switch[aria-checked='false'] .dpr-thumb { background: var(--dsw-alias-switch-thumb); }
.dpr-switch[aria-checked='true'] .dpr-thumb { transform: translate(16px); }
.dpr-preview { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-module-platform); }
.dpr-previewTitle { margin: 0; font-size: 12px; font-weight: 500; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dpr-sample { margin: 0; font-size: 13px; line-height: 1.95; color: var(--dsw-alias-label-primary); }
.dpr-sampleCode { margin: 0; padding: 6px 10px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-3); font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Consolas, monospace); font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-secondary); direction: ltr; unicode-bidi: isolate; text-align: left; }
.dpr-note { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dpr-kbd { display: inline-block; min-width: 18px; padding: 1px 5px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 16px; text-align: center; }
`

    // ---------------------------------------------------------------- prefs

    /** @returns {{enabled: boolean, force: boolean, font: boolean}} */
    function defaultPrefs() {
      return { enabled: true, force: false, font: true }
    }

    /** @returns the persisted preferences, or the defaults when storage is unreadable. */
    function loadPrefs() {
      try {
        if (typeof localStorage === 'undefined') return defaultPrefs()
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === null) return defaultPrefs()
        const parsed = JSON.parse(raw)
        return {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          force: parsed.force === true,
          font: typeof parsed.font === 'boolean' ? parsed.font : true,
        }
      } catch {
        return defaultPrefs()
      }
    }

    let prefs = loadPrefs()
    const listeners = new Set()

    /** @returns the current immutable preference snapshot. */
    function getSnapshot() {
      return prefs
    }

    /**
     * Subscribe to preference changes.
     * @param listener - called after every accepted change.
     * @returns the unsubscribe function.
     */
    function subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }

    /**
     * Store one change, re-apply it, and notify the Settings page.
     * @param patch - the fields to replace.
     */
    function updatePrefs(patch) {
      prefs = { ...prefs, ...patch }
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      } catch { /* a blocked storage only costs persistence */ }
      reconcile()
      for (const listener of [...listeners]) listener()
    }

    // --------------------------------------------------------------- panel

    /**
     * The header panel's visibility and viewport anchor. Presentation state:
     * it is never persisted and lives outside the preference snapshot.
     */
    let panel = { open: false, top: 0, right: 0 }
    const panelListeners = new Set()

    /** @returns the current panel snapshot. */
    function getPanelSnapshot() {
      return panel
    }

    /**
     * Subscribe to panel open/close changes.
     * @param listener - called after every change.
     * @returns the unsubscribe function.
     */
    function subscribePanel(listener) {
      panelListeners.add(listener)
      return () => { panelListeners.delete(listener) }
    }

    /**
     * Publish one panel state.
     * @param next - the replacement snapshot.
     */
    function setPanel(next) {
      panel = next
      for (const listener of [...panelListeners]) listener()
    }

    /**
     * Open the panel under its anchor button.
     * @param anchor - the toggle button, whose rect places the panel.
     */
    function openPanel(anchor) {
      if (!(anchor instanceof HTMLElement)) return
      const rect = anchor.getBoundingClientRect()
      const width = window.innerWidth
      // Align the panel's right edge to the button's, but never let a narrow
      // window push its left edge off screen.
      const right = Math.max(PANEL_MARGIN, Math.min(Math.round(width - rect.right), Math.round(width - PANEL_WIDTH - PANEL_MARGIN)))
      setPanel({ open: true, top: Math.round(rect.bottom + 8), right })
    }

    /** Close the panel. */
    function closePanel() {
      if (panel.open) setPanel({ open: false, top: 0, right: 0 })
    }

    // ------------------------------------------------------------ direction

    /**
     * Resolve a block's direction from how much of each script it carries.
     *
     * A bare "contains a right-to-left letter" rule flips an English answer
     * merely because it quotes one Persian word, and the bidi algorithm then
     * reorders every neutral character in that answer — arrows, dashes,
     * separators — so the line reads backwards. Weighing the two scripts keeps
     * a Persian paragraph right-to-left even when it opens with or names a
     * Latin product, while an English-dominant block stays left-to-right and
     * its arrows keep the order they were written in.
     * @param text - the block's text, code subtrees already removed.
     * @returns 'rtl' when right-to-left letters are at least as many as Latin
     * ones; 'ltr' otherwise.
     */
    function directionFor(text) {
      if (prefs.force) return 'rtl'
      let rtl = 0
      let latin = 0
      for (const character of text) {
        if (RTL_RE.test(character)) rtl += 1
        else if (LATIN_RE.test(character)) latin += 1
      }
      return rtl > 0 && rtl >= latin ? 'rtl' : 'ltr'
    }

    /**
     * Write one element's direction, remembering what it had first.
     * @param element - the element to change.
     * @param dir - the direction to publish.
     */
    function setDir(element, dir) {
      if (!element.hasAttribute(MARK)) {
        element.__dshRtlPreviousDir = element.getAttribute('dir')
        element.setAttribute(MARK, '')
      }
      if (element.getAttribute('dir') !== dir) element.setAttribute('dir', dir)
    }

    /**
     * Restore one element to the direction it had before this plugin touched it.
     * @param element - an element carrying the marker.
     */
    function unmark(element) {
      if (!element.hasAttribute(MARK)) return
      element.removeAttribute(MARK)
      const previous = element.__dshRtlPreviousDir
      delete element.__dshRtlPreviousDir
      if (previous === null || previous === undefined) element.removeAttribute('dir')
      else element.setAttribute('dir', previous)
    }

    /**
     * Read a block's text without its code and math subtrees, so a sentence
     * that opens with inline code is still judged by its own words.
     * @param element - the block.
     * @returns its text with the invisible direction marks removed.
     */
    function blockText(element) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let text = ''
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement
        if (parent !== null && parent.closest(SKIP_SELECTOR) !== null) continue
        text += node.nodeValue === null ? '' : node.nodeValue
      }
      return text.replace(INVISIBLE_RE, '')
    }

    /**
     * Resolve one block element inside the transcript.
     * @param element - a candidate block.
     */
    function markBlock(element) {
      const text = blockText(element).trim()
      if (text === '') {
        unmark(element)
        return
      }
      setDir(element, directionFor(text))
    }

    /**
     * Resolve a subtree that appeared (or changed) inside a transcript.
     * @param root - the added or changed element.
     */
    function scanElement(root) {
      if (!prefs.enabled) return
      if (!(root instanceof Element)) return
      if (root.closest(SCOPE_SELECTOR) === null) {
        // A newly mounted wrapper can hold the transcript itself.
        for (const scope of root.querySelectorAll(SCOPE_SELECTOR)) scanElement(scope)
        return
      }
      if (root.closest(SKIP_SELECTOR) !== null) return
      if (root.matches(BLOCK_SELECTOR)) markBlock(root)
      for (const element of root.querySelectorAll(BLOCK_SELECTOR)) {
        if (element.closest(SKIP_SELECTOR) === null) markBlock(element)
      }
    }

    /** Resolve every block in every mounted transcript. */
    function scanAll() {
      for (const scope of document.querySelectorAll(SCOPE_SELECTOR)) scanElement(scope)
    }

    /** Give editable surfaces their own first-strong-character direction. */
    function syncInputs() {
      for (const element of document.querySelectorAll(INPUT_SELECTOR)) {
        if (!(element instanceof HTMLElement)) continue
        if (element.closest(SKIP_SELECTOR) !== null) continue
        // A direction the host set itself is not ours to rewrite.
        if (element.hasAttribute('dir') && !element.hasAttribute(MARK)) continue
        setDir(element, directionForInput(element))
      }
    }

    /**
     * Read an editable surface's text.
     * @param element - a textarea, an input, or a contenteditable host.
     * @returns its value or text content.
     */
    function readInputText(element) {
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) return element.value
      return element.textContent === null ? '' : element.textContent
    }

    /**
     * Resolve an editable surface's direction as you type. Unlike a paragraph,
     * a draft is judged by its first strong character only, so an English
     * sentence in a Persian conversation does not jump the caret.
     *
     * A draft with no letter yet — a fresh composer, or one holding only
     * digits and punctuation — keeps the direction it already has, so the caret
     * does not hop to the other edge on the first key. A fresh composer starts
     * right-to-left: that is the text this page exists to write.
     * @param element - the editable surface.
     * @returns 'rtl' or 'ltr'.
     */
    function directionForInput(element) {
      if (prefs.force) return 'rtl'
      const text = readInputText(element).replace(INVISIBLE_RE, '')
      const first = STRONG_RE.exec(text)
      if (first !== null) return RTL_RE.test(first[0]) ? 'rtl' : 'ltr'
      const current = element.getAttribute('dir')
      return current === 'rtl' || current === 'ltr' ? current : 'rtl'
    }

    /** Restore every element this plugin changed. */
    function clearDirections() {
      for (const element of document.querySelectorAll('[' + MARK + ']')) unmark(element)
    }

    /** Publish the preferences on the document and re-resolve the page. */
    function reconcile() {
      const root = document.documentElement
      if (root === null) return
      root.toggleAttribute(HTML_RTL, prefs.enabled)
      root.toggleAttribute(HTML_FONT, prefs.font)
      if (prefs.enabled) {
        scanAll()
        syncInputs()
      } else {
        clearDirections()
      }
    }

    // ------------------------------------------------------------- observer

    const queue = new Set()
    let frame = 0

    /** Resolve everything queued since the last frame. */
    function flushQueue() {
      frame = 0
      const nodes = [...queue]
      queue.clear()
      if (!prefs.enabled) return
      for (const node of nodes) scanElement(node)
      syncInputs()
    }

    /**
     * Find the block a changed node belongs to, so a change inside inline
     * markup (`strong`, a link) re-resolves its paragraph rather than the
     * inline element alone.
     * @param node - an added node or a changed text node.
     * @returns the nearest block ancestor, else the element itself.
     */
    function nearestBlock(node) {
      const element = node instanceof Element ? node : node.parentElement
      if (element === null) return null
      return element.closest(BLOCK_SELECTOR) ?? element
    }

    /**
     * Queue one changed element for the next frame.
     * @param node - the added node or the parent of changed text.
     */
    function enqueue(node) {
      const block = node === null ? null : nearestBlock(node)
      if (block === null) return
      queue.add(block)
      if (frame === 0) frame = window.requestAnimationFrame(flushQueue)
    }

    /**
     * Watch the document for transcript changes.
     * @returns the connected observer.
     */
    function startObserver() {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'characterData') {
            enqueue(record.target)
            continue
          }
          // The parent too: a batch that only inserts text nodes has no
          // element among its added nodes.
          enqueue(record.target)
          for (const node of record.addedNodes) enqueue(node)
        }
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      return observer
    }

    // ------------------------------------------------------------ dictionaries

    const en = {
      nav: 'Persian RTL',
      title: 'Persian RTL',
      description: 'Persian and Arabic paragraphs read from the right. Every chat block follows its own first strong character, so English replies, code, and paths keep their natural direction.',
      enabledTitle: 'Right-to-left layout',
      enabledDesc: 'Aligns chat paragraphs, headings, and lists by their language, and lets the composer follow what you type.',
      forceTitle: 'Force right-to-left',
      forceDesc: 'Right-aligns every chat block and the composer, including replies that contain no Persian letters at all.',
      forceDisabledDesc: 'Turn on right-to-left layout first.',
      fontTitle: 'Vazirmatn font',
      fontDesc: 'Uses the bundled Vazirmatn variable font for interface and conversation text. Code keeps the code font.',
      previewTitle: 'Preview',
      previewRtl: 'این نمونهٔ متن فارسی است؛ از راست به چپ خوانده می‌شود و با فونت وزیرمتن نمایش داده می‌شود.',
      previewMixed: 'DeepSeek یک مدل زبانی است که کد را چپ‌چین نگه می‌دارد.',
      previewLtr: 'English text stays left-to-right, and so does everything the assistant calls code.',
      previewCode: 'const direction = "rtl" // code, paths, and terminal output stay LTR',
      codeNote: 'Code blocks, inline code, file paths, and terminal output are always left-to-right.',
      shortcutHint: 'toggles right-to-left layout anywhere in the app.',
      headerToggleAria: 'Right-to-left layout',
      enabledShort: 'Persian and Arabic paragraphs read from the right.',
      forceShort: 'Right-align every chat block, including English replies.',
      fontShort: 'Use the bundled Vazirmatn font.',
    }

    const zh = {
      nav: '波斯语 RTL',
      title: '波斯语 RTL',
      description: '波斯语与阿拉伯语段落从右向左阅读。每个聊天块按自身首个强字符决定方向，因此英文回复、代码和路径保持原有方向。',
      enabledTitle: '从右到左排版',
      enabledDesc: '按语言对齐聊天段落、标题和列表，输入框也会跟随你输入的内容。',
      forceTitle: '强制从右到左',
      forceDesc: '把所有聊天块与输入框都设为右对齐，包括完全不含波斯语的回复。',
      forceDisabledDesc: '请先开启从右到左排版。',
      fontTitle: 'Vazirmatn 字体',
      fontDesc: '界面与对话文本使用内置的 Vazirmatn 可变字体，代码仍使用代码字体。',
      previewTitle: '预览',
      previewRtl: 'این نمونهٔ متن فارسی است؛ از راست به چپ خوانده می‌شود و با فونت وزیرمتن نمایش داده می‌شود.',
      previewMixed: 'DeepSeek یک مدل زبانی است که کد را چپ‌چین نگه می‌دارد.',
      previewLtr: 'English text stays left-to-right, and so does everything the assistant calls code.',
      previewCode: 'const direction = "rtl" // code, paths, and terminal output stay LTR',
      codeNote: '代码块、行内代码、文件路径与终端输出始终保持从左到右。',
      shortcutHint: '可在应用任意位置切换从右到左排版。',
      headerToggleAria: '从右到左排版',
      enabledShort: '波斯语与阿拉伯语段落从右向左阅读。',
      forceShort: '把所有聊天块（含英文回复）设为右对齐。',
      fontShort: '使用内置的 Vazirmatn 字体。',
    }

    let boundTranslate = () => ''

    // ------------------------------------------------------------------- UI

    /**
     * One preference row with its switch.
     * @param props - title, description, checked state, and the change callback.
     * @returns the row.
     */
    function Row(props) {
      const titleId = React.useId()
      const title = props.title
      return h('div', { className: props.compact === true ? 'dpr-row dpr-rowCompact' : 'dpr-row', 'data-off': props.disabled === true ? 'true' : undefined },
        h('div', { className: 'dpr-rowText' },
          h('div', { className: 'dpr-title', id: titleId }, title),
          h('div', { className: 'dpr-desc' }, props.description),
        ),
        h('button', {
          type: 'button',
          className: 'dpr-switch',
          role: 'switch',
          'aria-checked': props.checked,
          'aria-labelledby': titleId,
          disabled: props.disabled === true,
          onClick: () => { props.onChange(!props.checked) },
        }, h('span', { className: 'dpr-thumb' })),
      )
    }

    /**
     * The Settings page for the three preferences.
     * @param props - the shell's section props and the locale reader.
     * @returns the page.
     */
    function PersianRtlSection(props) {
      const t = typeof props.t === 'function' ? props.t : boundTranslate
      const state = React.useSyncExternalStore(subscribe, getSnapshot)
      // The preview shows what the current rules do to each sample, so switching
      // Force or the layout off is visible without leaving the page.
      const sampleDir = text => (state.enabled ? directionFor(text) : 'ltr')
      return h('div', { className: 'dpr-page' },
        h('h2', { className: 'dpr-heading' }, t('title')),
        h('p', { className: 'dpr-lead' }, t('description')),
        h('div', { className: 'dpr-card' },
          h(Row, {
            title: t('enabledTitle'),
            description: t('enabledDesc'),
            checked: state.enabled,
            onChange: value => { updatePrefs({ enabled: value }) },
          }),
          h(Row, {
            title: t('forceTitle'),
            description: state.enabled ? t('forceDesc') : t('forceDisabledDesc'),
            checked: state.force,
            disabled: !state.enabled,
            onChange: value => { updatePrefs({ force: value }) },
          }),
          h(Row, {
            title: t('fontTitle'),
            description: t('fontDesc'),
            checked: state.font,
            onChange: value => { updatePrefs({ font: value }) },
          }),
        ),
        h('div', { className: 'dpr-preview' },
          h('p', { className: 'dpr-previewTitle' }, t('previewTitle')),
          h('p', { className: 'dpr-sample', dir: sampleDir(t('previewRtl')), lang: 'fa' }, t('previewRtl')),
          h('p', { className: 'dpr-sample', dir: sampleDir(t('previewMixed')), lang: 'fa' }, t('previewMixed')),
          h('p', { className: 'dpr-sample', dir: sampleDir(t('previewLtr')), lang: 'en' }, t('previewLtr')),
          h('pre', { className: 'dpr-sampleCode' }, t('previewCode')),
          h('p', { className: 'dpr-note' }, t('codeNote')),
        ),
        h('p', { className: 'dpr-note' },
          h('span', { className: 'dpr-kbd' }, 'Alt'),
          h('span', null, '+'),
          h('span', { className: 'dpr-kbd' }, 'R'),
          h('span', null, t('shortcutHint')),
        ),
      )
    }

    /**
     * The bidirectional-text glyph: two opposed arrows, shared by the header
     * toggle and the Settings navigation row.
     * @param size - square edge in pixels.
     * @returns the SVG element.
     */
    function bidirectionalGlyph(size) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: 'false',
      },
        h('path', { d: 'M4 7h9' }),
        h('path', { d: 'M10 4l3 3-3 3' }),
        h('path', { d: 'M20 17h-9' }),
        h('path', { d: 'M14 14l-3 3 3 3' }),
      )
    }

    /**
     * The Settings navigation glyph for this section.
     * @param props - the requested size.
     * @returns the icon.
     */
    function PersianRtlIcon(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 16
      return bidirectionalGlyph(size)
    }

    /**
     * The conversation header's right-to-left control, seated beside the
     * header's More-actions button: it opens the settings panel and its tint
     * shows whether the layout is on.
     * @returns the header button.
     */
    function HeaderToggle() {
      const t = boundTranslate
      const state = React.useSyncExternalStore(subscribe, getSnapshot)
      const panelState = React.useSyncExternalStore(subscribePanel, getPanelSnapshot)
      const anchor = React.useRef(null)
      // A Session switch unmounts this seat; never leave the panel floating.
      React.useEffect(() => () => { closePanel() }, [])
      return h('button', {
        ref: anchor,
        type: 'button',
        className: 'dpr-header-toggle',
        'data-on': state.enabled ? 'true' : undefined,
        'data-persian-rtl-anchor': '',
        'aria-haspopup': 'dialog',
        'aria-expanded': panelState.open,
        'aria-label': t('headerToggleAria'),
        title: t('headerToggleAria'),
        onClick: () => {
          if (panelState.open) closePanel()
          else openPanel(anchor.current)
        },
      }, bidirectionalGlyph(16))
    }

    /**
     * The panel anchored to the header control: the same three switches the
     * Settings page owns, plus the shortcut. Mounted in `shell.overlay`, so no
     * header scroll container or clip can cut it off.
     * @returns the panel, or nothing while it is closed.
     */
    function HeaderPanel() {
      const t = boundTranslate
      const state = React.useSyncExternalStore(subscribe, getSnapshot)
      const panelState = React.useSyncExternalStore(subscribePanel, getPanelSnapshot)
      const surface = React.useRef(null)
      React.useEffect(() => {
        if (!panelState.open) return
        const onPointerDown = event => {
          const target = event.target
          if (!(target instanceof Element)) return
          if (surface.current !== null && surface.current.contains(target)) return
          if (target.closest('[data-persian-rtl-anchor]') !== null) return
          closePanel()
        }
        const onKeyDown = event => {
          if (event.key !== 'Escape' || event.defaultPrevented) return
          event.preventDefault()
          closePanel()
        }
        const onResize = () => { closePanel() }
        // Keyboard entry starts at the first switch, and closing returns focus
        // to the control that opened the panel.
        const first = surface.current === null ? null : surface.current.querySelector('button')
        if (first instanceof HTMLElement) first.focus({ preventScroll: true })
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('resize', onResize)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
          window.removeEventListener('resize', onResize)
          const active = document.activeElement
          if (surface.current !== null && active instanceof Node && surface.current.contains(active)) {
            const anchor = document.querySelector('[data-persian-rtl-anchor]')
            if (anchor instanceof HTMLElement) anchor.focus({ preventScroll: true })
          }
        }
      }, [panelState.open])
      if (!panelState.open) return null
      return h('div', {
        ref: surface,
        className: 'dpr-panel',
        role: 'dialog',
        'aria-label': t('title'),
        style: { top: panelState.top + 'px', right: panelState.right + 'px' },
      },
        h('div', { className: 'dpr-panelHead' },
          h('span', { className: 'dpr-panelTitle' }, t('nav')),
          h('span', { className: 'dpr-note' },
            h('span', { className: 'dpr-kbd' }, 'Alt'),
            h('span', null, '+'),
            h('span', { className: 'dpr-kbd' }, 'R'),
          ),
        ),
        h('div', { className: 'dpr-panelBody' },
          h(Row, {
            compact: true,
            title: t('enabledTitle'),
            description: t('enabledShort'),
            checked: state.enabled,
            onChange: value => { updatePrefs({ enabled: value }) },
          }),
          h(Row, {
            compact: true,
            title: t('forceTitle'),
            description: state.enabled ? t('forceShort') : t('forceDisabledDesc'),
            checked: state.force,
            disabled: !state.enabled,
            onChange: value => { updatePrefs({ force: value }) },
          }),
          h(Row, {
            compact: true,
            title: t('fontTitle'),
            description: t('fontShort'),
            checked: state.font,
            onChange: value => { updatePrefs({ font: value }) },
          }),
        ),
      )
    }

    // -------------------------------------------------------------- lifecycle

    /**
     * Mount the stylesheet and the live runtime.
     * @param ctx - the browser plugin context.
     */
    function installRuntime(ctx) {
      ctx.effect(() => {
        const global = document.createElement('style')
        global.dataset.plugin = PLUGIN_ID
        global.dataset.pluginCss = PLUGIN_ID + '/persian-rtl.css'
        global.textContent = STYLE_TEXT
        document.head.appendChild(global)
        const page = document.createElement('style')
        page.dataset.plugin = PLUGIN_ID
        page.dataset.pluginCss = PLUGIN_ID + '/settings.css'
        page.textContent = PAGE_CSS
        document.head.appendChild(page)
        return () => {
          global.remove()
          page.remove()
        }
      }, 'persian-rtl: stylesheets')

      ctx.effect(() => {
        reconcile()
        const observer = startObserver()
        const onKeyDown = event => {
          if (event.defaultPrevented || event.repeat) return
          if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
          if (event.code !== 'KeyR') return
          event.preventDefault()
          updatePrefs({ enabled: !prefs.enabled })
        }
        // A draft's direction follows what is being typed; composition stays
        // untouched so an IME is never interrupted.
        const onInput = event => {
          if (!prefs.enabled || event.isComposing === true) return
          const target = event.target
          if (!(target instanceof Element)) return
          const surface = target.closest(INPUT_SELECTOR)
          if (!(surface instanceof HTMLElement)) return
          if (surface.closest(SKIP_SELECTOR) !== null) return
          if (surface.hasAttribute('dir') && !surface.hasAttribute(MARK)) return
          setDir(surface, directionForInput(surface))
        }
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('input', onInput, true)
        return () => {
          observer.disconnect()
          document.removeEventListener('keydown', onKeyDown, true)
          document.removeEventListener('input', onInput, true)
          if (frame !== 0) {
            window.cancelAnimationFrame(frame)
            frame = 0
          }
          queue.clear()
          const root = document.documentElement
          if (root !== null) {
            root.removeAttribute(HTML_RTL)
            root.removeAttribute(HTML_FONT)
          }
          clearDirections()
        }
      }, 'persian-rtl: runtime')
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        boundTranslate = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'persian-rtl: dictionaries')
        installRuntime(ctx)
        // Utilities render in ascending order and the header's own More-actions
        // button follows them, so a high order seats this toggle right beside it.
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'persian-rtl',
          order: 100,
        }, HeaderToggle))
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'persian-rtl.panel',
          order: 60,
        }, HeaderPanel))
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'persian-rtl',
          order: 30,
          label: () => boundTranslate('nav'),
          locale: NS,
        }, PersianRtlSection))
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon',
          id: 'persian-rtl',
          order: 30,
        }, PersianRtlIcon))
      },
    }
  },
})
