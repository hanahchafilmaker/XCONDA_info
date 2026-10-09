import type { EntryTranslation } from "./types";

/** English copy translated from the Korean sample instructions. */
export const SAMPLE_ENTRY_EN: Record<string, EntryTranslation> = {
  "notice-kbs": {
    title: "XCONDA completes KBS Production validation",
    summary: "XCONDA's causality-driven AI storyboard workflow has passed validation in the KBS Production pipeline.",
    category: "Notice",
    author: "XCONDA Team",
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
    title: "Introducing XCONDA Hub",
    summary: "Find notices, news, per-tool guides, blog posts and Q&A together in one hub.",
    category: "Notice",
    blocks: [
      { type: "p", text: "All XCONDA Hub content is synced with Notion so you can get the latest XCONDA news as quickly as possible." },
    ],
  },

  "news-240": {
    title: "[YouTube] Turn: 360 space cube map & mask editing update",
    summary: "A new walkthrough shows how to lock space with a 6-faced cube map from one photo and add or remove objects with mask tools.",
    category: "YouTube",
    blocks: [
      { type: "p", text: "The official XCONDA YouTube channel now has a six-minute walkthrough of the Turn 360 space-locking workflow, from cube map creation to mask editing." },
      { type: "callout", icon: "🎬", text: "Put a video or post URL into the Link property in Notion and it becomes the button in the detail modal." },
    ],
  },
  "news-230": {
    title: "[Instagram] FlexBoard selective frame regeneration reel",
    summary: "A short reel shows regenerating only the cuts you dislike on the 9-cut grid.",
    category: "Instagram",
    blocks: [
      { type: "p", text: "This Instagram reel demonstrates FlexBoard selective regeneration — fix a single cut without rebuilding the whole board." },
    ],
  },
  "news-220": {
    title: "[X] Continuity memory ships in Art Director Pro",
    summary: "Character emotions, injuries, prop states, and previous prompts are remembered across every scene.",
    category: "X",
    blocks: [
      { type: "p", text: "First announced on X: continuity memory removes the reset problem when cuts change." },
    ],
  },
  "news-210": {
    title: "[LinkedIn] Three new tools: CineGrade AI, ClothSwap, and YouTube Ref",
    summary: "Transfer color grades, replace wardrobe, and build a nine-scene storyboard from a YouTube link.",
    category: "LinkedIn",
    blocks: [
      { type: "p", text: "Shared with partners and production houses on LinkedIn." },
    ],
  },
  "news-200": {
    title: "[Notion] All-in-one model workspace release notes",
    summary: "Use every AI model in one workspace, with consistent detailed controls as you switch models.",
    category: "Notion",
    blocks: [
      { type: "p", text: "These are the v2.0.0 release notes recorded in the XCONDA_NEWs Notion database — the same source behind this page." },
    ],
  },

  "blog-pipeline": {
    title: "Turn → FlexBoard → Blocking Board → Seedance 2.5: the order that produces nine cuts",
    summary: "The official XCONDA production pipeline, step by step: lock space, build cuts, then render video.",
    category: "Workflow",
    author: "XCONDA Production Team",
    blocks: [
      { type: "h2", text: "1. Lock space (Turn)" },
      { type: "p", text: "Create a 6-faced cube map from one photo and freeze the angle you want. Locking space first keeps the background stable across cuts." },
      { type: "h2", text: "2. Generate cuts (FlexBoard)" },
      { type: "ol", items: ["Write the scenario", "Pick director and art styles", "Generate all nine cuts", "Regenerate only the cuts you dislike"] },
      { type: "h2", text: "3. Block the movement (Blocking Board)" },
      { type: "p", text: "Place characters and camera moves to design how each cut connects." },
      { type: "h2", text: "4. Render video (Seedance 2.5 · Kling)" },
      { type: "p", text: "Pass the finished board to a video model for the final cuts." },
      { type: "callout", icon: "💡", text: "Following the order reduces regenerations — and saves credits." },
    ],
  },
  "blog-continuity": {
    title: "Building a character sheet that keeps faces consistent across cuts",
    summary: "Practical tips for character consistency using Detect Face and the name-linking rule in Art Director Pro.",
    category: "Tutorial",
    author: "Hana Kim",
    blocks: [
      { type: "p", text: "Most face drift comes from a missing character name in the scenario or no character sheet at all." },
      { type: "h3", text: "Order" },
      { type: "ol", items: ["Name the character in the scenario", "Upload a face photo", "Detect Face → create a character sheet", "Generate or regenerate"] },
      { type: "callout", icon: "⚠️", text: "Generation cannot begin until you create a character sheet." },
    ],
  },
  "blog-interview": {
    title: "Notes from the KBS Production validation — why causality-driven AI worked on set",
    summary: "What held up during real production validation, and what still needed work.",
    category: "Insight",
    author: "Dohyun Lee",
    blocks: [
      { type: "p", text: "Validation covered continuity across cuts (emotion, props, wardrobe), face consistency, and preserved context after feedback." },
      { type: "quote", text: "Write the scenario so each event's cause and effect is clear, and the cuts flow naturally." },
      { type: "h3", text: "Open issues" },
      { type: "ul", items: ["Token splitting for long scenarios", "Retaining previous-cut tone during regeneration"] },
    ],
  },

  "guide-start": {
    title: "Getting started: 5-minute pipeline from Turn to FlexBoard",
    summary: "The core workflow to lock space with Turn and generate 9-cut storyboards with FlexBoard.",
    category: "Getting Started",
    blocks: [
      { type: "h2", text: "1. Lock space with Turn" },
      { type: "p", text: "Upload one photo to create a 6-faced cube map and freeze your camera angle." },
      { type: "h2", text: "2. Generate 9-cut storyboard in FlexBoard" },
      { type: "ol", items: ["Write scenario", "Choose director and art styles", "Generate 9 cuts", "Selectively regenerate frames"] },
      { type: "h2", text: "3. Video rendering" },
      { type: "p", text: "Pass completed frames into Seedance 2.5 or Kling video models." },
      { type: "callout", icon: "💡", text: "Turn → FlexBoard → Blocking Board → Seedance 2.5 is XCONDA's production pipeline." },
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
