import type { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

export const BRAND = "Covers";

/** Absolute URL for links in emails; NEXT_PUBLIC_APP_URL is the Vercel URL now, the real domain later. */
export function appUrl(path: string, env: Record<string, string | undefined> = process.env): string {
  const base = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const accent = "#c2410c";
const ink = "#1c1917";
const muted = "#78716c";

export const styles = {
  body: { backgroundColor: "#faf7f2", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif", color: ink, margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: 16, maxWidth: 560, margin: "0 auto", padding: "32px 32px 24px" },
  brand: { color: accent, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 600, margin: "0 0 20px" },
  heading: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 500, lineHeight: "34px", margin: "0 0 16px" },
  text: { fontSize: 15, lineHeight: "24px", margin: "0 0 14px" },
  muted: { fontSize: 13, lineHeight: "20px", color: muted, margin: "0 0 8px" },
  facts: { backgroundColor: "#fdf4ec", borderRadius: 12, padding: "14px 16px", margin: "0 0 18px" },
  fact: { fontSize: 14, lineHeight: "22px", margin: 0 },
  button: { backgroundColor: accent, borderRadius: 999, color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "12px 22px", textDecoration: "none" },
  hr: { borderColor: "#eee7dc", margin: "24px 0 14px" },
  link: { color: accent },
} as const;

export function EmailLayout({ preview, heading, children, cta }: { preview: string; heading: string; children: ReactNode; cta?: { label: string; href: string } }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{BRAND}</Text>
          <Heading as="h1" style={styles.heading}>{heading}</Heading>
          {children}
          {cta && (
            <Section style={{ margin: "22px 0 6px" }}>
              <Button href={cta.href} style={styles.button}>{cta.label}</Button>
            </Section>
          )}
          <Hr style={styles.hr} />
          <Text style={styles.muted}>
            {BRAND} · ticketed dinner parties cooked by NYC chefs. Every dinner is BYOB and seats ten at most.{" "}
            <Link href={appUrl("/")} style={styles.link}>{appUrl("/").replace(/^https?:\/\//, "")}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** A short list of key facts (when, where, how much) in a tinted box. */
export function Facts({ items }: { items: Array<[label: string, value: ReactNode] | null | false | undefined> }) {
  const rows = items.filter((i): i is [string, ReactNode] => Boolean(i));
  return (
    <Section style={styles.facts}>
      {rows.map(([label, value]) => (
        <Text key={label} style={styles.fact}>
          <span style={{ color: muted }}>{label}: </span>
          {value}
        </Text>
      ))}
    </Section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}
