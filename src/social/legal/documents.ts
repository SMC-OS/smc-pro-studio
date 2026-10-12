import { PUBLIC_PATHS, SUPPORT_EMAIL } from "../contact";

/**
 * Privacy Policy and Terms of Use content (owner decision O7).
 *
 * STATUS: DRAFT. Every statement below describes what this version of the
 * app actually does (verified against the code and database on 2026-10-01).
 * Items only SMC and its legal advisers can decide — the legal entity acting
 * as controller and its registered details, lawful bases, retention periods,
 * international-transfer position, age policy, governing law, liability — are
 * deliberately absent rather than guessed, and are tracked in
 * docs/legal-launch-checklist.md. While `status` is "draft" each page shows a
 * clear notice saying so; switching to "final" requires the approved text.
 */

export type LegalStatus = "draft" | "final";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  links?: Array<{ label: string; to: string }>;
}

export interface LegalDocument {
  slug: "privacy" | "terms";
  title: string;
  status: LegalStatus;
  /** ISO date this text was last changed. */
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  status: "draft",
  lastUpdated: "2026-10-01",
  summary: "What SMC Pro Studio collects, who can see it, and the choices you have.",
  sections: [
    {
      heading: "Information you give us",
      paragraphs: ["When you create and use an account we store:"],
      bullets: [
        "Your email address and sign-in details. Your password is handled by our authentication provider and is never visible to SMC Pro Studio staff.",
        "Your profile: display name, optional username and bio, account type (customer or professional) and who can see your profile.",
        "If you are a professional: your profession, company name, service area, services and website, if you add them.",
        "What you create: posts, comments, reactions, saved posts, follows, connection requests, blocks, and direct messages with their read status.",
        "Reports you make or that are made about you, and any moderation decision linked to them.",
      ],
    },
    {
      heading: "Information collected automatically",
      paragraphs: [
        "On the web, your signed-in session is kept in your browser's session storage for that tab. In the mobile app it is kept on your device.",
        "This version of SMC Pro Studio does not use analytics, advertising or tracking tools.",
        "The web app loads its typefaces from Google Fonts, so your browser contacts Google's servers when a page loads.",
      ],
    },
    {
      heading: "Who can see your information",
      paragraphs: [],
      bullets: [
        "If your profile is set to Everyone, your profile and any public posts can be seen by anyone, including people who are not signed in, and a professional profile can appear in Network search once it is complete.",
        "If your profile is set to Only you, it is hidden from other members and from search.",
        "Direct messages can be read only by the people in the conversation. If a message is reported, authorised moderators can review it.",
        "Your email address is never shown on your profile.",
      ],
    },
    {
      heading: "How we use it",
      paragraphs: [],
      bullets: [
        "To provide your account, profile, search, connections and messaging.",
        "To keep members safe: reviewing reports, enforcing our Community Guidelines and preventing abuse.",
        "To secure the service, for example verifying sign-ins and preventing misuse.",
        "To reply when you contact us.",
      ],
    },
    {
      heading: "Where it is stored",
      paragraphs: [
        "Your information is stored with Supabase, the provider of our database, authentication and file storage.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [],
      bullets: [
        "Edit your profile or change who can see it at any time in Edit profile.",
        "Block or report another member from their profile or a conversation.",
        `Ask us for a copy of your information, or to correct it, by emailing ${SUPPORT_EMAIL}.`,
        "Delete your account from Settings or the Delete account page.",
      ],
      links: [
        { label: "Delete your account", to: PUBLIC_PATHS.deleteAccount },
        { label: "Community Guidelines", to: PUBLIC_PATHS.communityGuidelines },
      ],
    },
    {
      heading: "When you delete your account",
      paragraphs: [
        "Deletion is scheduled for the end of a short cancellation period, during which you can change your mind. When it is processed, your profile is replaced by a hidden \"Deleted member\" record; your professional details, posts, comments, reactions, saved posts, follows, connections and blocks are deleted; the text of your messages is removed; any staff role ends; your sign-in is closed and files you uploaded are deleted.",
        "Reports, moderation decisions and messages that were reported are kept for safety, no longer linked to your name or email.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [`Questions about privacy: ${SUPPORT_EMAIL}.`],
      links: [{ label: "Help and support", to: PUBLIC_PATHS.support }],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  slug: "terms",
  title: "Terms of Use",
  status: "draft",
  lastUpdated: "2026-10-01",
  summary: "The basics of using SMC Pro Studio.",
  sections: [
    {
      heading: "The service",
      paragraphs: [
        "SMC Pro Studio is a professional network for the built environment. You can create a customer or professional profile, find professionals, connect, follow, post updates, message other members and browse the SMC materials catalogue.",
        "This version does not offer quotations, payments, ordering or project management. Materials are shown for information only: no prices, stock or availability are given in the app.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "Keep your sign-in details secure and the information on your profile accurate. A professional category describes what you do; it never gives you any staff or administrative access.",
      ],
    },
    {
      heading: "Community Guidelines",
      paragraphs: [
        "Everything you post or send must follow our Community Guidelines. Content that breaks them can be reported, reviewed by authorised moderators and hidden.",
      ],
      links: [{ label: "Read the Community Guidelines", to: PUBLIC_PATHS.communityGuidelines }],
    },
    {
      heading: "Your content",
      paragraphs: [
        "What you post is shown to the people your visibility settings allow. You can delete your account at any time; see the Privacy Policy for what happens to your information.",
      ],
      links: [
        { label: "Privacy Policy", to: PUBLIC_PATHS.privacy },
        { label: "Delete your account", to: PUBLIC_PATHS.deleteAccount },
      ],
    },
    {
      heading: "Contact",
      paragraphs: [`Questions about these terms: ${SUPPORT_EMAIL}.`],
    },
  ],
};

export const DRAFT_NOTICE =
  "This document is a draft and is being finalised with our legal advisers before SMC Pro Studio launches publicly.";
