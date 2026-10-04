import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { TextButton } from "../components/UI";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT, FONT_SANS_MED } from "../lib/theme";

const Section: React.FC<{ h: string; children: React.ReactNode }> = ({ h, children }) => (
  <View style={{ marginTop: 20, marginBottom: 6 }}>
    <Text style={styles.h3}>{h}</Text>
    {children}
  </View>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <Text style={styles.p}>{children}</Text>;

export const Terms: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <ScrollView style={styles.screen} contentContainerStyle={styles.inner}>
    <TextButton title="← Back" onPress={onBack} style={{ marginBottom: 20 }} />
    <View style={{ alignItems: "center", marginBottom: 14 }}>
      <SFLogo size={36} glow />
    </View>
    <Text style={styles.title}>Terms & Conditions</Text>
    <Text style={styles.date}>Effective Date: June 2025</Text>

    <Section h="1. Acceptance of Terms">
      <P>By creating an account or using Serene Flow, you agree to these Terms & Conditions. If you do not agree, please do not use the app.</P>
    </Section>
    <Section h="2. Purpose of Serene Flow">
      <P>Serene Flow is a personal wellness and self-reflection app designed to support relaxation, mindfulness, journaling, mood tracking, and community connection. It is intended for general wellbeing purposes only.</P>
      <P>Serene Flow is not a substitute for professional medical, psychological, or crisis care. If you are experiencing a medical or mental health emergency, please contact a licensed professional or local emergency services immediately.</P>
    </Section>
    <Section h="3. User Responsibilities">
      <P>You are responsible for:</P>
      <P>• Keeping your account credentials confidential and secure.</P>
      <P>• Providing accurate information when creating your account.</P>
      <P>• All content you create, post, or share within the app, including journal entries and Spaces posts.</P>
      <P>• Using the app in a manner consistent with these Terms and applicable laws.</P>
    </Section>
    <Section h="4. Community Guidelines (Spaces)">
      <P>Spaces is a shared space for support and connection. To keep it safe for everyone, the following content is strictly prohibited:</P>
      <P>• Bullying, harassment, threats, or hate speech directed at any person or group.</P>
      <P>• Spam, scams, or unsolicited promotional content.</P>
      <P>• Content promoting, encouraging, or describing self-harm, suicide, violence, or illegal activity.</P>
      <P>• Sexually explicit or intimate content of any kind.</P>
      <P>• Sharing of sensitive personal information — including your own or others' addresses, phone numbers, email addresses, passwords, financial information, or government ID numbers.</P>
      <P>Posts that appear to fall into these categories will not be published, and you will see an explanation of why.</P>
    </Section>
    <Section h="5. Respectful Behaviour">
      <P>All interactions within Serene Flow — including Spaces posts, replies, and reactions — should be kind, respectful, and supportive. Treat others the way you would want to be treated in a moment of vulnerability.</P>
    </Section>
    <Section h="6. Content Removal & Account Actions">
      <P>Serene Flow may remove any content that violates these Terms or our community guidelines, with or without prior notice. Accounts that repeatedly violate these rules may be suspended or removed at our discretion.</P>
    </Section>
    <Section h="7. Account Ownership & Responsibility">
      <P>You retain ownership of the content you create. However, by posting in Spaces, you grant Serene Flow the ability to display that content to other users (or anonymously, if you choose) within the app.</P>
    </Section>
    <Section h="8. Disclaimer">
      <P>Serene Flow is provided "as is" without warranties of any kind. While we aim to provide a calming and supportive experience, we cannot guarantee specific outcomes for your mental health or wellbeing. In any crisis, please contact a qualified professional or emergency services.</P>
    </Section>
    <Section h="9. Changes to These Terms">
      <P>We may update these Terms from time to time. Continued use of Serene Flow after changes are made constitutes acceptance of the updated Terms.</P>
    </Section>
    <Section h="10. Contact">
      <P>Questions about these Terms? Email hello@sereneflow.app</P>
    </Section>
    <View style={{ height: 30 }} />
  </ScrollView>
);

