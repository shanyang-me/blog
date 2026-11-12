---
layout: post
title: "Rebuilding an AI Shooter: 4.7 Agent-Hours vs. 50–80 Person-Days"
subtitle: "Monsters, a rifle, a level and a UE5 boss fight for about $68, built unattended by a coding agent at prototype quality."
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

- **Hours instead of weeks, at prototype quality.** Every asset, both games and the level ran unattended for about 4.7 agent-hours and $68, against an estimated 50–80 person-days of manual work. The comparison holds for prototyping, not for shippable art.
- **Video reference helps, but only for shape.** With an identical prompt, the Blender agent that watched the turntable built a clearly better monster than the one that only read the text ($5.15 vs $3.47). Countable features (leg count) had to be overridden by the text.
- **Generated mesh + agent rig beat agent modeling.** Rigging a Tripo mesh cost $4.76 and 11 minutes, kept the far better surface, and drew in one call instead of five.
- **The assets survive real engines.** In a three.js shooter the Blender monster needed no scale or orientation fix and its feet slipped 0.009 m/s. In Unreal, all three GLBs imported with skeletons and clips intact, and a headless greybox build hit 57.9 fps with 0 errors.
- **The agent checks its own work, but only in stills.** Every run rendered, inspected and fixed its output for up to four rounds (ten in Unreal) without help. No run ever watched its animations in motion, and that is where the remaining defects are.

## What Higgsfield showed, and what it leaves out

Higgsfield's post <a href="https://higgsfield.ai/@higgsfield.studio/blogs/fable-5-2-built-a-playable-shooter-in-3-5-hours">"Fable 5.2 Built a Playable Sci-Fi Shooter in 3.5 Hours"</a> shows Claude Code turning a 360° turntable video of each enemy into Blender models and rigs, and then into an Unreal Engine 5 shooter through one long, five-part prompt. It is a striking demo, but it leaves out what anyone deciding whether to use this pipeline would need to know. Only the Unreal prompt is the one actually used; the other steps come with starter prompts written for readers. The result is shown as a 25-second clip. There is no record of what it cost, how many attempts each step took, how much a person steered, or whether the assets hold up inside a game. This study fills those gaps: it re-runs the pipeline unattended on one of the article's enemies, compares it with simpler routes to the same asset, and logs time, cost and every self-correction at each stage.

<figure class="pipeline" markdown="0">
<div class="pipe">
  <div class="stage">
    <div class="stage-head"><b>1. Turntable video</b><span>Kling v4 on fal</span></div>
    <div class="metric"><span class="k">Time</span><span class="bar"><i style="width:3%"></i></span><span class="v">4 min</span></div>
    <div class="metric"><span class="k">Cost</span><span class="bar cost"><i style="width:6%"></i></span><span class="v">$2.35</span></div>
    <ul class="runs"><li><span class="run">Scuttler turntable</span><span class="dots" aria-label="0 self-fix rounds">–</span><span class="rn">0</span></li></ul>
  </div>
  <div class="arrow" aria-hidden="true">→</div>
  <div class="stage">
    <div class="stage-head"><b>2. 3D assets</b><span>Blender + Tripo</span></div>
    <div class="metric"><span class="k">Time</span><span class="bar"><i style="width:100%"></i></span><span class="v">158.6 min</span></div>
    <div class="metric"><span class="k">Cost</span><span class="bar cost"><i style="width:100%"></i></span><span class="v">$37.78</span></div>
    <ul class="runs"><li><span class="run">Scuttler, from video</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li><li><span class="run">Scuttler, text only</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li><li><span class="run">Tripo meshes ×2</span><span class="dots" aria-label="0 self-fix rounds">–</span><span class="rn">0</span></li><li><span class="run">Tripo mesh rig</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li><li><span class="run">Rifle + arms</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li><li><span class="run">Level kit</span><span class="dots" aria-label="3 self-fix rounds">●●●</span><span class="rn">3</span></li><li><span class="run">Boss</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li></ul>
  </div>
  <div class="arrow" aria-hidden="true">→</div>
  <div class="stage">
    <div class="stage-head"><b>3. three.js game</b><span>browser FPS</span></div>
    <div class="metric"><span class="k">Time</span><span class="bar"><i style="width:11%"></i></span><span class="v">17.6 min</span></div>
    <div class="metric"><span class="k">Cost</span><span class="bar cost"><i style="width:12%"></i></span><span class="v">$4.63</span></div>
    <ul class="runs"><li><span class="run">Game build</span><span class="dots" aria-label="4 self-fix rounds">●●●●</span><span class="rn">4</span></li></ul>
  </div>
  <div class="arrow" aria-hidden="true">→</div>
  <div class="stage">
    <div class="stage-head"><b>4. Unreal game</b><span>UE 5.8, headless</span></div>
    <div class="metric"><span class="k">Time</span><span class="bar"><i style="width:69%"></i></span><span class="v">110 min</span></div>
    <div class="metric"><span class="k">Cost</span><span class="bar cost"><i style="width:61%"></i></span><span class="v">$23.19</span></div>
    <ul class="runs"><li><span class="run">Greybox arena</span><span class="dots" aria-label="10 self-fix rounds">●●●●●●●●●●</span><span class="rn">10</span></li><li><span class="run">Art pass</span><span class="dots" aria-label="11 self-fix rounds">●●●●●●●●●●●</span><span class="rn">11</span></li></ul>
  </div>
