# SODOM — Game Design & Development Brief

## 1. Project

Build a very short, comedic, retro browser platformer loosely based on
Genesis 19: Lot escaping Sodom.

This is a small game made for friends, not a commercial game.

Target playtime for a successful first run: approximately 4–5 minutes.

The game should feel like a strange lost late-1980s/early-1990s Bible game:
simple, colorful, immediately understandable, slightly janky in a charming
way, and funny because biblical events are translated very literally into
video-game mechanics.

Do not overengineer this project.

The finished game must run entirely in a web browser and be deployable as a
static site on GitHub Pages.

---

# 2. Technology

Use:

- Phaser 3
- Vite
- Vanilla JavaScript
- HTML/CSS only where needed outside the Phaser canvas
- Phaser Arcade Physics
- Static local assets

Do NOT use:

- React
- TypeScript unless there is a compelling technical reason
- Firebase
- databases
- authentication
- backend/server code
- external APIs
- unnecessary dependencies

The production build must work when hosted from a GitHub Pages project
subdirectory such as:

https://USERNAME.github.io/sodom/

Configure Vite appropriately for that deployment model.

The game should work on:

- desktop browsers
- mobile browsers
- keyboard
- touchscreen

Develop mobile compatibility from the beginning rather than adding it later.

---

# 3. Design Philosophy

The game should be extremely simple.

The player should understand the controls within seconds.

Do not add:

- inventories
- skill trees
- upgrades
- dialogue systems
- complicated menus
- complicated combat
- collectible currencies
- elaborate scoring systems
- unnecessary HUD elements

The humor should primarily come from gameplay and visual events rather than
large amounts of written dialogue.

The game should remain recognizable as a simple retro platformer.

---

# 4. Overall Structure

The game consists of three main gameplay acts plus an ending.

ACT I:
Escape through the collapsing cities of Sodom/Gomorrah.

Gameplay style:
Classic side-scrolling platformer.

Approximate duration:
2–3 minutes.

ACT II:
Angels carry the family away from the final destruction.

Gameplay style:
Very short Flappy Bird-style sequence.

Approximate duration:
20–30 seconds.

TRANSITION:
Very brief wilderness section.

Approximate duration:
10–20 seconds.

ACT III:
Climb the mountain to the cave.

Gameplay style:
Vertical platformer inspired by Doodle Jump and similar games.

Approximate duration:
45–60 seconds.

ENDING:
Lot enters the cave. His daughters arrive afterward carrying a jug marked
"XXX", look toward the player, smile/wink, and enter the cave.

Roll short credits.

Total successful playthrough:
roughly 4–5 minutes.

---

# 5. ACT I — SODOM

## Environment

The player should spend most of this act INSIDE the city rather than running
through empty desert.

The city should provide visually interesting platforming using reusable
pixel-art tiles.

Possible terrain:

- streets
- sandstone buildings
- rooftops
- broken walls
- stairs
- fallen pillars
- collapsed buildings
- burning structures
- gaps between roofs
- debris
- city gates

The route should regularly change elevation.

Example rhythm:

street -> fallen pillar -> roof -> rooftop gap -> damaged building ->
street -> stairs -> roofs -> city gate

Do not create complicated environmental simulation.

The collapsing city can largely be communicated visually through animation,
background effects, hazards, and an advancing destruction boundary.

---

# 6. LOT

Lot is the player-controlled character.

Primary controls:

DESKTOP:
- Left Arrow / A = move left
- Right Arrow / D = move right
- Space / Up = jump

MOBILE:
- large left button
- large right button
- large jump button

Movement should feel responsive and arcade-like rather than physically
realistic.

Lot should eventually have simple animations for:

- idle
- running
- jumping
- death

Placeholder graphics are acceptable during development.

---

# 7. FAMILY FOLLOWER SYSTEM

Lot begins with:

- Lot's wife
- Daughter 1
- Daughter 2

They follow behind Lot.

IMPORTANT:

Avoid building complicated autonomous platforming AI if possible.

Prefer a system based on Lot's recent movement/path history, with each family
member reproducing his movement after a short delay.

The desired visual effect is a small procession following Lot through the
city.

Family members should generally be able to reproduce Lot's:

- movement
- jumps
- changes in elevation

They should trail at slightly different delays.

The family system is an important gameplay mechanic and should be built and
tested before substantial level art is created.

---

# 8. SALT MECHANIC

If a family member is hit by a hazard or enemy:

They instantly transform into a small, funny container/shaker of table salt.

Use a quick visual/sound effect.

Example:

PFFT!

The salt container remains at that location.

The rest of the family continues moving.

Lot can rescue the salted family member by JUMPING ON THE SALT CONTAINER.

When Lot lands on it:

- play a "pop" or similarly satisfying effect
- restore that family member
- they resume following Lot

