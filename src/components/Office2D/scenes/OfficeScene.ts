/**
 * Main office scene — renders the tilemap, spawns player + workers.
 * Extracted from Agent Town: components/game/scenes/OfficeScene.ts
 *
 * Asset paths updated to /assets/ subdirectories.
 * Agent Town-specific WebSocket imports removed.
 */

import * as Phaser from "phaser";
import { Player } from "./entities/Player";
import { resetWanderClock } from "./entities/Worker";
import { SPRITE_KEY, SPRITE_PATH, WORKER_SPRITES } from "./config/animations";
import { EMOTE_SHEET_KEY, EMOTE_SHEET_PATH, EMOTE_FRAME_SIZE } from "./config/emotes";
import { Pathfinder } from "./utils/Pathfinder";
import {
  buildSpriteFrames,
  parseSpawns,
  parsePOIs,
  buildCollisionRects,
  renderTileObjectLayer,
  type AnimatedProp,
} from "./utils/MapHelpers";
import { gameEvents, type SeatState } from "./events";
import { createLogger } from "./logger";
import {
  BOSS_INTERACT_DISTANCE,
  PF_PADDING,
  PRESS_E_STYLE,
  BOSS_PROMPT_OFFSET_X,
  BOSS_PROMPT_OFFSET_Y,
} from "./constants";

import { CameraController } from "./systems/CameraController";
import { WorkerManager } from "./systems/WorkerManager";
import { InteractionManager } from "./systems/InteractionManager";
import { DoorManager } from "./systems/DoorManager";
import { initSceneEventBridge } from "./systems/SceneEventBridge";
import type { EventBridge } from "../EventBridge";
import type { AgentRow, AgentStatus } from "@/types/supabase";

