import { Application, Container, Graphics } from 'pixi.js';
import { SpellElement } from '@/types/game';

interface VFXConfig {
  element: SpellElement;
  position: { x: number; y: number };
  target?: { x: number; y: number };
  power?: number;
}

interface ElementalVFX {
  castSigil: () => Container;
  projectile: (from: { x: number; y: number }, to: { x: number; y: number }) => Container;
  impact: (position: { x: number; y: number }) => Container;
  trail?: () => Container;
}

export class VFXManager {
  private app: Application;
  private container: Container;
  private particles: Container[] = [];
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.container = new Container();
    this.app.stage.addChild(this.container);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize PIXI and create base textures
      await this.createBaseTextures();
      this.isInitialized = true;
      
      // Start render loop
      this.app.ticker.add(() => this.update());
    } catch (error) {
      console.error('Failed to initialize VFX Manager:', error);
    }
  }

  createCastSigil(config: VFXConfig): void {
    if (!this.isInitialized) return;

    const sigil = this.getElementalVFX(config.element).castSigil();
    sigil.x = config.position.x;
    sigil.y = config.position.y;

    this.container.addChild(sigil);
    this.particles.push(sigil);

    // Animate sigil appearance
    sigil.scale.set(0);
    sigil.alpha = 0;

    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      sigil.scale.set(progress * (config.power || 1));
      sigil.alpha = progress * 0.8;
      sigil.rotation += 0.02;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.fadeOut(sigil, 300);
      }
    };

    animate();
  }

  createProjectile(config: VFXConfig): void {
    if (!this.isInitialized || !config.target) return;

    const projectile = this.getElementalVFX(config.element).projectile(
      config.position,
      config.target
    );

    this.container.addChild(projectile);
    this.particles.push(projectile);

    // Animate projectile movement
    const duration = 600;
    const startTime = performance.now();
    const distance = Math.sqrt(
      Math.pow(config.target.x - config.position.x, 2) +
      Math.pow(config.target.y - config.position.y, 2)
    );

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      projectile.x = config.position.x + (config.target!.x - config.position.x) * progress;
      projectile.y = config.position.y + (config.target!.y - config.position.y) * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.removeParticle(projectile);
        this.createImpact({ element: config.element, position: config.target! });
      }
    };

    animate();
  }

  createImpact(config: VFXConfig): void {
    if (!this.isInitialized) return;

    const impact = this.getElementalVFX(config.element).impact(config.position);
    impact.x = config.position.x;
    impact.y = config.position.y;

    this.container.addChild(impact);
    this.particles.push(impact);

    // Screen shake effect
    this.screenShake(5, 200);

    // Animate impact
    const duration = 400;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const scale = 0.5 + progress * 1.5;
      impact.scale.set(scale);
      impact.alpha = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.removeParticle(impact);
      }
    };

    animate();
  }

  private getElementalVFX(element: SpellElement): ElementalVFX {
    const baseVFX: ElementalVFX = {
      castSigil: () => this.createBasicSigil(element),
      projectile: (from, to) => this.createBasicProjectile(element, from, to),
      impact: (pos) => this.createBasicImpact(element, pos),
    };

    // Element-specific customizations
    switch (element) {
      case 'fire':
        return {
          ...baseVFX,
          castSigil: () => this.createFireSigil(),
          projectile: (from, to) => this.createFireProjectile(from, to),
          impact: (pos) => this.createFireImpact(pos),
        };
      case 'ice':
        return {
          ...baseVFX,
          castSigil: () => this.createIceSigil(),
          projectile: (from, to) => this.createIceProjectile(from, to),
          impact: (pos) => this.createIceImpact(pos),
        };
      case 'lightning':
        return {
          ...baseVFX,
          castSigil: () => this.createLightningSigil(),
          projectile: (from, to) => this.createLightningProjectile(from, to),
          impact: (pos) => this.createLightningImpact(pos),
        };
      default:
        return baseVFX;
    }
  }

  // Basic VFX creators
  private createBasicSigil(element: SpellElement): Container {
    const container = new Container();
    const circle = new Graphics();
    
    const color = this.getElementColor(element);
    circle.beginFill(color, 0.7);
    circle.drawCircle(0, 0, 50);
    circle.endFill();

    container.addChild(circle);
    return container;
  }

  private createBasicProjectile(element: SpellElement, from: { x: number; y: number }, to: { x: number; y: number }): Container {
    const container = new Container();
    const orb = new Graphics();
    
    const color = this.getElementColor(element);
    orb.beginFill(color);
    orb.drawCircle(0, 0, 15);
    orb.endFill();

    container.addChild(orb);
    return container;
  }

  private createBasicImpact(element: SpellElement, pos: { x: number; y: number }): Container {
    const container = new Container();
    const burst = new Graphics();
    
    const color = this.getElementColor(element);
    burst.beginFill(color, 0.6);
    burst.drawCircle(0, 0, 80);
    burst.endFill();

    container.addChild(burst);
    return container;
  }

  // Fire VFX
  private createFireSigil(): Container {
    const container = new Container();
    const flames = new Graphics();
    
    flames.beginFill(0xFF4500, 0.8);
    flames.drawCircle(0, 0, 60);
    flames.endFill();

    flames.beginFill(0xFF6600, 0.6);
    flames.drawCircle(0, 0, 40);
    flames.endFill();

    flames.beginFill(0xFFAA00, 0.4);
    flames.drawCircle(0, 0, 20);
    flames.endFill();

    container.addChild(flames);
    return container;
  }

  private createFireProjectile(from: { x: number; y: number }, to: { x: number; y: number }): Container {
    const container = new Container();
    const fireball = new Graphics();
    
    fireball.beginFill(0xFF4500);
    fireball.drawCircle(0, 0, 20);
    fireball.endFill();

    fireball.beginFill(0xFFAA00);
    fireball.drawCircle(0, 0, 12);
    fireball.endFill();

    container.addChild(fireball);
    return container;
  }

  private createFireImpact(pos: { x: number; y: number }): Container {
    const container = new Container();
    const explosion = new Graphics();
    
    explosion.beginFill(0xFF4500, 0.8);
    explosion.drawCircle(0, 0, 100);
    explosion.endFill();

    explosion.beginFill(0xFFAA00, 0.6);
    explosion.drawCircle(0, 0, 70);
    explosion.endFill();

    container.addChild(explosion);
    return container;
  }

  // Ice VFX
  private createIceSigil(): Container {
    const container = new Container();
    const ice = new Graphics();
    
    ice.beginFill(0x87CEEB, 0.8);
    ice.drawPolygon([0, -60, 52, -30, 52, 30, 0, 60, -52, 30, -52, -30]);
    ice.endFill();

    container.addChild(ice);
    return container;
  }

  private createIceProjectile(from: { x: number; y: number }, to: { x: number; y: number }): Container {
    const container = new Container();
    const shard = new Graphics();
    
    shard.beginFill(0x87CEEB);
    shard.drawPolygon([0, -15, 10, 0, 0, 15, -10, 0]);
    shard.endFill();

    container.addChild(shard);
    return container;
  }

  private createIceImpact(pos: { x: number; y: number }): Container {
    const container = new Container();
    const shatter = new Graphics();
    
    shatter.beginFill(0x87CEEB, 0.7);
    shatter.drawCircle(0, 0, 90);
    shatter.endFill();

    // Add ice crystals
    for (let i = 0; i < 8; i++) {
      const crystal = new Graphics();
      crystal.beginFill(0xB0E0E6);
      crystal.drawPolygon([0, -20, 5, 0, 0, 20, -5, 0]);
      crystal.endFill();
      
      const angle = (i / 8) * Math.PI * 2;
      crystal.x = Math.cos(angle) * 60;
      crystal.y = Math.sin(angle) * 60;
      crystal.rotation = angle;
      
      shatter.addChild(crystal);
    }

    container.addChild(shatter);
    return container;
  }

  // Lightning VFX
  private createLightningSigil(): Container {
    const container = new Container();
    const bolt = new Graphics();
    
    bolt.lineStyle(4, 0xFFFF00, 1);
    bolt.moveTo(0, -50);
    bolt.lineTo(20, -20);
    bolt.lineTo(-10, -20);
    bolt.lineTo(10, 10);
    bolt.lineTo(-20, 10);
    bolt.lineTo(0, 50);

    container.addChild(bolt);
    return container;
  }

  private createLightningProjectile(from: { x: number; y: number }, to: { x: number; y: number }): Container {
    const container = new Container();
    const spark = new Graphics();
    
    spark.beginFill(0xFFFF00);
    spark.drawCircle(0, 0, 12);
    spark.endFill();

    spark.beginFill(0xFFFFFF);
    spark.drawCircle(0, 0, 6);
    spark.endFill();

    container.addChild(spark);
    return container;
  }

  private createLightningImpact(pos: { x: number; y: number }): Container {
    const container = new Container();
    
    // Multiple lightning bolts radiating outward
    for (let i = 0; i < 6; i++) {
      const bolt = new Graphics();
      bolt.lineStyle(3, 0xFFFF00, 0.8);
      
      const angle = (i / 6) * Math.PI * 2;
      const length = 80;
      
      bolt.moveTo(0, 0);
      bolt.lineTo(
        Math.cos(angle) * length + (Math.random() - 0.5) * 20,
        Math.sin(angle) * length + (Math.random() - 0.5) * 20
      );
      
      container.addChild(bolt);
    }

    return container;
  }

  private getElementColor(element: SpellElement): number {
    const colors: Record<SpellElement, number> = {
      fire: 0xFF4500,
      ice: 0x87CEEB,
      lightning: 0xFFFF00,
      nature: 0x32CD32,
      shadow: 0x8B00FF,
      light: 0xFFD700,
      arcane: 0x9932CC,
      water: 0x1E90FF,
      wind: 0x87CEEB,
      earth: 0x8B4513,
    };
    return colors[element] || 0xFFFFFF;
  }

  private screenShake(intensity: number, duration: number): void {
    const originalX = this.container.x;
    const originalY = this.container.y;
    const startTime = performance.now();

    const shake = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentIntensity = intensity * (1 - progress);

      this.container.x = originalX + (Math.random() - 0.5) * currentIntensity;
      this.container.y = originalY + (Math.random() - 0.5) * currentIntensity;

      if (progress < 1) {
        requestAnimationFrame(shake);
      } else {
        this.container.x = originalX;
        this.container.y = originalY;
      }
    };

    shake();
  }

  private fadeOut(particle: Container, duration: number): void {
    const startTime = performance.now();
    const startAlpha = particle.alpha;

    const fade = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      particle.alpha = startAlpha * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        this.removeParticle(particle);
      }
    };

    fade();
  }

  private removeParticle(particle: Container): void {
    const index = this.particles.indexOf(particle);
    if (index > -1) {
      this.particles.splice(index, 1);
      this.container.removeChild(particle);
      particle.destroy();
    }
  }

  private update(): void {
    // Clean up finished particles and update animations
    this.particles.forEach(particle => {
      if (particle.alpha <= 0) {
        this.removeParticle(particle);
      }
    });
  }

  private async createBaseTextures(): Promise<void> {
    // Create minimal base textures for demo
    // In production, these would be loaded from actual image files
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.particles.forEach(particle => particle.destroy());
    this.particles = [];
    this.app.destroy(true);
  }
}

export const createVFXManager = (canvas: HTMLCanvasElement) => new VFXManager(canvas);