import type { ToolTranslation } from "./types";

/** English copy translated from the product instructions in tools.ts. */
export const TOOL_EN: Record<string, ToolTranslation> = {
  turn: {
    tagline: "Turn one image into a 360° space and shoot from any angle",
    desc: "Build a complete 3D environment from a reference image or text, add or remove objects, and shoot the scene from any cinematic angle.",
    steps: [
      "Upload a reference image or describe the space you want to create.",
      "Select Generate to build a 360° 3D environment.",
      "Paint an area with the mask tool and enter a prompt to place a new object. Leave the prompt blank to erase the selected area automatically.",
      "Select a character and move the camera freely through the space.",
      "Choose a cinematic angle and select Shoot to save the cut.",
    ],
    tips: [
      "Use Turn to change only the camera angle while keeping the background fixed, preserving spatial continuity between cuts.",
      "Wide-angle, front-facing reference images generally produce the best environment reconstruction.",
    ],
  },
  "directors-cut": {
    tagline: "One scenario becomes a complete nine-cut storyboard",
    desc: "Choose an image engine, period, location, director style, and art style. AI then designs the mood and direction for a complete nine-cut storyboard.",
    steps: [
      "Choose an image engine (model).",
      "Set the period and location for the story.",
      "Write your scenario. More detail about the characters, situation, and emotional arc produces better results.",
      "Choose a director style and art style to define the overall mood and visual direction.",
      "Select Generate to create a nine-cut storyboard with designed angles, mood, and timing.",
      "If a cut is not right, edit only that cut's prompt and regenerate it instead of starting over.",
    ],
    tips: [
      "For an ad pitch, start with the Ad Storyboard template to turn one brief into a draft in under five minutes.",
      "Even after feedback, XCONDA remembers character emotions, injuries, props, and previous prompts across every scene.",
    ],
  },
  "art-director-pro": {
    tagline: "Keep every character's face and wardrobe consistent across cuts",
    desc: "Create a character sheet from a face photo, then connect face and wardrobe references to names in your scenario to preserve continuity between cuts.",
    steps: [
      "Include every character's name in the scenario. AI uses names to connect face and wardrobe references.",
      "Upload a face photo for the character.",
      "Select Detect Face to create a character sheet. A sheet is required before generation can begin.",
      "Add wardrobe or prop references when needed.",
      "Generate the storyboard. The tone and context of previous cuts remain consistent even after you revise the scenario and generate again.",
    ],
    tips: [
      "For scenes with multiple people, pair each name with one face photo.",
      "A well-lit, front-facing portrait gives the most accurate detection.",
    ],
  },
  "scene-snap": {
    tagline: "One image → a cinematic six-keyframe storyboard",
    desc: "Upload an image to create a cinematic storyboard composed of six keyframes.",
    steps: [
      "Upload the image that will serve as your starting point.",
      "Optionally enter a short description of the mood or progression.",
      "Generate a six-keyframe storyboard.",
    ],
  },
  "youtube-ref": {
    tagline: "YouTube link → a nine-scene storyboard",
    desc: "Paste a video link and AI will generate a nine-scene storyboard. A character reference is optional.",
    steps: [
      "Paste the YouTube video link you want to reference.",
      "Optionally upload a character reference image.",
      "Generate a nine-scene storyboard inspired by the video's flow.",
    ],
  },
  "drct-seq": {
    tagline: "One keyframe → eight connected scenes",
    desc: "Upload one keyframe and AI automatically creates eight connected scenes as a cinematic sequence.",
    steps: [
      "Upload the keyframe that will begin the sequence.",
      "Generate eight connected scenes automatically.",
      "Choose the scenes you want to use in your storyboard.",
    ],
  },
  "spin-angle": {
    tagline: "Set camera position and direction with a circle and arrow",
    desc: "Mark the camera position with a circle and its direction with an arrow to generate a photoreal view from that perspective.",
    steps: [
      "Upload an image.",
      "Draw a circle to mark the camera position.",
      "Draw an arrow to show where the camera should point.",
      "Generate a photoreal image from the selected viewpoint.",
    ],
  },
  "arw-view": {
    tagline: "Create a new viewpoint with a single arrow",
    desc: "Draw an arrow on an image to set the camera direction and create a new viewpoint without 3D modeling.",
    steps: [
      "Upload an image.",
      "Draw an arrow to set the camera direction.",
      "Generate the scene from the new viewpoint.",
    ],
  },
  "auto-angle": {
    tagline: "Change angles automatically with AI camera shots",
    desc: "Use AI camera shots to change an image's angle with ease.",
    steps: [
      "Upload an image.",
      "Choose the camera shot or angle you want.",
      "Generate a selection of cuts from different angles.",
    ],
  },
  "cloth-swap": {
    tagline: "Paint, upload, and replace an outfit",
    desc: "Paint over the clothing you want to change, upload a wardrobe reference, and let AI replace it.",
    steps: [
      "Upload an image of the person.",
      "Paint over the clothing area you want to replace.",
      "Upload the outfit you want to use as a reference.",
      "Generate an image with the outfit replaced naturally.",
    ],
  },
  expression: {
    tagline: "Change expressions with text while preserving identity",
    desc: "Change a facial expression with a simple text prompt while keeping the person's identity intact.",
    steps: [
      "Upload an image of the person.",
      "Describe the emotion or expression you want, such as surprise, a smile, or anger.",
      "Generate the image with the new expression.",
    ],
  },
  "face-swap": {
    tagline: "Swap any face, whenever you need",
    desc: "Replace a face in an image with the face you choose.",
    steps: [
      "Upload the target image.",
      "Upload the replacement face image.",
      "Generate and review the result.",
    ],
    tips: ["Only use your own face or a face you have permission to use."],
  },
  "background-blend": {
    tagline: "Person + background → a cinematic composite",
    desc: "Upload a portrait and a background image, then let AI blend them naturally into a cinematic look.",
    steps: [
      "Upload a photo of the person.",
      "Upload a background image.",
      "Generate a composite with matched lighting and color tone.",
    ],
  },
  "cine-grade": {
    tagline: "Bring the color of a film still to your image",
    desc: "Upload a reference film still to transfer its color grade, contrast, and mood to your photo instantly.",
    steps: [
      "Upload the photo you want to grade.",
      "Upload a film still as your visual reference.",
      "Generate the image with the reference color grade and mood applied.",
    ],
  },
  image: {
    tagline: "Image models including Grok Imagine",
    desc: "Use every AI model in one workspace. Detailed parameter controls stay consistent as you move between models.",
    steps: [
      "Choose an image model.",
      "Enter a prompt and adjust parameters such as aspect ratio and style.",
      "Select Generate.",
    ],
  },
  video: {
    tagline: "Video models including Kling 3.0",
    desc: "Generate video from a finished storyboard cut or a text prompt.",
    steps: [
      "Choose a video model.",
      "Enter a prompt or upload a starting image.",
      "Set options such as duration and aspect ratio, then generate.",
    ],
  },
  upscale: {
    tagline: "Make any image crisp at up to 6K",
    desc: "Upscale a low-resolution image to a sharp result at up to 6K.",
    steps: [
      "Upload the image you want to upscale.",
      "Choose an upscale factor.",
      "Generate and download the high-resolution result.",
    ],
  },
};