No additional rescue button is required.

This mechanic should be immediately understandable through gameplay.

If advancing destruction reaches a salted family member before Lot rescues
them, that family member is permanently lost for the remainder of the run.

---

# 9. LOT'S WIFE SPECIAL BEHAVIOR

Lot's wife has an additional behavior inspired by the biblical story.

At certain scripted or semi-random moments, she may:

1. stop following
2. turn toward the destruction behind the family
3. pause briefly
4. turn into salt

Give the player enough visual/audio warning to notice what she is doing.

Lot can choose to:

- continue running and leave her behind
- run backward
- jump on the salt container
- restore her
- continue escaping

She may attempt to look back more than once during the level.

This should become a recurring joke.

Do NOT permanently force her canonical death.

A skilled or determined player should be able to get Lot's wife all the way
to the cave.

---

# 10. SODOMITES

Simple hostile NPCs pursue or approach Lot.

Keep their behavior extremely simple, similar to early platform-game enemies.

Possible behavior:

- walk/run toward Lot
- turn around at simple obstacles where necessary
- hurt Lot/family on side contact

Lot defeats a Sodomite by jumping on their head.

On successful stomp:

- squash/pop animation
- satisfying sound
- enemy disappears or remains briefly flattened

Do not implement complicated combat.

There is no attack button.

Jumping is the attack.

---

# 11. FIRE AND SULFUR

Fire/sulfur falls from above throughout the city.

Keep this visually and mechanically simple.

Fireballs should:

- have readable trajectories
- provide a short warning where appropriate
- fall from above
- damage Lot or family
- optionally leave a temporary flame/hazard after impact

Avoid realistic particle simulations.

Use simple Arcade Physics objects.

The frequency should increase as the player progresses through Sodom.

---

# 12. ADVANCING DESTRUCTION

The destruction of Sodom advances from the LEFT side of the level.

This creates constant forward pressure.

The player is allowed to move backward, especially to rescue family members,
but cannot remain indefinitely.

Represent the destruction using something simple such as:

- fire
- smoke
- red/orange glow
- collapsing silhouettes
- screen effects
- an advancing kill boundary

If the destruction catches Lot:

Game over.

If it reaches a salted family member:

That family member is permanently lost.

This mechanic should create the recurring decision:

"Do I go back and save them?"

---

# 13. ANGEL / HALO POWER-UP

Occasionally place a simple glowing halo/ring collectible in the Sodom level.

When Lot collects it:

An angel or pair of angels briefly swoops in and assists the family.

The exact implementation can be refined during development, but the intended
effect is:

- family receives a temporary forward-speed boost
- brief protection/invulnerability may be provided
- visually communicate that angels are physically rushing the family away

The angels should physically appear rather than the halo simply functioning
as an unexplained speed boost.

Keep this short and funny.

This also establishes the angels before Act II.

---

# 14. ACT II — ANGEL FLIGHT

Near the end of Sodom, the family encounters destruction or an obstacle that
cannot be crossed normally.

Two angels arrive.

They physically grab/carry Lot and the family into the air.

Gameplay transitions into a very short Flappy Bird-style sequence.

Controls:

DESKTOP:
Space = upward impulse

MOBILE:
Tap anywhere = upward impulse

Gravity continuously pulls the group downward.

The player must avoid approximately 5–8 simple obstacles.

Possible obstacles:

- burning towers
- falling pillars
- sulfur/fireballs
- smoke
- pieces of collapsing architecture

The family can visually dangle underneath or travel with the angels as one
combined gameplay object.

Do NOT attempt individual family physics during this sequence.

Treat the entire group as one collision object.

Duration:
approximately 20–30 seconds.

At the end:

The angels carry the family beyond the city and drop them safely outside.

Use a deliberately comedic landing if appropriate.

---

# 15. WILDERNESS TRANSITION

After the angel sequence, provide a very short horizontal wilderness section.

This is primarily a transition between Sodom and the mountain.

Keep it approximately 10–20 seconds.

No substantial new mechanics.

The player runs toward the mountain.

The environment becomes quieter and visually simpler.

Then transition naturally into the vertical climb.

---

# 16. ACT III — MOUNTAIN CLIMB

The gameplay now becomes a simple vertical platformer.

Inspiration:

- Doodle Jump
- classic vertical jumping games

Lot climbs upward using small platforms.

The camera scrolls vertically.

Prefer automatic jumping/bouncing when Lot lands on platforms if this makes
the mechanic simpler and more immediately understandable.

Controls should ideally be:

DESKTOP:
Left / Right

MOBILE:
Left / Right touch controls

The player steers Lot while airborne.

If Lot falls below the bottom of the screen:

Game over / restart mountain section or appropriate checkpoint.

Do NOT simulate the family individually during this section.

Assume they are following behind offscreen.

