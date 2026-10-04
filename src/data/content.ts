// ============================================================
// CONTENT DATA — ported verbatim from the original JSX.
// ============================================================

export interface MindDrop {
  id: number;
  text: string;
  cat: string;
}

export const MIND_DROPS: MindDrop[] = [
{ id:1, text: "This moment is difficult, but it will not last forever.", cat:"sad" },
{ id:2, text: "It's okay to rest when your heart feels heavy.", cat:"sad" },
{ id:3, text: "Healing is rarely loud; sometimes it happens quietly.", cat:"sad" },
{ id:4, text: "Even the longest night eventually meets the morning.", cat:"sad" },
{ id:5, text: "You do not have to carry everything alone.", cat:"sad" },
{ id:6, text: "Breathe. You only need to handle this moment.", cat:"anxious" },
{ id:7, text: "Not every thought deserves your attention.", cat:"anxious" },
{ id:8, text: "You have survived uncertain days before.", cat:"anxious" },
{ id:9, text: "One step is enough right now.", cat:"anxious" },
{ id:10, text: "Let your breath return you to the present.", cat:"anxious" },
{ id:11, text: "Your feelings are valid; your reactions are your choice.", cat:"angry" },
{ id:12, text: "Pause before responding. Peace is powerful.", cat:"angry" },
{ id:13, text: "Anger is information, not a destination.", cat:"angry" },
{ id:14, text: "You deserve calm more than conflict.", cat:"angry" },
{ id:15, text: "Take a breath before carrying this moment forward.", cat:"angry" },
{ id:16, text: "Rest is productive too.", cat:"tired" },
{ id:17, text: "You are allowed to slow down.", cat:"tired" },
{ id:18, text: "Being tired does not mean you are failing.", cat:"tired" },
{ id:19, text: "Recovery is part of progress.", cat:"tired" },
{ id:20, text: "Give yourself the kindness you would offer a friend.", cat:"tired" },
{ id:21, text: "Peace begins in small moments.", cat:"calm" },
{ id:22, text: "Enjoy this breath. Enjoy this moment.", cat:"calm" },
{ id:23, text: "Calm is not the absence of noise; it is the presence of balance.", cat:"calm" },
{ id:24, text: "Let yourself simply be.", cat:"calm" },
{ id:25, text: "You don't need to rush through a peaceful moment.", cat:"calm" },
{ id:26, text: "Joy deserves to be noticed.", cat:"happy" },
{ id:27, text: "Let yourself celebrate small wins.", cat:"happy" },
{ id:28, text: "Happiness grows when shared.", cat:"happy" },
{ id:29, text: "This moment matters.", cat:"happy" },
{ id:30, text: "Carry this feeling with gratitude.", cat:"happy" },
{ id:31, text: "Being alone and being unloved are not the same thing.", cat:"lonely" },
{ id:32, text: "Your presence matters more than you know.", cat:"lonely" },
{ id:33, text: "Connection often arrives unexpectedly.", cat:"lonely" },
{ id:34, text: "You are part of a much larger story.", cat:"lonely" },
{ id:35, text: "Someone would be glad to hear from you today.", cat:"lonely" },
{ id:36, text: "You do not have to solve everything today.", cat:"overwhelmed" },
{ id:37, text: "One thing at a time is enough.", cat:"overwhelmed" },
{ id:38, text: "Progress happens step by step.", cat:"overwhelmed" },
{ id:39, text: "Pause. Breathe. Begin again.", cat:"overwhelmed" },
{ id:40, text: "Small actions create meaningful change.", cat:"overwhelmed" },
{ id:41, text: "Be gentle with yourself today.", cat:"general" },
{ id:42, text: "Growth takes time.", cat:"general" },
{ id:43, text: "You are allowed to start over.", cat:"general" },
{ id:44, text: "Small progress is still progress.", cat:"general" },
{ id:45, text: "Protect your peace.", cat:"general" },
{ id:46, text: "Every day is a new page.", cat:"general" },
{ id:47, text: "Your worth is not measured by productivity.", cat:"general" },
{ id:48, text: "Kindness is never wasted.", cat:"general" },
{ id:49, text: "A deep breath can change a moment.", cat:"general" },
{ id:50, text: "Trust yourself a little more.", cat:"general" },
{ id:51, text: "The future is built one day at a time.", cat:"general" },
{ id:52, text: "You have come further than you think.", cat:"general" },
{ id:53, text: "Quiet moments have value.", cat:"general" },
{ id:54, text: "Courage often looks like simply continuing.", cat:"general" },
{ id:55, text: "Take things one step at a time.", cat:"general" },
{ id:56, text: "Rest and effort can coexist.", cat:"general" },
{ id:57, text: "The best time to care for yourself is now.", cat:"general" },
{ id:58, text: "You deserve patience, especially from yourself.", cat:"general" },
{ id:59, text: "Let today be enough.", cat:"general" },
{ id:60, text: "Keep going—you are growing.", cat:"general" },
];

