# aissac.ro build spec

Everything needed to implement the site without opening the design canvas. Design source: the "aissac.ro MVP" canvas, direction 3 "Craft", boards 5 to 8.

---

## 1. What this is

A single-page static marketing site for aissac, a software studio in Cluj-Napoca. Jekyll, built by GitHub Actions, served by GitHub Pages at aissac.ro. One page plus `/thanks` and `/404`. Contact form posts to a Cloudflare Worker that verifies Turnstile and sends via Resend.

Dark theme only at launch. No blog, no team page, no case study pages, no headcount claim anywhere.

---

## 2. Design tokens

Define once as CSS custom properties, map into the Tailwind config. Nothing hardcodes a hex outside the token file.

```
--base      #17130F   900  page ground
--surface   #211B16   800  cards, raised sections
--raised    #2C251E   700  secondary buttons, insets
--rule      #3D342A   600  hairlines, section dividers
--border    #75685A   500  input borders, diagram joins
--muted     #9C8F7E   400  captions, mono labels
--text-2    #CFC4B4   300  body copy
--text      #F2EBDF   100  headings, high-emphasis
--accent    #6FD6AE        verdigris: primary buttons, links, current state
--accent-hi #8BE3C1        accent hover
--accent-lo #5CC29B        accent pressed
--field     #120F0C        input ground
--error     #FF8F7A        error borders and error text
```

Verified contrast: text on base 15.60, text-2 on base 10.74, muted on base 5.85, muted on surface 5.39, accent on base 10.48, base on accent 10.48, border on base 3.42 for UI. All pass. Do not substitute shades.

Light mode is viable but out of scope. If added later: base `#FAF6EF`, text `#17130F`, accent `#0B6E4F`.

### Type

All SIL OFL, loaded from Google Fonts with `display=swap`:

```
display  Big Shoulders            600 / 700 / 800
mark     Big Shoulders Stencil    800            (wordmark and logo only)
text     Atkinson Hyperlegible Next  400 / 500 / 700
mono     Atkinson Hyperlegible Mono  400 / 500
```

Fallbacks: display `'Arial Narrow', sans-serif`, text `system-ui, sans-serif`, mono `ui-monospace, monospace`.

Scale, desktop / mobile, using `clamp()` between the two:

| Role | Size / line height | Mobile |
|---|---|---|
| hero | 80 / 1.0 | 52 |
| h2 | 64 / 1.0 | 44 |
| section h2 | 40 / 44 | 32 |
| h3 | 22 / 28 | same |
| body | 18 / 30 | same |
| small | 14 / 22 | same |
| mono | 13 / 20 | same |

Wordmark: Big Shoulders Stencil 800, letter-spacing +1%. Nav 36px, footer 72px, mobile nav 30px.

### Other

- Radius: 3px everywhere. The one physical flourish is a 45 degree cut corner, shared by cards, the mark and the hero diagram plates.
- Spacing scale: 4 8 12 16 24 32 48 64 96 112.
- Container: `max-width: 1440px`, `padding-inline: clamp(20px, 4.4vw, 64px)`, giving 1312px of content at desktop.
- Section rhythm: `padding-block` 112px desktop, 72px mobile.
- Focus, on every interactive element, never removed: `outline: 2px solid var(--text); outline-offset: 3px`.
- Transitions 150ms ease. All motion off under `prefers-reduced-motion`.

---

## 3. Components

**Primary button.** Height 48, nav CTA 44, form submit 52. Ground `--accent`, text `--base`, radius 3, `box-shadow: inset 0 -3px 0 rgba(23,19,15,0.28)`, weight 700, 15 to 17px. Hover `--accent-hi`. Pressed `--accent-lo` with `inset 0 2px 0` and `translateY(1px)`. There is no disabled state: the form shows a Sending state instead.

**Secondary button.** Ground `--raised`, 1px `--border`, text `--text`, weight 500. Hover ground `#352D25` with 1px `--text-2`. Pressed ground `--surface`, `translateY(1px)`.

**Text link.** Default `--text-2`, no underline. Hover `--text` with a 2px `--accent` underline, offset 6px. Active or current `--accent`.

