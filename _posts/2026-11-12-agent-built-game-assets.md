---
layout: post
title: "Rebuilding an AI Shooter: 4.7 Agent-Hours vs. 50–80 Person-Days"
date: 2026-11-12
description: "I replicated a published turntable → Blender → Unreal game pipeline with Claude Code, end to end and unattended: about $68 and 4.7 agent-hours for work estimated at 50–80 person-days by hand, at prototype quality. Integration is solved; art quality is the gap."
image: /assets/agent-built-game-assets/og.jpg
permalink: /agent-built-game-assets/
bibtex_key: yang2026agentgameassets
---
{% assign a = '/assets/agent-built-game-assets' | relative_url %}

<figure>
  <video src="{{ a }}/video/ue-gameplay.mp4" poster="{{ a }}/img/ue-video-poster.jpg" controls muted playsinline preload="metadata"></video>
  <figcaption>The end result: a UE5 arena with a boss fight, built from a turntable video by unattended coding-agent runs. 36 s of the game's own autoplay bot, wave 3 through the boss kill.</figcaption>
</figure>

<div class="tldr" markdown="1">
**TL;DR.** Rebuilt Higgsfield's AI-made shooter (monsters, a rifle, a level and a UE5 boss fight) using Claude Code on one Mac mini, unattended. Cost: about 4.7 hours and $68. By hand: an estimated 50–80 person-days and $21,000–55,000. Potential gap: the result has not yet been compared against hand-made art or tested with players. But promising: every step ran from prompts alone, so going from a game idea to something playable can take hours instead of weeks.
</div>

**Key results at a glance**

- **Hours, not weeks.** All the assets and both games took about 4.7 hours and $68 of agent time, against an estimated 50–80 days of work by hand.
- **A reference video helps with shape, not counting.** The monster built from the turntable video followed its shape, but the video drew too few legs, so the leg count had to come from the text.
- **The agent can rig a model it didn't build.** Adding a skeleton and animations to a ready-made Tripo model cost about the same as building one from scratch.
- **The models work in real games.** They went into a browser game and into Unreal Engine 5 without hand fixes, running at 50–60 frames per second.
- **The agent checks its work from screenshots only.** It never watched its animations play, so problems that show only in motion can slip through.

## Motivation

This study is inspired by Higgsfield's post <a href="https://higgsfield.ai/@higgsfield.studio/blogs/fable-5-2-built-a-playable-shooter-in-3-5-hours">"Fable 5.2 Built a Playable Sci-Fi Shooter in 3.5 Hours"</a>, which shows Claude Code turning videos of each monster into 3D models and then into an Unreal Engine 5 game, shared as one prompt and a 25-second clip. The goal here is to measure what that demo doesn't show: what the pipeline costs, how long each step takes, how many tries it needs, and whether the models work in real games when no one is helping.


## Coding Agent for Game Pipeline

The pipeline runs from a turntable video through 3D assets and rigging to two playable games, each box one unattended agent run.

