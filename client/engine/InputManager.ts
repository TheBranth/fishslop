// Dual Input Manager: Keyboard (P1/P2) & Touch Joystick/Buttons

import { PlayerInput } from '../../shared/types';

export class InputManager {
  private currentInput: PlayerInput = {
    dx: 0,
    dy: 0,
    actionGrab: false,
    actionThrow: false,
    actionInteract: false,
    actionSlap: false
  };

  private keysDown: Set<string> = new Set();
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };

  constructor() {
    this.setupKeyboardListeners();
  }

  public getInput(): PlayerInput {
    // If keyboard is used, compute dx/dy from keys
    if (!this.joystickActive) {
      let dx = 0;
      let dy = 0;

      // P1 Keys: WASD or Arrow Keys
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) dy -= 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) dy += 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) dx -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) dx += 1;

      // Normalize diagonal
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        this.currentInput.dx = dx / len;
        this.currentInput.dy = dy / len;
      } else {
        this.currentInput.dx = 0;
        this.currentInput.dy = 0;
      }
    }

    // Return a copy and reset instantaneous action triggers
    const inputCopy = { ...this.currentInput };
    this.currentInput.actionGrab = false;
    this.currentInput.actionThrow = false;
    this.currentInput.actionInteract = false;
    this.currentInput.actionSlap = false;
    return inputCopy;
  }

  public triggerAction(action: 'grab' | 'throw' | 'interact' | 'slap'): void {
    if (action === 'grab') this.currentInput.actionGrab = true;
    if (action === 'throw') this.currentInput.actionThrow = true;
    if (action === 'interact') this.currentInput.actionInteract = true;
    if (action === 'slap') this.currentInput.actionSlap = true;

    // Mobile haptic pulse if available
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  public setJoystickVector(dx: number, dy: number): void {
    this.joystickActive = true;
    this.currentInput.dx = dx;
    this.currentInput.dy = dy;
  }

  public releaseJoystick(): void {
    this.joystickActive = false;
    this.currentInput.dx = 0;
    this.currentInput.dy = 0;
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);

      // Instantaneous actions
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        this.currentInput.actionGrab = true;
      }
      if (e.code === 'KeyF' || e.code === 'ShiftRight' || e.code === 'KeyQ') {
        this.currentInput.actionThrow = true;
      }
      if (e.code === 'KeyR' || e.code === 'ControlRight') {
        this.currentInput.actionSlap = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });
  }
}
