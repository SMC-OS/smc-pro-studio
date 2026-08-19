# SMC Pro Studio UX direction

## Product direction amendment — 2026-08-19 (professional network pivot)

**Old emphasis (Phase 1–3 slices 1–3):** social-first discovery — a "premium social community" modelled loosely on consumer social apps, with Home as a content feed and Discover as a materials/people/inspiration browse surface.

**New locked emphasis, effective this amendment:** SMC Pro Studio is a **professional network and project collaboration platform for the built environment** — closer in spirit to LinkedIn (professional identity, networking, discovery, connections, credibility) and CompanyCam (project evidence, site photography, real work history) than to Instagram, while remaining an original SMC product. Content is not the product; the network and real-world work are the product.

This is a re-emphasis and re-labelling of the existing foundation, not a rebuild:
- The relational schema (`follows`, `connections`, `posts`, `post_media`, `comments`, `reactions`, `saved_posts`) already supports this direction as-is — no new migration is required for the Phase 3 professional-network foundation work.
- The reusable primitives, auth, bead/notch mobile nav, desktop rail, RLS foundations, and honest-state discipline all carry forward unchanged.
- What changes is information architecture, navigation labelling, screen purpose/copy, and feature prioritisation — see `tasks/plan.md`'s amendment section for the navigation/screen-hierarchy delta and `tasks/todo.md` for the re-ordered priority list.

**Core relationship model (mandatory, three distinct concepts):**
- **Follow** — unilateral, "I want to see this person/company's public work and updates." Implies no trust, access, or relationship.
- **Connect** — mutual request/accept, "I want to establish a professional relationship." States: none / requested / pending-incoming / connected.
- **Collaborate** — project-scoped participation with membership, roles, and permissions. Never conflated with Follow or Connect as an authorization concept.

**Primary journey:** Discover → Network → Connect → Project → Deliver (the existing SMC service journey — Design → Quote → Survey → Fabrication → Installation — nests inside "Project → Deliver").

**Primary navigation (mobile + desktop rail):** Home · Network · Create · Projects · Profile. Messages remains reachable contextually (header/profile/project/connection actions and a notification shortcut) rather than occupying a primary tab.

**What was "Discover" becomes "Network":** professional discovery — people, trades, companies — is the primary use of that surface, so it is renamed and reframed rather than duplicated. Materials/product discovery remains real but becomes a secondary, contextual surface (reachable from Home, Network, Projects, and search) instead of a primary tab. See the amendment section in `tasks/plan.md` for the concrete screen-hierarchy delta.

**Stories are de-emphasized**, reframed toward field/project updates ("Today on Site", "Material Arrival", "Installation Progress") rather than entertainment-style ephemeral content, and remain a secondary feature — not rebuilt into a Phase 4-style moderation system yet.

**Reactions/comments/saves remain but stay secondary** to professional identity, discovery, connections, and project evidence — never the product's centre of gravity, never gamified.

## Experience statement

SMC Pro Studio is where homeowners, trades and design professionals find each other, prove their work, discover materials and services, build professional relationships, and turn connections into real projects.

*(Superseded statement, kept for history — see amendment above: "SMC Pro Studio is a premium social community where people discover stone and architectural inspiration, connect with relevant professionals, and turn saved ideas into governed real-world projects.")*

## Information hierarchy

1. Show inspiring, truthful content.
2. Make the next useful action obvious.
3. Reveal project and professional complexity only in context.
4. Label unavailable integrations honestly.
5. Protect private project, quote, document, and conversation data by default.

## Visual direction

- Canvas: warm off-white/ivory, light stone surfaces, restrained mineral accents.
- Typography: dark charcoal, editorial display type used sparingly, highly legible body type.
- Cards: light borders and subtle elevation; content imagery carries richness.
- Motion: short and purposeful; honour reduced-motion preferences.
- Dark mode: token-ready but not the launch default.
- SMC identity: original material textures, spacing, and editorial composition; no copied social-brand chrome.

## Responsive composition

- Phone: one content column and five-item bottom navigation respecting safe-area insets.
- Tablet: adaptive two-column feed/discovery and navigation rail where appropriate.
- Desktop: navigation rail, primary content column, optional contextual panel; same routes and language.
- Composer/messages: remain usable with software keyboard open and enlarged text.

## Principal-screen acceptance criteria

| Screen | Must communicate | Must not do |
|---|---|---|
| Home | Professional activity (project updates, portfolio, opportunities), field updates, provenance, visibility, contextual project/material actions | Fake posts, counts, trends, engagement-first framing, or success fallback |
| Network *(was Discover, amended 2026-08-19)* | Professional discovery — people, trades, companies, service area/profession filters; materials/projects/inspiration remain reachable as secondary/contextual entries | Present unknown stock, price, origin, popularity, or fabricated availability/verification as fact |
| Story viewer | Author, expiry, report, contextual material/project action | Auto-publish private project media |
| Create | Content type, audience, project association, upload status | Default private project content to public |
| Messages | Conversation membership, project context, delivery/error status | Expose non-member or internal conversations |
| Customer profile | Identity, posts, saved/projects privacy, relationships | Imply professional verification or staff access |
| Professional profile | Profession, company, services, portfolio, service area, genuine status | Treat selected profession as authorization |
| Materials | Editorial imagery, verified fields, applications, save/project/enquiry actions | Show invented prices/stock/certifications/properties |
| Project | Stage, next action, decisions, materials, files, participants, communication | Show pipeline valuation/fake progress/internal data |
| Quote | Focused required inputs and Review Required outcome | Generate an instant amount without approved pricing |
| Auth | Guest path, real provider state, recovery and deletion access | Simulate provider success or store credentials insecurely |

## Figma validation workflow

No Figma artifact was created in Phase 1 because no team/project or existing file was supplied and the navigation/schema plan has not yet been approved. After approval:

1. Confirm the Figma plan/project and inspect any existing SMC library.
2. Create tokens and reusable shell/feed/form primitives.
3. Produce phone frames for all principal screens, then tablet/desktop adaptations.
4. Validate the core prototype path: guest Discover -> auth boundary -> save -> project -> quote request -> project message.
5. Review screens with the owner before implementing each matching vertical slice.

## Content and state language

- Empty: “No stories yet”, “No project updates yet”, “Create a project” — never synthetic content.
- Failure: explain what failed, preserve user input, offer retry when safe.
- Offline: distinguish saved local draft from server-confirmed publication/submission.
- Pricing: “Request Quote”, “Price on Application”, or “Quote Review Required”.
- Verification: “Not verified” or omit the badge until a genuine workflow exists.
- AR measurement: “Planning aid — final dimensions require professional survey/templating.”
