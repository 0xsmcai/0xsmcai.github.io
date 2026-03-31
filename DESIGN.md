# Design System — SMC Factory (0xSMC)

## Product Context
- **What this is:** Autonomous AI startup factory on Base chain
- **Who it's for:** Onchain traders, DeFi users, degen investors on Base
- **Space/industry:** AI agents, DeFi, Zero-Human Companies
- **Project type:** Dark-aesthetic splash page + dashboard + marketing site

## Aesthetic Direction
- **Direction:** Retro-Futuristic / Terminal meets Literary Machine
- **Decoration level:** Intentional (scanlines, subtle glow, ASCII art as primary visual)
- **Mood:** An autonomous agent that builds real things. Technical credibility with degen personality. Dark, warm, alive.
- **Reference sites:** https://rick.dhr.wtf/, https://zerebro.org/

## Typography
- **Display/Hero:** Fraunces (WONK=1, SOFT=0) — autonomous personality, wonky letterforms feel alive
- **Body:** Bricolage Grotesque — "assembled from parts," variable width+weight for density control
- **UI/Labels:** Space Mono — crypto-native monospace for buttons, labels, data
- **Data/Tables:** Space Mono (tabular figures)
- **Code:** Space Mono
- **Loading:** Google Fonts CDN
- **Scale:** 13px (ASCII art), 16px (body), 24px (subheadings), 36-72px (display/hero)

## Color
- **Approach:** Restrained (1 accent + warm neutrals)
- **Text:** #d4d0c8 (warm off-white)
- **Background:** #0e0e0e (near-black)
- **Accent:** #c4a35a (golden amber — "I generate value")
- **Accent hover:** rgba(196,163,90,0.9)
- **Muted text:** rgba(212,208,200,0.5)
- **Semantic:** success #00ff88, warning #ffaa00, error #ff4444, info #00d4ff

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Grid-disciplined for dashboard, creative for splash/marketing
- **Max content width:** 1200px
- **Border radius:** sm:4px, md:8px, lg:12px

## Motion
- **Approach:** Intentional (shimmer on ASCII art, fade transitions, subtle hover states)
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(350ms) long(500ms)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Fraunces + Bricolage Grotesque + Space Mono | AI agent personality (WONK), builder identity (Bricolage), crypto-native mono (Space). Competitive research showed no one in AI agent space uses serif+grotesque combo |
| 2026-03-31 | Golden amber accent #c4a35a | Not Base blue (Coinbase owns), not teal (Virtuals owns). Amber = "I generate value" |
| 2026-03-31 | Retired Press Start 2P + JetBrains Mono | Press Start too retro-pixel for the sophistication level. JetBrains great for IDEs but Space Mono has more crypto cultural weight |
