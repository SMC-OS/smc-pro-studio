# SMC Pro Studio — Mobile customer journey refinement

Date: 12 October 2026  
Base: `launch/smc-pro-studio` at `77225eb`  
Scope: presentation and client navigation only; no database migrations, credential changes, production deployments, live Stripe or RLS modifications.

## Goals and actual implementation

| Area | Behaviour |
| --- | --- |
| Navigation | Raised animated active-tab circle is restored using a five-column CSS translation rather than ResizeObserver/JS layout measurement. Profile remains active for /connections and /settings. Reduced-motion users receive an instant state change. |
| Home | Compressed mobile greeting; clearly grouped Request a quote, Explore materials, Find professionals; empty appointment card is omitted when there is no next appointment. |
| Studio | First action is planning or finding a professional. Real published materials can be searched by name, category, summary and application; empty results can be cleared. No fake stock, material prices or visualiser availability claims. |
| Network | Trades are selectable as horizontal buttons rather than one long Android native dropdown. Area/name search remains backend-backed. Published professionals have direct profile and quote links. No unpublished records are presented. |
| Quote Request | Four steps: Your project → Property → Professional → Review. Forms preserve in-memory data across steps. Submission requires title, property and a currently available published professional. A missing professional never triggers an unassigned write; users can still explore the planning steps. |

## Verification and release gates

**The initial feature branch is not an Android release.** Complete these gates before merging or issuing an APK:

- [ ] TypeScript check, full unit/component tests, builds and diff check.
- [ ] Run `tests/mobile-journey-refinement.test.mjs` and existing navigation, Home and Network tests.
- [ ] Real-backend integration and database/security gate (unchanged code should still pass).
- [ ] Android staging APK from the exact tested SHA; verify staging Supabase configuration and APK signature.
- [ ] Samsung S24 Ultra visual review of all five bottom tabs, orientation changes, reduced-motion setting, one-hand navigation and screen reader labels.
- [ ] Test mobile keyboard with quote title, property fields, professional search, Studio and Network searches.
- [ ] Confirm quote wizard: no property, adding property, back/next, missing professional, direct professional URL preselection, invalid title, server refusal, successful staging quote, review accuracy, and no duplicate submission.
- [ ] Compare screenshots from the previous recording and capture new before/after evidence.
- [ ] Keep PR #26 draft/unmerged and leave production and live Stripe untouched.

## Data required for a meaningful launch

- **Materials**: an approved catalogue editor must add authentic material names, accurate approved descriptions, licensed product images, and publish via the existing editorial workflow.
- **Professionals**: actual consented professional accounts must finish the approved verification/onboarding and publication process.
- Until those records exist in staging, discovery honestly remains empty and a quote cannot be submitted to a nonexistent provider.

No material, account or payment records were inserted by this UI refinement.

## Remaining limitations

This work is a concrete usability iteration, not a complete overhaul or launch acceptance. Professional search inside Quote Request still uses the currently bounded initial fetch, and a saved/resumable quote draft and full visualiser require separate design and backend validation. Reverify physical-device keyboard, scroll and safe-area behaviour before public release.
