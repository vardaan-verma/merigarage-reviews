import QRCode from 'qrcode';

export interface PosterRenderOptions {
  garageName: string;
  qrUrl: string;
  templateImageUrl?: string;
  scale?: number; // 1 = 765x1024, 2 = 1530x2048 (high-res print)
  isDevTestMode?: boolean;
}

export interface PosterRenderResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
}

/**
 * Helper to draw a crisp 5-pointed star on the canvas
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes = 5,
  outerRadius = 12,
  innerRadius = 5.5,
  fillStyle = '#DC2626'
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

/**
 * Loads an image from a URL or asset path into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load poster template image: ${src} (${err})`));
    img.src = src;
  });
}

/**
 * Wraps text into multiple lines ensuring it does not exceed maxWidth
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return [text];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = `${currentLine} ${words[i]}`;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Renders the complete, print-ready MeriGarage review poster using the exact visual template.
 * 
 * Order of composition:
 * 1. Original MeriGarage logo and branding (from template)
 * 2. Individual garage name (dynamically drawn between branding and RATE US ON)
 * 3. “RATE US ON”
 * 4. Five red stars
 * 5. Garage-specific QR code (inside the central placeholder, preserving the red/blue corner brackets)
 * 6. “SCAN TO RATE & REVIEW” (from template)
 * 7. “YOUR FEEDBACK HELPS US SERVE YOU BETTER!” (from template)
 * 8. “THANK YOU FOR YOUR VISIT!” (from template)
 * 9. MeriGarage public website domain (www.merigarage.com, from template)
 */
export async function renderGarageReviewPoster(
  options: PosterRenderOptions
): Promise<PosterRenderResult> {
  const {
    garageName,
    qrUrl,
    templateImageUrl = '/garage-review-poster-template.png',
    scale = 2, // Default 2x for high-resolution 1530x2048 print output
    isDevTestMode = false,
  } = options;

  const baseWidth = 765;
  const baseHeight = 1024;
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  // 1. Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 2. Load template image and draw onto canvas
  const templateImg = await loadImage(templateImageUrl);
  ctx.drawImage(templateImg, 0, 0, width, height);

  // 3. Clear the inner QR placeholder box with pure white
  // Covering the placeholder text "PLACE QR CODE HERE" & camera icon while keeping the corner brackets intact
  const clearX = 232 * scale;
  const clearY = 398 * scale;
  const clearW = 301 * scale;
  const clearH = 275 * scale;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(clearX, clearY, clearW, clearH);

  // 4. Generate the QR Code onto an offscreen canvas
  const qrSize = Math.round(256 * scale);
  const qrOffscreen = document.createElement('canvas');
  await QRCode.toCanvas(qrOffscreen, qrUrl, {
    width: qrSize,
    margin: 1, // minimal 1-module margin
    errorCorrectionLevel: 'H', // High error correction (30% recovery)
    color: {
      dark: '#0F2147', // Deep brand navy for high-contrast scanning
      light: '#FFFFFF',
    },
  });

  // 5. Draw QR Code centered inside the central placeholder box
  const qrCenterX = (baseWidth / 2) * scale;
  const qrCenterY = 535 * scale;
  const qrPosX = Math.round(qrCenterX - qrSize / 2);
  const qrPosY = Math.round(qrCenterY - qrSize / 2);
  ctx.drawImage(qrOffscreen, qrPosX, qrPosY, qrSize, qrSize);

  // 6. Draw Individual Garage Name (between MeriGarage branding and "RATE US ON")
  // Center: x = 382.5 * scale, Available vertical space: y = 175 * scale to 275 * scale
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F2147'; // Deep navy brand color

  const maxTextWidth = 630 * scale;
  let fontSize = 32 * scale;
  ctx.font = `bold ${fontSize}px 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

  let lines = wrapText(ctx, garageName, maxTextWidth);

  // Dynamically reduce font size if name is long or needs more than 2 lines
  if (lines.length > 2 || ctx.measureText(lines[0]).width > maxTextWidth) {
    fontSize = 25 * scale;
    ctx.font = `bold ${fontSize}px 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    lines = wrapText(ctx, garageName, maxTextWidth);
  }

  if (lines.length > 2) {
    fontSize = 20 * scale;
    ctx.font = `bold ${fontSize}px 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    lines = wrapText(ctx, garageName, maxTextWidth);
    if (lines.length > 3) {
      lines = [lines[0], lines[1], `${lines[2]}...`];
    }
  }

  // Vertical placement of garage name
  const nameCenterY = 222 * scale;
  const lineHeight = fontSize * 1.25;
  const startY = nameCenterY - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, qrCenterX, startY + index * lineHeight);
  });

  // 7. Draw "RATE US ON"
  const rateUsOnY = 288 * scale;
  const rateUsFontSize = 18 * scale;
  ctx.font = `800 ${rateUsFontSize}px 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = '#0F2147';
  // Manually add letter-spacing for premium feel
  const rateText = 'RATE US ON';
  ctx.fillText(rateText, qrCenterX, rateUsOnY);

  // 8. Draw Five Red Stars (★ ★ ★ ★ ★)
  const starY = 333 * scale;
  const starSpacing = 30 * scale;
  const starRadius = 13 * scale;
  const innerStarRadius = 5.5 * scale;
  const totalStarsWidth = 4 * starSpacing;
  const starStartX = qrCenterX - totalStarsWidth / 2;

  for (let i = 0; i < 5; i++) {
    const starX = starStartX + i * starSpacing;
    drawStar(ctx, starX, starY, 5, starRadius, innerStarRadius, '#DC2626');
  }

  // 9. If Development Test Mode is active, draw a distinct warning watermark on the poster
  if (isDevTestMode) {
    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.95)'; // Amber/Orange
    ctx.fillRect(0, 0, width, 32 * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${13 * scale}px 'Manrope', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ DEVELOPMENT TEST POSTER — ENCODES LOCALHOST — NOT FOR PRODUCTION PRINT', width / 2, 16 * scale);
    ctx.restore();
  }

  // 10. Convert to Data URL and Blob
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create Blob from canvas'));
      },
      'image/png',
      1.0
    );
  });

  const sanitizedSlug = garageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fileName = `${sanitizedSlug}-review-poster${isDevTestMode ? '-DEV-TEST' : ''}.png`;

  return {
    dataUrl,
    blob,
    width,
    height,
    fileName,
  };
}

/**
 * Triggers a browser download of the poster PNG
 */
export function downloadPosterFile(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
