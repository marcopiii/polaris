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

    // Apply circular blur in the ring between vision and playfield
    vec4 color = vec4(0.0);
    float total = 0.0;
    float blurAmount = 0.005;

    // Circular blur kernel (only sample within radius)
    for (float x = -4.0; x <= 4.0; x += 1.0) {
        for (float y = -4.0; y <= 4.0; y += 1.0) {
            float sampleDist = length(vec2(x, y));
            if (sampleDist <= 4.0) {
                vec2 offset = vec2(x, y) * blurAmount;
                color += texture2D(uMainSampler, uv + offset);
                total += 1.0;
            }
        }
    }

    gl_FragColor = color / total;
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
