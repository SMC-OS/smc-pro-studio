# Phase 2 factual data-processing inventory

Status: engineering inventory for legal review before public beta. It is not legal advice or a compliance certification.

| Data | Purpose | System | Visibility | Current retention/deletion state |
|---|---|---|---|---|
| Email and Supabase identity ID | Registration, verification, sign-in, recovery | Supabase Auth | User and trusted auth operations | Provider configuration required; deletion workflow foundation exists |
| Display name and account type | Profile and customer/professional onboarding | `public.profiles` | Public only when profile visibility is public; owner otherwise | Deleted with identity unless retention requirements intervene |
| Professional category/company/services/service area | Professional profile | `public.professional_profiles` | Public only through a public professional profile; owner otherwise | Deleted with profile; verification fields are server-controlled |
| Staff-role assignments and audit | Authorization and accountability | `public.user_roles`, `private.role_assignment_audit` | Trusted server/admin only | Retention policy requires SMC/legal approval |
| Avatar/public media | User-directed public presentation | Supabase Storage public buckets | Public URLs; uploads/changes restricted to owner | Removal workflow and moderation retention require approval |
| Private user media | Private account/project preparation | Supabase Storage private bucket | Owner through RLS | Retention and deletion require approval |
| Account-deletion request | Fulfil account deletion workflow | `public.account_deletion_requests` | Requesting user and trusted operations | Final deletion/anonymisation worker and legal retention review pending |
| Authentication session tokens | Session restoration and API authorization | Web `sessionStorage`; native memory only in Phase 2 | Current application context | Web tab lifetime; native persistence disabled until secure storage is implemented |

## Explicitly not enabled in Phase 2

- PostHog or other product analytics
- Social posts, Stories, followers, engagement metrics or messages
- Pricing, stock, origin, certification or availability data
- Payment processing
- Push notifications
- Production OAuth providers without real SMC-owned credentials

## Legal-review gates

- Controller identity and contact information
- Lawful bases and special-category-data assessment
- Retention periods and deletion/anonymisation exceptions
- DSAR/export procedure and response ownership
- Processor/subprocessor list and international transfer position
- Children/16+ wording and age-handling approach
- Community Guidelines, moderation operations and appeals
- Cookie/analytics position if analytics is later approved
