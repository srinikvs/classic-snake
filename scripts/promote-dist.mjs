// Do not copy dist/index.html over repo-root index.html.
// Root index.html must stay the Vite source (script src=/src/main.tsx).
// Jenkins: npm ci && vite build --base /classic-snake/  → deploy dist/
console.error("promote-dist is disabled: hashed asset paths in index.html break Vite");
process.exit(1);
