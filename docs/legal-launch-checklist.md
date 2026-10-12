# Legal launch checklist (owner decision O7)

The Privacy Policy (`/privacy`) and Terms of Use (`/terms`) are live in the app, linked from sign-up, Settings and `/support`, and render from `src/social/legal/documents.ts`. Both are marked **draft**: each page shows a visible "draft — being finalised with our legal advisers" notice until `status` is changed to `"final"`.

The draft text only states what the V1 app verifiably does. The items below are deliberately **not** in the text because only SMC and its legal advisers can decide them. Public launch is blocked until each is resolved and the approved wording is placed in `documents.ts` with `status: "final"`.

## Privacy Policy

- [ ] Legal entity acting as data controller, registered address, company number and ICO registration (if applicable).
- [ ] Lawful basis for each purpose listed under "How we use it".
- [ ] Retention periods: active accounts, deleted-account safety records (see `docs/account-deletion-policy.md`), support emails, server logs.
- [ ] Processors and sub-processors (Supabase; email delivery provider; hosting provider once chosen; Google Fonts) and the international-transfer position, including the Supabase region chosen for staging/production.
- [ ] Data-subject rights wording (access, rectification, erasure, restriction, objection, portability), response process and timescale, and the right to complain to the ICO.
- [ ] Minimum age and how it is applied.
- [ ] Cookie/local-storage statement (today: session storage only; no analytics).
- [ ] Confirm the `reported_message_handling` policy value matches the wording.

## Terms of Use

- [ ] Operator identity and contact details.
- [ ] Eligibility, account rules and suspension/termination.
- [ ] Licence to user content and intellectual property.
- [ ] Disclaimers and limitation of liability (UK consumer law compliant).
- [ ] Governing law and jurisdiction.
- [ ] Changes-to-terms process.

## Other

- [ ] Community Guidelines: final legal review (interim version dated 3 September 2026 is live).
- [ ] The mailbox `support@smcprostudio.app` exists, is monitored, and the domain `smcprostudio.app` is controlled by SMC.
- [ ] Store listings use `https://<production-domain>/support` as the support URL and `https://<production-domain>/delete-account` as the account-deletion URL.