<figure class="pipeline-graph" markdown="0">
<p class="scroll-hint">Scroll sideways to see the whole graph →</p>
<div class="graph-scroll">
<svg class="graph" viewBox="0 0 800 528" role="img" aria-labelledby="pg-title pg-desc">
<title id="pg-title">Coding-agent game pipeline</title>
<desc id="pg-desc">Each box is one unattended agent run with its time, cost and number of self-fix rounds. Arrows show which run's output fed which. Grey boxes were built only for comparison.</desc>
<defs><marker id="pg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="pg-head"/></marker></defs>
<text x="20" y="16" class="pg-col">Reference</text>
<text x="220" y="16" class="pg-col">3D assets</text>
<text x="420" y="16" class="pg-col">Rigging</text>
<text x="620" y="16" class="pg-col">Games</text>
<path d="M190,195.0 C205.0,195.0 205.0,129.0 218,129.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M190,195.0 C205.0,195.0 205.0,261.0 218,261.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,261.0 C405.0,261.0 405.0,261.0 418,261.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,129.0 C505.0,129.0 505.0,129.0 618,129.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,195.0 C505.0,195.0 505.0,129.0 618,129.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M590,261.0 C605.0,261.0 605.0,129.0 618,129.0" class="pg-edge pg-dash" marker-end="url(#pg-arrow)"/>
<path d="M390,129.0 C505.0,129.0 505.0,261.0 618,261.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M590,261.0 C605.0,261.0 605.0,261.0 618,261.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,195.0 C505.0,195.0 505.0,261.0 618,261.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M705.0,290 L705.0,395" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,393.0 C505.0,393.0 505.0,426.0 618,426.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<path d="M390,459.0 C505.0,459.0 505.0,426.0 618,426.0" class="pg-edge" marker-end="url(#pg-arrow)"/>
<g class="pg-node pg-main"><rect x="20" y="166" width="170" height="58" rx="8"/>
<text x="30" y="184" class="pg-t">Turntable video</text>
<text x="30" y="200" class="pg-m">Kling v4 · 4 min · $2.35</text>
<text x="30" y="216" class="pg-r">no self-fix rounds</text>
</g>
<g class="pg-node pg-cmp"><rect x="220" y="34" width="170" height="58" rx="8"/>
<text x="230" y="52" class="pg-t">Monster, text only</text>
<text x="230" y="68" class="pg-m">Blender · 8.7 min · $3.47</text>
<circle cx="234" cy="80" r="3.2" class="pg-dot"/>
<circle cx="243" cy="80" r="3.2" class="pg-dot"/>
<circle cx="252" cy="80" r="3.2" class="pg-dot"/>
<circle cx="261" cy="80" r="3.2" class="pg-dot"/>
<text x="272" y="84" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="220" y="100" width="170" height="58" rx="8"/>
<text x="230" y="118" class="pg-t">Monster, from video</text>
<text x="230" y="134" class="pg-m">Blender · 13.1 min · $5.15</text>
<circle cx="234" cy="146" r="3.2" class="pg-dot"/>
<circle cx="243" cy="146" r="3.2" class="pg-dot"/>
<circle cx="252" cy="146" r="3.2" class="pg-dot"/>
<circle cx="261" cy="146" r="3.2" class="pg-dot"/>
<text x="272" y="150" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="220" y="166" width="170" height="58" rx="8"/>
<text x="230" y="184" class="pg-t">Rifle + arms</text>
<text x="230" y="200" class="pg-m">Blender · 35.8 min · $8.42</text>
<circle cx="234" cy="212" r="3.2" class="pg-dot"/>
<circle cx="243" cy="212" r="3.2" class="pg-dot"/>
<circle cx="252" cy="212" r="3.2" class="pg-dot"/>
<circle cx="261" cy="212" r="3.2" class="pg-dot"/>
<text x="272" y="216" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="220" y="232" width="170" height="58" rx="8"/>
<text x="230" y="250" class="pg-t">Monster, video frame</text>
<text x="230" y="266" class="pg-m">Tripo · 1.6 min · $1.10</text>
<text x="230" y="282" class="pg-r">no self-fix rounds</text>
</g>
<g class="pg-node pg-cmp"><rect x="220" y="298" width="170" height="58" rx="8"/>
<text x="230" y="316" class="pg-t">Monster, text</text>
<text x="230" y="332" class="pg-m">Tripo · 1.7 min · $1.10</text>
<text x="230" y="348" class="pg-r">no self-fix rounds</text>
</g>
<g class="pg-node pg-main"><rect x="220" y="364" width="170" height="58" rx="8"/>
<text x="230" y="382" class="pg-t">Level kit</text>
<text x="230" y="398" class="pg-m">Blender · 56 min · $6.48</text>
<circle cx="234" cy="410" r="3.2" class="pg-dot"/>
<circle cx="243" cy="410" r="3.2" class="pg-dot"/>
<circle cx="252" cy="410" r="3.2" class="pg-dot"/>
<text x="263" y="414" class="pg-r">3</text>
</g>
<g class="pg-node pg-main"><rect x="220" y="430" width="170" height="58" rx="8"/>
<text x="230" y="448" class="pg-t">Boss</text>
<text x="230" y="464" class="pg-m">Blender · 31 min · $7.30</text>
<circle cx="234" cy="476" r="3.2" class="pg-dot"/>
<circle cx="243" cy="476" r="3.2" class="pg-dot"/>
<circle cx="252" cy="476" r="3.2" class="pg-dot"/>
<circle cx="261" cy="476" r="3.2" class="pg-dot"/>
<text x="272" y="480" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="420" y="232" width="170" height="58" rx="8"/>
<text x="430" y="250" class="pg-t">Rig + animate mesh</text>
<text x="430" y="266" class="pg-m">Blender · 10.7 min · $4.76</text>
<circle cx="434" cy="278" r="3.2" class="pg-dot"/>
<circle cx="443" cy="278" r="3.2" class="pg-dot"/>
<circle cx="452" cy="278" r="3.2" class="pg-dot"/>
<circle cx="461" cy="278" r="3.2" class="pg-dot"/>
<text x="472" y="282" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="620" y="100" width="170" height="58" rx="8"/>
<text x="630" y="118" class="pg-t">three.js shooter</text>
<text x="630" y="134" class="pg-m">browser · 17.6 min · $4.63</text>
<circle cx="634" cy="146" r="3.2" class="pg-dot"/>
<circle cx="643" cy="146" r="3.2" class="pg-dot"/>
<circle cx="652" cy="146" r="3.2" class="pg-dot"/>
<circle cx="661" cy="146" r="3.2" class="pg-dot"/>
<text x="672" y="150" class="pg-r">4</text>
</g>
<g class="pg-node pg-main"><rect x="620" y="232" width="170" height="58" rx="8"/>
<text x="630" y="250" class="pg-t">UE5 greybox arena</text>
<text x="630" y="266" class="pg-m">Unreal 5.8 · 33 min · $9.07</text>
<circle cx="634" cy="278" r="3.2" class="pg-dot"/>
<circle cx="643" cy="278" r="3.2" class="pg-dot"/>
<circle cx="652" cy="278" r="3.2" class="pg-dot"/>
<circle cx="661" cy="278" r="3.2" class="pg-dot"/>
<circle cx="670" cy="278" r="3.2" class="pg-dot"/>
<circle cx="679" cy="278" r="3.2" class="pg-dot"/>
<circle cx="688" cy="278" r="3.2" class="pg-dot"/>
<circle cx="697" cy="278" r="3.2" class="pg-dot"/>
<circle cx="706" cy="278" r="3.2" class="pg-dot"/>
<circle cx="715" cy="278" r="3.2" class="pg-dot"/>
<text x="726" y="282" class="pg-r">10</text>
</g>
<g class="pg-node pg-main"><rect x="620" y="397" width="170" height="58" rx="8"/>
<text x="630" y="415" class="pg-t">UE5 art pass + boss</text>
<text x="630" y="431" class="pg-m">Unreal 5.8 · 77 min · $14.12</text>
<circle cx="634" cy="443" r="3.2" class="pg-dot"/>
<circle cx="643" cy="443" r="3.2" class="pg-dot"/>
<circle cx="652" cy="443" r="3.2" class="pg-dot"/>
<circle cx="661" cy="443" r="3.2" class="pg-dot"/>
<circle cx="670" cy="443" r="3.2" class="pg-dot"/>
<circle cx="679" cy="443" r="3.2" class="pg-dot"/>
<circle cx="688" cy="443" r="3.2" class="pg-dot"/>
<circle cx="697" cy="443" r="3.2" class="pg-dot"/>
<circle cx="706" cy="443" r="3.2" class="pg-dot"/>
<circle cx="715" cy="443" r="3.2" class="pg-dot"/>
<circle cx="724" cy="443" r="3.2" class="pg-dot"/>
<text x="735" y="447" class="pg-r">11</text>
</g>
<circle cx="26" cy="510" r="3.2" class="pg-dot"/><text x="34" y="514" class="pg-r">= one self-fix round</text>
<rect x="170" y="503" width="16" height="11" rx="3" class="pg-legend-cmp"/><text x="192" y="514" class="pg-r">comparison only</text>
<path d="M300,510 L330,510" class="pg-edge pg-dash"/><text x="336" y="514" class="pg-r">monster switch added later by the supervising session</text>
</svg>
</div>
<figcaption>Totals: 290 minutes and $67.95, all on one Mac mini. The level kit and boss ran in parallel. The rifle run also wired the rifle into the three.js game.</figcaption>
</figure>

