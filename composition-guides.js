/**
 * Composition Guides Module (Refined)
 * Provides crisp, high-contrast overlays and reusable drawing helpers.
 *
 * Usage: CompositionGuides.draw(ctx, rect, 'thirds', options);
 */
var CompositionGuides = (function() {
  const PHI = 1.61803398875;
  const PHI_INV = 1 / PHI;

  const defaultOpts = {
    color: '#FFFFFF',
    lineWidth: 1.5,
    showPoints: true,
    pointRadius: 4,
    shadow: true,
    flipX: false,
    flipY: false
  };

  function getOpts(opts) {
    if (!opts) return defaultOpts;
    return Object.assign({}, defaultOpts, opts);
  }

  function snap(value) {
    return Math.round(value * 2) / 2;
  }

  function applyStyle(ctx, opts) {
    ctx.strokeStyle = opts.color;
    ctx.fillStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    if (opts.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
    }
  }

  function cleanupStyle(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
  }

  function drawPoint(ctx, x, y, opts) {
    if (!opts.showPoints) return;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(snap(x), snap(y), opts.pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.stroke();
    ctx.restore();
  }

  function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(snap(x1), snap(y1));
    ctx.lineTo(snap(x2), snap(y2));
    ctx.stroke();
  }

  function drawRect(ctx, x, y, w, h) {
    ctx.strokeRect(snap(x), snap(y), snap(w), snap(h));
  }

  function renderGuide(ctx, rect, opts, drawFn) {
    const finalOpts = getOpts(opts);
    ctx.save();
    if (finalOpts.flipX || finalOpts.flipY) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.scale(finalOpts.flipX ? -1 : 1, finalOpts.flipY ? -1 : 1);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    applyStyle(ctx, finalOpts);
    drawFn(ctx, rect, finalOpts);
    cleanupStyle(ctx);
    ctx.restore();
  }

  function drawThirds(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const x1 = r.x + r.w / 3;
      const x2 = r.x + (r.w * 2) / 3;
      const y1 = r.y + r.h / 3;
      const y2 = r.y + (r.h * 2) / 3;
      drawLine(innerCtx, x1, r.y, x1, r.y + r.h);
      drawLine(innerCtx, x2, r.y, x2, r.y + r.h);
      drawLine(innerCtx, r.x, y1, r.x + r.w, y1);
      drawLine(innerCtx, r.x, y2, r.x + r.w, y2);
      drawPoint(innerCtx, x1, y1, opts);
      drawPoint(innerCtx, x2, y1, opts);
      drawPoint(innerCtx, x1, y2, opts);
      drawPoint(innerCtx, x2, y2, opts);
    });
  }

  function drawPhiGrid(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const x1 = r.x + r.w * PHI_INV;
      const x2 = r.x + r.w * (1 - PHI_INV);
      const y1 = r.y + r.h * PHI_INV;
      const y2 = r.y + r.h * (1 - PHI_INV);
      innerCtx.setLineDash([6, 4]);
      drawLine(innerCtx, x1, r.y, x1, r.y + r.h);
      drawLine(innerCtx, x2, r.y, x2, r.y + r.h);
      drawLine(innerCtx, r.x, y1, r.x + r.w, y1);
      drawLine(innerCtx, r.x, y2, r.x + r.w, y2);
      innerCtx.setLineDash([]);
      drawPoint(innerCtx, x1, y1, opts);
      drawPoint(innerCtx, x1, y2, opts);
      drawPoint(innerCtx, x2, y1, opts);
      drawPoint(innerCtx, x2, y2, opts);
    });
  }

  function drawQuadrant(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      drawLine(innerCtx, cx, r.y, cx, r.y + r.h);
      drawLine(innerCtx, r.x, cy, r.x + r.w, cy);
      drawPoint(innerCtx, r.x + r.w / 4, r.y + r.h / 4, opts);
      drawPoint(innerCtx, r.x + (r.w * 3) / 4, r.y + r.h / 4, opts);
      drawPoint(innerCtx, r.x + r.w / 4, r.y + (r.h * 3) / 4, opts);
      drawPoint(innerCtx, r.x + (r.w * 3) / 4, r.y + (r.h * 3) / 4, opts);
    });
  }

  function drawCenter(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      drawLine(innerCtx, cx, r.y, cx, r.y + r.h);
      drawLine(innerCtx, r.x, cy, r.x + r.w, cy);
      innerCtx.beginPath();
      innerCtx.arc(snap(cx), snap(cy), opts.pointRadius + 2, 0, Math.PI * 2);
      innerCtx.fill();
    });
  }

  function drawGoldenSpiral(ctx, rect, corner, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      let sw = r.w;
      let sh = r.w / PHI;
      let sx = r.x;
      let sy = r.y;
      if (sh > r.h) {
        sh = r.h;
        sw = sh * PHI;
      }
      if (corner.includes('r')) {
        sx = r.x + (r.w - sw);
      }
      if (corner.includes('b')) {
        sy = r.y + (r.h - sh);
      }
      let dir = corner;
      innerCtx.setLineDash([5, 4]);
      for (let i = 0; i < 10; i++) {
        drawRect(innerCtx, sx, sy, sw, sh);
        innerCtx.beginPath();
        const arcR = Math.min(sw, sh);
        if (dir === 'tl') {
          innerCtx.arc(sx + sw, sy + sh, arcR, Math.PI, 1.5 * Math.PI);
          dir = 'bl';
        } else if (dir === 'tr') {
          innerCtx.arc(sx, sy + sh, arcR, 1.5 * Math.PI, 2 * Math.PI);
          dir = 'tl';
        } else if (dir === 'br') {
          innerCtx.arc(sx, sy, arcR, 0, 0.5 * Math.PI);
          dir = 'tr';
        } else if (dir === 'bl') {
          innerCtx.arc(sx + sw, sy, arcR, 0.5 * Math.PI, Math.PI);
          dir = 'br';
        }
        innerCtx.stroke();
        if (sw >= sh) {
          const newW = sw / PHI;
          if (corner.includes('r')) sx += sw - newW;
          sw = newW;
        } else {
          const newH = sh / PHI;
          if (corner.includes('b')) sy += sh - newH;
          sh = newH;
        }
        if (sw < 8 || sh < 8) break;
      }
      innerCtx.setLineDash([]);
    });
  }

  function drawGoldenTriangles(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      drawLine(innerCtx, r.x, r.y + r.h, r.x + r.w, r.y);
      innerCtx.setLineDash([6, 4]);
      const t = (r.w * r.w) / (r.w * r.w + r.h * r.h);
      drawLine(innerCtx, r.x, r.y, r.x + r.w * t, r.y + r.h * (1 - t));
      drawLine(innerCtx, r.x + r.w, r.y + r.h, r.x + r.w * (1 - t), r.y + r.h * t);
      innerCtx.setLineDash([]);
      drawPoint(innerCtx, r.x + r.w * t, r.y + r.h * (1 - t), opts);
      drawPoint(innerCtx, r.x + r.w * (1 - t), r.y + r.h * t, opts);
    });
  }

  function drawDiagonal(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      drawLine(innerCtx, r.x, r.y, r.x + r.w, r.y + r.h);
      drawLine(innerCtx, r.x + r.w, r.y, r.x, r.y + r.h);
      drawPoint(innerCtx, r.x + r.w / 2, r.y + r.h / 2, opts);
    });
  }

  function drawBaroqueDiagonal(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.lineWidth = opts.lineWidth + 0.5;
      drawLine(innerCtx, r.x, r.y, r.x + r.w, r.y + r.h);
      drawLine(innerCtx, r.x + r.w - 15, r.y + r.h - 5, r.x + r.w, r.y + r.h);
      drawLine(innerCtx, r.x + r.w, r.y + r.h, r.x + r.w - 5, r.y + r.h - 15);
      drawPoint(innerCtx, r.x + r.w * 0.33, r.y + r.h * 0.33, opts);
      drawPoint(innerCtx, r.x + r.w * 0.67, r.y + r.h * 0.67, opts);
    });
  }

  function drawSinisterDiagonal(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.lineWidth = opts.lineWidth + 0.5;
      drawLine(innerCtx, r.x + r.w, r.y, r.x, r.y + r.h);
      drawLine(innerCtx, r.x + 15, r.y + r.h - 5, r.x, r.y + r.h);
      drawLine(innerCtx, r.x, r.y + r.h, r.x + 5, r.y + r.h - 15);
      drawPoint(innerCtx, r.x + r.w * 0.67, r.y + r.h * 0.33, opts);
      drawPoint(innerCtx, r.x + r.w * 0.33, r.y + r.h * 0.67, opts);
    });
  }

  function drawRabatment(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const short = Math.min(r.w, r.h);
      innerCtx.setLineDash([6, 4]);
      if (r.w > r.h) {
        drawRect(innerCtx, r.x, r.y, short, r.h);
        drawRect(innerCtx, r.x + r.w - short, r.y, short, r.h);
        innerCtx.setLineDash([]);
        drawLine(innerCtx, r.x + short, r.y, r.x + short, r.y + r.h);
        drawLine(innerCtx, r.x + r.w - short, r.y, r.x + r.w - short, r.y + r.h);
        drawPoint(innerCtx, r.x + short, r.y + r.h / 2, opts);
        drawPoint(innerCtx, r.x + r.w - short, r.y + r.h / 2, opts);
      } else {
        drawRect(innerCtx, r.x, r.y, r.w, short);
        drawRect(innerCtx, r.x, r.y + r.h - short, r.w, short);
        innerCtx.setLineDash([]);
        drawLine(innerCtx, r.x, r.y + short, r.x + r.w, r.y + short);
        drawLine(innerCtx, r.x, r.y + r.h - short, r.x + r.w, r.y + r.h - short);
        drawPoint(innerCtx, r.x + r.w / 2, r.y + short, opts);
        drawPoint(innerCtx, r.x + r.w / 2, r.y + r.h - short, opts);
      }
    });
  }

  function drawRootGrid(ctx, rect, root, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.setLineDash([4, 4]);
      drawLine(innerCtx, r.x, r.y + r.h, r.x + r.w, r.y);
      innerCtx.setLineDash([]);
      const divisions = Math.max(2, Math.min(Math.floor((r.w / r.h) * root), 6));
      for (let i = 1; i < divisions; i++) {
        const xPos = r.x + (r.w * i) / divisions;
        drawLine(innerCtx, xPos, r.y, xPos, r.y + r.h);
      }
    });
  }

  function drawPerspective1(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      drawPoint(innerCtx, cx, cy, opts);
      drawLine(innerCtx, r.x, r.y, cx, cy);
      drawLine(innerCtx, r.x + r.w, r.y, cx, cy);
      drawLine(innerCtx, r.x, r.y + r.h, cx, cy);
      drawLine(innerCtx, r.x + r.w, r.y + r.h, cx, cy);
      innerCtx.setLineDash([4, 4]);
      drawLine(innerCtx, r.x, cy, cx, cy);
      drawLine(innerCtx, r.x + r.w, cy, cx, cy);
      drawLine(innerCtx, cx, r.y, cx, cy);
      drawLine(innerCtx, cx, r.y + r.h, cx, cy);
      innerCtx.setLineDash([]);
    });
  }

  function drawPerspective2(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cy = r.y + r.h / 2;
      const vp1x = r.x + r.w * 0.15;
      const vp2x = r.x + r.w * 0.85;
      drawLine(innerCtx, r.x, cy, r.x + r.w, cy);
      drawPoint(innerCtx, vp1x, cy, opts);
      drawPoint(innerCtx, vp2x, cy, opts);
      innerCtx.setLineDash([4, 4]);
      drawLine(innerCtx, r.x + r.w / 2, r.y, vp1x, cy);
      drawLine(innerCtx, r.x + r.w / 2, r.y + r.h, vp1x, cy);
      drawLine(innerCtx, r.x + r.w / 2, r.y, vp2x, cy);
      drawLine(innerCtx, r.x + r.w / 2, r.y + r.h, vp2x, cy);
      innerCtx.setLineDash([]);
    });
  }

  function drawPerspective3(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const vp1 = { x: r.x + r.w * 0.15, y: r.y + r.h * 0.4 };
      const vp2 = { x: r.x + r.w * 0.85, y: r.y + r.h * 0.4 };
      const vp3 = { x: cx, y: r.y + r.h * 1.2 };
      drawPoint(innerCtx, vp1.x, vp1.y, opts);
      drawPoint(innerCtx, vp2.x, vp2.y, opts);
      innerCtx.setLineDash([4, 4]);
      drawLine(innerCtx, cx, r.y + r.h * 0.3, vp1.x, vp1.y);
      drawLine(innerCtx, cx, r.y + r.h * 0.3, vp2.x, vp2.y);
      drawLine(innerCtx, r.x + r.w * 0.3, r.y, vp3.x, vp3.y);
      drawLine(innerCtx, r.x + r.w * 0.7, r.y, vp3.x, vp3.y);
      innerCtx.setLineDash([]);
    });
  }

  function drawSCurve(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.lineWidth = opts.lineWidth + 1;
      innerCtx.beginPath();
      innerCtx.moveTo(r.x, r.y + r.h * 0.9);
      innerCtx.bezierCurveTo(
        r.x + r.w * 0.4, r.y + r.h * 0.9,
        r.x + r.w * 0.3, r.y + r.h * 0.1,
        r.x + r.w * 0.6, r.y + r.h * 0.5
      );
      innerCtx.bezierCurveTo(
        r.x + r.w * 0.9, r.y + r.h * 0.9,
        r.x + r.w * 0.7, r.y + r.h * 0.1,
        r.x + r.w, r.y + r.h * 0.1
      );
      innerCtx.stroke();
    });
  }

  function drawTriangle(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.lineWidth = opts.lineWidth;
      const cx = r.x + r.w / 2;
      const triH = r.h * 0.75;
      const triW = triH * 1.15;
      const topY = r.y + (r.h - triH) / 2;
      innerCtx.beginPath();
      innerCtx.moveTo(cx, topY);
      innerCtx.lineTo(cx - triW / 2, topY + triH);
      innerCtx.lineTo(cx + triW / 2, topY + triH);
      innerCtx.closePath();
      innerCtx.stroke();
      drawPoint(innerCtx, cx, topY, opts);
      drawPoint(innerCtx, cx - triW / 2, topY + triH, opts);
      drawPoint(innerCtx, cx + triW / 2, topY + triH, opts);
    });
  }

  function drawCircle(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const rad = Math.min(r.w, r.h) * 0.4;
      innerCtx.beginPath();
      innerCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      innerCtx.stroke();
      drawPoint(innerCtx, cx, cy, opts);
    });
  }

  function drawDiamond(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const hw = r.w * 0.35;
      const hh = r.h * 0.4;
      innerCtx.beginPath();
      innerCtx.moveTo(cx, cy - hh);
      innerCtx.lineTo(cx + hw, cy);
      innerCtx.lineTo(cx, cy + hh);
      innerCtx.lineTo(cx - hw, cy);
      innerCtx.closePath();
      innerCtx.stroke();
      drawPoint(innerCtx, cx, cy - hh, opts);
      drawPoint(innerCtx, cx + hw, cy, opts);
      drawPoint(innerCtx, cx, cy + hh, opts);
      drawPoint(innerCtx, cx - hw, cy, opts);
    });
  }

  function drawHeadroom(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const topLine = r.y + r.h * 0.08;
      const eyesLine = r.y + r.h / 3;
      innerCtx.setLineDash([8, 4]);
      drawLine(innerCtx, r.x, topLine, r.x + r.w, topLine);
      drawLine(innerCtx, r.x, eyesLine, r.x + r.w, eyesLine);
      innerCtx.setLineDash([]);
      innerCtx.font = '11px sans-serif';
      innerCtx.fillText('TOP OF HEAD', r.x + 8, topLine - 4);
      innerCtx.fillText('EYES', r.x + 8, eyesLine - 4);
    });
  }

  function drawNoseRoom(ctx, rect, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, finalOpts) {
      const lookingRight = !finalOpts.flipX;
      const subjectX = lookingRight ? r.x + r.w / 3 : r.x + (r.w * 2) / 3;
      const lookX = lookingRight ? r.x + r.w * 0.85 : r.x + r.w * 0.15;
      innerCtx.setLineDash([8, 4]);
      drawLine(innerCtx, subjectX, r.y, subjectX, r.y + r.h);
      innerCtx.setLineDash([]);
      drawLine(innerCtx, subjectX + (lookingRight ? 20 : -20), r.y + r.h / 2, lookX - (lookingRight ? 20 : -20), r.y + r.h / 2);
      const headDir = lookingRight ? 1 : -1;
      drawLine(innerCtx, lookX - 30 * headDir, r.y + r.h / 2 - 8, lookX - 20 * headDir, r.y + r.h / 2);
      drawLine(innerCtx, lookX - 30 * headDir, r.y + r.h / 2 + 8, lookX - 20 * headDir, r.y + r.h / 2);
      innerCtx.font = '11px sans-serif';
      innerCtx.fillText('LOOK ROOM', subjectX + (35 * headDir), r.y + r.h / 2 - 10);
    });
  }

  function drawSafeZone(ctx, rect, percent, label, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      const margin = (1 - percent) / 2;
      const safeX = r.x + r.w * margin;
      const safeY = r.y + r.h * margin;
      const safeW = r.w * percent;
      const safeH = r.h * percent;
      innerCtx.setLineDash([8, 4]);
      drawRect(innerCtx, safeX, safeY, safeW, safeH);
      innerCtx.setLineDash([]);
      const markLen = 12;
      drawLine(innerCtx, safeX, safeY + markLen, safeX, safeY);
      drawLine(innerCtx, safeX, safeY, safeX + markLen, safeY);
      drawLine(innerCtx, safeX + safeW - markLen, safeY, safeX + safeW, safeY);
      drawLine(innerCtx, safeX + safeW, safeY, safeX + safeW, safeY + markLen);
      drawLine(innerCtx, safeX + safeW, safeY + safeH - markLen, safeX + safeW, safeY + safeH);
      drawLine(innerCtx, safeX + safeW, safeY + safeH, safeX + safeW - markLen, safeY + safeH);
      drawLine(innerCtx, safeX + markLen, safeY + safeH, safeX, safeY + safeH);
      drawLine(innerCtx, safeX, safeY + safeH, safeX, safeY + safeH - markLen);
      innerCtx.font = '10px sans-serif';
      innerCtx.fillText(label, safeX + 4, safeY + 12);
    });
  }

  function drawAspectRatio(ctx, rect, targetAspect, label, opts) {
    renderGuide(ctx, rect, opts, function(innerCtx, r, opts) {
      innerCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      const currentAspect = r.w / r.h;
      if (currentAspect > targetAspect) {
        const targetW = r.h * targetAspect;
        const barW = (r.w - targetW) / 2;
        innerCtx.fillRect(r.x, r.y, barW, r.h);
        innerCtx.fillRect(r.x + r.w - barW, r.y, barW, r.h);
        drawRect(innerCtx, r.x + barW, r.y, targetW, r.h);
      } else {
        const targetH = r.w / targetAspect;
        const barH = (r.h - targetH) / 2;
        innerCtx.fillRect(r.x, r.y, r.w, barH);
        innerCtx.fillRect(r.x, r.y + r.h - barH, r.w, barH);
        drawRect(innerCtx, r.x, r.y + barH, r.w, targetH);
      }
      innerCtx.font = '11px sans-serif';
      innerCtx.fillStyle = opts.color;
      innerCtx.fillText(label, r.x + 8, r.y + 16);
    });
  }

  const guides = {
    'off': { name: 'No Guide', draw: null },
    'thirds': { name: 'Rule of Thirds', draw: drawThirds },
    'phi': { name: 'Phi Grid', draw: drawPhiGrid },
    'quadrant': { name: 'Quadrant Grid', draw: drawQuadrant },
    'center': { name: 'Center Cross', draw: drawCenter },
    'golden-spiral-tl': { name: 'Golden Spiral ↖', draw: function(ctx, rect, opts) { drawGoldenSpiral(ctx, rect, 'tl', opts); } },
    'golden-spiral-tr': { name: 'Golden Spiral ↗', draw: function(ctx, rect, opts) { drawGoldenSpiral(ctx, rect, 'tr', opts); } },
    'golden-spiral-bl': { name: 'Golden Spiral ↙', draw: function(ctx, rect, opts) { drawGoldenSpiral(ctx, rect, 'bl', opts); } },
    'golden-spiral-br': { name: 'Golden Spiral ↘', draw: function(ctx, rect, opts) { drawGoldenSpiral(ctx, rect, 'br', opts); } },
    'golden-triangles': { name: 'Golden Triangles', draw: drawGoldenTriangles },
    'diagonal': { name: 'Diagonal Lines', draw: drawDiagonal },
    'diagonal-baroque': { name: 'Baroque Diagonal', draw: drawBaroqueDiagonal },
    'diagonal-sinister': { name: 'Sinister Diagonal', draw: drawSinisterDiagonal },
    'rabatment': { name: 'Rabatment', draw: drawRabatment },
    'root2': { name: '√2 Rectangle', draw: function(ctx, rect, opts) { drawRootGrid(ctx, rect, Math.SQRT2, opts); } },
    'root3': { name: '√3 Rectangle', draw: function(ctx, rect, opts) { drawRootGrid(ctx, rect, Math.sqrt(3), opts); } },
    'root4': { name: '√4 Rectangle', draw: function(ctx, rect, opts) { drawRootGrid(ctx, rect, 2, opts); } },
    'root5': { name: '√5 Rectangle', draw: function(ctx, rect, opts) { drawRootGrid(ctx, rect, Math.sqrt(5), opts); } },
    'perspective-1': { name: '1-Point Perspective', draw: drawPerspective1 },
    'perspective-2': { name: '2-Point Perspective', draw: drawPerspective2 },
    'perspective-3': { name: '3-Point Perspective', draw: drawPerspective3 },
    's-curve': { name: 'S-Curve', draw: drawSCurve },
    'triangle': { name: 'Triangle', draw: drawTriangle },
    'circle': { name: 'Central Circle', draw: drawCircle },
    'diamond': { name: 'Diamond', draw: drawDiamond },
    'headroom': { name: 'Headroom Guide', draw: drawHeadroom },
    'nose-room': { name: 'Nose/Look Room', draw: drawNoseRoom },
    'safe-action': { name: 'Safe Action 90%', draw: function(ctx, rect, opts) { drawSafeZone(ctx, rect, 0.9, 'ACTION SAFE', opts); } },
    'safe-title': { name: 'Safe Title 80%', draw: function(ctx, rect, opts) { drawSafeZone(ctx, rect, 0.8, 'TITLE SAFE', opts); } },
    'aspect-235': { name: '2.35:1 Cinemascope', draw: function(ctx, rect, opts) { drawAspectRatio(ctx, rect, 2.35, '2.35:1', opts); } },
    'aspect-185': { name: '1.85:1 Theatrical', draw: function(ctx, rect, opts) { drawAspectRatio(ctx, rect, 1.85, '1.85:1', opts); } },
    'aspect-11': { name: '1:1 Square', draw: function(ctx, rect, opts) { drawAspectRatio(ctx, rect, 1, '1:1', opts); } },
    'aspect-916': { name: '9:16 Stories', draw: function(ctx, rect, opts) { drawAspectRatio(ctx, rect, 9/16, '9:16', opts); } },
    'aspect-45': { name: '4:5 Portrait', draw: function(ctx, rect, opts) { drawAspectRatio(ctx, rect, 4/5, '4:5', opts); } }
  };

  return {
    draw: function(ctx, rect, guideKey, opts) {
      var guide = guides[guideKey];
      if (guide && guide.draw) {
        guide.draw(ctx, rect, opts);
      }
    },
    list: function() {
      return Object.keys(guides);
    },
    getName: function(guideKey) {
      var guide = guides[guideKey];
      return guide ? guide.name : 'Unknown';
    },
    exists: function(guideKey) {
      return guides.hasOwnProperty(guideKey);
    }
  };
})();
