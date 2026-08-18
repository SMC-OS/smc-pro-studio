# SMC Pro Studio UX direction

## Experience statement

SMC Pro Studio is a premium social community where people discover stone and architectural inspiration, connect with relevant professionals, and turn saved ideas into governed real-world projects.

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
| Home | Stories, feed provenance, visibility, contextual project/material actions | Fake posts, counts, trends, or success fallback |
| Discover | Search intent, useful filters, materials/people/projects/inspiration | Present unknown stock, price, origin, or popularity as fact |
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