## Setup

I chose what to build, which routes to compare and when to stop. A separate Claude Code session, which I call the supervising session, turned those choices into prompts and launched the runs. Every asset and game came from headless `claude -p` runs on Fable 5.2, fully unattended once launched, all on one Mac mini (Apple M5, 16 GB). Each run builds, renders, checks its own pictures and fixes what is wrong, round after round. Claude costs are API-equivalent prices; fal costs are what fal billed. Prompts are in the appendix.

## 1. Reference: the turntable video

Kling made the turntable in one take (4 min, $2.35), but drew three or four legs per side instead of five. Rather than retry, the modeling prompt says the text wins on anything countable: use video for shape, text for counts.

<figure>
  <video src="{{ a }}/video/turntable.mp4" poster="{{ a }}/img/turntable-poster.jpg" controls loop muted playsinline preload="none"></video>
  <figcaption>The Kling v4 turntable: consistent all the way around, wrong leg count.</figcaption>
</figure>

## 2. 3D assets

### The monster, four ways

Same monster, same prompt, four routes. Only the Blender routes produce a skeleton and animations; Tripo is fastest but its meshes cannot move on their own.

<div class="grid">
  <figure><img src="{{ a }}/img/compare-ref.jpg" alt="Frame from the Kling turntable video" loading="lazy"><figcaption><b>Reference</b> frame</figcaption></figure>
  <figure><img src="{{ a }}/img/compare-blender-video.jpg" alt="Blender model built while watching the video" loading="lazy"><figcaption><b>Blender, from video</b></figcaption></figure>
  <figure><img src="{{ a }}/img/compare-blender-text.jpg" alt="Blender model built from text only" loading="lazy"><figcaption><b>Blender, text only</b></figcaption></figure>
  <figure><img src="{{ a }}/img/compare-tripo-image.jpg" alt="Tripo model generated from one video frame" loading="lazy"><figcaption><b>Tripo, video frame</b></figcaption></figure>
  <figure><img src="{{ a }}/img/compare-tripo-text.jpg" alt="Tripo model generated from text" loading="lazy"><figcaption><b>Tripo, text</b></figcaption></figure>
