// ============================================================
// SPACES SAFETY MODERATION
// Ported verbatim from the original web app's moderateSpacesPost.
// Logic, regex patterns, and message copy are unchanged.
// ============================================================

export type ModerationReason = "selfharm" | "personalinfo" | "conduct";

export interface ModerationResult {
  blocked: boolean;
  reason: ModerationReason | null;
}

export const moderateSpacesPost = (raw: string): ModerationResult => {
  const text = raw.toLowerCase();
  // 1. Self-harm / suicide related content
  const selfHarmPatterns = [
    /\b(suicid\w*)\b/, /\bkill myself\b/, /\bend my life\b/, /\bwant to die\b/,
    /\bdon'?t want to (live|be alive)\b/, /\bself[\s-]?harm\w*\b/, /\bcutting myself\b/,
    /\bhurt(ing)? myself\b/, /\bno reason to live\b/, /\bbetter off dead\b/,
    /\boverdose\b/, /\btake my (own )?life\b/, /\bcan'?t go on\b/, /\bending it all\b/
  ];
  if (selfHarmPatterns.some((p) => p.test(text))) {
    return { blocked: true, reason: "selfharm" };
  }
  // 2. Personal information
  const personalInfoPatterns = [
    /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|apt|apartment)\b/,
    /\b(?:\d[ -]*?){13,19}\b/,
    /\b(ssn|social security)\b.{0,15}\d{3}/,
    /\bpassword\s*[:=]?\s*\S+/,
    /\b(routing number|account number|iban|bank account)\b/
  ];
  if (personalInfoPatterns.some((p) => p.test(text))) {
    return { blocked: true, reason: "personalinfo" };
  }
  // 3. Sexually explicit content
  const explicitPatterns = [
    /\b(nude|naked) (photo|pic|picture|video)s?\b/, /\bsexting\b/, /\bsend nudes\b/,
    /\bsexual(ly)? explicit\b/, /\bporn\w*\b/, /\bxxx\b/
  ];
  if (explicitPatterns.some((p) => p.test(text))) {
    return { blocked: true, reason: "conduct" };
  }
  // 4. Bullying, harassment, threats, spam
  const conductPatterns = [
    /\bi('?ll| will) (kill|hurt|find) you\b/, /\bkill yourself\b/, /\bkys\b/,
    /\byou should die\b/, /\bi hate (you|all)\b.{0,20}\b(people|group|race)\b/,
    /\b(threat|threaten\w*) (you|her|him|them)\b/,
    /\bbuy now\b.{0,15}\bclick\b/, /\bfree money\b.{0,15}\bclick\b/, /\bwww\.\S+\.(xyz|click|loan)\b/
  ];
  if (conductPatterns.some((p) => p.test(text))) {
    return { blocked: true, reason: "conduct" };
  }
  return { blocked: false, reason: null };
};

export const MODERATION_MESSAGES: Record<
  ModerationReason,
  { title: string; body: string; extra: string; resources: { label: string; value: string }[] }
> = {
  selfharm: {
    title: "We hear you, and we care about you 💜",
    body: "It looks like this post may be about thoughts of self-harm or suicide. To keep this space safe, we're not able to publish it — but please know that what you're feeling matters, and you deserve support.",
    extra: "Please consider reaching out to a trusted friend, family member, school counselor, or mental health professional. You don't have to carry this alone.",
    resources: [
      { label: "988 Suicide & Crisis Lifeline (US)", value: "Call or text 988" },
      { label: "Crisis Text Line", value: "Text HOME to 741741" },
      { label: "International Association for Suicide Prevention", value: "iasp.info/resources" },
    ],
  },
  personalinfo: {
    title: "Let's protect your privacy 🔒",
    body: "This post appears to contain personal information — such as a phone number, email, address, or financial details. To help keep you and others safe, we don't allow this kind of information to be shared in Spaces.",
    extra: "Please remove any personal or identifying details before sharing. Your safety matters to us.",
    resources: [],
  },
  conduct: {
    title: "This space is for support, not harm 🌸",
    body: "This post can't be published because it appears to violate our community guidelines — content involving harassment, threats, hate speech, spam, or sexually explicit material isn't allowed here.",
    extra: "Spaces is meant to be a kind, respectful place for everyone. Feel free to rewrite your post in a way that reflects that.",
    resources: [],
  },
};
