# Copilot: First 10 Minutes Setup Guide

Get productive with GitHub Copilot in your first session. This guide walks you through installation, configuration, and your first real autocomplete.

---

## ⏱️ Timeline

| Step | Time | Task |
|------|------|------|
| 1 | 2 min | Install extension |
| 2 | 1 min | Sign in with GitHub |
| 3 | 1 min | Verify subscription |
| 4 | 2 min | Open a file & enable inline suggestions |
| 5 | 2 min | Write your first prompt (function or component) |
| 6 | 2 min | Accept/edit & test |

**Total: ~10 minutes**

---

## Step 1: Install (2 min)

### VS Code (recommended for first-timers)

1. Open **VS Code Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
2. Search **"GitHub Copilot"** (official, by GitHub)
3. Click **Install**
4. A notification appears: "GitHub Copilot — Sign in to use"
5. Restart VS Code if prompted

### JetBrains IDEs (IntelliJ, PyCharm, WebStorm, etc.)

1. Go **Settings → Plugins → Marketplace**
2. Search **"GitHub Copilot"**
3. Click **Install**
4. Restart the IDE

### Neovim

```bash
# Using vim-plug
Plug 'github/copilot.vim'

# Then in nvim:
:Copilot setup
```

---

## Step 2: Authenticate (1 min)

After installation, a sign-in prompt appears.

1. Click **Sign in to GitHub** (or press Ctrl+Shift+P → "Copilot: Sign In")
2. Browser opens → authorize `GitHub Copilot` to access your account
3. Click **Authorize github** (this just gives Copilot read access to your repos)
4. Copy the device code from the browser (or it auto-pastes)
5. Return to your editor — you'll see **"Authenticated"** in the status bar

---

## Step 3: Verify Your Subscription (1 min)

Copilot requires an active plan:

- **Copilot Individual** — $10/month or $100/year (personal projects)
- **Copilot Business** — $19/month/seat (work accounts)
- **Copilot Pro** — $20/month (expanded features, priority queue)
- **Free trial** — first 2 months at reduced rates

Check your plan:

