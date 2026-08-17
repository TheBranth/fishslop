# Master Implementation Plan: Friendslop Fishing Co. (v0.2 Architecture & 3D Overhaul)

This document serves as the master architectural specification and roadmap for Friendslop Fishing Co., incorporating the **Three.js 3D/2.5D visual overhaul** (in the style of *Overcooked*), the **Modular Trawler Deck Socket System**, the **Composable Multi-Modifier Culinary Pipeline**, and **Expanded Slapstick Station Mishaps**.

---

## 🗺️ 1. The 3D/2.5D Isometric Visual Overhaul (Three.js Architecture)

```
                 [ 🎥 ISOMETRIC ORTHOGRAPHIC TILT CAMERA ]
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │  🌊 STYLIZED GERSTNER OCEAN (Water Foam & Ripples)  │
        │                                                     │
        │          ┌───────────────────────────────┐          │
        │          │   ⛵ CHUNKY LOW-POLY TRAWLER  │          │
        │          │   (Physically Rolls & Tilts)  │          │
        │          │                               │          │
        │          │  👨‍🍳 [Chef Bobbing Walk Cycles]│          │
        │          │  🐟 [Floppy Fish Physics]     │          │
        │          │  🍲 [3D Bubbling Cauldron]    │          │
        │          │  🔪 [Cleaver Animation]       │          │
        │          └───────────────────────────────┘          │
        │                                                     │
        │  🐙 KRAKEN 3D TENTACLES WRITHING OVER GUNWALES      │
        └─────────────────────────────────────────────────────┘
```

### Visual Pillars:
1. **Camera**: Orthographic $45^\circ$ isometric tilt with dollhouse diorama feel. The camera stays fixed to the ocean horizon while the **3D trawler boat physically pitches, rolls, and heaves** based on real-time mass balance and wave harmonics.
2. **Cel/Toon Shading & Lighting**: Custom Three.js stepped lighting band shader with crisp dark ink outlines (Fresnel rim highlights) and warm sunny directional light.
3. **Low-Poly Stylized Meshes**: Chunky wooden plank deck, rounded brass portholes, floppy 3D fish meshes that wriggle when carried or thrown, and animated chef sailors with bobbing caps and googly eyes.
4. **Decoupled Architecture**: `ThreeGameRenderer.ts` acts as a pure visual layer reading 60 FPS authoritative game state from `LocalGameEngine.ts` without modifying core physics.

---

## ⛵ 2. The Trawler Deck & Modular Socket System

The trawler deck perimeter is divided into fixed starter fixtures and **4 Modular Brass Worktop Sockets** that dynamically fill when upgrades are purchased during the 30-second post-round draft:

```
                            ⚓ BOW / FOREDECK (Top)
                     ┌────────────────────────────────────┐
                     │   🌊 Railing Casting Zone (Top)    │
  ┌──────────────────┴────────────────────────────────────┴──────────────────┐
  │                                                                          │
  │  🛠️ SOCKET #1 (Port Bow)                         🛠️ SOCKET #2 (Stbd Bow)  │
  │  [Empty Brass Socket]                            [Empty Brass Socket]    │
  │                                                                          │
  │                                                                          │
  │  🎣 STARTER #1 (Port Mid):                       🧊 STARTER #2 (Stbd Mid):│
  │  Rod Storage Rack                                Delivery Cooler Bin     │
  │  (Take / Return Rod)                             (Bank & Sell Catches)   │
  │                                                                          │
  │                                                                          │
  │  🛠️ SOCKET #3 (Port Stern)                       🛠️ SOCKET #4 (Stbd Stern)│
  │  [Empty Brass Socket]                            [Empty Brass Socket]    │
  │                                                                          │
  │                                                                          │
  │                     🗑️ STARTER #3 (Stern Center):                         │
  │                     Trash Chute / Discard Bin                            │
  └──────────────────┬────────────────────────────────────┬──────────────────┘
                     │   🌊 Railing Casting Zone (Bottom) │
                     └────────────────────────────────────┘
                            🚢 STERN / AFT (Bottom)
```

### Starter Layout (Level 1 Tutorial):
* **🎣 Rod Storage Rack (Port Mid)**: Walk up $\rightarrow$ `[GRAB ROD]` $\rightarrow$ step to railing $\rightarrow$ `[CAST]` $\rightarrow$ reel tension $\rightarrow$ fish pops onto deck.
* **🧊 Delivery Cooler Bin (Starboard Mid)**: Drop clean or processed fish into ice to bank cash toward quota.
* **🗑️ Trash Chute (Stern Center)**: Drop boots, spoiled items, and broken scrap out to sea.

### Auto-Balanced Modular Sockets (1 to 4):
* Purchased stations (*Fillet Board*, *Deep Fryer*, *Soup Cauldron*, *Sushi Rolling Mat*, *Microwave*) snap into empty sockets, automatically alternating Port and Starboard to maintain physical boat trim and create varied galley throwing routes.

