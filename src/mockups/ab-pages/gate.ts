// Runs before the first paint. It marks the page as "motion will run", which lets the stylesheet
// hold the home page's opening state until the motion code (loaded after first paint) takes over.
// No class is added for visitors who prefer reduced motion, and if the motion code has not started
// within 2.5 s the class is removed again, so nothing can stay hidden.
export const MOTION_GATE = `(function(){var d=document.documentElement;try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){return}d.classList.add('has-motion');setTimeout(function(){if(!window.__dastaMotion)d.classList.remove('has-motion')},2500)})()`;