No complicated enemies are required.

The challenge should primarily come from platform placement and movement.

Duration:
approximately 45–60 seconds.

At the top of the mountain is a cave.

Lot reaches the final platform and enters.

---

# 17. ENDING

Once Lot enters the cave:

Stop normal gameplay.

Allow a short pause.

Then Daughter 1 and Daughter 2 reach the cave entrance.

Lot is already inside.

One daughter produces a large pixel-art jug labeled:

XXX

The daughters look at each other.

Then they look directly toward the player/camera.

They smile or wink.

They carry the jug into the cave.

CUT TO BLACK.

Display:

THE END

Then roll very short comedic credits.

Do not explicitly depict or explain what happens after they enter the cave.

The implication is the joke.

Possible credit jokes can be added later, but keep the ending short.

---

# 18. DEATH AND RESTARTS

This is a very short game.

Do not use a lives system.

If Lot dies:

- quick death animation
- immediate retry option

Use sensible checkpoints so replaying a mistake does not become annoying.

Potential checkpoints:

1. beginning of Sodom
2. beginning of angel-flight sequence
3. beginning of mountain climb

Family losses should persist through the current run where practical.

The game should encourage quick retries.

---

# 19. ART DIRECTION

Style:

8-bit / early console pixel art.

Reference feeling:

- late 1980s / early 1990s platform games
- obscure NES-era Bible game
- intentionally simple
- colorful
- readable
- slightly ridiculous

Do not make the graphics cinematic, realistic, painterly, or overly detailed.

Use a small internal game resolution and upscale with nearest-neighbor/pixel
rendering so pixels remain crisp.

Build gameplay using PLACEHOLDER ART FIRST.

Do not spend significant development time generating final art until all
major mechanics work.

Likely assets eventually include:

CHARACTERS:
- Lot
- Lot's wife
- Daughter 1
- Daughter 2
- Sodomite
- angel

OBJECTS:
- salt container
- sulfur/fireball
- halo
- XXX jug

ENVIRONMENT:
- city tiles
- pillars
- roofs
- walls
- fire
- destruction effects
- wilderness
- mountain platforms
- cave

---

# 20. AUDIO

Keep audio simple and retro.

Eventually include:

- short looping Sodom music
- jump sound
- enemy stomp
- sulfur impact
- salt transformation "pfft"
- unsalt "pop"
- angel pickup
- angel-flight music/change
- mountain music/change
- victory sting
- ending/credits music

Do not make audio a dependency for early milestones.

The game must remain understandable when muted.

---

# 21. MOBILE DESIGN

Assume many players will receive this game as a link in a text message and
open it directly on their phone.

Therefore:

- no installation required
- no login
- no PWA requirement
- minimal loading
- responsive canvas
- large touch targets
- landscape orientation preferred if appropriate
- prevent accidental browser scrolling while actively interacting with game
  controls where safe/appropriate
- game should remain usable on common phone screen sizes

Do not require hover.

---

# 22. GITHUB PAGES

The game must be deployable as a static GitHub Pages project.

Use Vite.

Configure asset paths correctly for a repository subdirectory.

Provide:

- npm run dev
- npm run build
- npm run preview

Configure a GitHub Actions workflow for GitHub Pages deployment if
appropriate.

A push to the main branch should ultimately be capable of rebuilding and
deploying the game automatically.

No server-side functionality should be required.

---

# 23. DEVELOPMENT STRATEGY

IMPORTANT:

DO NOT ATTEMPT TO IMPLEMENT THE ENTIRE GAME AT ONCE.

Work incrementally.

Every milestone should leave the project in a runnable, testable state.

Do not prematurely create elaborate architecture for hypothetical future
features.

Prefer straightforward, readable code suitable for a small game.

---

# MILESTONE 1 — MOVEMENT PROTOTYPE

IMPLEMENT ONLY THIS FIRST.

Create:

- Vite project
- Phaser 3 setup
- responsive game canvas
- GitHub-Pages-compatible configuration
- one simple test scene
- placeholder Lot sprite/rectangle
- ground/platform collision
- left movement
- right movement
- jumping
- camera following Lot
- desktop controls
- basic mobile touch controls
- restart/reset capability

Use placeholder rectangles and simple geometry.

Do NOT yet implement:

- family
- Sodom
- enemies
- sulfur
- salt
- angels
- Flappy sequence
- mountain
- final art
- final audio

The purpose of Milestone 1 is ONLY to establish:

"Does controlling Lot in the browser feel good?"

When Milestone 1 is complete:

STOP.

Explain:

1. what was created
2. project structure
3. how to run it locally
4. how to test desktop controls
5. how to test mobile controls
6. any technical decisions that will affect later milestones
7. which files contain the important movement values such as speed, gravity,
   and jump strength

Do not proceed to Milestone 2 until instructed.