export const getDropsForMood = (moodLabel: string | null): MindDrop[] => {
  const map: Record<string, string> = {
    Sad: "sad", Anxious: "anxious", Angry: "angry", Tired: "tired",
    Calm: "calm", Happy: "happy", Lonely: "lonely", Overwhelmed: "overwhelmed",
  };
  const cat = moodLabel ? map[moodLabel] : undefined;
  let pool = MIND_DROPS.filter((d) => d.cat === cat);
  if (pool.length === 0) pool = MIND_DROPS.filter((d) => d.cat === "general");
  if (pool.length === 0) pool = MIND_DROPS;
  return pool;
};

export interface Mood {
  emoji: string;
  label: string;
  color: string;
  bgGlow: string;
  quote: string;
  message: string;
  affirmation: string;
  breathingRec: { id: string; label: string };
  soundRec: { id: string; label: string; icon: string };
}

export const MOODS: Mood[] = [
{ emoji:"😢", label:"Sad", color:"#7C9BFF", bgGlow:"rgba(100,130,255,0.14)", quote:"Sadness is the soul asking to be heard.", message:"It's okay to let yourself feel this. You don't have to rush through it.", affirmation:"I allow myself to feel, and in feeling, I begin to heal.", breathingRec:{id:"478",label:"Sleep & Unwind"}, soundRec:{id:"moonflow",label:"Moonflow",icon:"🌙"} },
{ emoji:"😰", label:"Anxious", color:"#CFA7FF", bgGlow:"rgba(160,120,220,0.14)", quote:"You are safe in this moment.", message:"Take a breath. Ground yourself in what's real and present right now.", affirmation:"I am safe. I am present. I can handle what comes my way.", breathingRec:{id:"grounding",label:"Ground & Release"}, soundRec:{id:"ripple",label:"Ripple",icon:"💧"} },
{ emoji:"😤", label:"Angry", color:"#FF9B7C", bgGlow:"rgba(255,120,80,0.12)", quote:"Your fire can become your fuel.", message:"Your anger is valid. Give yourself space before you act.", affirmation:"I channel my energy with wisdom and intention.", breathingRec:{id:"box",label:"Focus & Balance"}, soundRec:{id:"forest",label:"Forest Rain",icon:"🌿"} },
{ emoji:"😴", label:"Tired", color:"#A0B4C8", bgGlow:"rgba(120,150,180,0.12)", quote:"Rest is not giving up — it's showing up for tomorrow.", message:"You've given a lot. Honour your body's need for restoration.", affirmation:"I give myself permission to rest and restore.", breathingRec:{id:"478",label:"Sleep & Unwind"}, soundRec:{id:"moonflow",label:"Moonflow",icon:"🌙"} },
{ emoji:"😌", label:"Calm", color:"#A8E6CF", bgGlow:"rgba(100,200,160,0.12)", quote:"Stillness is where clarity lives.", message:"This peace you feel is real. Let yourself stay here a while.", affirmation:"I am rooted, present, and at peace.", breathingRec:{id:"basic",label:"Quick Calm"}, soundRec:{id:"aurora",label:"Aurora Drift",icon:"✨"} },
{ emoji:"✨", label:"Happy", color:"#FFD700", bgGlow:"rgba(255,200,80,0.12)", quote:"Joy is your birthright — receive it fully.", message:"Let yourself be completely, unapologetically joyful.", affirmation:"I deserve this joy and I welcome more of it.", breathingRec:{id:"basic",label:"Quick Calm"}, soundRec:{id:"aurora",label:"Aurora Drift",icon:"✨"} },
{ emoji:"🥺", label:"Lonely", color:"#B4A0FF", bgGlow:"rgba(150,130,255,0.14)", quote:"You are not alone in feeling alone.", message:"Your longing for connection is beautiful — it means you love deeply.", affirmation:"I am worthy of deep, meaningful connection.", breathingRec:{id:"grounding",label:"Ground & Release"}, soundRec:{id:"moonflow",label:"Moonflow",icon:"🌙"} },
{ emoji:"😵", label:"Overwhelmed", color:"#7CCCFF", bgGlow:"rgba(80,160,220,0.12)", quote:"You don't have to do it all. Just the next small thing.", message:"Step by step. Breath by breath. You can do this.", affirmation:"I focus on one thing at a time and trust the process.", breathingRec:{id:"box",label:"Focus & Balance"}, soundRec:{id:"forest",label:"Forest Rain",icon:"🌿"} },
];