1. Go to [github.com/settings/copilot](https://github.com/settings/copilot)
2. Look for **"Active subscription"** or **"Free trial"**
3. If none, start a trial or upgrade

**Offline setup note:** Copilot *requires* internet the first time (to validate your subscription), but can work offline briefly after that.

---

## Step 4: Open a File & Enable Inline Suggestions (2 min)

### Pick a file to edit

Go to a real project file you're comfortable modifying:

- **React/TypeScript:** `src/components/MyComponent.tsx` (perfect for this repo)
- **Python:** `app.py` or a test file
- **JavaScript:** `src/index.js` or a utility

### Enable inline suggestions (if not on by default)

1. **VS Code:** Settings (Ctrl+, / Cmd+,) → search "copilot"
2. Look for **"Copilot: Enable Inline Suggestions"** (should be ON by default)
3. If greyed out, click **Install** if a suggestion widget appears

You'll see a faint grey autocomplete preview as you type.

---

## Step 5: Write Your First Prompt (2 min)

### Example 1: Simple function (any language)

Go to an empty line in your file and **type a comment**:

```typescript
// Calculate the total price of items in a cart, applying a 10% discount if over $100
function calculateTotal(items: { price: number; quantity: number }[]) {
```

**Then stop typing and wait 1–2 seconds.** Copilot will suggest the full function.

### Example 2: React component (for this repo)

Open `src/components/` and type:

```typescript
// A card component that displays a property listing with image, address, price, and a "View Details" button
export function PropertyCard({ property }: { property: Property }) {
```

Copilot will fill in JSX.

### Example 3: Test (very popular)

```typescript
describe('calculateTotal', () => {
  it('should apply a 10% discount if total > 100', () => {
```

Copilot will write the test body.

---

## Step 6: Accept, Edit & Test (2 min)

### Accept a suggestion

- **Tab** — accept the full suggestion
- **Ctrl+Right Arrow** (VS Code) — accept word-by-word
- **Esc** — reject and dismiss

### See more suggestions

If the first suggestion isn't perfect:

1. Press **Ctrl+Enter** (VS Code) / **Cmd+Enter** (Mac)
2. A side panel shows **10 alternatives**
3. Click one to replace the current suggestion
4. Close the panel (Esc)

### Edit & refine

You don't have to accept everything as-is. Common workflow:

1. Accept the skeleton (Tab)
2. Edit the logic inline
3. Ask Copilot Chat to explain or improve it

Example:
```typescript
// Copilot wrote:
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
return total > 100 ? total * 0.9 : total;

// You notice the discount logic is correct ✅
// Accept it, then move on
```

### Run it

1. Save the file (Ctrl+S / Cmd+S)
2. Run your test suite or build:
   ```bash
   npm test
   npm run build
   ```
3. Fix any errors Copilot made (type safety, logic bugs, missing imports)

---

## ✅ Checkpoint: You're Done!

After 10 minutes, you should have:

- ✅ Copilot installed and signed in
- ✅ Inline suggestions enabled
- ✅ Written and accepted at least one piece of code
- ✅ Seen how the accept/reject workflow feels

---

## 🎯 Next: Level Up in 15 More Minutes

### Enable Copilot Chat

Chat mode is where Copilot becomes a true pair programmer.

1. **VS Code:** Click the **Copilot Chat** icon in the sidebar (speech bubble)
2. Or press **Ctrl+Shift+I** (VS Code) / **Cmd+Shift+I** (Mac)

### Try these chat prompts

On any file or code selection:

```
Explain this function to me like I'm new to the codebase
```

```
What tests should I write for this component?
```

```
How would you refactor this to reduce nesting?
```

```
What's the security risk in this code?
```

### Common chat commands

- `@workspace` — ask about your entire project structure
- `@file filename.tsx` — focus a specific file
- Select code, then ask a question — Copilot sees the context

---

## ⚙️ Recommended Settings

Go to **Settings** (Ctrl+, / Cmd+,) and search "copilot":

| Setting | Recommended |
|---------|-------------|
| `Copilot: Enable Inline Suggestions` | ✅ ON |
| `Copilot: Inline Suggest Show Completions` | `on-demand` (press Alt+\ to see) |
| `Copilot: Auto Closing Braces` | ✅ ON (if you trust autocomplete) |
| `Copilot: Language Models` | Set to your preferred model (GPT-4o is default) |

---

## 🚀 Pro Tips for This Repo

Since this is a **large TypeScript + React + Framer Motion** monolith:

### 1. Use entity context
When working on modules (M03, M05, M08, etc.), start with:
```
// Based on the canonical entity system in this repo (Property, Tenant, Lease, etc.),
// create a component that displays a [Lease | WorkOrder | SLA] with its state badge
```

### 2. Leverage module patterns
This codebase has strong patterns (glass cards, KPI ribbons, animation tokens). Ask Copilot to follow them:
```
// Create a new module widget following the pattern of Module06PropertyOps (KPI cards + table + drawer)
```

### 3. Test-first prompts
For a codebase this size, tests catch bugs early:
```
// Write a Vitest test for the useGraphLayout hook that validates the mode picker logic
```

### 4. Ask about design tokens
```
// Using trinityTokens and the CSS Layer 43 mobile-first setup, create a responsive table
```

---

## 🐛 Troubleshooting: First 10 Minutes

| Issue | Fix |
|-------|-----|
| "Sign in" button grayed out | Restart your editor |
| No inline suggestions appearing | Check `Copilot: Enable Inline Suggestions` in Settings |
| "Subscription expired" error | Visit [github.com/settings/copilot](https://github.com/settings/copilot) and renew |
| Very slow suggestions | Toggle `Copilot: Inline Suggest Show Completions` to `on-demand` (Alt+\) |
| Copilot suggests very wrong code | Provide better context (add types, write clear comments, select relevant code first) |

---

## 📚 Quick Reference

### Keyboard shortcuts (VS Code defaults)

| Action | Shortcut |
|--------|----------|
| Accept suggestion | Tab |
| Dismiss suggestion | Esc |
| See 10 suggestions | Ctrl+Enter |
| Open Chat | Ctrl+Shift+I |
| Ask about selection | Ctrl+I (with code selected) |
| Trigger suggestion manually | Alt+\ (or Ctrl+Alt+\ on some systems) |

### Keyboard shortcuts (Mac)

| Action | Shortcut |
|--------|----------|
| Accept suggestion | Tab |
| Dismiss suggestion | Esc |
| See 10 suggestions | Cmd+Enter |
| Open Chat | Cmd+Shift+I |
| Ask about selection | Cmd+I (with code selected) |
| Trigger suggestion manually | Opt+\ or Cmd+Opt+\ |

---

## 🎓 Learn by Doing

**Best way to master Copilot: use it on real work immediately.**

Start with:
1. **A bug you need to fix** — ask Copilot to explain the error
2. **A test you need to write** — let it draft the test
3. **A utility function** — let it generate, then review

Avoid:
- ❌ Trying to use Copilot on greenfield projects without context
- ❌ Accepting code you don't understand
- ❌ Skipping the review/test step

---

## Next Steps

- [ ] Complete steps 1–6 above
- [ ] Run `npm run build` to ensure no regressions
- [ ] Try Copilot Chat on a real issue from this repo
- [ ] Write one full feature using Copilot (component + test)
- [ ] Review the [Copilot Best Practices](https://docs.github.com/en/copilot/using-github-copilot/best-practices-for-using-github-copilot) guide

**Happy coding! 🚀**