</div>
<figcaption>The pipeline as re-run here. Bars compare time and cost across stages (longest stage = full bar). Dots are self-fix rounds: each round the run rendered or played its own output, found a problem and fixed it, with no person involved. Totals: 290 minutes and $67.95. Stage 2 includes the rifle run's game integration; the level kit and boss ran in parallel.</figcaption>
</figure>

## Setup

**Who did what.** I designed the experiment and made the decisions: which routes to compare, when to stop, what to build next. A supervising Claude Code session wrote the prompts, launched the runs, re-ran key checks and assembled the raw report. Every asset, game and level in this post was produced by headless `claude -p` runs on Fable 5.2, each working alone in its own folder with no one watching. Every run was fully unattended once launched. When I write "verified" below, I say who verified it.

**The creature.** All routes target the same enemy from the article, the Scuttler: "a ten-legged alien swarm enemy like a giant armored tick", low and heavy, with a domed charcoal shell split down the front, five clawed legs per side, no eyes and a bristled mouth.

**Tools.** The turntable came from Kling v4 on fal (10 s, 21:9, 1080p) instead of the Higgsfield MCP. The generative 3D baseline was Tripo P2, also through fal. Modeling and rigging used Blender 5.3 in background mode, the game used three.js 0.170.0, and the engine was Unreal Engine 5.8.4. Everything, from the Blender runs to the Unreal builds, ran on a single Mac mini (Apple M5, 16 GB of memory); no cloud GPUs.

**The loop.** Every run had the same contract: build the asset, render it from fixed cameras with a shared script, look at the PNGs, fix what is wrong, and log each round in a `rounds.md`. Runs stopped when the result matched the reference or after four rounds (ten for the Unreal build). Costs are the `total_cost_usd` that `claude -p` reports, which is API-equivalent pricing; fal costs are what fal actually billed. All prompts are in the appendix.

## Five routes to one monster

The core comparison holds the creature and the self-check loop fixed and varies only the route:

