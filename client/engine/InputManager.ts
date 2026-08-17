// Dual Input Manager: Keyboard (P1/P2) & Touch Joystick/Buttons

import { PlayerInput } from '../../shared/types';

export class InputManager {
  private currentInput: PlayerInput = {
    dx: 0,
    dy: 0,
    actionPrimary: false,
    actionSecondary: false,
    isActionPrimaryHeld: false
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
    this.currentInput.actionPrimary = false;
    this.currentInput.actionSecondary = false;
    return inputCopy;
  }

  public triggerAction(action: 'primary' | 'secondary'): void {
    if (action === 'primary') this.currentInput.actionPrimary = true;
    if (action === 'secondary') this.currentInput.actionSecondary = true;

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

      // Button 1 (Action / Work / Drop / Cast / Reel / Heave)
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter') {
        this.currentInput.actionPrimary = true;
        this.currentInput.isActionPrimaryHeld = true;
      }
      // Button 2 (Chaos / Slap / Throw / Cut)
      if (e.code === 'KeyK' || e.code === 'KeyM' || e.code === 'ShiftRight') {
        this.currentInput.actionSecondary = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter') {
        this.currentInput.isActionPrimaryHeld = false;
      }
    });
  }
}
