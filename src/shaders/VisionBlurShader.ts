import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME VISION_BLUR_FS

precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uVisionRadius;
uniform float uPlayfieldRadius;
uniform vec2 uDirection;

varying vec2 outTexCoord;

void main() {
    vec2 uv = outTexCoord;
    vec2 pixelPos = uv * uResolution;
    float dist = distance(pixelPos, uCenter);

    // Inside vision radius or outside playfield - no blur
    if (dist <= uVisionRadius || dist > uPlayfieldRadius) {
        gl_FragColor = texture2D(uMainSampler, uv);
        return;
    }

    // 9-tap Gaussian blur along uDirection (separable)
    float blurAmount = 0.005;
    vec2 step = uDirection * blurAmount;

    vec4 color = vec4(0.0);
    color += texture2D(uMainSampler, uv - 4.0 * step) * 0.0162;
    color += texture2D(uMainSampler, uv - 3.0 * step) * 0.0540;
    color += texture2D(uMainSampler, uv - 2.0 * step) * 0.1218;
    color += texture2D(uMainSampler, uv - 1.0 * step) * 0.1956;
    color += texture2D(uMainSampler, uv              ) * 0.2248;
    color += texture2D(uMainSampler, uv + 1.0 * step) * 0.1956;
    color += texture2D(uMainSampler, uv + 2.0 * step) * 0.1218;
    color += texture2D(uMainSampler, uv + 3.0 * step) * 0.0540;
    color += texture2D(uMainSampler, uv + 4.0 * step) * 0.0162;

    gl_FragColor = color;
}
`;

export default class VisionBlurShader extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private centerX: number = 0;
  private centerY: number = 0;
  private visionRadius: number = 0;
  private playfieldRadius: number = 0;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'VisionBlurShader',
      renderTarget: true,
      fragShader,
    });
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set2f('uCenter', this.centerX, this.centerY);
    this.set1f('uVisionRadius', this.visionRadius);
    this.set1f('uPlayfieldRadius', this.playfieldRadius);
  }

  onDraw(renderTarget: Phaser.Renderer.WebGL.RenderTarget) {
    // Two-pass separable blur: horizontal then vertical
    this.set2f('uDirection', 1.0, 0.0);
    this.bindAndDraw(renderTarget, this.fullFrame1);

    this.set2f('uDirection', 0.0, 1.0);
    this.bindAndDraw(this.fullFrame1);
  }

  setVisionParams(centerX: number, centerY: number, visionRadius: number, playfieldRadius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.visionRadius = visionRadius;
    this.playfieldRadius = playfieldRadius;
  }
}
