import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export type ContentVisibility = "public" | "followers" | "connections" | "project" | "private";
export type AccountType = "customer" | "professional";

export interface PublicAuthor {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  account_type: AccountType;
}

export interface FeedPost {
  id: string;
  author_id: string;
  body: string | null;
  visibility: ContentVisibility;
  created_at: string;
  author: PublicAuthor | null;
}

export interface PublicProfessional {
  user_id: string;
  category: string | null;
  company_name: string | null;
  service_area: string | null;
  profile: PublicAuthor | null;
}

export class SocialUnavailableError extends Error {
  constructor(message = "This requires a configured Supabase connection.") {
    super(message);
    this.name = "SocialUnavailableError";
  }
}

function requireClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  return getSupabaseClient();
}

/** Guest-safe: reads only rows the `posts_public_read` RLS policy exposes. */
export async function fetchPublicFeed(limit = 20): Promise<FeedPost[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseClient()
    .from("posts")
    .select("id, author_id, body, visibility, created_at, author:profiles(id, display_name, username, avatar_path, account_type)")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("The feed could not be loaded. Please try again.");
  return (data ?? []) as unknown as FeedPost[];
}

/** Guest-safe: reads only public professional profiles. */
export async function fetchPublicProfessionals(limit = 20): Promise<PublicProfessional[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseClient()
    .from("professional_profiles")
    .select("user_id, category, company_name, service_area, profile:profiles(id, display_name, username, avatar_path, account_type)")
    .limit(limit);
  if (error) throw new Error("Professionals could not be loaded. Please try again.");
  return (data ?? []) as unknown as PublicProfessional[];
}

export interface OwnProfile extends PublicAuthor {
  bio: string | null;
  visibility: "public" | "private";
  onboarding_completed: boolean;
}

export async function fetchOwnProfile(): Promise<OwnProfile | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, username, avatar_path, account_type, bio, visibility, onboarding_completed")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error("Your profile could not be loaded. Please try again.");
  return data as OwnProfile | null;
}

export async function createPost(input: { body: string; visibility: ContentVisibility }): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to post.");
  const body = input.body.trim();
  if (!body) throw new Error("Write something before posting.");
  if (body.length > 3000) throw new Error("Posts must be 3000 characters or fewer.");
  const { error } = await client.from("posts").insert({
    author_id: userData.user.id,
    body,
    visibility: input.visibility,
  });
  if (error) throw new Error("The post could not be published. Please try again.");
}

export async function followUser(followeeId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to follow.");
  const { error } = await client.from("follows").insert({ follower_id: userData.user.id, followee_id: followeeId });
  if (error) throw new Error("This could not be followed right now.");
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage follows.");
  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", userData.user.id)
    .eq("followee_id", followeeId);
  if (error) throw new Error("This could not be unfollowed right now.");
}

export async function savePost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to save.");
  const { error } = await client.from("saved_posts").insert({ user_id: userData.user.id, post_id: postId });
  if (error) throw new Error("This could not be saved right now.");
}

export async function unsavePost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage saved posts.");
  const { error } = await client.from("saved_posts").delete().eq("user_id", userData.user.id).eq("post_id", postId);
  if (error) throw new Error("This could not be unsaved right now.");
}

/** Which of the given post ids the signed-in user has already saved — used so the feed can render an honest, real toggle state rather than assuming "not saved." */
export async function fetchMySavedPostIds(postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0 || !isSupabaseConfigured) return new Set();
  const client = getSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return new Set();
  const { data, error } = await client.from("saved_posts").select("post_id").eq("user_id", userData.user.id).in("post_id", postIds);
  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.post_id as string));
}

export interface OwnProfessionalProfile {
  user_id: string;
  category: string | null;
  company_name: string | null;
  services: string[];
  service_area: string | null;
  website_url: string | null;
  verification_status: "not_verified" | "pending" | "verified" | "rejected";
}

/** Owner-only read (professional_profiles_owner_read) — visible regardless of the public-read gate, so an incomplete professional profile can still show honestly to its own owner. */
export async function fetchOwnProfessionalProfile(): Promise<OwnProfessionalProfile | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client
    .from("professional_profiles")
    .select("user_id, category, company_name, services, service_area, website_url, verification_status")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error("Your professional profile could not be loaded. Please try again.");
  return data as OwnProfessionalProfile | null;
}