</div>

<div class="table-wrap" markdown="1">

| Route | Time | Cost | Self-fix rounds | What came out |
|---|---|---|---|---|
| Blender, text only | 8.7 min | $3.47 | 4 | 10 legs, 3.9k triangles, skeleton, walk and die |
| Blender, from video | 13.1 min | $5.15 | 4 | 10 legs, 10.3k triangles, skeleton, walk and die |
| Tripo, text | 1.7 min | $1.10 | – | textured mesh, no skeleton |
| Tripo, video frame | 1.6 min | $1.10 | – | textured mesh, 6 legs, no skeleton |

</div>

<div class="embed" data-src="{{ a }}/viewer/index.html" data-title="3D viewer for the four Scuttler models">
  <img class="cover" src="{{ a }}/img/viewer-poster.jpg" alt="Front view of the Blender Scuttler" loading="lazy">
  <button type="button">Rotate the four models (≈8 MB)</button>
</div>
<p class="footnote">Viewer lighting and scaling were added for this page, not by the agent.</p>

### Rifle, level kit and boss

The rifle with arms was the most expensive asset (35.8 min, $8.42); the run also wired it into the three.js game. The level kit (56 min, $6.48) and boss (31 min, $7.30, 59 bones, joints rigidly attached) ran in parallel for the Unreal art pass.

<figure><img src="{{ a }}/img/rifle-reload.jpg" alt="Reload in game: left hand pulling the magazine" loading="lazy"><figcaption>Rifle reload in the game.</figcaption></figure>
<figure><img src="{{ a }}/img/ue-kit.jpg" alt="The Blender level kit pieces" loading="lazy"><figcaption>The 12-piece level kit in Blender.</figcaption></figure>

## 3. Rigging: a generated mesh

The agent added a skeleton and walk and die animations to Tripo's mesh without remodeling it (10.7 min, $4.76). With Tripo's fee that is $5.86, about the same as modeling from scratch, and it is lighter to render. Rigging cannot fix shape: the mesh kept the video frame's six legs.

<div class="grid">
  <figure><img src="{{ a }}/img/tripo-v0.jpg" alt="The raw Tripo mesh" loading="lazy"><figcaption>Input: no skeleton.</figcaption></figure>
  <figure><img src="{{ a }}/img/tripo-walk.jpg" alt="The rigged Tripo mesh mid-walk" loading="lazy"><figcaption>Walk.</figcaption></figure>
  <figure><img src="{{ a }}/img/tripo-die-close.jpg" alt="Close-up of the knee crease in the death pose" loading="lazy"><figcaption>Die: knees crease when bent.</figcaption></figure>
</div>

## 4. Games

### three.js shooter

The agent built a browser shooter around its monster and play-tested it with a bot (17.6 min, $4.63). Things checkable in a screenshot came out right; things only visible in motion did not.