<div class="grid">
  <figure><img src="{{ a }}/img/compare-ref.jpg" alt="Frame from the Kling turntable video" loading="lazy"><figcaption><b>Reference</b>: turntable frame at 2 s</figcaption></figure>
  <figure><img src="{{ a }}/img/compare-blender-video.jpg" alt="Blender model built while watching the video" loading="lazy"><figcaption><b>Blender, from video</b>: 10.3k tris, 45 bones</figcaption></figure>
  <figure><img src="{{ a }}/img/compare-blender-text.jpg" alt="Blender model built from text only" loading="lazy"><figcaption><b>Blender, text only</b>: 3.9k tris, 33 bones</figcaption></figure>
  <figure><img src="{{ a }}/img/compare-tripo-image.jpg" alt="Tripo model generated from one video frame" loading="lazy"><figcaption><b>Tripo, video frame</b>: 5.4k faces, no rig</figcaption></figure>
  <figure><img src="{{ a }}/img/compare-tripo-text.jpg" alt="Tripo model generated from text" loading="lazy"><figcaption><b>Tripo, text</b>: 4.9k faces, no rig</figcaption></figure>
</div>

<div class="table-wrap" markdown="1">

| Route | Time | Cost | Self-fix rounds | Size | Rig / clips | Verdict |
|---|---|---|---|---|---|---|
| Turntable video (Kling v4) | ~4 min | $2.35 | one take | – | – | consistent 360°, wrong leg count and body shape |
| Blender, text only | 8.7 min | $3.47 | 4 | 3.9k tris | 33 bones, walk + die | every part present, flat programmer art |
| **Blender, from video** | 13.1 min | $5.15 | 4 | 10.3k tris | 45 bones, walk + die | closest to the design: hooked claws, normal map, video proportions |
| Tripo P2, text | 1.7 min | $1.10 | – | 4.9k faces | none | richest surface, drifted to brown |
| Tripo P2, video frame | 1.6 min | $1.10 | – | 5.4k faces | none | follows the video, including its mistakes |

</div>

The two Blender arms received the same prompt except for one line pointing at the video. The video arm cost $1.68 more and took four minutes longer, and it was the only from-scratch result that looked designed rather than assembled. Both arms spent all four rounds fixing things they could see in renders: a shell that was not round enough, a tail that showed the belly, a death pose with feet through the floor, an animation timeline that would have left an empty gap in three.js. Nobody intervened in either run.

Tripo produced the best surfaces in under two minutes, but a static mesh is a prop, not an enemy. Without a skeleton it cannot walk or die, which rules it out on its own. You can orbit all four models below; walk and die play for the rigged ones.

<div class="embed" data-src="{{ a }}/viewer/index.html" data-title="3D viewer for the four Scuttler models">
  <img class="cover" src="{{ a }}/img/viewer-poster.jpg" alt="Front view of the Blender Scuttler" loading="lazy">
  <button type="button">Load the 3D viewer (≈8 MB)</button>
</div>
<p class="footnote">The viewer's lighting and environment map were added for this page, not made by the agent: the raw albedos are close to black, and Tripo meshes arrive at arbitrary scale, so every model is normalised to about 1.4 m long.</p>

## Video models can't count

The turntable itself was the most instructive failure. Kling produced a smooth, consistent 360° orbit in one take: front and back agree, the mouth and bristles are right. It also drew three or four legs per side and a tall, round shell, so the "low, heavy" tick became something closer to a dung beetle.

<figure>
  <video src="{{ a }}/video/turntable.mp4" poster="{{ a }}/img/turntable-poster.jpg" controls loop muted playsinline preload="none"></video>
  <figcaption>Kling v4 turntable: 10 s, 21:9, one take, recompressed for the web.</figcaption>
</figure>
<figure>
  <img src="{{ a }}/img/contact.jpg" alt="Twelve frames sampled from the turntable video" loading="lazy">
  <figcaption>One frame every 0.83 s. The orbit is consistent; the leg count is not what the prompt asked for.</figcaption>
</figure>

Leg count is a countable feature, and video models are known to be weak at counting. The video was not re-rolled, because how many tries it takes to get five legs is unbounded. Instead the Blender prompt says that where the video and the text disagree on leg count, the text wins. The video arm followed that rule and modelled ten legs while copying everything else from the footage.

This is the general lesson. A turntable is a good reference for silhouette, proportion and surface character, and a bad spec for anything you could count or measure. Those belong in text, and the prompt has to say which source wins when they conflict. Tripo has no such override. Generated from a single video frame, its mesh came out with six legs: the frame already showed too few, and Tripo dropped a few more.