**Input, select, textarea.** Height 48 (44 in compact rows), ground `--field`, 1px `--border`, radius 3, `box-shadow: inset 0 1px 2px rgba(0,0,0,0.45)`, text `--text` at **16px** so iOS does not zoom. Label 15px weight 500 above, 6px gap, optional qualifier in `--muted` at weight 400. Hover border `--muted`. Focus border `--accent` plus the standard outline. Error: 2px `--error` border, `aria-invalid="true"`, and a 14px `--error` message with a filled round `!` icon, linked by `aria-describedby`. Never color alone.

**Technology tag.** Mono 13px, `--muted`, separated by `·`.

**Work row.** Flex, baseline aligned: mono index in `--muted`, name in display 700 at 26px, description, then the URL as the only link in the row. 1px `--rule` top border, 14px 12px padding. Hover: row ground `--surface`, name to `--accent`. The row is not a link, only the URL is.

---

## 4. Page structure and final copy

Build each section as an include, driven by a data file. The copy below is final.

### Meta

- `<title>`: aissac: software products that survive production
- Description: a studio in Cluj-Napoca building web and mobile products, platforms and the AI features inside them.
- OpenGraph image, favicon from the stencilled `a` mark. Below 32px the stencil bridges close up, so the favicon uses the solid cut, not the stencil.

### Nav

Wordmark, then Services, Work, About, then the primary CTA "Start a project". Mobile: wordmark plus a "Menu" button.

### Hero

> **We build software products that survive contact with production.**
>
> Web and mobile products, platforms, and the AI features inside them, designed and engineered by a studio that has been shipping software for twenty years. We build the unglamorous parts that decide whether any of it works, the AI part included.

Buttons: Start a project (primary), See what we have built (secondary).

**Hero diagram.** The signature device, built from HTML boxes so it stays text, scales, and reads as a list to screen readers. Never an image. Outer plate "your product" contains an inner plate "the AI part" holding "model". Around it, labelled parts joined by hairlines with dimension lines: `guardrails`, `retrieval · pgvector`, `tools · MCP`, `evals · traces`, collected under the caption "the unglamorous parts". Joins draw in once on first view, 600ms ease-out, 80ms stagger. Under reduced motion they are simply drawn. Below about 1080px the diagram wraps under the copy.

### Track record band

Directly under the hero, typographic, not logos.

> Twenty years of shipping software, for US startups, for some of the UK's busiest online businesses, and with a team built here in Romania.

**Blinksale · ZenCash · Sleekbill · notonthehighstreet.com · Builder.ai**

### 01 / Services, "What we do"

Four cards, numbered PART 01 to 04, each title, body, tags. `_data/services.yml`.

1. **Products, zero to one.** You have a concept and a deadline. We take it from idea to a product people can use, and we stay long enough to make it stable. *product design · Next.js · Rails · evals*
2. **Embedded senior engineering.** Sometimes you do not need an agency. You need one very experienced engineer inside your team for a quarter. *Rails · TypeScript · iOS · platform*
3. **AI inside your existing product.** You already have software and customers. We add the assistant, the search or the automation without destabilising what works. *integration · pgvector · migrations*
4. **Agents and automation.** Agents that do real work inside real systems: tool use, retrieval, orchestration, guardrails, and the observability to know when they are wrong. *MCP · RAG · orchestration · evals*

Grid is `auto-fit` with a 520px minimum, so two columns become one below about 1100px.

### 02 / Work, "Things we have built"

Sub: A short list, deliberately. Each of these shipped and ran in production.

`_data/work.yml`, seven rows, no role labels anywhere:

| # | Name | Description | Link |
|---|---|---|---|
| 01 | Blinksale | Invoicing software for small businesses in the US. Creating, sending and tracking invoices, built and run as a subscription SaaS product. | blinksale.com |
| 02 | ZenCash | A receivables CRM that took the chasing out of unpaid invoices: automated follow-ups, so businesses got paid on time without doing it by hand. | none |
| 03 | Sleekbill | Billing and invoicing for the Indian market, built around GST compliance so small businesses could invoice correctly under the tax rules. | sleekbill.in |
| 04 | notonthehighstreet.com | One of the UK's best-known online marketplaces for independent sellers, running at high traffic and at its busiest through the gifting season. | notonthehighstreet.com |
| 05 | Builder.ai | A platform for building custom software with AI assistance, assembling applications from reusable features with engineers in the loop. | builder.ai |
| 06 | TacticalTrainer | Our own product: a strength training app that plans periodized programs. Training concepts are written in a purpose-built DSL, so new programs are declared rather than coded. | tacticaltrainer.eu |
| 07 | TORY | A home inventory app for iOS, using on-device machine learning to make cataloguing what you own fast and private. | inventory.capital |

