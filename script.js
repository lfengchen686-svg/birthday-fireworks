(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: true });
  const stage = document.getElementById('birthdayStage');
  const soundButton = document.getElementById('soundButton');
  const soundButtonText = document.getElementById('soundButtonText');
  const soundHint = document.getElementById('soundHint');
  const statusText = document.getElementById('statusText');
  const blessingText = document.getElementById('blessingText');
  const blessingDisplay = document.getElementById('blessingDisplay');

  const wishes = [
    '姐姐，生日快乐。',
    '希望新的一岁里，你想做的事都能慢慢有结果，想去的地方都能一步一步靠近。',
    '希望你少一点焦虑，多一点开心；少一点自我怀疑，多一点坚定。',
    '也希望以后不管生活有多忙，你都能好好吃饭，好好睡觉，好好照顾自己。',
    '谢谢你出现在我的生活里。',
    '愿你永远自由、漂亮、温柔，也永远有重新开始的勇气。',
    '生日快乐，姐姐。',
  ];

  const palette = [
    ['#fff3bd', '#ffd06f', '#ff9eaa'],
    ['#ffe4a5', '#ffb27e', '#fff6df'],
    ['#ffc4d2', '#ff8fb3', '#fff0bb'],
    ['#d0c7ff', '#a8dcff', '#fff2c0'],
    ['#ffe7aa', '#f7a9ce', '#ffffff'],
    ['#fff8d1', '#c8b1ff', '#ff9dad'],
    ['#a9f5ff', '#b58cff', '#fff1a8'],
    ['#e9ff9b', '#ffbd72', '#ff78c8'],
    ['#ffffff', '#73e6ff', '#ff9cdb'],
  ];

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    stars: [],
    rockets: [],
    particles: [],
    sparkles: [],
    bursts: [],
    blessingParticles: [],
    blessingLayout: null,
    startedAt: performance.now(),
    lastFrame: performance.now(),
    lastLaunch: -Infinity,
    launchIndex: 0,
    soundEnabled: false,
    audioContext: null,
    musicStarted: false,
    blessingStarted: false,
    blessingIndex: -1,
    wishCycle: 4200,
    blessingStart: 10000,
  };

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const random = (min, max) => Math.random() * (max - min) + min;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;
  const smooth = (t) => t * t * (3 - 2 * t);

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.stars = Array.from({ length: Math.max(110, Math.floor(state.width * 0.22)) }, () => ({
      x: random(0, state.width),
      y: random(0, state.height * 0.58),
      size: random(0.35, 1.65),
      alpha: random(0.18, 0.72),
      phase: random(0, Math.PI * 2),
    }));
    if (state.blessingIndex >= 0) prepareBlessing(state.blessingIndex);
  }

  function currentType() {
    const sequence = ['sphere', 'chrysanthemum', 'willow', 'palm', 'ring', 'heart', 'fountain', 'spiral', 'multi'];
    return sequence[state.launchIndex++ % sequence.length];
  }

  function launchFirework(type = currentType(), x = random(state.width * 0.12, state.width * 0.88)) {
    const targetY = random(state.height * 0.17, state.height * 0.55);
    const speed = random(8.2, 11.4);
    state.rockets.push({
      x,
      y: state.height + 18,
      previousX: x,
      previousY: state.height + 18,
      vx: random(-0.48, 0.48),
      vy: -speed,
      targetY,
      type,
      colorSet: palette[Math.floor(random(0, palette.length))],
      age: 0,
    });
  }

  function addParticle(particle) {
    state.particles.push({
      x: particle.x,
      y: particle.y,
      previousX: particle.x,
      previousY: particle.y,
      vx: particle.vx,
      vy: particle.vy,
      gravity: particle.gravity ?? 0.045,
      drag: particle.drag ?? 0.988,
      life: particle.life ?? random(1.1, 2.3),
      age: 0,
      size: particle.size ?? random(1.1, 2.35),
      alpha: particle.alpha ?? 1,
      color: particle.color,
      twinkle: random(0, Math.PI * 2),
      trail: particle.trail ?? true,
      crackle: particle.crackle ?? false,
    });
  }

  function explode(rocket) {
    const { x, y, type, colorSet } = rocket;
    const colors = colorSet;
    state.bursts.push({
      x,
      y,
      age: 0,
      life: 0.72,
      radius: random(70, 125),
      colors,
    });
    const addRadial = (count, speedMin, speedMax, options = {}) => {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + random(-0.025, 0.025);
        const speed = random(speedMin, speedMax) * (options.speedScale || 1);
        addParticle({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: options.gravity ?? random(0.02, 0.058),
          drag: options.drag ?? random(0.978, 0.992),
          life: options.life ?? random(1.35, 2.55),
          size: options.size ?? random(1.15, 2.45),
          color: colors[i % colors.length],
          crackle: options.crackle ?? false,
        });
      }
    };

    if (type === 'sphere') addRadial(118, 2.4, 6.0, { crackle: true });
    if (type === 'chrysanthemum') addRadial(178, 3.2, 4.95, { gravity: 0.034, drag: 0.987, life: 1.9, size: 1.05 });
    if (type === 'willow') addRadial(132, 2.0, 4.7, { gravity: 0.105, drag: 0.984, life: 3.45, size: 1.22 });
    if (type === 'ring') addRadial(112, 4.8, 5.05, { gravity: 0.018, drag: 0.991, life: 2.3, size: 1.25 });
    if (type === 'fountain') {
      for (let i = 0; i < 125; i += 1) {
        const angle = random(-Math.PI * 0.98, -Math.PI * 0.02);
        addParticle({ x, y, vx: Math.cos(angle) * random(2.2, 5.6), vy: Math.sin(angle) * random(2.2, 5.6), gravity: 0.12, drag: 0.988, life: random(1.8, 3.1), color: colors[i % colors.length], size: random(1.2, 2.35) });
      }
    }
    if (type === 'palm') {
      const branches = Math.floor(random(5, 8));
      for (let branch = 0; branch < branches; branch += 1) {
        const angle = -Math.PI / 2 + random(-1.04, 1.04);
        for (let i = 0; i < 24; i += 1) {
          const speed = lerp(1.2, 6.2, i / 23);
          addParticle({ x, y, vx: Math.cos(angle) * speed + random(-0.16, 0.16), vy: Math.sin(angle) * speed, gravity: 0.083, drag: 0.987, life: random(2.1, 3.1), color: colors[(branch + i) % colors.length], size: random(1.3, 2.5), crackle: i % 4 === 0 });
        }
      }
    }
    if (type === 'heart') {
      for (let i = 0; i < 150; i += 1) {
        const t = (i / 150) * Math.PI * 2;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const scale = random(0.21, 0.28);
        addParticle({ x, y, vx: hx * scale, vy: hy * scale, gravity: 0.03, drag: 0.991, life: random(1.9, 2.8), color: colors[i % colors.length], size: random(1.1, 2.1), crackle: i % 17 === 0 });
      }
      addRadial(46, 1.1, 2.2, { gravity: 0.02, life: 1.25, size: 1.15 });
    }
    if (type === 'spiral') {
      for (let i = 0; i < 155; i += 1) {
        const angle = i * 0.31;
        const speed = 1.6 + i * 0.027;
        addParticle({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 0.038, drag: 0.989, life: 2.3, color: colors[i % colors.length], size: random(1.15, 2.1), crackle: i % 15 === 0 });
      }
    }
    if (type === 'multi') {
      addRadial(86, 2.2, 4.6, { gravity: 0.025, life: 2.05, size: 1.15 });
      addRadial(52, 4.9, 5.2, { gravity: 0.014, life: 1.45, size: 0.8 });
    }

    for (let i = 0; i < 23; i += 1) {
      state.sparkles.push({ x: x + random(-5, 5), y: y + random(-5, 5), age: 0, life: random(0.28, 0.66), size: random(1.4, 3.2), color: colors[i % colors.length] });
    }
    playFireworkSound(type);
  }

  function updateRockets(dt) {
    for (let i = state.rockets.length - 1; i >= 0; i -= 1) {
      const rocket = state.rockets[i];
      rocket.age += dt;
      rocket.previousX = rocket.x;
      rocket.previousY = rocket.y;
      rocket.x += rocket.vx * dt * 60;
      rocket.y += rocket.vy * dt * 60;
      rocket.vy += 0.075 * dt * 60;
      const tailAlpha = clamp(1 - rocket.age / 1.8) * 0.8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = tailAlpha * 0.48;
      ctx.strokeStyle = rocket.colorSet[0];
      ctx.lineWidth = 4.2;
      ctx.shadowColor = rocket.colorSet[0];
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.moveTo(rocket.previousX, rocket.previousY);
      ctx.lineTo(rocket.x, rocket.y);
      ctx.stroke();
      ctx.globalAlpha = tailAlpha;
      ctx.lineWidth = 1.25;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(rocket.previousX, rocket.previousY);
      ctx.lineTo(rocket.x, rocket.y);
      ctx.stroke();
      ctx.fillStyle = '#fffbe8';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (rocket.y <= rocket.targetY || rocket.vy >= -0.65) {
        explode(rocket);
        state.rockets.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.age += dt;
      p.previousX = p.x;
      p.previousY = p.y;
      p.vx *= p.drag ** (dt * 60);
      p.vy = p.vy * p.drag ** (dt * 60) + p.gravity * dt * 60;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      const lifeProgress = p.age / p.life;
      const alpha = clamp(1 - lifeProgress) ** 1.25 * (0.7 + Math.sin(p.age * 18 + p.twinkle) * 0.3);
      if (lifeProgress >= 1) {
        state.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = alpha * 0.48;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.75, p.size * 0.92);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = Math.min(14, p.size * 6);
      if (p.trail) {
        ctx.beginPath();
        ctx.moveTo(p.previousX, p.previousY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.92 + alpha * 0.42), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (p.crackle && Math.random() < 0.035) {
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
      }
    }
    ctx.restore();
  }

  function updateBursts(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
      const burst = state.bursts[i];
      burst.age += dt;
      const progress = burst.age / burst.life;
      if (progress >= 1) {
        state.bursts.splice(i, 1);
        continue;
      }
      const radius = easeOut(progress) * burst.radius;
      const flash = Math.max(0, 1 - progress / 0.22);
      const halo = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, Math.max(18, radius));
      halo.addColorStop(0, `rgba(255, 250, 215, ${0.22 * flash})`);
      halo.addColorStop(0.16, `rgba(255, 207, 119, ${0.14 * flash})`);
      halo.addColorStop(1, 'rgba(255, 160, 124, 0)');
      ctx.fillStyle = halo;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, Math.max(18, radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (1 - progress) * 0.8;
      ctx.strokeStyle = burst.colors[Math.floor(progress * burst.colors.length) % burst.colors.length];
      ctx.lineWidth = 2.4 + (1 - progress) * 4;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, Math.max(5, radius), 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function updateSparkles(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.sparkles.length - 1; i >= 0; i -= 1) {
      const sparkle = state.sparkles[i];
      sparkle.age += dt;
      if (sparkle.age >= sparkle.life) {
        state.sparkles.splice(i, 1);
        continue;
      }
      const progress = sparkle.age / sparkle.life;
      const alpha = Math.sin(progress * Math.PI);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sparkle.color;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(sparkle.x - sparkle.size * 2, sparkle.y);
      ctx.lineTo(sparkle.x + sparkle.size * 2, sparkle.y);
      ctx.moveTo(sparkle.x, sparkle.y - sparkle.size * 2);
      ctx.lineTo(sparkle.x, sparkle.y + sparkle.size * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStars(now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const star of state.stars) {
      const alpha = star.alpha * (0.72 + Math.sin(now * 0.0012 + star.phase) * 0.28);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dbe7ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function wrapText(text, font, maxWidth) {
    const testCanvas = document.createElement('canvas');
    const test = testCanvas.getContext('2d');
    test.font = font;
    const lines = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (test.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function prepareBlessing(index) {
    const text = wishes[index];
    const shortSide = Math.min(state.width, state.height);
    const scale = state.width < 600 ? 0.72 : 1;
    const baseSize = text.length <= 9 ? 64 : text.length <= 25 ? 38 : text.length <= 39 ? 31 : 26;
    const fontSize = Math.max(19, baseSize * scale * clamp(shortSide / 720, 0.78, 1.12));
    const font = `600 ${fontSize}px "STKaiti", "KaiTi", "DFKai-SB", "Noto Serif SC", serif`;
    const maxWidth = Math.min(state.width * 0.82, text.length <= 12 ? 940 : 850);
    const lines = wrapText(text, font, maxWidth);
    state.blessingLayout = {
      font,
      fontSize,
      lines,
      lineHeight: fontSize * 1.45,
      centerY: state.height * 0.51,
    };
    blessingDisplay.style.fontSize = `${fontSize}px`;
    blessingDisplay.replaceChildren(...lines.map((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    }));
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.ceil(maxWidth);
    offscreen.height = Math.ceil(fontSize * lines.length * 1.55 + 30);
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    offCtx.font = font;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';
    lines.forEach((line, lineIndex) => {
      offCtx.fillText(line, offscreen.width / 2, offscreen.height / 2 + (lineIndex - (lines.length - 1) / 2) * fontSize * 1.45);
    });
    const image = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    const gap = state.width < 600 ? 4 : 3;
    const targets = [];
    for (let y = 0; y < offscreen.height; y += gap) {
      for (let x = 0; x < offscreen.width; x += gap) {
        const alpha = image[(y * offscreen.width + x) * 4 + 3];
        if (alpha > 90 && Math.random() < 0.76) {
          targets.push({
            x: state.width / 2 - offscreen.width / 2 + x,
            y: state.height * 0.51 - offscreen.height / 2 + y,
          });
        }
      }
    }
    state.blessingParticles = targets.map((target, particleIndex) => ({
      targetX: target.x,
      targetY: target.y,
      x: state.width / 2 + random(-state.width * 0.46, state.width * 0.46),
      y: state.height * 0.5 + random(-state.height * 0.38, state.height * 0.38),
      size: random(0.7, 1.65),
      alpha: random(0.7, 1),
      seed: particleIndex * 0.73 + random(0, 4),
      color: particleIndex % 7 === 0 ? '#f7adbd' : particleIndex % 5 === 0 ? '#fff0b7' : '#ffd98d',
    }));
    blessingText.textContent = text;
  }

  function drawBlessing(elapsed) {
    if (!state.blessingStarted) return;
    const sinceStart = elapsed - state.blessingStart;
    const index = Math.floor(sinceStart / state.wishCycle) % wishes.length;
    if (index !== state.blessingIndex) {
      state.blessingIndex = index;
      prepareBlessing(index);
    }
    const phase = (sinceStart % state.wishCycle) / state.wishCycle;
    const inProgress = clamp(phase / 0.27);
    const outProgress = clamp((phase - 0.63) / 0.37);
    const reveal = easeOut(inProgress);
    const dissolve = smooth(outProgress);
    blessingDisplay.style.opacity = `${clamp((0.12 + reveal * 0.92) * (1 - dissolve * 0.96))}`;
    blessingDisplay.style.transform = `translate(-50%, -50%) scale(${0.985 + reveal * 0.015 - dissolve * 0.018})`;
    blessingDisplay.style.filter = `blur(${dissolve * 1.4}px)`;
    if (state.blessingLayout) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.font = state.blessingLayout.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = `rgba(73, 27, 54, ${0.56 * (1 - dissolve)})`;
      ctx.fillStyle = `rgba(255, 231, 173, ${0.16 * (1 - dissolve)})`;
      ctx.shadowColor = '#ffc77c';
      ctx.shadowBlur = 16;
      state.blessingLayout.lines.forEach((line, lineIndex) => {
        const y = state.blessingLayout.centerY + (lineIndex - (state.blessingLayout.lines.length - 1) / 2) * state.blessingLayout.lineHeight;
        ctx.strokeText(line, state.width / 2, y);
        ctx.fillText(line, state.width / 2, y);
      });
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(state.width / 2, state.height * 0.51, 10, state.width / 2, state.height * 0.51, Math.min(state.width, state.height) * 0.42);
    halo.addColorStop(0, `rgba(255, 190, 140, ${0.06 * reveal * (1 - dissolve)})`);
    halo.addColorStop(1, 'rgba(255, 120, 150, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, state.width, state.height);
    for (const particle of state.blessingParticles) {
      const jitterX = Math.sin(particle.seed + elapsed * 0.0012) * (1.5 + dissolve * 26);
      const jitterY = Math.cos(particle.seed * 1.7 + elapsed * 0.001) * (1.2 + dissolve * 22);
      const pull = reveal * 0.12;
      const drawX = lerp(particle.x, particle.targetX, reveal) + jitterX * dissolve;
      const drawY = lerp(particle.y, particle.targetY, reveal) + jitterY * dissolve;
      const alpha = particle.alpha * (0.2 + reveal * 0.82) * (1 - dissolve * 0.94);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, particle.size * (1 + reveal * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function updateStatus(elapsed) {
    if (elapsed < state.blessingStart) {
      const remaining = Math.ceil((state.blessingStart - elapsed) / 1000);
      statusText.textContent = remaining > 0 ? `烟花正在绽放 · ${remaining}s` : '祝福正在抵达';
    } else {
      statusText.textContent = '生日快乐 · 星光祝福中';
    }
  }

  function createAudioContext() {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return state.audioContext;
  }

  function playFireworkSound(type) {
    if (!state.soundEnabled) return;
    const audio = createAudioContext();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = type === 'crackle' ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(random(90, 145), now);
    oscillator.frequency.exponentialRampToValueAtTime(random(32, 55), now + 0.28);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(170, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === 'willow' ? 0.045 : 0.075, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);
    oscillator.connect(filter).connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.36);
    if (type === 'sphere' || type === 'multi' || type === 'chrysanthemum') {
      const noise = audio.createBufferSource();
      const buffer = audio.createBuffer(1, audio.sampleRate * 0.23, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const noiseGain = audio.createGain();
      const noiseFilter = audio.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = random(1400, 2800);
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.025, now + 0.012);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
      noise.connect(noiseFilter).connect(noiseGain).connect(audio.destination);
      noise.start(now);
    }
  }

  function playHappyBirthday() {
    if (!state.soundEnabled || state.musicStarted) return;
    state.musicStarted = true;
    const audio = createAudioContext();
    const start = audio.currentTime + 0.05;
    const beat = 0.34;
    const notes = [
      ['G4', 1], ['G4', 1], ['A4', 2], ['G4', 2], ['C5', 2], ['B4', 3],
      ['G4', 1], ['G4', 1], ['A4', 2], ['G4', 2], ['D5', 2], ['C5', 3],
      ['G4', 1], ['G4', 1], ['G5', 2], ['E5', 2], ['C5', 2], ['B4', 2], ['A4', 3],
      ['F5', 1], ['F5', 1], ['E5', 2], ['C5', 2], ['D5', 2], ['C5', 4],
    ];
    const frequencies = { G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784 };
    let cursor = start;
    for (const [note, beats] of notes) {
      const duration = beats * beat;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequencies[note];
      gain.gain.setValueAtTime(0.0001, cursor);
      gain.gain.exponentialRampToValueAtTime(0.095, cursor + 0.045);
      gain.gain.setValueAtTime(0.075, cursor + Math.max(0.06, duration - 0.09));
      gain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration - 0.02);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(cursor);
      oscillator.stop(cursor + duration);
      cursor += duration;
    }
  }

  function enableSound() {
    const audio = createAudioContext();
    audio.resume();
    state.soundEnabled = true;
    soundButton.classList.add('is-on');
    soundButton.setAttribute('aria-pressed', 'true');
    soundButtonText.textContent = '声音已开启';
    soundHint.classList.add('is-hidden');
    if (performance.now() - state.startedAt >= state.blessingStart) playHappyBirthday();
  }

  function frame(now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - state.lastFrame) / 1000));
    state.lastFrame = now;
    const elapsed = now - state.startedAt;
    ctx.clearRect(0, 0, state.width, state.height);
    drawStars(now);
    if (elapsed - state.lastLaunch > random(370, 820)) {
      const launchType = currentType();
      launchFirework(launchType, random(state.width * 0.12, state.width * 0.88));
      if (Math.random() < 0.29) window.setTimeout(() => launchFirework(currentType(), random(state.width * 0.16, state.width * 0.84)), random(80, 260));
      state.lastLaunch = elapsed;
    }
    if (!state.blessingStarted && elapsed >= state.blessingStart) {
      state.blessingStarted = true;
      state.blessingIndex = -1;
      if (state.soundEnabled) playHappyBirthday();
    }
    updateRockets(dt);
    updateBursts(dt);
    updateParticles(dt);
    updateSparkles(dt);
    updateStatus(elapsed);
    drawBlessing(elapsed);
    requestAnimationFrame(frame);
  }

  soundButton.addEventListener('click', enableSound);
  stage.addEventListener('pointerdown', (event) => {
    if (event.target !== soundButton && !state.soundEnabled) enableSound();
  });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