export interface BreathingPhase {
  name: string;
  duration: number;
}

export interface BreathingMode {
  id: string;
  label: string;
  purpose: string[];
  description: string;
  pattern: string;
  phases: BreathingPhase[];
}

export const BREATHING_MODES: BreathingMode[] = [
  {
    id:"basic", label:"Quick Calm",
    purpose:["Quick relaxation","Everyday calm","Beginner-friendly"],
    description:"A simple breathing exercise to help you slow down and reset.",
    pattern:"Inhale 4s · Exhale 4s",
    phases:[{name:"Breathe in...",duration:4000},{name:"Breathe out...",duration:4000}]
  },
  {
    id:"box", label:"Focus & Balance",
    purpose:["Reduce stress","Improve focus","Regain control during anxiety"],
    description:"A structured breathing exercise designed to calm the mind, improve concentration, and help you regain a sense of balance.",
    pattern:"Inhale 4s · Hold 4s · Exhale 4s",
    phases:[{name:"Breathe in...",duration:4000},{name:"Hold...",duration:4000},{name:"Breathe out...",duration:4000}]
  },
  {
    id:"478", label:"Sleep & Unwind",
    purpose:["Overthinking","Relaxation before sleep","Emotional calming"],
    description:"A deeply calming technique designed to help you relax and let go.",
    pattern:"Inhale 4s · Hold 7s · Exhale 8s",
    phases:[{name:"Breathe in...",duration:4000},{name:"Hold...",duration:7000},{name:"Breathe out...",duration:8000}]
  },
  {
    id:"grounding", label:"Ground & Release",
    purpose:["Anxiety","Feeling overwhelmed","Racing thoughts"],
    description:"A gentle breathing exercise that encourages relaxation through longer exhales.",
    pattern:"Inhale 3s · Exhale 6s",
    phases:[{name:"Breathe in...",duration:3000},{name:"Breathe out...",duration:6000}]
  },
];

export interface SoundDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SOUNDS: SoundDef[] = [
{ id:"ripple", label:"Ripple", icon:"💧", description:"Still water resonance" },
{ id:"moonflow",label:"Moonflow", icon:"🌙", description:"Dreamy piano & cosmos" },
{ id:"aurora", label:"Aurora Drift", icon:"✨", description:"Soft celestial tones" },
{ id:"forest", label:"Forest Rain", icon:"🌿", description:"Gentle woodland rain" },
{ id:"innerglow",label:"Inner Glow", icon:"☀️", description:"Warm healing frequencies" },
];

export const CEO_EMAIL = "baanikaursethi27@gmail.com";