## Does it survive a real game?

Loading a GLB and playing its clips proves little. The real question is whether an asset holds up when a game drives it, so another headless run built a three.js first-person shooter around the video-arm Scuttler: a 40 × 40 m station deck, three waves of 6, 12 and 20 enemies, three hits to kill. The agent played its own game through headless Chrome with a bot mode, inspected screenshots, and fixed things for four rounds (17.6 minutes, $4.63).

<div class="embed" data-src="{{ a }}/game/index.html" data-title="Scuttler Swarm, a three.js shooter built by the agent">
  <img class="cover" src="{{ a }}/img/game-poster.jpg" alt="First-person view firing the rifle at Scuttlers" loading="lazy">
  <button type="button">Play in the browser (≈10 MB)</button>
</div>
<p class="footnote">Desktop only: WASD to move, click to aim with the mouse, left click or Space to fire, R to reload. Open <a href="{{ a }}/game/index.html?enemy=tripo" target="_blank" rel="noopener">the Tripo monster version</a> or <a href="{{ a }}/game/index.html?auto=1" target="_blank" rel="noopener">watch the bot play</a> (works on phones) in a new tab. This build already includes the rifle from the next section. The Tripo switch was added afterwards by the supervising session; everything else is the agent's output.</p>

The agent's own split of what worked is a fair summary of how an asset fails in a game:

<div class="table-wrap" markdown="1">

| Check | Result | Notes |
|---|---|---|
| Scale and orientation | usable as is | scale 1.0, faces +Z as its build log claimed; reads as a waist-high crab from 1.7 m eye height |
| Foot slip | 0.009 m/s | with walk speed set to speed / 0.6, the stride the modeling run reported; at 0.56 it rose to 0.127 m/s |
| Crowds | 50 fps with 20 alive | 72–112 draw calls, 145k–207k triangles; real-GPU numbers measured by the supervising session on the Mac mini in Chrome, since the agent's own runs were software-rendered |
| Death clip | too weak | the body sinks 15 cm and the legs stay planted; it reads as resting, not dying |
| Missing clips | none made | no idle, attack, turn or hit reaction; queued enemies freeze mid-stride |
| Colour | too dark | base colours of 0.012–0.045 linear vanish on a dark deck |
| Draw calls | 5 per enemy | five materials; one atlas would make 20 enemies cost 20 calls |

</div>

<div class="grid">
  <figure><img src="{{ a }}/img/game-swarm.jpg" alt="Twenty Scuttlers surrounding the player" loading="lazy"><figcaption>Twenty alive, 50 fps on the Mac mini's GPU.</figcaption></figure>
  <figure><img src="{{ a }}/img/game-die-sheet.jpg" alt="Eight phases of the death animation, nearly identical" loading="lazy"><figcaption>The die clip by phase: eight nearly identical frames.</figcaption></figure>
</div>

The pattern is consistent. What can be checked from one still frame (scale, facing, stride length, feet on the ground) the agent got right. What only shows up in motion or in context (a death that does not read, a missing attack, colours that disappear against the floor) it missed, because its loop only looks at stills. That is a property of the harness, not the model, and it is the cheapest thing on this list to fix.

## A first-person rifle

The article's one admitted rework was the weapon, which makes sense: it is on screen the whole time. A run got the same job: a sci-fi rifle held by two arms, rigged, with draw, idle, fire and reload clips. It was then told to replace the grey placeholder gun in the game itself.

It worked, and it was the most expensive asset in the experiment: 35.8 minutes and $8.42 against an estimate of $5. The result is cheap to render (4.2k triangles, 2 draw calls) and mechanically correct. The muzzle flash sits on an exported `Muzzle` node, the magazine stays in the left hand through the reload with zero gap, and firing, ammo and reload are wired into the game with no console errors.

