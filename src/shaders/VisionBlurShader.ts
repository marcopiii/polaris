import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME VISION_BLUR_FS

precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uVisionRadius;
uniform float uPlayfieldRadius;

varying vec2 outTexCoord;

void main() {
    vec2 uv = outTexCoord;
    vec2 pixelPos = uv * uResolution;
    float dist = distance(pixelPos, uCenter);

    // Inside vision radius - no blur
    if (dist <= uVisionRadius) {
        gl_FragColor = texture2D(uMainSampler, uv);
        return;
    }

    // Outside playfield - no blur
    if (dist > uPlayfieldRadius) {
        gl_FragColor = texture2D(uMainSampler, uv);
        return;
    }

    // 9-tap Gaussian blur (single-pass cross pattern, fewer samples than original grid)
    float blurAmount = 0.005;

    vec4 color = texture2D(uMainSampler, uv) * 0.2270;

    color += texture2D(uMainSampler, uv + vec2( blurAmount, 0.0)) * 0.1946;
    color += texture2D(uMainSampler, uv + vec2(-blurAmount, 0.0)) * 0.1946;
    color += texture2D(uMainSampler, uv + vec2(0.0,  blurAmount)) * 0.1946;
    color += texture2D(uMainSampler, uv + vec2(0.0, -blurAmount)) * 0.1946;

    float diag = blurAmount * 0.707;
    color += texture2D(uMainSampler, uv + vec2( diag,  diag)) * 0.0486;
    color += texture2D(uMainSampler, uv + vec2(-diag,  diag)) * 0.0486;
    color += texture2D(uMainSampler, uv + vec2( diag, -diag)) * 0.0486;
    color += texture2D(uMainSampler, uv + vec2(-diag, -diag)) * 0.0486;

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

  setVisionParams(centerX: number, centerY: number, visionRadius: number, playfieldRadius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.visionRadius = visionRadius;
    this.playfieldRadius = playfieldRadius;
  }
}
