/**
 * Composition Guides Module
 * Clean, modular drawing functions for photographic composition overlays
 * 
 * Usage:
 *   CompositionGuides.draw(ctx, rect, 'thirds', options);
 *   CompositionGuides.list(); // returns array of all guide keys
 */

var CompositionGuides = (function() {
  
  // Constants
  var PHI = 1.61803398875;
  var PHI_INV = 1 / PHI;
  
  // Default drawing options
  var defaultOpts = {
    color: 'rgba(255, 255, 255, 0.6)',
    lineWidth: 1.5,
    showPoints: true,
    pointRadius: 4
  };
  
  // Merge options helper
  function mergeOpts(opts) {
    var result = {};
    for (var key in defaultOpts) {
      result[key] = defaultOpts[key];
    }
    if (opts) {
      for (var key in opts) {
        result[key] = opts[key];
      }
    }
    return result;
  }
  
  // Draw a point/hotspot
  function drawPoint(ctx, x, y, opts) {
    if (!opts.showPoints) return;
    ctx.beginPath();
    ctx.arc(x, y, opts.pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = opts.color;
    ctx.fill();
  }
  
  // ==========================================
  // CLASSIC GRIDS
  // ==========================================
  
  function drawThirds(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(x + w / 3, y);
    ctx.lineTo(x + w / 3, y + h);
    ctx.moveTo(x + 2 * w / 3, y);
    ctx.lineTo(x + 2 * w / 3, y + h);
    
    // Horizontal lines
    ctx.moveTo(x, y + h / 3);
    ctx.lineTo(x + w, y + h / 3);
    ctx.moveTo(x, y + 2 * h / 3);
    ctx.lineTo(x + w, y + 2 * h / 3);
    ctx.stroke();
    
    // Power points
    drawPoint(ctx, x + w / 3, y + h / 3, opts);
    drawPoint(ctx, x + 2 * w / 3, y + h / 3, opts);
    drawPoint(ctx, x + w / 3, y + 2 * h / 3, opts);
    drawPoint(ctx, x + 2 * w / 3, y + 2 * h / 3, opts);
    
    ctx.restore();
  }
  
  function drawPhiGrid(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    var x1 = x + w * PHI_INV;
    var x2 = x + w * (1 - PHI_INV);
    var y1 = y + h * PHI_INV;
    var y2 = y + h * (1 - PHI_INV);
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.setLineDash([8, 6]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1, y + h);
    ctx.moveTo(x2, y);
    ctx.lineTo(x2, y + h);
    ctx.moveTo(x, y1);
    ctx.lineTo(x + w, y1);
    ctx.moveTo(x, y2);
    ctx.lineTo(x + w, y2);
    ctx.stroke();
    
    ctx.setLineDash([]);
    drawPoint(ctx, x1, y1, opts);
    drawPoint(ctx, x1, y2, opts);
    drawPoint(ctx, x2, y1, opts);
    drawPoint(ctx, x2, y2, opts);
    
    ctx.restore();
  }
  
  function drawQuadrant(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2, cy = y + h / 2;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Main cross
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + h);
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    
    // Quadrant centers
    drawPoint(ctx, x + w / 4, y + h / 4, opts);
    drawPoint(ctx, x + 3 * w / 4, y + h / 4, opts);
    drawPoint(ctx, x + w / 4, y + 3 * h / 4, opts);
    drawPoint(ctx, x + 3 * w / 4, y + 3 * h / 4, opts);
    
    ctx.restore();
  }
  
  function drawCenter(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2, cy = y + h / 2;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + h);
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    
    // Center point
    ctx.beginPath();
    ctx.arc(cx, cy, opts.pointRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = opts.color;
    ctx.fill();
    
    ctx.restore();
  }
  
  // ==========================================
  // GOLDEN SPIRAL
  // ==========================================
  
  function drawGoldenSpiral(ctx, rect, corner, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    // Calculate the golden rectangle that fits
    var frameAR = w / h;
    var rw, rh, rx, ry;
    
    if (frameAR >= PHI) {
      rh = h;
      rw = h * PHI;
      rx = x + (w - rw) / 2;
      ry = y;
    } else {
      rw = w;
      rh = w / PHI;
      rx = x;
      ry = y + (h - rh) / 2;
    }
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.setLineDash([6, 6]);
    
    var sx = rx, sy = ry, sw = rw, sh = rh;
    var dir = corner;
    
    for (var i = 0; i < 8; i++) {
      // Draw rectangle
      ctx.strokeRect(sx, sy, sw, sh);
      
      // Draw arc
      ctx.beginPath();
      var arcR = Math.min(sw, sh);
      
      if (dir === 'tl') {
        ctx.arc(sx + sw, sy + sh, arcR, Math.PI, 1.5 * Math.PI);
        dir = 'bl';
      } else if (dir === 'tr') {
        ctx.arc(sx, sy + sh, arcR, 1.5 * Math.PI, 2 * Math.PI);
        dir = 'tl';
      } else if (dir === 'br') {
        ctx.arc(sx, sy, arcR, 0, 0.5 * Math.PI);
        dir = 'tr';
      } else if (dir === 'bl') {
        ctx.arc(sx + sw, sy, arcR, 0.5 * Math.PI, Math.PI);
        dir = 'br';
      }
      ctx.stroke();
      
      // Subdivide
      if (sw >= sh) {
        var newW = sw / PHI;
        if (corner === 'tr' || corner === 'br') {
          sx = sx + (sw - newW);
        }
        sw = newW;
      } else {
        var newH = sh / PHI;
        if (corner === 'bl' || corner === 'br') {
          sy = sy + (sh - newH);
        }
        sh = newH;
      }
      
      if (sw < 10 || sh < 10) break;
    }
    
    ctx.setLineDash([]);
    ctx.restore();
  }
  
  // ==========================================
  // TRIANGLES & DIAGONALS
  // ==========================================
  
  function drawGoldenTriangles(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Main diagonal
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    
    // Perpendicular lines from corners
    ctx.setLineDash([6, 4]);
    var t = (w * w) / (w * w + h * h);
    
    // From top-left
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * t, y + h * (1 - t));
    ctx.stroke();
    
    // From bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w * (1 - t), y + h * t);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Intersection points
    drawPoint(ctx, x + w * t, y + h * (1 - t), opts);
    drawPoint(ctx, x + w * (1 - t), y + h * t, opts);
    
    ctx.restore();
  }
  
  function drawDiagonal(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Both diagonals
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    
    // Center point
    drawPoint(ctx, x + w / 2, y + h / 2, opts);
    
    ctx.restore();
  }
  
  function drawBaroqueDiagonal(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth + 0.5;
    
    // Upper-left to lower-right (comfortable, classical)
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
    
    // Arrow indicator
    ctx.beginPath();
    ctx.moveTo(x + w - 15, y + h - 5);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - 5, y + h - 15);
    ctx.stroke();
    
    // Points along the line
    drawPoint(ctx, x + w * 0.33, y + h * 0.33, opts);
    drawPoint(ctx, x + w * 0.67, y + h * 0.67, opts);
    
    ctx.restore();
  }
  
  function drawSinisterDiagonal(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth + 0.5;
    
    // Upper-right to lower-left (tension, unease)
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    
    // Arrow indicator
    ctx.beginPath();
    ctx.moveTo(x + 15, y + h - 5);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + 5, y + h - 15);
    ctx.stroke();
    
    // Points along the line
    drawPoint(ctx, x + w * 0.67, y + h * 0.33, opts);
    drawPoint(ctx, x + w * 0.33, y + h * 0.67, opts);
    
    ctx.restore();
  }
  
  // ==========================================
  // DYNAMIC SYMMETRY
  // ==========================================
  
  function drawRabatment(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var shortSide = Math.min(w, h);
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.setLineDash([6, 4]);
    
    if (w > h) {
      // Landscape: squares from left and right
      ctx.strokeRect(x, y, shortSide, h);
      ctx.strokeRect(x + w - shortSide, y, shortSide, h);
      
      ctx.setLineDash([]);
      // Mark the inner edges
      ctx.beginPath();
      ctx.moveTo(x + shortSide, y);
      ctx.lineTo(x + shortSide, y + h);
      ctx.moveTo(x + w - shortSide, y);
      ctx.lineTo(x + w - shortSide, y + h);
      ctx.stroke();
      
      drawPoint(ctx, x + shortSide, y + h / 2, opts);
      drawPoint(ctx, x + w - shortSide, y + h / 2, opts);
    } else {
      // Portrait: squares from top and bottom
      ctx.strokeRect(x, y, w, shortSide);
      ctx.strokeRect(x, y + h - shortSide, w, shortSide);
      
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, y + shortSide);
      ctx.lineTo(x + w, y + shortSide);
      ctx.moveTo(x, y + h - shortSide);
      ctx.lineTo(x + w, y + h - shortSide);
      ctx.stroke();
      
      drawPoint(ctx, x + w / 2, y + shortSide, opts);
      drawPoint(ctx, x + w / 2, y + h - shortSide, opts);
    }
    
    ctx.restore();
  }
  
  function drawRootGrid(ctx, rect, root, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.setLineDash([4, 4]);
    
    // Diagonal
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    
    // Vertical divisions based on root
    var divisions = Math.floor((w / h) * root);
    divisions = Math.max(2, Math.min(divisions, 6)); // Clamp
    
    ctx.setLineDash([]);
    for (var i = 1; i < divisions; i++) {
      var xPos = x + (w * i) / divisions;
      ctx.beginPath();
      ctx.moveTo(xPos, y);
      ctx.lineTo(xPos, y + h);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // ==========================================
  // PERSPECTIVE GRIDS
  // ==========================================
  
  function drawPerspective1(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2, cy = y + h / 2;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Vanishing point at center
    drawPoint(ctx, cx, cy, opts);
    
    // Lines from corners to center
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + w, y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x, y + h);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    
    // Lines from edge midpoints
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + w, cy);
    ctx.lineTo(cx, cy);
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(cx, y + h);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    
    ctx.restore();
  }
  
  function drawPerspective2(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cy = y + h / 2;
    
    // Two vanishing points on horizon
    var vp1x = x + w * 0.15;
    var vp2x = x + w * 0.85;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Horizon line
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    
    // Vanishing points
    drawPoint(ctx, vp1x, cy, opts);
    drawPoint(ctx, vp2x, cy, opts);
    
    // Lines to VP1
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(vp1x, cy);
    ctx.moveTo(x + w / 2, y + h);
    ctx.lineTo(vp1x, cy);
    ctx.stroke();
    
    // Lines to VP2
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(vp2x, cy);
    ctx.moveTo(x + w / 2, y + h);
    ctx.lineTo(vp2x, cy);
    ctx.stroke();
    
    ctx.restore();
  }
  
  function drawPerspective3(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2;
    
    // Three vanishing points
    var vp1 = { x: x + w * 0.15, y: y + h * 0.4 };
    var vp2 = { x: x + w * 0.85, y: y + h * 0.4 };
    var vp3 = { x: cx, y: y + h * 1.2 }; // Below frame
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Vanishing points (only ones in frame)
    drawPoint(ctx, vp1.x, vp1.y, opts);
    drawPoint(ctx, vp2.x, vp2.y, opts);
    
    // Lines to each VP
    ctx.setLineDash([4, 4]);
    
    // From center to VPs
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.3);
    ctx.lineTo(vp1.x, vp1.y);
    ctx.moveTo(cx, y + h * 0.3);
    ctx.lineTo(vp2.x, vp2.y);
    ctx.stroke();
    
    // Vertical convergence toward VP3
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y);
    ctx.lineTo(vp3.x, vp3.y);
    ctx.moveTo(x + w * 0.7, y);
    ctx.lineTo(vp3.x, vp3.y);
    ctx.stroke();
    
    ctx.restore();
  }
  
  // ==========================================
  // CURVES & SHAPES
  // ==========================================
  
  function drawSCurve(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth + 1;
    
    // S-curve using bezier
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.9);
    ctx.bezierCurveTo(
      x + w * 0.4, y + h * 0.9,
      x + w * 0.3, y + h * 0.1,
      x + w * 0.6, y + h * 0.5
    );
    ctx.bezierCurveTo(
      x + w * 0.9, y + h * 0.9,
      x + w * 0.7, y + h * 0.1,
      x + w, y + h * 0.1
    );
    ctx.stroke();
    
    ctx.restore();
  }
  
  function drawTriangle(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2;
    var triH = h * 0.75;
    var triW = triH * 1.15;
    var topY = y + (h - triH) / 2;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx - triW / 2, topY + triH);
    ctx.lineTo(cx + triW / 2, topY + triH);
    ctx.closePath();
    ctx.stroke();
    
    // Vertices
    drawPoint(ctx, cx, topY, opts);
    drawPoint(ctx, cx - triW / 2, topY + triH, opts);
    drawPoint(ctx, cx + triW / 2, topY + triH, opts);
    
    ctx.restore();
  }
  
  function drawCircle(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2, cy = y + h / 2;
    var r = Math.min(w, h) * 0.4;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center point
    drawPoint(ctx, cx, cy, opts);
    
    ctx.restore();
  }
  
  function drawDiamond(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var cx = x + w / 2, cy = y + h / 2;
    var hw = w * 0.35, hh = h * 0.4;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.stroke();
    
    // Vertices
    drawPoint(ctx, cx, cy - hh, opts);
    drawPoint(ctx, cx + hw, cy, opts);
    drawPoint(ctx, cx, cy + hh, opts);
    drawPoint(ctx, cx - hw, cy, opts);
    
    ctx.restore();
  }
  
  // ==========================================
  // PORTRAIT & FRAMING
  // ==========================================
  
  function drawHeadroom(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Ideal head zone (top 10-20% for headroom)
    var headroomLine = y + h * 0.12;
    
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(x, headroomLine);
    ctx.lineTo(x + w, headroomLine);
    ctx.stroke();
    
    // Chin line (around 1/3 from bottom for medium shot)
    var chinLine = y + h * 0.75;
    ctx.beginPath();
    ctx.moveTo(x, chinLine);
    ctx.lineTo(x + w, chinLine);
    ctx.stroke();
    
    // Labels
    ctx.setLineDash([]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = opts.color;
    ctx.fillText('HEADROOM', x + 8, headroomLine - 4);
    ctx.fillText('CHIN LINE', x + 8, chinLine - 4);
    
    ctx.restore();
  }
  
  function drawNoseRoom(ctx, rect, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    
    // Show the "look room" zone (subject at 1/3, space at 2/3)
    var subjectLine = x + w / 3;
    var lookZone = x + w * 0.67;
    
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(subjectLine, y);
    ctx.lineTo(subjectLine, y + h);
    ctx.stroke();
    
    // Look direction arrow
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(subjectLine + 20, y + h / 2);
    ctx.lineTo(lookZone - 20, y + h / 2);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(lookZone - 30, y + h / 2 - 8);
    ctx.lineTo(lookZone - 20, y + h / 2);
    ctx.lineTo(lookZone - 30, y + h / 2 + 8);
    ctx.stroke();
    
    // Label
    ctx.font = '11px sans-serif';
    ctx.fillStyle = opts.color;
    ctx.fillText('LOOK ROOM →', subjectLine + 25, y + h / 2 - 10);
    
    ctx.restore();
  }
  
  // ==========================================
  // CINEMA SAFE ZONES
  // ==========================================
  
  function drawSafeZone(ctx, rect, percent, label, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    
    var margin = (1 - percent) / 2;
    var safeX = x + w * margin;
    var safeY = y + h * margin;
    var safeW = w * percent;
    var safeH = h * percent;
    
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.setLineDash([8, 4]);
    
    ctx.strokeRect(safeX, safeY, safeW, safeH);
    
    // Corner markers
    ctx.setLineDash([]);
    var markLen = 12;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(safeX, safeY + markLen);
    ctx.lineTo(safeX, safeY);
    ctx.lineTo(safeX + markLen, safeY);
    // Top-right
    ctx.moveTo(safeX + safeW - markLen, safeY);
    ctx.lineTo(safeX + safeW, safeY);
    ctx.lineTo(safeX + safeW, safeY + markLen);
    // Bottom-right
    ctx.moveTo(safeX + safeW, safeY + safeH - markLen);
    ctx.lineTo(safeX + safeW, safeY + safeH);
    ctx.lineTo(safeX + safeW - markLen, safeY + safeH);
    // Bottom-left
    ctx.moveTo(safeX + markLen, safeY + safeH);
    ctx.lineTo(safeX, safeY + safeH);
    ctx.lineTo(safeX, safeY + safeH - markLen);
    ctx.stroke();
    
    // Label
    ctx.font = '10px sans-serif';
    ctx.fillStyle = opts.color;
    ctx.fillText(label, safeX + 4, safeY + 12);
    
    ctx.restore();
  }
  
  // ==========================================
  // ASPECT RATIO CROPS
  // ==========================================
  
  function drawAspectRatio(ctx, rect, targetAspect, label, opts) {
    opts = mergeOpts(opts);
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var currentAspect = w / h;
    
    ctx.save();
    
    // Semi-transparent overlay for cropped areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    if (currentAspect > targetAspect) {
      // Too wide, add pillarbox
      var targetW = h * targetAspect;
      var barW = (w - targetW) / 2;
      ctx.fillRect(x, y, barW, h);
      ctx.fillRect(x + w - barW, y, barW, h);
      
      // Border lines
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = opts.lineWidth;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x + barW, y);
      ctx.lineTo(x + barW, y + h);
      ctx.moveTo(x + w - barW, y);
      ctx.lineTo(x + w - barW, y + h);
      ctx.stroke();
    } else {
      // Too tall, add letterbox
      var targetH = w / targetAspect;
      var barH = (h - targetH) / 2;
      ctx.fillRect(x, y, w, barH);
      ctx.fillRect(x, y + h - barH, w, barH);
      
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = opts.lineWidth;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x + w, y + barH);
      ctx.moveTo(x, y + h - barH);
      ctx.lineTo(x + w, y + h - barH);
      ctx.stroke();
    }
    
    // Label
    ctx.setLineDash([]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = opts.color;
    ctx.fillText(label, x + 8, y + 16);
    
    ctx.restore();
  }
  
  // ==========================================
  // GUIDE REGISTRY
  // ==========================================
  
  var guides = {
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
  
  // ==========================================
  // PUBLIC API
  // ==========================================
  
  return {
    draw: function(ctx, rect, guideKey, opts) {
      var guide = guides[guideKey];
      if (guide && guide.draw) {
        guide.draw(ctx, rect, opts);
      }
    },
    
    list: function() {
      var keys = [];
      for (var key in guides) {
        keys.push(key);
      }
      return keys;
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