<figure>
  <img src="{{ a }}/img/rifle-reload.jpg" alt="Reload in game: left hand pulling the magazine" loading="lazy">
  <figcaption>Reload in game. The magazine follows the hand; the hands themselves are the weakest part.</figcaption>
</figure>

The weaknesses are exactly the ones you would predict from the previous section. The hands look like mittens, with one bone per finger. The run caught and fixed a mirrored, left-handed first draft, a wrist that tore 24 mm apart during reload, and a muzzle flash that lit the left hand white. But it judged the animation from single frames only, so nobody, human or agent, has verified that the clips feel right in motion.

## A generated mesh, rigged by the agent

The comparison left an obvious question: Tripo has the best surface but no skeleton, and the agent rigs well but models poorly. What happens if you give the agent Tripo's mesh and forbid remodeling?

That run took 10.7 minutes and cost $4.76, with no help. The fear was that generated legs would be fused into the body and need surgery. They were not: each leg was a separate tube joined only at the hip. The agent skipped Blender's automatic weights and computed its own from surface distance to each foot, so neighbouring legs do not drag each other. It changed exactly one vertex, pulling up a spike under the mouth that poked through the floor.

<div class="grid">
  <figure><img src="{{ a }}/img/tripo-v0.jpg" alt="The raw Tripo mesh" loading="lazy"><figcaption>Input: one textured mesh, no skeleton.</figcaption></figure>
  <figure><img src="{{ a }}/img/tripo-walk.jpg" alt="The rigged Tripo mesh mid-walk" loading="lazy"><figcaption>Walk: tripod gait, planted feet on the ground.</figcaption></figure>
  <figure><img src="{{ a }}/img/tripo-die-close.jpg" alt="Close-up of the knee crease in the death pose" loading="lazy"><figcaption>Die, close up: knees pinch at 80–100°.</figcaption></figure>
</div>

In the game it draws in one call per enemy instead of five, keeps Tripo's texture, and the walk holds up at close range. Two flaws remain. It has six legs, because the video frame it was generated from already showed too few, and no amount of rigging fixes geometry. Its knees crease like rubber in the death pose, because the generated mesh has no edge loops at the joints and linear skinning does not preserve volume.

This result changed the recommendation. For creatures, the better route is generative mesh plus agent rig: about the same cost as modeling from scratch, a much better surface, and one draw call instead of five. Its one precondition is that the generated shape is already right, so the counting problem has to be solved before Tripo runs, not after. Modeling from scratch is still the better choice for objects that need precise structure, like the rifle.

## Unreal, headless

The article's step 3 builds the game in Unreal Engine 5, which looked like the hard part. It was the cheapest.

The supervising session installed Unreal and Xcode, ran a smoke test (import, C++ compile, off-screen capture) and wrote a wrapper script that could build the project, run editor Python headless, launch the off-screen editor and play the game, all with timeouts. A run then got that wrapper and nothing else. It could never open a window. It had to build a first-person shooter from the existing GLBs, with two enemy types, the rifle, waves and a HUD, judging its work only from screenshots and JSON reports the game wrote about itself.

It took 33 minutes and $9.07 over ten self-check rounds. All three GLBs imported with meshes, skeletons and every clip intact; the rifle's `Muzzle` survived as a bone. A 60-second autoplay reached wave 4 with 38 kills (26 Blender scuttlers, 12 Tripo ones), averaged 57.9 fps with Lumen on, and logged 0 errors and 0 warnings. The supervising session re-ran it and got the same result.

<figure>
  <img src="{{ a }}/img/ue-play-55.jpg" alt="Unreal autoplay at 55 seconds: both enemy types, HUD, hurt vignette" loading="lazy">
  <figcaption>Greybox build, autoplay at 55 s: both enemy types, hit flash, hurt vignette, HUD.</figcaption>
</figure>

