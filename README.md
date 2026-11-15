# deepseek-rtl

**Read and write Persian and Arabic naturally in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), without breaking English text or code.**

A right-to-left and Persian-typography plugin for the DeepSeek Harness Web UI (the Desktop app shows the same client). It installs as an ordinary Harness plugin, so removing it restores the interface exactly — nothing is patched into the application.

[فارسی](#فارسی) • [English](#english) • [Install](#install) • [Options](#options)

## English

### Features

- **Paragraphs that know their language.** A chat block that contains Persian or Arabic letters reads right-to-left — even when it opens with a Latin product name such as `DeepSeek` — while a block with no right-to-left letters stays left-to-right.
- **Lists and quotes that mirror.** A Persian list moves its markers and its gutter to the right, and a Persian blockquote moves its bar and padding to the right.
- **A composer that follows you.** The draft's direction comes from its first strong character as you type; an in-progress input-method composition is never interrupted.
- **Isolated code.** Fenced code blocks, inline code, keyboard glyphs, and math stay left-to-right inside right-to-left prose.
- **Bundled Vazirmatn.** The Vazirmatn variable font ships inside the package and loads offline. It leads the interface's text stack; the font you chose in **Settings → General** stays behind it.
- **A header panel.** A bidirectional-text button beside the conversation header's More-actions control opens the three switches, and `Alt` + `R` toggles the layout from anywhere.
- **Smart and forced modes.** Smart mode follows each block's language. Force mode right-aligns everything, including English replies to Persian questions.

### Install

Requires Node.js 18.17+ and an initialized DeepSeek Harness profile (open the app once).

```sh
npx deepseek-rtl
```

Then quit DeepSeek Harness and open it again. The plugin appears as **Persian RTL** in Settings, and the header button sits beside More actions in an open session.

The installer runs `pnpm add deepseek-rtl` inside your profile directory and selects the package in `dsh.profile.bundles` — the same two steps the Harness Plugin Manager performs. DeepSeek Harness Desktop ships pnpm, so a separate pnpm install is not needed.

Prefer the in-app route? Publish-independent alternatives:

- **Plugins → Add plugin** in the app, with the package name `deepseek-rtl`.
- Or from a terminal: `dsh plugin --profile desktop add deepseek-rtl`, then enable it in **Plugins**.

### Options

| Command | Description |
| :--- | :--- |
| `npx deepseek-rtl` | Install and enable the plugin in the profile |
| `npx deepseek-rtl --revert` | Remove it from the selection and from the profile |
| `npx deepseek-rtl --status` | Report the profile, the dependency, and the installed version |
| `npx deepseek-rtl --profile <name>` | Target another profile (default `$DSH_PROFILE`, else `desktop`) |
| `npx deepseek-rtl --home <dir>` | Use another DSH home (default `$DSH_HOME`, else `~/.dsh`) |
| `npx deepseek-rtl --from <dir>` | Install a local checkout instead of the npm package |

### Use

| Control | Default | What it does |
| :--- | :--- | :--- |
| Right-to-left layout | On | Any chat block containing Persian or Arabic letters reads right-to-left; the composer follows what you type. |
| Force right-to-left | Off | Right-aligns every chat block and the composer, including English-only replies. |
| Vazirmatn font | On | Uses the bundled Vazirmatn ahead of the interface text font. Code keeps the code font. |

The panel opens from the header button; click anywhere else or press `Escape` to dismiss. `Alt` + `R` toggles instantly.

The Session header's utilities row — and with it the header button — is hidden on a blank New Session. There, use `Alt` + `R` or the Settings page.

Preferences persist per browser origin in `localStorage` under `dsh.persian-rtl.v1`. Type size, line height, and your own font family stay in **Settings → General**.

### How it works

- `client.js` installs two global stylesheets and a `MutationObserver` that resolves `dir` on chat blocks inside `[data-chat-flow]` and on editable surfaces. A block is right-to-left when its text contains a right-to-left letter (code subtrees are ignored when sampling); a draft when its first strong character is right-to-left. Every element it changes carries `data-dsh-rtl-dir` plus its previous `dir`, so disabling the plugin restores the DOM.
- Direction rules live in CSS keyed off `html[data-dsh-rtl]`; `pre`, `code`, `kbd`, `samp`, and math are pinned to `direction: ltr` with `unicode-bidi: isolate`.
- The header button registers in `conversation.session.header.utilities`; its panel is a `shell.overlay` entry positioned from the button's rect, so no header clip can cut it off.
- The font is inlined as a `data:` URL, so the bundle works offline. `assets/Vazirmatn-Variable.woff2` is the source face, `assets/OFL.txt` its license.
- The Host half (`index.js`) is an empty `apply()`: every feature is browser-side.

### Development

```sh
npm run build     # regenerates client.js with the font inlined
npx . --from .    # install this checkout into your profile
```

Edit `src/client.js`, run the build, then restart DeepSeek Harness (or `--revert` first when replacing a published install).

### Limitations

- Styles the Web client only; native menus and dialogs outside the page are unaffected.
- The paragraph rule is "contains a right-to-left letter", so an English paragraph quoting one Persian word is right-aligned too.
- `Alt` + `R` is handled by the plugin, so it does not appear in **Settings → Keyboard shortcuts**.
- The installer edits the profile manifest directly; quit DeepSeek Harness first so the running app does not hold its own copy.

### License

MIT for the plugin. Vazirmatn is distributed under the SIL Open Font License 1.1 (`assets/OFL.txt`).

---

<div dir="rtl">

<a id="فارسی"></a>

## فارسی

**خواندن و نوشتن طبیعی فارسی و عربی در DeepSeek Harness، بدون به‌هم‌ریختن متن انگلیسی و کد.**

این یک پلاگین (bundle) رسمی‌شکل برای رابط وب DeepSeek Harness است — همان رابطی که اپ دسکتاپ نشان می‌دهد. فایلی از برنامه پچ نمی‌شود؛ با حذف پلاگین، رابط دقیقاً به حالت قبل برمی‌گردد.

### امکانات

- **جهت هوشمند:** هر بلوک چت که حرف فارسی یا عربی داشته باشد راست‌به‌چپ می‌شود، حتی اگر با نام لاتین مثل `DeepSeek` شروع شود؛ بلوک انگلیسی چپ‌چین می‌ماند.
- **لیست و نقل‌قول آینه‌ای:** نشانگر بولت‌ها و فاصلهٔ سمت چپ لیست، و خط و تورفتگی نقل‌قول، در متن فارسی به سمت راست منتقل می‌شود.
- **کامپوزر دنبال‌کنندهٔ متن:** جهت پیش‌نویس با اولین حرف قوی متن تعیین می‌شود و ترکیب IME قطع نمی‌شود.
- **کد ایزوله:** بلوک کد، کد درون‌خطی، کلیدها و فرمول‌ها همیشه چپ‌چین می‌مانند.
- **فونت وزیرمتن آفلاین:** فونت به‌صورت base64 داخل بسته است؛ فونت انتخابی شما در Settings → General هم پشت آن می‌ماند.
- **پنل در هدر:** دکمهٔ دو-جهته کنار More actions پنل سه‌سوییچه را باز می‌کند و `Alt` + `R` از همه‌جا toggle می‌کند.
- **حالت اجباری:** برای وقتی پاسخ دستیار انگلیسی است ولی می‌خواهید راست‌چین بماند.

### نصب

پیش‌نیاز: Node.js 18.17+ و یک پروفایل ساخته‌شده (یک‌بار برنامه را باز کنید).

```sh
npx deepseek-rtl
```

بعد از نصب، DeepSeek Harness را کامل ببندید و دوباره باز کنید. پلاگین در تنظیمات با نام **Persian RTL** دیده می‌شود و دکمه‌اش کنار More actions در هدر سشن می‌نشیند.

نصب‌کننده همان دو کاری را می‌کند که Plugin Manager می‌کند: `pnpm add` در پوشهٔ پروفایل و افزودن بسته به `dsh.profile.bundles`. pnpm داخل خود DeepSeek Harness Desktop هست، پس نیازی به نصب جداگانه ندارید.

### گزینه‌ها

| دستور | توضیح |
| :--- | :--- |
| `npx deepseek-rtl` | نصب و فعال‌سازی پلاگین در پروفایل |
| `npx deepseek-rtl --revert` | حذف کامل از پروفایل |
| `npx deepseek-rtl --status` | نمایش وضعیت نصب و نسخه |
| `npx deepseek-rtl --profile <name>` | پروفایل دیگر (پیش‌فرض `$DSH_PROFILE` یا `desktop`) |
| `npx deepseek-rtl --home <dir>` | پوشهٔ دیگر DSH (پیش‌فرض `$DSH_HOME` یا `~/.dsh`) |

### استفاده

Settings → **Persian RTL** سه سوییچ دارد: روشن/خاموش، حالت اجباری، و فونت وزیرمتن. پیش‌نمایش زیر سوییچ‌ها اثر هر تغییر را نشان می‌دهد. `Alt` + `R` همه‌جا کار می‌کند؛ در سشن خالی (New Session) که ردیف ابزارهای هدر پنهان است، از همین میانبر یا صفحهٔ تنظیمات استفاده کنید.

</div>
