// Renders 1080x1920 story images on a canvas: one for replying to a message
// (question card + answer) and one for promoting your link.

const STORY_W = 1080;
const STORY_H = 1920;

function storyBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
  g.addColorStop(0, '#7b5cff');
  g.addColorStop(0.6, '#ff4fa3');
  g.addColorStop(1, '#ffb547');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Card with gradient header (prompt) and white body (question). Returns its bottom y.
function drawQuestionCard(ctx, { prompt, question, y }) {
  const x = 90;
  const w = STORY_W - 180;
  const pad = 56;
  ctx.font = `700 64px ${FONT}`;
  const lines = wrapLines(ctx, question, w - pad * 2);
  const headerH = 130;
  const bodyH = pad * 2 + lines.length * 78;
  const h = headerH + bodyH;

  ctx.save();
  ctx.shadowColor = 'rgba(30, 10, 60, 0.35)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, x, y, w, h, 56);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 56);
  ctx.clip();
  const hg = ctx.createLinearGradient(x, y, x + w, y + headerH);
  hg.addColorStop(0, '#7b5cff');
  hg.addColorStop(1, '#ff4fa3');
  ctx.fillStyle = hg;
  ctx.fillRect(x, y, w, headerH);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = `800 52px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(prompt, x + pad, y + headerH / 2, w - pad * 2);

  ctx.fillStyle = '#16131f';
  ctx.font = `700 64px ${FONT}`;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, x + pad, y + headerH + pad + i * 78));
  return y + h;
}

function drawFooter(ctx, text) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `800 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, STORY_W / 2, STORY_H - 140);
  ctx.textAlign = 'left';
}

function renderReplyStory(canvas, { prompt, question, reply, link }) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');
  storyBackground(ctx);
  const bottom = drawQuestionCard(ctx, { prompt, question, y: 380 });

  ctx.fillStyle = '#fff';
  ctx.font = `800 76px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 16;
  const lines = wrapLines(ctx, reply, STORY_W - 180).slice(0, 9);
  lines.forEach((line, i) => ctx.fillText(line, 90, bottom + 90 + i * 92));
  ctx.shadowBlur = 0;

  drawFooter(ctx, `psst · ${link}`);
  return canvas;
}

function renderLinkStory(canvas, { prompt, link }) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');
  storyBackground(ctx);
  const bottom = drawQuestionCard(ctx, { prompt, question: 'send me anonymous messages! 👇', y: 640 });

  // Placeholder where the user drops the platform's "link" sticker.
  ctx.save();
  ctx.setLineDash([24, 18]);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;
  roundRect(ctx, 240, bottom + 80, 600, 130, 65);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `800 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('paste link sticker here', STORY_W / 2, bottom + 145);
  ctx.textAlign = 'left';

  drawFooter(ctx, link);
  return canvas;
}

async function shareOrDownload(canvas, filename) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
