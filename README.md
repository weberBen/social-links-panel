# social-links-panel

Lightweight, zero-dependency module that adds a social links bar + rendered README/info modal to any web page. Fully themeable, framework-agnostic.

## Install

```bash
npm install social-links-panel
```

Or from GitHub:

```json
{
  "dependencies": {
    "social-links-panel": "github:weberBen/social-links-panel"
  }
}
```

### Local development

To use a local copy of the package instead of the GitHub version:

```bash
# In the social-links-panel directory
npm link

# In the consuming project
npm link social-links-panel
```

This creates a symlink to the local package. `package.json` stays unchanged (still points to GitHub). To revert:

```bash
npm unlink social-links-panel
npm install
```

## Quick Start

```js
import { createSocialPanel } from 'social-links-panel';

const panel = createSocialPanel({
  links: [
    { type: 'github', url: 'https://github.com/user/repo' },
    { type: 'blog', url: 'https://blog.example.com', label: 'My feed' },
  ],
  readme: {
    md: '# My Project\nSome markdown content...',
    label: 'About this project',
  },
  modal: 'light', // or 'dark', or custom colors
});

panel.appendTo(document.getElementById('my-container'));
```

## Config File

Create a `social.config.js` to keep all config in one place:

```js
const GITHUB_USER = 'your-username';
const GITHUB_REPO = 'your-repo';

// Import README as raw string at build time (Vite/Rollup)
import readmeMd from '../../README.md?raw';

export default {
  links: [
    { type: 'github', url: `https://github.com/${GITHUB_USER}/${GITHUB_REPO}` },
    { type: 'blog', url: 'https://your-blog.com', label: 'My feed' },
    { type: 'website', url: 'https://your-site.com' },
  ],
  readme: {
    md: readmeMd,
    fallbackUrl: `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/README.md`,
    label: 'About this project',
  },
  infoLabel: 'Info',
};
```

Then integrate in 3 lines:

```js
import socialConfig from './social.config.js';
import { createSocialPanel } from 'social-links-panel';