The greybox build looked like a greybox, so a second pass added art. Two Blender runs went in parallel: a 12-piece sci-fi level kit (56 minutes, $6.48, 9.4k triangles) and a four-metre boss, the Brood Mother (31 minutes, $7.30, 16k triangles, 59 bones, 6 clips). A third run spent 77 minutes and $14.12 integrating them in Unreal. It rebuilt the arena from the kit, staged a boss entrance with glowing weak points on her back, added Niagara effects, volumetric fog and colour grading, and rendered a gameplay video from autoplay frames.<sup>1</sup> The autoplay bot kills the boss, and the supervising session's re-run matched (kill at 103 s, 55–60 fps).

<p>The 36-second autoplay video at the top of this post comes from this art pass, wave 3 through the boss kill.</p>

<div class="grid">
  <figure><img src="{{ a }}/img/ue-boss-roar.jpg" alt="The boss roaring on entry" loading="lazy"><figcaption>Boss entrance.</figcaption></figure>
  <figure><img src="{{ a }}/img/ue-weak-point.jpg" alt="Hitting a glowing weak point on the boss's back" loading="lazy"><figcaption>Weak-point hits from behind.</figcaption></figure>
  <figure><img src="{{ a }}/img/ue-kit.jpg" alt="The Blender level kit pieces" loading="lazy"><figcaption>The level kit in Blender.</figcaption></figure>
</div>

The compromises are visible if you look. Lumen is off, because the kit level ran at 26–29 fps with it on. The boss is rigidly bound, so its joints do not deform, and her weak points face away from the player. The bot hugs the boss, which makes the video crowded. The run judged its video from about forty sampled frames, not from playback.

## Where the rework lives

Across nine agent runs, the rework clustered in three places, none of them in the integration work that looked most fragile.

- **The reference.** The only failure that needed a human decision came from the video model miscounting legs. Self-correction cannot fix a spec that is wrong.
- **Modeling quality.** From-scratch meshes are assembled from procedural tubes and ellipsoids, with procedural or baked textures and no hand painting. That is fine for distant swarm enemies and not good enough up close.
- **Motion.** Weak death clips, mechanical gaits, hands checked only in stills. Every animation flaw in this post survived because the self-check loop never plays anything back.

The integration problems were real, but each was solved once and stayed solved. Four came from Unreal on macOS. The supervising session hit them during setup and wrote them into the prompt, so no agent run had to rediscover them:

- Newer Xcode needs the Metal toolchain downloaded separately.
- UBT 5.8 crashes after linking unless `UE_TELEMETRY_DIR` is set.
- An editor launched with `-ExecutePythonScript` quits as soon as the script returns unless the script calls `set_keep_python_script_alive(True)`.
- Exported render targets are written without a file extension.

## Cost

<div class="table-wrap" markdown="1">

| Item | Billing | Cost |
|---|---|---|
| Turntable video, Kling v4 | fal, paid | $2.35 |
| Tripo P2, text-to-3D | fal, paid | $1.10 |
| Tripo P2, image-to-3D | fal, paid | $1.10 |
| Blender, text only | Claude, API-equivalent | $3.47 |
| Blender, from video | Claude, API-equivalent | $5.15 |
| three.js game | Claude, API-equivalent | $4.63 |
| First-person rifle + game integration | Claude, API-equivalent | $8.42 |
| Rigging the Tripo mesh | Claude, API-equivalent | $4.76 |
| Unreal greybox arena | Claude, API-equivalent | $9.07 |
| Art pass: level kit | Claude, API-equivalent | $6.48 |
| Art pass: boss | Claude, API-equivalent | $7.30 |
| Art pass: Unreal integration | Claude, API-equivalent | $14.12 |
| **Claude subtotal** | | **$63.40** |
| **fal subtotal** | | **$4.55** |
| **Total** | | **$67.95** |

</div>

The Claude figures are what `claude -p` reports at API prices. These runs were billed to a subscription, so the real marginal cost was lower; an API-keyed pipeline would pay the table price. The total leaves out the time to install Unreal and Xcode, the supervising session, and my own decisions and review.