const log = createLogger("OfficeScene");

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export class OfficeScene extends Phaser.Scene {
  private player!: Player;
  private terminalZone: { x: number; y: number } | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;
  private eKey!: Phaser.Input.Keyboard.Key;
  private terminalOpen = false;

  private sessionBindings = new Map<string, string>();

  private cameraController!: CameraController;
  private workerManager!: WorkerManager;
  private interactionManager!: InteractionManager;
  private doorManager!: DoorManager;
  private cleanupEventBridge: (() => void) | null = null;
  private bridge: EventBridge | null = null;
  private cleanupBridge: (() => void) | null = null;

  constructor() {
    super({ key: "OfficeScene" });
  }

  preload() {
    // Tilemap (paths updated to /assets/)
    this.load.tilemapTiledJSON("office", "/assets/maps/office2.json");

    this.load.once("filecomplete-tilemapJSON-office", () => {
      const cached = this.cache.tilemap.get("office");
      if (!cached?.data?.tilesets) return;
      for (const ts of cached.data.tilesets) {
        const basename = (ts.image as string).split("/").pop()!;
        this.load.image(ts.name, `/assets/tilesets/${basename}`);
      }
    });

    // Character sprites
    this.load.image(SPRITE_KEY, SPRITE_PATH);

    for (const ws of WORKER_SPRITES) {
      this.load.image(ws.key, ws.path);
    }

    // Emote spritesheet
    this.load.spritesheet(EMOTE_SHEET_KEY, EMOTE_SHEET_PATH, {
      frameWidth: EMOTE_FRAME_SIZE,
      frameHeight: EMOTE_FRAME_SIZE,
    });

    // Misc sprites
    this.load.spritesheet("boss-arrow", "/assets/sprites/arrow_down_48x48.png", {
      frameWidth: 48,
      frameHeight: 48,
    });

    this.load.spritesheet("anim-cauldron", "/assets/sprites/animated_witch_cauldron_48x48.png", {
      frameWidth: 96,
      frameHeight: 96,
    });

    this.load.spritesheet("anim-door", "/assets/sprites/animated_door_big_4_48x48.png", {
      frameWidth: 48,
      frameHeight: 144,
    });
  }

  create() {
    buildSpriteFrames(this, SPRITE_KEY);
    for (const ws of WORKER_SPRITES) {
      buildSpriteFrames(this, ws.key);
    }

    const map = this.make.tilemap({ key: "office" });

    const allTilesets: Phaser.Tilemaps.Tileset[] = [];
    for (const ts of map.tilesets) {
      const added = map.addTilesetImage(ts.name, ts.name);
      if (added) allTilesets.push(added);
    }
    if (allTilesets.length === 0) {
      log.error("No tilesets loaded");
      return;
    }

    map.createLayer("floor", allTilesets);
    map.createLayer("walls", allTilesets);
    map.createLayer("ground", allTilesets);
    map.createLayer("furniture", allTilesets);
    map.createLayer("objects", allTilesets);

    const animatedProps: AnimatedProp[] = [
      {
        tilesetName: "11_Halloween_48x48",
        anchorLocalId: 130,
        skipLocalIds: new Set([130, 131, 146, 147]),
        spriteKey: "anim-cauldron",
        frameWidth: 96,
        frameHeight: 96,
        endFrame: 11,
        frameRate: 8,
      },
    ];
    renderTileObjectLayer(this, map, "props", allTilesets, 5, animatedProps);
    renderTileObjectLayer(this, map, "props-over", allTilesets, 11);

    const overheadLayer = map.createLayer("overhead", allTilesets);
    if (overheadLayer) overheadLayer.setDepth(10);

    const collisionGroup = this.physics.add.staticGroup();
    const collisionRects = buildCollisionRects(map, collisionGroup);

    const pathfinder = new Pathfinder(
      map.widthInPixels,
      map.heightInPixels,
      collisionRects,
      PF_PADDING,
    );

    const { bossSpawn, workerSpawns } = parseSpawns(map);
    const pois = parsePOIs(map);

    this.player = new Player(this, bossSpawn.x, bossSpawn.y, bossSpawn.facing);
    this.physics.add.collider(this.player.sprite, collisionGroup);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.sprite.setCollideWorldBounds(true);

    this.input.keyboard?.disableGlobalCapture();

    // -- Systems --
    this.cameraController = new CameraController(
      this,
      this.player.sprite,
      map.widthInPixels,
      map.heightInPixels,
    );
    this.cameraController.init();

    this.workerManager = new WorkerManager(this, workerSpawns, pois, pathfinder);

    this.interactionManager = new InteractionManager(
      this,
      this.player,
      this.workerManager,
      this.cameraController,
    );
    this.interactionManager.initInteractionUI();

    this.doorManager = new DoorManager(this, this.player, () => this.workerManager.workers);
    this.doorManager.initDoors();

    resetWanderClock();

    // -- React <-> Phaser EventBridge (Supabase Realtime agents) --
    this.bridge = this.game.registry.get("eventBridge") as EventBridge | null;

    // Only init boss seat terminal when no EventBridge (standalone Agent Town mode)
    // With bridge, the boss seat "Press E" / terminal is unused
    if (!this.bridge) {
      this.initBossSeat(bossSpawn);
    }

    this.cleanupEventBridge = initSceneEventBridge(
      this.workerManager,
      this.interactionManager,
      this.sessionBindings,
      (open) => {
        this.terminalOpen = open;
      },
    );

    gameEvents.emit("seats-discovered", workerSpawns);
    if (this.bridge) {
      this.cleanupBridge = this.initRealtimeBridge(this.bridge, workerSpawns);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  /**
   * Bridge Supabase AgentRow[] data into the existing Worker system.
   * Converts agents to SeatState[], emits seat-configs-updated, applies tints,
   * and wires click handlers for agent-clicked events.
   */
  private initRealtimeBridge(
    bridge: EventBridge,
    seatDefs: import("./utils/MapHelpers").SeatDef[],
  ): () => void {
    const unsubs: Array<() => void> = [];

    // Map AgentStatus to WorkerManager-compatible SeatState status
    const mapAgentStatus = (s: AgentStatus): SeatState["status"] => {
      switch (s) {
        case "working":
        case "thinking":
          return "running";
        case "error":
          return "failed";
        case "offline":
          return "empty";
        case "queued":
          return "returning";
        case "idle":
        default:
          return "done";
      }
    };

    // Assign each agent a seat and sprite from the available pool
    const assignSpriteKey = (index: number): string | undefined => {
      if (WORKER_SPRITES.length === 0) return undefined;
      return WORKER_SPRITES[index % WORKER_SPRITES.length].key;
    };

    unsubs.push(
      bridge.on("agents-updated", (agents: AgentRow[]) => {
        const seats: SeatState[] = agents.map((agent, index) => {
          const seatId = seatDefs[index % seatDefs.length]?.seatId ?? `seat-${index}`;
          return {
            seatId,
            label: agent.name || agent.emoji || `Agent ${index + 1}`,
            assigned: agent.status !== "offline",
            spriteKey: assignSpriteKey(index),
            status: mapAgentStatus(agent.status),
            agentStatus: agent.status,
            agentId: agent.agent_id,
          };
        });

        gameEvents.emit("seat-configs-updated", seats);

        // Apply AgentStatus tinting + store agentId on workers after sync
        this.time.delayedCall(50, () => {
          for (const seat of seats) {
            if (!seat.agentId) continue;
            const worker = this.workerManager.findBySeatId(seat.seatId);
            if (worker) {
              worker.agentId = seat.agentId;
              if (seat.agentStatus) {
                worker.applyAgentStatus(seat.agentStatus);
              }
              // Make sprite interactive for click-to-select
              if (!worker.sprite.input) {
                worker.sprite.setInteractive({ useHandCursor: true });
                worker.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer) => {
                  if (worker.agentId && this.bridge) {
                    this.bridge.emit("agent-clicked", {
                      agentId: worker.agentId,
                      x: worker.sprite.x,
                      y: worker.sprite.y,
                    });
                  }
                });
              }
            }
          }
        });
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }

  // -- Boss seat --

  private initBossSeat(bossSpawn: { x: number; y: number }) {
    this.terminalZone = { x: bossSpawn.x, y: bossSpawn.y };

    this.promptText = this.add
      .text(
        bossSpawn.x + BOSS_PROMPT_OFFSET_X,
        bossSpawn.y - BOSS_PROMPT_OFFSET_Y,
        "Press E",
        PRESS_E_STYLE as Phaser.Types.GameObjects.Text.TextStyle,
      )
      .setResolution(window.devicePixelRatio * 2)
      .setOrigin(0, 0)
      .setDepth(20)
      .setVisible(false);
    this.promptText.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const kb = this.input.keyboard;
    if (!kb) return;
    this.eKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
  }

  // -- Cleanup --

  private cleanup() {
    this.cleanupEventBridge?.();
    this.cleanupEventBridge = null;

    this.cleanupBridge?.();
    this.cleanupBridge = null;
    this.bridge = null;

    this.workerManager?.destroyAll();
    this.interactionManager?.destroy();
  }

  // -- Update --

  update() {
    if (this.interactionManager.interactionMenu.visible) {
      this.interactionManager.interactionMenu.update();
      this.workerManager.updateAll();
      return;
    }

    if (this.terminalOpen || isInputFocused()) {
      this.workerManager.updateAll();
      this.doorManager.updateDoors();
      return;
    }

    this.player.update();
    if (!this.cameraController.cameraFollowing && this.player.isMoving()) {
      this.cameraController.resumeCameraFollow();
    }
    this.workerManager.updateAll();
    this.doorManager.updateDoors();

    // Worker proximity + E-key interaction
    if (this.bridge) {
      // React AgentPanel mode: detect proximity + E key ourselves, emit bridge events
      // Do NOT open Agent Town's InteractionMenu (it freezes the player)
      const nearest = this.interactionManager.findNearestWorker();

      // Update prompt text visibility
      if (this.interactionManager.workerPromptText) {
        if (nearest) {
          this.interactionManager.workerPromptText.setPosition(
            nearest.sprite.x,
            nearest.sprite.y - 40,
          );
          this.interactionManager.workerPromptText.setVisible(true);
        } else {
          this.interactionManager.workerPromptText.setVisible(false);
        }
      }

      if (nearest?.agentId && Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.bridge.emit("agent-approached", { agentId: nearest.agentId });
        // Don't return — player keeps moving
      }
    } else {
      // Fallback: Agent Town's built-in InteractionMenu (no bridge)
      if (this.interactionManager.updateProximity(this.eKey)) {
        return;
      }
    }

    // Boss terminal interaction (only without bridge — with bridge, boss seat is unused)
    if (!this.bridge && !this.interactionManager.nearestWorker && this.terminalZone && this.promptText) {
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        this.terminalZone.x,
        this.terminalZone.y,
      );
      const near = dist < BOSS_INTERACT_DISTANCE;
      this.promptText.setVisible(near);

      if (near && Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.terminalOpen = true;
        this.promptText.setVisible(false);
        gameEvents.emit("open-terminal");
      }
    } else if (this.promptText) {
      this.promptText.setVisible(false);
    }
  }
}