export const Privacy: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <ScrollView style={styles.screen} contentContainerStyle={styles.inner}>
    <TextButton title="← Back" onPress={onBack} style={{ marginBottom: 20 }} />
    <View style={{ alignItems: "center", marginBottom: 14 }}>
      <SFLogo size={36} glow />
    </View>
    <Text style={styles.title}>Privacy Policy</Text>
    <Text style={styles.date}>Effective Date: June 2025</Text>

    <Section h="1. Our Commitment to Your Privacy">
      <P>Serene Flow was built as a calm, private space for self-reflection. Your privacy and emotional safety are central to how the app works — not an afterthought.</P>
    </Section>
    <Section h="2. Information We Collect">
      <P>• Account information: your name, email address, and password, which you provide when creating an account.</P>
      <P>• Profile picture: if you choose to upload one.</P>
      <P>• Wellness data: mood check-ins, journal entries, saved Mind Drops, and breathing exercise activity.</P>
      <P>• Spaces content: posts, replies, and reactions you choose to share, including whether you post anonymously.</P>
      <P>• Basic usage activity: login timestamps and sign-in counts, used to keep your account secure and to understand overall app usage.</P>
    </Section>
    <Section h="3. How We Use This Information">
      <P>• To provide and personalize the core features of the app — journaling, mood tracking, Mind Drops, breathing exercises, and Spaces.</P>
      <P>• To keep your account secure and allow you to sign in.</P>
      <P>• To understand overall app usage in aggregate (e.g. how many people use the app, how often), so we can improve Serene Flow. This analytics data is aggregated and does not include the content of your journal entries or private messages.</P>
    </Section>
    <Section h="4. Journal Privacy">
      <P>Your journal entries are private to you. They are never shown to other users, never displayed in Spaces, and are not reviewed by anyone — including our team — as part of normal app operation.</P>
    </Section>
    <Section h="5. Spaces & Anonymous Posting">
      <P>When you post in Spaces, you can choose to share anonymously. If you post anonymously, your name and identity are not displayed to other users. All Spaces posts are reviewed by an automatic safety check before publishing to help keep the space supportive and safe — see our Terms & Conditions for details.</P>
    </Section>
    <Section h="6. Your Controls">
      <P>• You can edit your display name and profile picture at any time from your Profile.</P>
      <P>• You can edit or delete your own journal entries at any time.</P>
      <P>• You can edit or delete your own Spaces posts at any time.</P>
      <P>• You can delete your account entirely from Profile. When you do, your account information, journal entries, and saved preferences are permanently removed.</P>
    </Section>
    <Section h="7. Account Deletion & Data Removal">
      <P>Deleting your account is permanent. Once deleted, your account details and personal journal data are removed and cannot be recovered. Spaces posts you've shared may remain if other users have replied to them, but will no longer be linked to your account or identity.</P>
    </Section>
    <Section h="8. We Do Not Sell Your Data">
      <P>Serene Flow does not sell, rent, or trade your personal information to third parties for marketing or any other purpose.</P>
    </Section>
    <Section h="9. Safety Note">
      <P>If you are experiencing a crisis or having thoughts of self-harm, please reach out to a trusted person in your life or a mental health professional. Serene Flow is a wellness tool and is not equipped to provide emergency support.</P>
    </Section>
    <Section h="10. Contact">
      <P>Privacy questions or requests: privacy@sereneflow.app</P>
    </Section>
    <View style={{ height: 30 }} />
  </ScrollView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  inner: { padding: 20, paddingTop: 24, maxWidth: 680, width: "100%", alignSelf: "center" },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text, textAlign: "center", marginBottom: 6 },
  date: { fontFamily: FONT_SANS_LIGHT, fontSize: 12, color: COLORS.textDim, textAlign: "center", marginBottom: 8 },
  h3: { fontFamily: FONT_SANS_MED, fontSize: 14, color: COLORS.text, marginBottom: 6 },
  p: { fontFamily: FONT_SANS_LIGHT, fontSize: 13.5, color: "#C4AFDE", lineHeight: 22, marginBottom: 8 },
});