---

## 🍳 3. Composable Multi-Modifier Culinary Pipeline

Every caught fish or item on deck tracks dynamic **State Modifiers** (`Set<ItemModifier>`). Stations are **100% self-sufficient** (single-step recipes work immediately), but chaining stations multiplies payout exponentially:

```
[RAW CATCH] ──┬─► 🔪 [SLICED]   (Fillet Board)  ──► Clean sashimi cutlet (+60% Value)
              ├─► 🍳 [FRIED]    (Deep Fryer)    ──► Golden crispy batter (+80% Value)
              ├─► 🍲 [BOILED]   (Soup Kettle)   ──► Steaming seafood broth (+100% Value)
              └─► 🍣 [ROLLED]   (Sushi Mat)     ──► Wrapped in rice & nori (+120% Value)
```

### Atlantic Cod Example ($\text{Base } \$35$):
* Raw Atlantic Cod: **$\$35$**
* Direct Fillet (`[sliced]`): **$\$55$** (Slices 🍢)
* Direct Fry (`[fried]`): **$\$65$** (Whole Crispy Cod 🐟✨)
* Direct Stew (`[boiled]`): **$\$70$** (Fish Head Broth 🍲)
* 2-Step Fillet $\rightarrow$ Fry (`[sliced, fried]`): **$\$115$** (Fish & Chips Platter 🍟)
* 2-Step Fillet $\rightarrow$ Roll (`[sliced, rolled]`): **$\$125$** (Cod Nigiri Sushi 🍣)
* 3-Step Fillet $\rightarrow$ Fry $\rightarrow$ Roll (`[sliced, fried, rolled]`): **$\$210$** (Crispy Dragon Tempura Roll 🍱)

---

## 💥 4. Expanded Slapstick Station Mishaps & Disasters

Mishandling hazardous species or missing minigame timings creates hilarious physical disruptions:

| Mishap Trigger | Station / Target | Slapstick Disaster & Physical Penalty |
| :--- | :--- | :--- |
| **Turtle Chopping** | 🔪 Fillet Board | 🔪 **Broken Knife**: Blade snaps on shell! Station disabled for 5s. |
| **Eel Slicing Rhythm Miss** | 🔪 Fillet Board | 🌀 **Wobbly Blade**: Missing a clean chop notch makes the cleaver wobble erratically for 1.2s on subsequent chops! |
| **Electric Ray in Deep Fryer**| 🍳 Deep Fryer | ⚡ **Oil Shockwave**: Boiling oil conducts 100,000V! Electrocutes and stuns all nearby chefs. |
| **Electric Ray in Rinse Basin**| 🧼 Rinse Station | ⚡ **Electrified Basin**: Washing the ray electrifies the water bucket; basin is charged and unusable for 5s! |
| **Bombfish in Fryer / Kettle**| 🍳 Fryer / 🍲 Pot | 💥 **Flash Explosion**: Instant detonation blasts chefs across the deck and knocks loose items flying! |
| **Slime Eel in Soup Kettle** | 🍲 Soup Kettle | 🧪 **Toxic Boil-Over**: Cauldron boils over, dropping a huge green slime slip-and-slide puddle across the galley! |
| **Rubber Boot in Deep Fryer** | 🍳 Deep Fryer | 👞 **Deep Fried Leather**: Valid joke dish! Sells for $\$40$ and satisfies Uncle Gary's secret bounty. |

---

## 🕹️ 5. Unified 2-Button Control & Contextual Action Pill Integration

* **Button 1 (Primary / Action - Big Bottom Thumb Button)**:
  * Syncs 1-to-1 with the **overhead color-coded capsule pill**:
  * `CAST` *(Cyan)*, `GRAB` *(Amber)*, `FILLET` *(Teal)*, `FRY` *(Orange)*, `SOUP` *(Emerald)*, `BANK` *(Green)*, `TRASH` *(Rose)*, `DROP` *(Silver)*, `CONGA` *(Gold)*, `HEAVE` *(Flashing Red)*, `REEL` *(Emerald)*.
* **Button 2 (Secondary / Chaos - Chunky Top Thumb Button)**:
  * `SLAP` (when hands are empty $\rightarrow$ shoves teammates).
  * `THROW` (when holding an item $\rightarrow$ yeets across the deck).
  * `CUT LINE` (when fishing $\rightarrow$ releases line).

---

## 📅 6. Execution Phases

```
Phase 1: 🌐 Live Network Multiplayer (Socket.IO + Cloudflare Internet Tunnel)
Phase 2: 🎨 Three.js 3D/2.5D Isometric World & Low-Poly Trawler Mesh (Overcooked Style)
Phase 3: ⛵ Modular Sockets & Rod Rack Starter Loop
Phase 4: 🍲 Composable Multi-Modifier State Machine & Expanded Slapstick Mishaps
Phase 5: 📻 Uncle Gary CB-Radio Quips, Polish & v0.1 Release
```