For scale, a single game-ready enemy by the best route is a turntable plus a video-guided Blender run, about $7.50 and 17 minutes. Generative mesh plus agent rig from the same turntable is about $8.20 and 16 minutes ($2.35 + $1.10 + $4.76); generating the mesh from text instead would drop the video, but this experiment only rigged the image-based mesh. The more interesting comparison is with doing the same work by hand.

### Against doing it by hand

I have no human control group, so the manual side is an estimate: typical industry hours for mid-level indie quality, item by item. These are not quotes, and nobody built this content by hand for comparison.

<div class="table-wrap" markdown="1">

| What the agent built | Manual estimate (person-days) |
|---|---:|
| Swarm enemy: model, texture, rig, walk and die | 6–8 |
| Second enemy: rig and animate an existing mesh | 2–3 |
| First-person arms and rifle: model, rig, four clips | 8–12 |
| Sci-fi level kit, 12 textured pieces | 8–12 |
| Boss: model, texture, rig, six clips | 13–20 |
| UE gameplay code: player, weapon, waves, enemy AI, HUD, boss fight, autoplay tests | 8–12 |
| Level assembly, lighting, grading | 3–5 |
| Five Niagara effects | 3–5 |
| Capture and edit the video | 1 |
| **Total** | **about 50–80** |

</div>

At $400–700 a day for freelancers, that is roughly $21k–55k and three to six weeks for a team of three or four. The agent's version cost $67.95 and about 4.7 hours of runtime: two to three orders of magnitude cheaper, and days instead of weeks even counting setup.

That ratio is only honest with the quality gap next to it. The agent's output is at prototype quality: the boss is rigidly bound and its joints do not deform, the textures are procedural rather than sculpted or painted, the motion is mechanical, and the level textures blur up close. A manual 50–80 person-day build would look clearly better. A rough estimate is that bringing the agent's art to a shippable bar would still take 30–50% of the manual art effort (re-sculpting, re-rigging, polishing animation), while the gameplay code would need much less. That figure is an estimate too.

Two more things are not in the $68: the time to install Unreal and Xcode and keep the machine healthy, and the human side, meaning the supervising session's orchestration and my decisions and review. Neither is large next to 50 person-days, but neither is zero.

So the comparison that holds up is this: for prototyping and testing whether a game idea plays, the agent turns weeks of mixed art and engineering work into hours. For production art, it gives you a first draft, and people still do the last stretch.

## Limitations and next steps

- **One creature, one seed.** Every route ran once. The comparison shows clear gaps, but I have no variance estimates, and a different creature or another take of the video could reorder the Tripo and Blender results.
- **The video arm is not the article's.** I used Kling instead of the Higgsfield MCP, and a 10 s clip instead of 12 s. A better video model might count legs; the general point about countable features in references would still stand.
- **No human evaluation.** "Closest to the design" is a judgment from renders, not a measurement. A small blind preference test against the reference would make the comparison much stronger.
- **Stills-only self-checks.** The obvious next step is to give the loop motion: render short clips or contact sheets per animation phase and score them. Most of the remaining defects are of exactly that kind.
- **Web delivery.** The Unreal half does not reach a browser yet. UE 5.9's preview restores a web target (WebAssembly and WebGPU), but it is experimental and requires a source build.

The headline is narrower than "agents can make games". From a turntable to a boss fight, the agent built the whole pipeline unattended: it modeled, rigged, weighted, animated, exported, imported and wired assets into two engines, built the level and the gameplay, and caught its own mistakes in anything it could see in a still frame. That is weeks of manual work done in hours. What it did not deliver is art a player would mistake for hand-made: the modeling and the motion are where people still earn their person-days.

<p class="footnote"><sup>1</sup> The first attempt at the art integration run was stopped after 16 minutes by the host's memory reaper (a stray 7 GB editor process was still open). It was restarted unchanged once memory was freed.</p>

<p class="footnote">This post was drafted by Claude and reviewed and edited by me.</p>

<section id="appendix-prompts" markdown="0">
<h2>Appendix: prompts</h2>
{% include prompts-agent-built-game-assets.html %}
</section>
