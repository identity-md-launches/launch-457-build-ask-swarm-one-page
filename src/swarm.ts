export type SwarmPhase = 'idle' | 'thinking' | 'revealed';

type Agent = {
  x: number;
  y: number;
  z: number;
  seed: number;
  size: number;
  px: number;
  py: number;
  depth: number;
  light: number;
};

type Link = { a: number; b: number };

const TAU = Math.PI * 2;
const smoothstep = (value: number) => {
  const bounded = Math.max(0, Math.min(1, value));
  return bounded * bounded * (3 - 2 * bounded);
};

/** Decorative, locally rendered constellation. No user data enters this renderer. */
export class Swarm {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly resizeObserver: ResizeObserver;
  private readonly motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly glow: HTMLCanvasElement;
  private agents: Agent[] = [];
  private links: Link[] = [];
  private phase: SwarmPhase = 'idle';
  private paused = false;
  private destroyed = false;
  private frame = 0;
  private previousTimestamp = 0;
  private elapsed = 0;
  private rotation = 0;
  private phaseElapsed = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.glow = this.makeGlow();
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.motionPreference.addEventListener('change', this.motionChanged);
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.resize();
  }

  setPhase(phase: SwarmPhase) {
    if (this.destroyed || this.phase === phase) return;
    this.phase = phase;
    this.phaseElapsed = 0;
    this.draw();
    this.start();
  }

  setPaused(paused: boolean) {
    if (this.destroyed || this.paused === paused) return;
    this.paused = paused;
    if (paused) this.stop();
    else this.start();
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.motionPreference.removeEventListener('change', this.motionChanged);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
  }

  private canAnimate() {
    return !this.destroyed && !this.paused && !this.motionPreference.matches && !document.hidden;
  }

  private start() {
    if (!this.frame && this.canAnimate() && this.context) {
      this.previousTimestamp = 0;
      this.frame = window.requestAnimationFrame(this.tick);
    }
  }

  private stop() {
    window.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previousTimestamp = 0;
  }

  private readonly motionChanged = () => {
    this.stop();
    this.draw();
    this.start();
  };

  private readonly visibilityChanged = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private readonly resize = () => {
    if (this.destroyed || !this.context) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.round(this.width * pixelRatio);
    this.canvas.height = Math.round(this.height * pixelRatio);
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const count = this.width < 420 ? 210 : 320;
    if (this.agents.length !== count) this.makeAgents(count);
    this.draw();
    this.start();
  };

  private readonly tick = (timestamp: number) => {
    this.frame = 0;
    if (!this.canAnimate()) return;
    // Clamp long frames so returning to a busy tab cannot produce a large jump.
    const delta = this.previousTimestamp ? Math.min((timestamp - this.previousTimestamp) / 1000, 0.04) : 0;
    this.previousTimestamp = timestamp;
    this.elapsed += delta;
    this.phaseElapsed += delta;
    const acceleration = this.phase === 'thinking'
      ? 0.9 + smoothstep(this.phaseElapsed / 1.5) * 4.4
      : this.phase === 'revealed'
        ? 5.3 * (1 - smoothstep(this.phaseElapsed / 0.65))
        : 0;
    this.rotation = (this.rotation + delta * (0.105 + acceleration)) % TAU;
    this.draw();
    this.frame = window.requestAnimationFrame(this.tick);
  };

  private makeGlow() {
    const sprite = document.createElement('canvas');
    sprite.width = 48;
    sprite.height = 48;
    const context = sprite.getContext('2d');
    if (!context) return sprite;
    const gradient = context.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, 'rgba(246,237,255,1)');
    gradient.addColorStop(0.08, 'rgba(217,190,255,0.95)');
    gradient.addColorStop(0.2, 'rgba(181,136,255,0.42)');
    gradient.addColorStop(0.5, 'rgba(154,105,255,0.10)');
    gradient.addColorStop(1, 'rgba(154,105,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 48, 48);
    return sprite;
  }

  private makeAgents(count: number) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    this.agents = Array.from({ length: count }, (_, index) => {
      const y = 1 - (2 * (index + 0.5)) / count;
      const ring = Math.sqrt(1 - y * y);
      const theta = index * goldenAngle;
      const seed = (Math.sin(index * 127.1 + 311.7) * 43758.5453) % 1;
      return {
        x: Math.cos(theta) * ring,
        y,
        z: Math.sin(theta) * ring,
        seed: Math.abs(seed),
        size: 0.65 + Math.abs(seed) * 0.85,
        px: 0,
        py: 0,
        depth: 0,
        light: 0,
      };
    });

    // Calculate the mesh only at construction / a density breakpoint. Each
    // agent links to five spatial neighbors; frames never do an all-pairs scan.
    const connected = new Set<number>();
    this.links = [];
    for (let index = 0; index < count; index += 1) {
      const agent = this.agents[index];
      const neighbors = this.agents
        .map((candidate, neighbor) => ({
          neighbor,
          distance: (agent.x - candidate.x) ** 2 + (agent.y - candidate.y) ** 2 + (agent.z - candidate.z) ** 2,
        }))
        .filter((candidate) => candidate.neighbor !== index)
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 5);
      for (const { neighbor } of neighbors) {
        const a = Math.min(index, neighbor);
        const b = Math.max(index, neighbor);
        const key = a * count + b;
        if (!connected.has(key)) {
          connected.add(key);
          this.links.push({ a, b });
        }
      }
    }
  }

  private draw() {
    const context = this.context;
    if (!context || this.destroyed) return;
    context.clearRect(0, 0, this.width, this.height);
    const reduced = this.motionPreference.matches || this.paused;
    const time = this.elapsed;
    const radius = Math.min(this.width * 0.40, this.height * 0.48);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const thinking = this.phase === 'thinking';
    const progress = thinking ? smoothstep(reduced ? 0.65 : this.phaseElapsed / 1.5) : 0;
    const release = this.phase === 'revealed' ? smoothstep(reduced ? 1 : this.phaseElapsed / 0.65) : 1;
    const burst = this.phase === 'revealed' && !reduced ? Math.sin(release * Math.PI) * 0.16 : 0;
    const scale = thinking ? 1 - progress * 0.73 : 0.27 + release * 0.73 + burst;
    // Integrating rotation preserves orientation across phase transitions.
    const spin = this.rotation;
    const cosY = Math.cos(spin);
    const sinY = Math.sin(spin);
    const tilt = -0.17 + Math.sin(time * 0.13) * 0.12;
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);

    // A faint annular atmosphere keeps the center clear for the HTML answer.
    const haloRadius = Math.max(1, Math.min(radius * scale * 1.25, this.width * 0.499, this.height * 0.499));
    const halo = context.createRadialGradient(centerX, centerY, haloRadius * 0.15, centerX, centerY, haloRadius);
    halo.addColorStop(0, 'rgba(135,89,222,0)');
    halo.addColorStop(0.56, 'rgba(135,89,222,0.012)');
    halo.addColorStop(0.74, 'rgba(135,89,222,0.062)');
    halo.addColorStop(1, 'rgba(135,89,222,0)');
    context.fillStyle = halo;
    context.fillRect(centerX - haloRadius, centerY - haloRadius, haloRadius * 2, haloRadius * 2);

    let extentX = 1;
    let extentY = 1;
    for (const agent of this.agents) {
      const longitude = Math.atan2(agent.y, agent.x);
      const ripple = 1 + 0.095 * Math.sin(longitude * 3 + time * 0.21 + agent.z * 1.4)
        + 0.045 * Math.cos(longitude * 5 - time * 0.15 + agent.z * 2);
      const drift = Math.sin(time * 0.38 + agent.seed * TAU) * 0.022;
      const x = agent.x * ripple + drift;
      const y = agent.y * ripple;
      const z = agent.z * (0.87 + drift);
      const rotatedX = x * cosY + z * sinY;
      const rotatedZ = z * cosY - x * sinY;
      const rotatedY = y * cosX - rotatedZ * sinX;
      const depth = y * sinX + rotatedZ * cosX;
      const perspective = 2.9 / (2.9 - depth * 0.3);
      const angularSwirl = (thinking ? progress : 1 - release) * depth * 1.75;
      const cosSwirl = Math.cos(angularSwirl);
      const sinSwirl = Math.sin(angularSwirl);
      let screenX = (rotatedX * cosSwirl - rotatedY * sinSwirl) * perspective;
      let screenY = (rotatedY * cosSwirl + rotatedX * sinSwirl) * perspective;
      const distance = Math.hypot(screenX, screenY);
      // The shell gently opens around its core, giving its silhouette a
      // distinctive organic shape and leaving an undisturbed reading area.
      const expansion = distance > 0.001 ? (0.23 + distance * 0.77) / distance : 1;
      screenX *= expansion;
      screenY *= expansion;
      const flutter = 1 + burst * Math.sin(agent.seed * TAU);
      agent.px = centerX + screenX * radius * scale * flutter;
      agent.py = centerY + screenY * radius * scale * flutter;
      extentX = Math.max(extentX, Math.abs(agent.px - centerX));
      extentY = Math.max(extentY, Math.abs(agent.py - centerY));
      agent.depth = (depth + 1.1) / 2.2;
      const centerFade = thinking ? 1 : 0.15 + smoothstep((distance - 0.15) / 0.65) * 0.85;
      const twinkle = 0.87 + 0.13 * Math.sin(time * 0.8 + agent.seed * TAU);
      agent.light = (0.22 + agent.depth * 0.78) * centerFade * twinkle;
    }

    // Keep the larger silhouette and its node glows inside the canvas, including
    // the brief expansion at reveal and the most pronounced drifting lobes.
    const fit = Math.max(0, Math.min(1, (centerX - 8) / extentX, (centerY - 8) / extentY));
    if (fit < 1) {
      for (const agent of this.agents) {
        agent.px = centerX + (agent.px - centerX) * fit;
        agent.py = centerY + (agent.py - centerY) * fit;
      }
    }

    context.lineWidth = this.width < 420 ? 0.55 : 0.65;
    // Four batched paths avoid per-link state changes and translucent overdraw.
    const opacity = [0.055, 0.11, 0.20, 0.30];
    for (let band = 0; band < 4; band += 1) {
      context.beginPath();
      for (const link of this.links) {
        const a = this.agents[link.a];
        const b = this.agents[link.b];
        const light = (a.light + b.light) * 0.5;
        if (Math.min(3, Math.floor(light * 4)) !== band) continue;
        // Avoid long bridges through the open core of the swarm.
        if (Math.hypot(a.px - b.px, a.py - b.py) > radius * scale * fit * 0.37) continue;
        context.moveTo(a.px, a.py);
        context.lineTo(b.px, b.py);
      }
      context.strokeStyle = `rgba(176,143,235,${opacity[band]})`;
      context.stroke();
    }

    // A single cached glow sprite replaces expensive per-agent shadow blurs.
    for (const agent of this.agents) {
      const size = (7 + agent.size * 4) * (0.72 + agent.depth * 0.40);
      context.globalAlpha = agent.light * 0.84;
      context.drawImage(this.glow, agent.px - size / 2, agent.py - size / 2, size, size);
      context.globalAlpha = Math.min(1, agent.light * 1.1);
      context.fillStyle = agent.seed > 0.86 ? '#eee3ff' : '#c0a2f4';
      context.beginPath();
      context.arc(agent.px, agent.py, agent.size * (0.55 + agent.depth * 0.28), 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }
}
