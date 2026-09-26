import type { EntryTranslation } from "./types";

/** English copy translated from the Korean sample instructions. */
export const SAMPLE_ENTRY_EN: Record<string, EntryTranslation> = {
  "notice-kbs": {
    title: "XCONDA completes KBS Production validation",
    summary: "XCONDA's causality-driven AI storyboard workflow has passed validation in the KBS Production pipeline.",
    category: "Notice",
    blocks: [
      { type: "p", text: "Hello from the XCONDA team. We are pleased to share that XCONDA ADP has completed validation in KBS Production's real-world production workflow." },
      { type: "h2", text: "What was validated" },
      { type: "ul", items: ["Continuity across a nine-cut storyboard, including emotion, props, and wardrobe", "Consistent character faces", "Preserved context after feedback is applied"] },
      { type: "callout", icon: "🎬", text: "We will continue shipping rapid improvements that meet professional production standards." },
    ],
  },
  "notice-maint": {
    title: "[Maintenance] Scheduled server stabilization",
    summary: "Scheduled maintenance will improve generation stability. Some tools may be temporarily unavailable.",
    category: "Maintenance",
    blocks: [
      { type: "callout", icon: "🛠", text: "Generation requests may remain in the queue temporarily during the maintenance window." },
      { type: "h3", text: "Affected services" },
      { type: "ul", items: ["Generation in Director's Cut and Art Director Pro", "Credit purchases will remain available"] },
      { type: "p", text: "Any credits deducted during maintenance will be restored automatically after maintenance ends." },
    ],
  },
  "notice-sub": {
    title: "Subscription plans coming soon",
    summary: "Credit packs are currently one-time purchases. Monthly plans are in development and will be announced at launch.",
    category: "Policy",
    blocks: [
      { type: "p", text: "All current credit packs — Starter, Pro, and Master — are offered as one-time purchases." },
      { type: "p", text: "Monthly subscriptions are in development. Credits you already own will remain available after subscriptions launch." },
    ],
  },
  "notice-event": {
    title: "Ad Storyboard template challenge",
    summary: "Share a nine-cut storyboard made with the Ad Storyboard template. Selected entries will receive credits.",
    category: "Event",
    blocks: [
      { type: "ol", items: ["Create a storyboard with the Ad Storyboard template in Director's Cut", "Share it on social media with the #XCONDA hashtag", "Submit the post link on the event page"] },
      { type: "link", href: "https://www.xconda.ai/studio/directors-cut", caption: "Start with the Ad Storyboard template" },
    ],
  },
  "notice-policy": {
    title: "Face Swap usage policy update",
    summary: "The Face Swap guidelines have been updated to help protect portrait rights.",
    category: "Policy",
    blocks: [
      { type: "p", text: "Only use your own face or a face you have permission to use. Policy violations may result in restricted access." },
    ],
  },
  "notice-welcome": {
    title: "Introducing the XCONDA Guide Center",
    summary: "Find notices, release notes, and per-tool instructions together in one guide center.",
    category: "Notice",
    blocks: [
      { type: "p", text: "All Guide Center content is synced with Notion so you can get the latest XCONDA news as quickly as possible." },
    ],
  },

  "update-240": {
    title: "Automatic mask erasing in 360 Turn Studio",
    summary: "Paint a mask with an empty prompt to remove an object automatically.",
    changes: [
      { kind: "New", text: "Masked area + empty prompt → automatic object removal" },
      { kind: "New", text: "Select and position characters within a space" },
      { kind: "Improved", text: "Higher-quality 3D reconstruction from reference images" },
    ],
  },
  "update-230": {
    title: "Per-cut regeneration in Director's Cut",
    summary: "Edit the prompt and regenerate only the cuts you want to change.",
    changes: [
      { kind: "New", text: "Edit prompts and regenerate individual cuts" },
      { kind: "New", text: "New director-style and art-style presets" },
      { kind: "Fixed", text: "An intermittent issue that changed cut order during nine-cut generation" },
    ],
  },
  "update-220": {
    title: "Continuity memory in Art Director Pro",
    summary: "Character emotions, injuries, prop states, and previous prompts are remembered across every scene.",
    changes: [
      { kind: "New", text: "Continuity memory for emotions, injuries, and props" },
      { kind: "Improved", text: "More accurate Detect Face results" },
      { kind: "Improved", text: "Previous-cut tone is retained during regeneration" },
    ],
  },
  "update-210": {
    title: "Three new tools: CineGrade AI, ClothSwap, and YouTube Ref",
    summary: "Transfer color grades, replace wardrobe, and build a nine-scene storyboard from a YouTube link.",
    changes: [
      { kind: "New", text: "CineGrade AI — transfer the color grade of a film still" },
      { kind: "New", text: "ClothSwap — replace wardrobe with a brush and reference image" },
      { kind: "New", text: "YouTube Ref — create a nine-scene storyboard from a video link" },
    ],
  },
  "update-200": {
    title: "All-in-one model workspace",
    summary: "Use every AI model in one workspace, with consistent detailed controls as you switch models.",
    changes: [
      { kind: "New", text: "Support for Kling 3.0 video and Grok Imagine image models" },
      { kind: "Improved", text: "Parameters persist when switching models" },
      { kind: "New", text: "Upscaler now supports 6K" },
    ],
  },

  "guide-start": {
    title: "Getting started: your first storyboard in five minutes",
    summary: "The fastest path from creating an account to completing your first nine-cut storyboard.",
    category: "Getting Started",
    blocks: [
      { type: "h2", text: "1. Create an account" },
      { type: "p", text: "Visit xconda.ai and create your account." },
      { type: "h2", text: "2. Get credits" },
      { type: "p", text: "Credit packs are one-time purchases. If you are new, Starter Pack V1 ($6.90 · 2,020 credits) is enough to explore the workflow." },
      { type: "h2", text: "3. Open Director's Cut" },
      { type: "ol", items: ["Choose an image engine", "Set the period and location", "Write a scenario", "Choose director and art styles", "Generate"] },
      { type: "callout", icon: "💡", text: "Start with the Ad Storyboard template to learn the structure quickly." },
    ],
  },
  "guide-prompt": {
    title: "How to write a strong scenario",
    summary: "Characters, location, emotional arc, and camera direction make every nine-cut storyboard stronger.",
    category: "Scenario",
    blocks: [
      { type: "p", text: "XCONDA uses causality-driven AI. Make each event's cause and effect clear to create a natural flow between cuts." },
      { type: "h3", text: "Checklist" },
      { type: "todo", items: [
        { text: "Did you name each character? This is required to connect Art Director Pro.", checked: true },
        { text: "Did you specify the time and place?", checked: true },
        { text: "Is there an emotional arc from opening to turn to ending?", checked: false },
        { text: "Did you identify important props or wardrobe?", checked: false },
      ] },
      { type: "h3", text: "Example" },
      { type: "quote", text: "Seoul, 1998, on a rainy night. Minji finds her father's old camera outside a closed photo lab. She hesitates, then presses the shutter. One by one, the street's neon signs flicker to life." },
    ],
  },
  "guide-character": {
    title: "Keeping characters consistent",
    summary: "Set up Art Director Pro to preserve faces and wardrobe across every cut.",
    category: "Character",
    blocks: [
      { type: "ol", items: ["Include the character's name in the scenario", "Upload a face photo", "Select Detect Face to create a character sheet", "Generate or regenerate"] },
      { type: "callout", icon: "⚠️", text: "Generation cannot begin until you create a character sheet." },
    ],
  },

  "faq-1": {
    title: "How do I add credits?",
    summary: "Purchase a Starter V1 or V2, Pro V1 or V2, or Master credit pack with a one-time payment. Subscription plans are coming soon.",
    category: "Credits",
  },
  "faq-2": {
    title: "Are credits deducted when generation fails?",
    summary: "Credits deducted after a generation fails because of a system error are restored automatically. Please contact us if they are not restored.",
    category: "Credits",
  },
  "faq-3": {
    title: "Can I regenerate only the cuts I don't like?",
    summary: "Yes. In Director's Cut, edit only that cut's prompt and regenerate it. The context of the remaining cuts stays intact.",
    category: "How-to",
  },
  "faq-4": {
    title: "Why does my character's face change between cuts?",
    summary: "In Art Director Pro, include the character's name in the scenario, upload a face photo, and use Detect Face to create a character sheet. The name connects the face to the character.",
    category: "How-to",
  },
  "faq-5": {
    title: "How do I remove an object in 360 Turn Studio?",
    summary: "Paint the area with the mask tool and run it with an empty prompt to erase the object automatically. Enter a prompt instead to place a new object.",
    category: "How-to",
  },
  "faq-6": {
    title: "Can I use my results commercially?",
    summary: "Yes, within the scope of the Terms of Service. You must obtain permission from the rights holder when using another person's likeness or copyrighted work.",
    category: "Policy",
  },
};
