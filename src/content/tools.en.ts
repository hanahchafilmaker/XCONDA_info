import type { ToolTranslation } from "./types";

/** English copy translated from the product instructions in tools.ts. */
export const TOOL_EN: Record<string, ToolTranslation> = {
  turn: {
    tagline: "One photo → 360° space creation and background/space locking",
    desc: "Build a 360° six-faced cube map from a single photo to lock your background space. Maintain complete spatial consistency across Dutch angles, bird's-eye views, and camera moves.",
    steps: [
      "In Reference, add Front / Left / Right / Back references or write a Description.",
      "Generate the 360° HDRI and choose a camera viewpoint in 3D Preview.",
      "If needed, refine each Cube Map face with Brush, Replace with, Inpaint, or REGEN.",
      "Save the chosen viewpoint as a Freeze Frame.",
      "In Production, configure cast, lighting, action, and style to finalize the shot.",
    ],
    tips: [
      "Turn is the initial step to lock the virtual space before entering FlexBoard.",
      "A 6-sided cube map ensures the room remains consistent even as camera angles change.",
    ],
  },
  flexboard: {
    tagline: "Scenario-driven 9-cut storyboard & selective frame regeneration",
    desc: "Generate a 3×3 cinematic 9-cut storyboard from a single scenario, then edit prompts and selectively regenerate only the cuts you want to refine.",
    steps: [
      "Choose Standard or Cinema Pro engine and input your scenario.",
      "Select Director Style and Art Style presets.",
      "Click Generate to create the 3×3 nine-cut grid storyboard.",
      "Select any cut to modify its prompt and regenerate only that frame.",
      "Export the 9-cut board directly into Seedance 2.5 / Kling video generation.",
    ],
    tips: [
      "Regenerate problematic frames individually without restarting the entire storyboard.",
      "Integrate with the Claude skill (xconda-new-prompt) to expand into 10-block prompts.",
    ],
  },
  "blocking-board": {
    tagline: "Character movement, camera blocking & spatial direction in 360° space",
    desc: "Intuitively place characters, gaze directions, and camera movements on the locked 360° space to design visual continuity across scenes.",
    steps: [
      "Load the locked 360° space or background from Turn.",
      "Place characters and their movement paths on the spatial viewport.",
      "Configure camera viewpoint, focal length, and movement trajectories.",
      "Verify spatial relationships before moving to final rendering.",
    ],
    tips: [
      "Check obstacle maps so movement paths do not collide with furniture or walls.",
      "Clear positioning in foreground, midground, and background maximizes consistency.",
    ],
  },
  "directors-cut": {
    tagline: "A nine-cut storyboard shaped by engine, direction, and art style",
    desc: "Set Standard or Cinema Pro, time and place, a director style, and an art medium to create one coherent 3×3 story grid.",
    steps: [
      "Choose Standard for drafts or Cinema Pro for final-quality output.",
      "Enter Year, Location, and a Scenario that meets the minimum length.",
      "Choose one of five Director Styles and one of four Art Styles.",
      "Optionally attach Hero Product and a near-frontal Hero Muse image.",
      "Press Generate to create the 3×3 nine-cut grid.",
      "Open a frame with its pen icon, edit the prompt, and Regenerate only that frame.",
    ],
    tips: [
      "Background-free product and model images improve recognition and cross-frame consistency.",
      "Both individual downloads and Download All are available.",
    ],
  },
  "art-director-pro": {
    tagline: "Consistent nine-cut direction with focus modes, character sheets, and camera",
    desc: "Connect face and wardrobe references through Role Names, then combine focus mode, camera, and optics to preserve character and spatial continuity.",
    steps: [
      "Choose Dialogue, Action, or Atmosphere focus for the scene.",
      "Include every Role Name in the scenario and upload a background with clear spatial structure.",
      "Set each cast member's Role Name and Face ID Source, then optionally add Wardrobe Ref.",
      "Press Detect Face to create a left/front/right three-view character sheet.",
      "Choose from six Cameras and ten Optics options.",
      "Generate Previews, then regenerate, upscale, and download the frames you need.",
    ],
    tips: [
      "Names in the scenario and Role Name fields must match exactly.",
      "A bright, near-frontal portrait produces the most reliable Face ID and character sheet.",
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
    tagline: "Keep pose, wardrobe, and background—replace only the marked face",
    desc: "Brush the face region in a source and apply a new face while preserving its background, wardrobe, pose, lighting, and composition as much as possible.",
    steps: [
      "Choose the Nano Banana 2 or Nano Banana model.",
      "Upload the source under Original image.",
      "Adjust Brush Size and paint the exact face region to replace.",
      "Upload a frontal or three-quarter new face under Swap to image.",
      "Press Generate and choose OK in the confirmation dialog.",
      "Compare the result, then share, regenerate, download, or delete it.",
    ],
    tips: [
      "Use only your own face or one you have explicit permission to use.",
      "Keep the mask around the face neither too narrow nor too wide.",
    ],
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
    tagline: "Create with seven AI models and image references",
    desc: "Use Nano Banana, Kling, Z Image, Seedream, and Grok Imagine models in one workspace with model-specific references, ratios, resolutions, and output counts.",
    steps: [
      "Choose one of seven models based on your goal and reference-image limits.",
      "Enter the required prompt and optionally attach references in @image format.",
      "Set one of 12 ratios, 1K/2K/4K resolution, and a count of 1, 2, or 4 images.",
      "With Z Image, enter unwanted elements under Negative prompt.",
      "Generate, then use prompt copy, detail view, and download controls on the result.",
    ],
    tips: [
      "After changing models, verify whether ratio and resolution were reset to supported values.",
      "English prompts can improve text-understanding accuracy.",
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
    tagline: "2X/4X detail upscaling with Topaz or Xconda",
    desc: "Scale low-resolution or blurry images by 2X or 4X, then restore detail with source-specific Enhance Models and Face Enhancement.",
    steps: [
      "Choose fine-control Topaz or the faster in-house Xconda model.",
      "Upload the source and choose 2X or 4X scale.",
      "With Topaz, set Enhance Model, Subject Detection, and output format.",
      "For portraits, tune Face Enhancement and Creativity from a low-to-middle range.",
      "Confirm the Generate cost and choose OK to start.",
      "Download Latest Result and compare previous versions in History.",
    ],
    tips: [
      "Start Face Enhancement near the middle to avoid over-processing portraits.",
      "Use JPG for sharing and PNG for compositing or further editing.",
    ],
  },
};