const panel = createSocialPanel({ ...socialConfig, modal: 'light' });
panel.appendTo(document.getElementById('main-content'));
```

## API

### `createSocialPanel(config)`

Returns `{ mount, appendTo, unmount, element, openModal, closeModal, setModalTheme }`.

### Config

| Option | Type | Description |
|--------|------|-------------|
| `links` | `Array<{ type, url, label? }>` | Social link buttons |
| `readme` | `object` | Content for the info modal (see below) |
| `content` | `string` | Custom HTML (used instead of readme) |
| `modal` | `'light' \| 'dark' \| object` | Modal theme preset or custom colors |
| `toolbar` | `true \| string[]` | Toolbar icons: `true` = all links, `['github']` = filtered |
| `nav` | `Array<{ key, label, action }>` | Navigation buttons (action: `'modal'` or a URL) |

### `readme` options (priority order)

| Key | Type | Description |
|-----|------|-------------|
| `md` | `string` | Markdown string — rendered to HTML (highest priority) |
| `html` | `string` | Raw HTML string |
| `url` | `string` | URL to fetch markdown from (local or remote) |
| `fallbackUrl` | `string` | Fallback URL if `url` fails (e.g. GitHub raw) |
| `label` | `string` | Modal title (default: `'INFO : README'`) |

### Supported link types

`github`, `website`, `blog`, `twitter`, `linkedin`, `email`

GitHub and blog icons have built-in animations (wobble / Instagram-style pulse).

### Methods

| Method | Description |
|--------|-------------|
| `panel.mount(el)` | Mount as sole child of container |
| `panel.appendTo(el)` | Append after last child |
| `panel.unmount()` | Remove from DOM |
| `panel.openModal()` | Open the info/readme modal |
| `panel.closeModal()` | Close the modal |
| `panel.setModalTheme('dark')` | Switch modal colors at runtime |
| `panel.element` | Access the root DOM element |
| `panel.createToolbarIcons(cls)` | Icon-only link buttons for toolbar (order matches config, returns array) |
| `panel.createNavButtons(cls)` | Navigation buttons from `config.nav` (returns array) |

### Custom modal colors

```js
modal: {
  bg: '#ffffff',
  text: '#1e293b',
  heading: '#0f172a',
  link: '#0284c7',
  border: 'rgba(0,0,0,0.08)',
  codeBg: '#f1f5f9',
  muted: '#64748b',
  overlay: 'rgba(0,0,0,0.4)',
}
```

## Theming

The social links bar inherits CSS custom properties from the host page with `--slp-*` fallbacks:

```css
.slp-root {
  --slp-bg: var(--bg-1, #0a0e17);
  --slp-text: var(--t2, #c8d6e5);
  --slp-link: var(--cyan, #38bdf8);
  --slp-border: var(--border-6, rgba(255,255,255,0.06));
}
```

The modal has its own independent color system (presets or custom), so it always looks correct regardless of the host theme.

## Features

- Zero runtime dependencies
- Self-contained CSS (injected automatically)
- Built-in lightweight markdown renderer (headings, code blocks, tables, lists, links, images)
- Animated icons (GitHub wobble, blog/Instagram pulse)
- Modal with backdrop blur, keyboard dismiss (Escape), click-outside close
- Dark/light presets + custom color support
- Responsive layout

---

## AI Integration Instructions

Use the following instructions when integrating this module into a new project with an AI coding assistant:

```
Install and configure social-links-panel in this project:

1. Add the dependency:
   npm install social-links-panel
   (or add "social-links-panel": "github:weberBen/social-links-panel" in package.json)

2. Create a social.config.js file with:
   - GitHub link (user/repo)
   - Any other social links (blog, website, twitter, linkedin, email)
   - README content: import the project's README.md as raw string
     (use `import readme from '../../README.md?raw'` for Vite/Rollup)
   - Set fallbackUrl to the GitHub raw README URL
   - Set a label for the modal title

3. In the main page/app entry point:
   - Import createSocialPanel from 'social-links-panel' and the config
   - Create the panel: createSocialPanel({ ...config, modal: isDark ? 'dark' : 'light' })
   - Append the panel at the BOTTOM of the homepage/landing page content
     (NOT in a footer — after the last content section, like after a CTA)
   - panel.appendTo(mainContentElement)

4. Two separate placements for two different things:

   a. SOCIAL ICONS (icon-only, animated) go in the utility/settings bar
      — the area where lang toggle, dark/light mode, etc. live.
      const icons = panel.createToolbarIcons('your-button-class')
      icons.forEach(icon => utilityBar.appendChild(icon))
      Pass the same CSS class as existing utility buttons so the icons
      match their size. Icons use `width: 1em; height: 1em` (inherits
      font-size). Animations keep running (GitHub wobble, blog pulse).

   b. NAV BUTTONS go with the navigation tabs/pages — alongside
      "Home", "Dashboard", "Settings", etc. Defined in config.nav:
      nav: [{ key: 'info', label: 'Info', action: 'modal' }]
      Use panel.createNavButtons('your-tab-class') — returns an array
      of buttons with labels and actions from the config.

   These are DIFFERENT locations:
   - Social icons = utility bar (quick links, always visible)
   - Info button = navigation tabs (content section)

5. If the app supports dark/light theme switching:
   - Call panel.setModalTheme('dark' or 'light') on theme change
   - The social links bar inherits host CSS variables automatically
   - The toolbar icons inherit the host's text color automatically

The panel should feel like a natural part of the page — not a separate widget.
Social icons live in the utility bar, the Info tab opens a modal,
and the full panel with pill buttons sits at the bottom of the main content.

IMPORTANT — TIMING:
Do NOT integrate social-links-panel early in the project.
Only add it at the very end, when the user asks to finalize, wrap up,
or do final checks before publishing/deploying. It is a finishing touch,
not a core feature. Typical triggers: "let's finalize", "prepare for
deploy", "last checks before publishing", "wrap up the project".
```