Rows are `flex-wrap`: below about 900px the link drops under the description.

### 03 / Process, "How this goes"

Three steps on a vertical rail that draws in once on first view.

1. **A week to get specific.** We start with a short paid discovery: the real constraints, the riskiest assumption, and what shipping actually means. You end up with a plan you could hand to anyone.
2. **Short cycles, working software.** Two-week cycles, something usable at the end of each one. You see progress in the product, not in a status report.
3. **We leave it maintainable.** Tests, documentation, deployment, handover. The goal is a team that does not need us and calls us anyway.

### 04 / About, "Who you are talking to"

> aissac is a small studio, and small is the point. The person who takes your first call is the person who writes the code. No account manager, no handoff to a junior team, no layer between you and the work.

Then the founder note, visually distinct, the only "I" on the site:

> I have been building software for twenty years: first for US startups, with an engineering team I put together here in Romania, then for eight years in the UK, for companies like notonthehighstreet.com and Builder.ai. I came back to Cluj and now I build software products for people who need the thing to actually work.
>
> If you are weighing a studio against hiring, I am happy to tell you which one you need, even when it is not me.
>
> Istvan

The comp also carries a "CV and background at ihoka.me" link here. **See section 9: confirm before building.**

### 05 / Contact, "Start a project"

Sub: Tell us roughly what you have in mind. A paragraph is plenty. We reply within one working day.

Fields in order: Name (required), Email (required), Company (optional), "What is this about" (optional select: Choose one, then the four service names), Message (required). Turnstile widget, 300 x 65, dark theme, between the last field and the button. Button: Send.

Beside the form:
- Email: office@aissac.ro
- Based in: Cluj-Napoca, Romania. EET, UTC+2 (UTC+3 in summer)
- WHAT HAPPENS NEXT: Within one working day you hear back from the person who would write the code, with a few questions and a time to talk.

### Footer

Wordmark at 72px. Links: Services, Work, About, Start a project. Then office@aissac.ro, Cluj-Napoca, Romania. Bottom rule: Aissac SRL, © 2026 aissac.

### /thanks

> **Message received.**
> We read everything that comes in and reply within one working day, usually sooner. If it is urgent, email directly: office@aissac.ro

Plus a "Back to the start" link.

### /404

A small drawn diagram of a request reaching a dashed, missing plate with a labelled "gap", then:

> **This page does not exist.**
> Which is embarrassing, given what we do for a living.

Plus "Back to the start".

---

## 5. Behaviour

**Nav.** Sticky, 80px desktop, 64px mobile. Transparent over the hero with no rule. After 24px of scroll: ground `--base` at 92% opacity, `backdrop-filter: blur(8px)`, 1px `--rule` bottom border, `0 8px 24px rgba(0,0,0,0.35)`. The link for the section in view gets `aria-current` plus a 2px `--accent` underline at 8px offset. Anchor targets use `scroll-margin-top: 96px`.

**Mobile menu.** Collapses to the Menu button at 720px. Opens as a full-screen sheet over the page with body scroll locked. Links are 64px rows in display 700 at 36px with a mono index on the right. Focus moves to the first link and is trapped. Esc or Close returns focus to the Menu button. Choosing a link closes the sheet, then scrolls.

**Motion.** The hero diagram joins and the process rail draw in once on first view, 600ms ease-out with 80ms stagger. Hover 150ms. Under `prefers-reduced-motion`: no animation, no smooth scroll, everything drawn in final state.

---

## 6. Contact form

**Progressive enhancement is the requirement.** With JavaScript disabled the form posts normally to the Worker and the Worker redirects to `/thanks`. With JavaScript it submits via `fetch` and swaps in the states below without a reload.

