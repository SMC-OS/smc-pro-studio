## Imported Claude Cowork project instructions

Work only inside the active SMC Pro Studio project folder and preserve existing work.

Before making substantial changes:

* Inspect the current source and project documentation first.
* Check Git status/history if Git is available.
* Create recoverable checkpoints before major changes.
* Never overwrite or delete the original project/archive.
* Do not discard existing work without explicit approval.

Preserve the production security foundation already implemented, including:

* frontend/backend separation
* server-side secrets
* fail-closed authentication
* server-controlled roles
* schema validation
* rate limiting
* CORS controls
* security headers
* safe error handling
* corrected offline behaviour
* prevention of simulated production success

Never weaken these protections for convenience.

SMC Pro Studio is being developed as a premium social-first platform for:

* customers
* homeowners
* architects
* interior designers
* stone professionals
* fabricators
* installers
* suppliers
* contractors
* developers
* SMC staff

The approved primary navigation direction is:

**Home · Network · Create · Projects · Profile**

The wider customer journey is:

**Network → Connect → Project → Deliver**

The app should feel modern and familiar like a premium social platform while maintaining an original SMC identity.

Default visual direction:

* bright
* warm
* premium
* spacious
* calm
* modern
* mobile-first

Avoid predominantly dark enterprise-dashboard styling.

Use warm ivory, off-white, light stone, subtle beige/warm grey surfaces and charcoal typography. Let architecture, stone and project photography provide visual richness.

Hard pricing rule:

**Never add or display monetary amounts unless they come from verified current UK pricing or SMC-approved authoritative pricing data.**

Do not fabricate:

* £/m² prices
* stock
* availability
* discounts
* project valuations
* engagement metrics
* reviews
* users
* followers
* verification
* certifications
* technical claims
* delivery estimates
* production activity

If reliable pricing is unavailable, use:

* Request Quote
* Price on Application
* Price Based on Specification

or omit the price.

Authentication direction:

* Supabase Auth + PostgreSQL
* Customer and Professional account types
* Email/password
* Google
* Apple
* Facebook
* minimum password length: 8 characters
* longer passwords allowed
* no 12-character maximum

Professional categories never grant administrative privileges.

Staff/admin authorization must remain server-controlled.

Privacy defaults:

* projects private by default
* project media inherits project visibility
* guests see public content only
* public content requires appropriate visibility controls
* private messages/projects/documents must be protected by authorization and RLS

Use all relevant available tools, integrations, plugins and development capabilities when they materially improve correctness.

Before each phase, inspect which tools are appropriate.

Prefer read-only inspection before modifying external systems.

Do not use tools just because they exist.

Major changes should be completed incrementally.

After every phase:

* run relevant tests/checks
* report exactly what changed
* report files changed
* report security implications
* report remaining blockers
* report owner decisions required
* stop at agreed approval checkpoints

Do not automatically continue into the next major phase without approval.

Never make the application merely appear finished.

A production feature must either:

* genuinely work,
* fail safely,
* remain disabled,
* or clearly state that setup is required.
