import * as THREE from "three";

export interface SceneParams {
  skin: string;
  infraTier: number;
  visitors: number;
  mood: "neutral" | "boom" | "bust";
  year: number;
}

export class SceneRuntime {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private desk: THREE.Mesh;
  private tower: THREE.Mesh;
  private racks: THREE.Mesh[] = [];
  private monitorMat: THREE.MeshStandardMaterial;
  private lastScreenLabel = "";
  private raf = 0;

  constructor(el: HTMLElement) {
    const w = el.clientWidth || 320;
    const h = el.clientHeight || 280;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(4, 3.2, 6);
    this.camera.lookAt(0, 0.8, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const dir = new THREE.DirectionalLight(0xfff2cc, 0.9);
    dir.position.set(5, 8, 4);
    this.scene.add(ambient, dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b6455 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    this.desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.12, 1),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 })
    );
    this.desk.position.y = 0.7;
    this.scene.add(this.desk);

    this.tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xb8b8b8 })
    );
    this.tower.position.set(-0.4, 1.05, 0);
    this.scene.add(this.tower);

    this.monitorMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      emissive: 0x1133aa,
      emissiveIntensity: 0.45,
    });
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.08), this.monitorMat);
    monitor.position.set(0.3, 1.1, 0);
    this.scene.add(monitor);

    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  apply(params: SceneParams & { companyName?: string }) {
    const moodColor =
      params.mood === "bust" ? 0x553333 : params.mood === "boom" ? 0x335544 : 0x444455;
    (this.scene.background as THREE.Color | null) =
      this.scene.background instanceof THREE.Color
        ? this.scene.background
        : new THREE.Color(moodColor);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(moodColor);
    } else {
      this.scene.background = new THREE.Color(moodColor);
    }

    const targetRacks = Math.min(6, params.infraTier + (params.year >= 2023 ? +Math.min(2, Math.floor(params.visitors / 5000)) : 0));
    while (this.racks.length < targetRacks) {
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 1.4, 0.35),
        new THREE.MeshStandardMaterial({
          color: 0x222222,
          emissive: 0x00ff88,
          emissiveIntensity: 0.15 + this.racks.length * 0.05,
        })
      );
      rack.position.set(2 + this.racks.length * 0.35, 0.7, -1.2);
      this.scene.add(rack);
      this.racks.push(rack);
    }
    while (this.racks.length > targetRacks) {
      const rack = this.racks.pop()!;
      this.scene.remove(rack);
      rack.geometry.dispose();
      (rack.material as THREE.Material).dispose();
    }

    const deskMat = this.desk.material as THREE.MeshStandardMaterial;
    if (params.skin === "win95") deskMat.color.setHex(0x8b7355);
    else if (params.skin === "enterprise" || params.year >= 2023) deskMat.color.setHex(0x333844);
    else deskMat.color.setHex(0x6a7a9a);

    const label = (params.companyName ?? "Startup").slice(0, 24);
    if (label !== this.lastScreenLabel) {
      this.lastScreenLabel = label;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a1628";
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(label, 12, 48);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px monospace";
        ctx.fillText(`${params.year} · IE`, 12, 80);
        const oldMap = this.monitorMat.map;
        const tex = new THREE.CanvasTexture(canvas);
        this.monitorMat.map = tex;
        this.monitorMat.needsUpdate = true;
        oldMap?.dispose();
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}