<div class="embed" data-src="{{ a }}/game/index.html" data-title="Scuttler Swarm, a three.js shooter built by the agent">
  <img class="cover" src="{{ a }}/img/game-poster.jpg" alt="First-person view firing the rifle at Scuttlers" loading="lazy">
  <button type="button">Play in the browser (≈10 MB)</button>
</div>
<p class="footnote">Desktop: WASD, mouse, click or Space to fire, R to reload. Or open <a href="{{ a }}/game/index.html?enemy=tripo" target="_blank" rel="noopener">the Tripo monster</a> or <a href="{{ a }}/game/index.html?auto=1" target="_blank" rel="noopener">watch the bot</a> in a new tab. The Tripo switch was added later by the supervising session.</p>

<div class="table-wrap" markdown="1">

| Check | Measured |
|---|---|
| Scale and direction | no fix needed |
| Foot slip | 0.009 m/s |
| 20 monsters at once | 50 fps (measured by the supervising session on the Mac mini) |
| Death animation | body sinks 15 cm, legs stay planted |
| Idle, attack, hit animations | none made |

</div>

### Unreal

The supervising session installed Unreal, solved four macOS setup issues once, and wrote a wrapper so a run could build and play without opening a window. The greybox run (33 min, $9.07, 10 rounds) imported all three models intact and hit 57.9 fps with 0 errors. The art pass (77 min, $14.12, 11 rounds) added the kit, the boss, effects and the video at the top, at 55–60 fps with Lumen off.<sup>1</sup> The supervising session re-ran both and got matching results.

<figure><img src="{{ a }}/img/ue-play-55.jpg" alt="Unreal greybox bot run at 55 seconds" loading="lazy"><figcaption>Greybox build, bot run at 55 s.</figcaption></figure>
<figure><img src="{{ a }}/img/ue-boss-roar.jpg" alt="The boss roaring on entry" loading="lazy"><figcaption>Art pass: the boss enters.</figcaption></figure>
<figure><img src="{{ a }}/img/ue-weak-point.jpg" alt="Hitting a glowing weak point on the boss's back" loading="lazy"><figcaption>Art pass: hitting a weak point on her back.</figcaption></figure>

## Cost: agent vs. by hand

<div class="table-wrap" markdown="1">

| What was built | Agent time | Agent cost | By hand (person-days) |
|---|---:|---:|---:|
| Turntable video (Kling) | 4 min | $2.35 | – |
| Monster, from video (Blender) | 13.1 min | $5.15 | 6–8 |
| Monster, text only (Blender, comparison) | 8.7 min | $3.47 | – |
| Tripo meshes ×2 | 3.3 min | $2.20 | – |
| Second monster: rig the Tripo mesh | 10.7 min | $4.76 | 2–3 |
| Rifle and arms | 35.8 min | $8.42 | 8–12 |
| Level kit, 12 pieces | 56 min | $6.48 | 8–12 |
| Boss | 31 min | $7.30 | 13–20 |
| three.js game | 17.6 min | $4.63 | – |
| Unreal greybox: gameplay code and bot tests | 33 min | $9.07 | 8–12 |
| Unreal art pass: level, lighting, effects, video | 77 min | $14.12 | 7–11 |
| **Total** | **4.8 h** | **$67.95** | **about 50–80** |

</div>

Agent cost is $63.40 of Claude at API-equivalent prices plus $4.55 billed by fal; it leaves out installing Unreal, the supervising session and my time. By-hand figures are estimates from typical industry hours for mid-level indie work, not quotes, and come to roughly $21,000–55,000 at freelance rates. The agent's output is at prototype quality; reaching a shippable bar would take an estimated 30–50% of the manual art effort.

## Limitations and next steps

- **One run per route**, so no error bars.
- **Kling, not the Higgsfield MCP**, for the video.
- **No human evaluation** of how the models look.
- **Self-checks from stills only**; next, let runs watch their own animations.
- **No browser build of the Unreal game** yet (UE 5.9's web target is experimental).

<p class="footnote"><sup>1</sup> The first art-pass attempt was stopped after 16 minutes by the computer's memory manager because an old 7 GB editor was still open; it was restarted unchanged.</p>

<p class="footnote">This post was drafted by Claude and reviewed and edited by me.</p>

<section id="appendix-prompts" markdown="0">
<h2>Appendix: prompts</h2>
{% include prompts-agent-built-game-assets.html %}
</section>