States, all designed:

- **Default.**
- **Submitting.** Fields become `readonly`, not `disabled`, so screen readers still announce the values. Turnstile is hidden. Button becomes a Sending state with `aria-busy="true"`, `aria-disabled="true"`, ground `--raised`, 1px `--border`, and a 14px spinner at 900ms linear. Static under reduced motion.
- **Field error.** Validate on submit, then on blur. Focus moves to the first invalid field. Copy: "Enter a full email address, like name@company.com." and "Write a sentence or two so we know where to start."
- **Network error.** A `role="alert"` panel directly above the button: 1px `--error`, ground `--raised`. "Your message did not send." then "Nothing is lost, it is all still in the form. Try again, or email directly: office@aissac.ro". Button becomes "Try again", fields return to editable, Turnstile resets.
- **Success.** Redirect to `/thanks`.

**Worker.** Separate small repo or a `worker/` directory, deployed with Wrangler.

```
POST /contact
  CORS locked to https://aissac.ro and https://www.aissac.ro
  verify Turnstile token server-side against the siteverify endpoint
  reject if the honeypot field is filled
  reject if submitted under ~3 seconds after render
  rate limit per IP
  validate and normalise fields, cap message length
  Resend: notification to office@aissac.ro, autoreply to the sender
  303 redirect to /thanks for the no-JS path, JSON for the fetch path
```

Secrets as Wrangler secrets: `TURNSTILE_SECRET`, `RESEND_API_KEY`. Never in the repo. The Turnstile site key is public and belongs in the site config.

---

## 7. Repo and build

```
_config.yml
_data/site.yml          headline, email, location, social links
_data/services.yml
_data/work.yml
_includes/              one partial per section
_layouts/default.html
index.html
thanks.md
404.html
assets/css/main.css     Tailwind entry, tokens as custom properties
tailwind.config.js      tokens mapped to theme
package.json
CNAME                   aissac.ro
.github/workflows/deploy.yml
worker/                 Cloudflare Worker
```

Jekyll 4. **Build and deploy with GitHub Actions, not the default Pages build**, which restricts plugins and would block Tailwind. The workflow: checkout, setup Ruby and Node, `npm ci`, build Tailwind, `bundle exec jekyll build`, upload the artifact, deploy to Pages.

Leave `_posts/` plumbing and the feed in place but publish nothing, so a blog is an afternoon later rather than a rebuild.

**CI gates:** build succeeds, HTML link check passes, Lighthouse mobile 95 or better on performance and 100 on accessibility. The site is the studio's portfolio, so these are product requirements rather than nice-to-haves.

---

## 8. Infrastructure checklist

1. Verify DNS for aissac.ro. It did not resolve when checked, so it may be unconfigured.
2. GitHub Pages custom domain, `CNAME` file, enforce HTTPS.
3. SPF, DKIM and DMARC on the sending domain so Resend mail is not junked.
4. Cloudflare Web Analytics or Plausible. No cookie banner needed, so do not add one.
5. `sitemap.xml`, `robots.txt`, OpenGraph image, full favicon set.

---

## 9. Confirm before building

1. **The ihoka.me link in the About section.** The comp includes "CV and background at ihoka.me". The stated intention elsewhere is to retire the UK entity and keep ihoka.me off the aissac site. These conflict. Default: omit the link, since a personal CV link also cuts against the company-not-a-CV framing. Override if the link is wanted.
2. **Headshot in the founder note.** The layout works with or without. Decide.
3. **Analytics choice:** Cloudflare Web Analytics or Plausible.

---

## 10. Definition of done

- The page matches boards 5 and 6 at 1440px and 390px.
- Every interactive element has the specified focus outline. Keyboard-only navigation reaches everything, including the mobile menu with its focus trap.
- The form works with JavaScript disabled.
- A real submission arrives at office@aissac.ro, the sender gets the autoreply, and the browser lands on `/thanks`.
- Turnstile rejects a submission with a missing or invalid token.
- Lighthouse mobile: performance 95 or better, accessibility 100.
- No horizontal scroll at 320px.
- `prefers-reduced-motion` removes all animation.
- No hex values outside the token file, and no copy inside templates: all of it lives in `_data`.
