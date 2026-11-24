// Content for lottie-react, shared by the page and its social image.
//
// Code here is written against lottie-react 3.1.2 (released Aug–Sep 2026),
// type-checked against its published types. v3 replaced v2's default export
// and `animationData` prop, so re-check the snippets when a new major ships.
import type { LandingConfig } from '@/components/seo/Landing'

export const config: LandingConfig = {
  path: '/lottie-react',
  eyebrow: 'Guide · Lottie in React',
  title: 'How to Use Lottie in React (lottie-react v3 Guide) | Reframe',
  description:
    'Add a Lottie animation to React or Next.js with lottie-react v3: install, render, control playback, play on scroll. Make the Lottie JSON free from an SVG.',
  h1: 'How to use a Lottie animation in React',
  heroSubhead:
    'A short, working guide to lottie-react version 3: install it, render an animation, control playback, and play it when it scrolls into view. It works in Vite, Create React App and the Next.js App Router. Don’t have a Lottie file yet? Make one from any SVG in Reframe, free.',
  primaryCta: 'Make a Lottie file from an SVG →',
  howHeading: 'The four steps',
  howSubhead: 'From an SVG to an animation playing in your React app.',
  steps: [
    ['Get a Lottie JSON file', 'Export one from Reframe (upload an SVG, animate it with an AI prompt or a preset, export Lottie JSON), or use a file from your designer.'],
    ['Install lottie-react', 'Run npm i lottie-react. It needs React 18.2 or newer and brings lottie-web with it.'],
    ['Put the file in your public folder', 'Save it as public/animations/logo.json so it’s served as a static file and stays out of your JavaScript bundle.'],
    ['Render the component', 'Use <Lottie src="/animations/logo.json" autoplay loop /> and give it a width and height. The animation fills the element.'],
  ],
  codeHeading: 'The code',
  codeSections: [
    {
      heading: 'Install',
      body: 'One package. lottie-web, the engine that draws the animation, is installed with it.',
      code: 'npm i lottie-react',
    },
    {
      heading: 'Render an animation',
      body: 'Import the named Lottie component and point src at the file. The component fills its element, so size the element with a style or a class.',
      code: `import { Lottie } from "lottie-react";

export function Logo() {
  return (
    <Lottie
      src="/animations/logo.json"
      autoplay
      loop
      style={{ width: 240, height: 240 }}
    />
  );
}`,
      note: 'src takes a URL or path, or the parsed animation object. loop also takes a number, for example loop={2} to play twice and stop.',
    },
    {
      heading: 'Coming from lottie-react v2?',
      body: 'Version 3 changed the API, and most tutorials and AI answers still show the old one. There is no default export any more, and animationData is now src.',
      code: `// v2 (no longer works)
import Lottie from "lottie-react";
<Lottie animationData={logo} loop />

// v3
import { Lottie } from "lottie-react";
<Lottie src={logo} autoplay loop />`,
      note: 'The library’s migration guide at lottiereact.com maps every v2 prop and method to its v3 equivalent.',
    },
    {
      heading: 'Control playback',
      body: 'Pass a ref through lottieRef to get play, pause, stop, seek and speed controls.',
      code: `import { useRef } from "react";
import { Lottie, type LottieHandle } from "lottie-react";

export function ControlledLogo() {
  const lottie = useRef<LottieHandle>(null);

  return (
    <div>
      <Lottie
        src="/animations/logo.json"
        autoplay={false}
        lottieRef={lottie}
        style={{ width: 200, height: 200 }}
      />
      <button onClick={() => lottie.current?.play()}>Play</button>
      <button onClick={() => lottie.current?.pause()}>Pause</button>
      <button onClick={() => lottie.current?.setSpeed(2)}>2× speed</button>
      <button onClick={() => lottie.current?.seek({ percent: 0 })}>Restart</button>
    </div>
  );
}`,
      note: 'seek takes a frame number, or { seconds }, { percent } or { marker }.',
    },
    {
      heading: 'Play it when it scrolls into view',
      body: 'Wrap the animation in LottieInteractions with lottieInView. It plays when the animation enters the viewport and pauses when it leaves. With once: true it plays on the first entry only, so scrolling past again doesn’t replay it.',
      code: `import { Lottie, LottieInteractions, lottieInView } from "lottie-react";

export function RevealOnScroll() {
  return (
    <LottieInteractions interactions={[lottieInView({ once: true })]}>
      <Lottie
        src="/animations/logo.json"
        autoplay={false}
        style={{ width: 200, height: 200 }}
      />
    </LottieInteractions>
  );
}`,
    },
    {
      heading: 'React to events with the hook',
      body: 'useLottie gives you the same controls plus live state, and lets you subscribe to events such as complete. Attach setDisplayRef to the element the animation should draw into.',
      code: `import { useLottie } from "lottie-react";

export function OnboardingStep({ onDone }: { onDone: () => void }) {
  const lottie = useLottie({
    src: "/animations/logo.json",
    autoplay: true,
    loop: false,
    subscriptions: { complete: onDone },
  });

  return <div ref={lottie.setDisplayRef} style={{ height: 300 }} />;
}`,
    },
    {
      heading: 'Respect reduced motion',
      body: 'Some people turn off animation in their system settings. Check prefers-reduced-motion and don’t autoplay for them.',
      code: `import { useSyncExternalStore } from "react";
import { Lottie } from "lottie-react";

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(query).matches;

export function Logo() {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return (
    <Lottie
      src="/animations/logo.json"
      autoplay={!reduced}
      loop={!reduced}
      style={{ width: 240, height: 240 }}
    />
  );
}`,
    },
  ],
  whyHeading: 'Next.js, bundle size and file loading',
  whyParagraphs: [
    'In the Next.js App Router you can use <Lottie> straight from a Server Component page. The package marks its components as client components, so the server renders a sized, empty container and the animation starts in the browser once the page hydrates. You don’t need next/dynamic or ssr: false. Wrap it in your own "use client" component only if you’re using the hook or a ref.',
    'Loading the file by URL (src="/animations/logo.json") keeps the animation out of your JavaScript bundle and lets the browser cache it. Importing the JSON (import logo from "./logo.json") bundles it, which is fine for small files you want on screen immediately. If you only need the SVG renderer, which is the default, use LottieSvg instead of Lottie: it takes the same props and loads a smaller build of lottie-web. Files exported from Reframe are plain shape layers, so they play with it.',
    'lottie-react plays Lottie JSON files. The .lottie format is a zipped variant played by LottieFiles’ own @lottiefiles/dotlottie-react. Reframe exports plain Lottie JSON (version 5.7.4, shape layers), so lottie-react plays it as is.',
  ],
  faqs: [
    ['How do I use a Lottie animation in React?', 'Install lottie-react (npm i lottie-react), put the Lottie JSON file in your public folder, then render <Lottie src="/animations/logo.json" autoplay loop /> with a width and height. In lottie-react 3, Lottie is a named import.'],
    ['Why does import Lottie from "lottie-react" no longer work?', 'lottie-react 3 removed the default export and renamed the animationData prop to src. Use import { Lottie } from "lottie-react" and <Lottie src={animation} />. Code written for version 2 needs those two changes.'],
    ['Does lottie-react work with the Next.js App Router?', 'Yes. Its components are marked as client components, so you can render <Lottie> from a Server Component page without next/dynamic. The hook and refs need a "use client" component of your own.'],
    ['How do I play, pause or restart a Lottie animation in React?', 'Pass a ref with lottieRef={ref}, then call ref.current.play(), pause(), stop(), setSpeed(2) or seek({ percent: 0 }). The useLottie hook returns the same controls along with the current state.'],
    ['Should I import the Lottie JSON or load it from a URL?', 'Load it from a URL in your public folder to keep it out of your JavaScript bundle and let the browser cache it. Import it when the file is small and must appear without a network request.'],
    ['How do I make a Lottie file without After Effects?', 'Upload an SVG to Reframe, animate it with a plain-English prompt or a preset, and export Lottie JSON. It’s free, needs no account, and Lottie exports are never watermarked.'],
    ['What’s the difference between lottie-react and dotlottie-react?', 'lottie-react plays Lottie JSON files using lottie-web. @lottiefiles/dotlottie-react plays the zipped .lottie format with LottieFiles’ own player. Use the one that matches your file type.'],
  ],
  finalHeading: 'Need a Lottie file for your app?',
  finalSubhead: 'Turn any SVG into Lottie JSON in your browser. Free, no account, never watermarked.',
  breadcrumbName: 'Lottie in React',
  howToName: 'How to use a Lottie animation in React',
  howToDescription: 'Export a Lottie JSON file, install lottie-react, and render it with the Lottie component.',
}
