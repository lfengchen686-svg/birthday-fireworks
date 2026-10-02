/*
 * Birthday presentation layer for the Firework Simulator engine.
 *
 * The fireworks renderer in this project is derived from:
 * Copyright © 2022 NianBroken. All rights reserved.
 * https://github.com/NianBroken/Firework_Simulator
 * Licensed under Apache-2.0. See ./LICENSE.
 * This file is an original addition for the birthday greeting page.
 */

(() => {
  'use strict';

  const wishes = [
    '姐姐，生日快乐。',
    '希望新的一岁里，你想做的事都能慢慢有结果，想去的地方都能一步一步靠近。',
    '希望你少一点焦虑，多一点开心；少一点自我怀疑，多一点坚定。',
    '也希望以后不管生活有多忙，你都能好好吃饭，好好睡觉，好好照顾自己。',
    '谢谢你出现在我的生活里。',
    '愿你永远自由、漂亮、温柔，也永远有重新开始的勇气。',
    '生日快乐，姐姐。',
  ];

  const wishNode = document.getElementById('birthday-wish');
  const introNode = document.getElementById('birthday-intro');
  const particleCanvas = document.getElementById('birthday-particle-canvas');
  const particleContext = particleCanvas.getContext('2d');
  const statusNode = document.getElementById('birthday-status');
  const soundButton = document.getElementById('birthday-sound');
  const fireworkBgm = document.getElementById('firework-bgm');
  const birthdaySong = document.getElementById('birthday-song');

  const showStartDelay = 6500;
  const fireworkShowDuration = 150000;
  const blessingStart = showStartDelay + fireworkShowDuration;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    startedAt: performance.now(),
    showStarted: false,
    blessingStarted: false,
    showStartDelay,
    blessingStart,
    wishCycle: 3000,
    wishIndex: -1,
    lastStatusUpdate: -Infinity,
    wishParticles: [],
    wishLayout: null,
    soundEnabled: false,
    fireworkMusicStarted: false,
    musicStarted: false,
  };

  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeOut = (value) => 1 - (1 - clamp(value)) ** 3;
  const smooth = (value) => value * value * (3 - 2 * value);

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    particleCanvas.width = Math.floor(state.width * state.dpr);
    particleCanvas.height = Math.floor(state.height * state.dpr);
    particleCanvas.style.width = `${state.width}px`;
    particleCanvas.style.height = `${state.height}px`;
    particleContext.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (state.wishIndex >= 0) prepareWish(state.wishIndex);
  }

  function wrapText(text, font, maxWidth) {
    const measureCanvas = document.createElement('canvas');
    const measureContext = measureCanvas.getContext('2d');
    measureContext.font = font;
    const lines = [];
    let line = '';
    for (const character of text) {
      const candidate = line + character;
      if (measureContext.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function getWishFontSize(text) {
    if (state.width <= 640) {
      if (text.length <= 9) return 42;
      if (text.length <= 28) return 28;
      return 22;
    }
    if (text.length <= 9) return 72;
    if (text.length <= 28) return 44;
    if (text.length <= 42) return 36;
    return 31;
  }

  function prepareWish(index) {
    const text = wishes[index];
    const fontSize = getWishFontSize(text);
    const font = `700 ${fontSize}px "KaiTi", "STKaiti", "DFKai-SB", "Noto Serif SC", serif`;
    const maxWidth = Math.min(state.width * 0.82, 1040);
    const lineHeight = fontSize * 1.48;
    const lines = wrapText(text, font, maxWidth);
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.ceil(maxWidth);
    offscreen.height = Math.ceil(lines.length * lineHeight + fontSize * 1.1);
    const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true });
    offscreenContext.font = font;
    offscreenContext.textAlign = 'center';
    offscreenContext.textBaseline = 'middle';
    offscreenContext.fillStyle = '#ffffff';
    lines.forEach((line, lineIndex) => {
      const y = offscreen.height / 2 + (lineIndex - (lines.length - 1) / 2) * lineHeight;
      offscreenContext.fillText(line, offscreen.width / 2, y);
    });

    const pixels = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height).data;
    const points = [];
    const gap = state.width <= 640 ? 4 : 3;
    for (let y = 0; y < offscreen.height; y += gap) {
      for (let x = 0; x < offscreen.width; x += gap) {
        if (pixels[(y * offscreen.width + x) * 4 + 3] > 110) points.push({ x, y });
      }
    }
    const stride = Math.max(1, Math.ceil(points.length / 760));
    state.wishParticles = points.filter((_, pointIndex) => pointIndex % stride === 0).map((point, pointIndex) => ({
      targetX: state.width / 2 - offscreen.width / 2 + point.x,
      targetY: state.height * 0.51 - offscreen.height / 2 + point.y,
      x: random(0, state.width),
      y: random(state.height * 0.26, state.height * 0.78),
      size: pointIndex % 8 === 0 ? 2 : 1.35,
      color: pointIndex % 7 === 0 ? '#f7a9bf' : pointIndex % 5 === 0 ? '#fff0af' : '#ffd98b',
      seed: random(0, Math.PI * 2),
    }));
    state.wishLayout = { font, fontSize, lines, lineHeight };

    wishNode.replaceChildren(...lines.map((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    }));
    wishNode.style.fontSize = `${fontSize}px`;
  }

  function startFireworkShow() {
    if (state.showStarted) return;
    state.showStarted = true;
    if (typeof window.setFireworkShowRunning === 'function') {
      window.setFireworkShowRunning(true);
    }
  }

  function playFireworkBgm() {
    if (!state.soundEnabled || state.fireworkMusicStarted || state.blessingStarted) return;
    state.fireworkMusicStarted = true;
    fireworkBgm.currentTime = 0;
    const playPromise = fireworkBgm.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        state.fireworkMusicStarted = false;
      });
    }
  }

  function stopFireworkBgm() {
    if (!state.fireworkMusicStarted && fireworkBgm.paused) return;
    fireworkBgm.pause();
    fireworkBgm.currentTime = 0;
    state.fireworkMusicStarted = false;
  }

  function startBlessing() {
    if (state.blessingStarted) return;
    state.blessingStarted = true;
    if (typeof window.setFireworkShowRunning === 'function') {
      // Keep the fireworks running behind the birthday song and particle
      // wishes. The text is an overlay, not the end of the show.
      window.setFireworkShowRunning(true);
    }
  }

  function drawIntro(now) {
    const elapsed = now - state.startedAt;
    if (elapsed >= state.showStartDelay) {
      introNode.style.opacity = '0';
      introNode.style.transform = 'translate(-50%, -50%) scale(1.03)';
      return;
    }

    const reveal = easeOut(elapsed / 900);
    const fadeStart = state.showStartDelay - 900;
    const fade = smooth((elapsed - fadeStart) / 900);
    introNode.style.opacity = `${clamp(reveal * (1 - fade * 0.92))}`;
    introNode.style.transform = `translate(-50%, -50%) scale(${0.98 + reveal * 0.02})`;
  }

  function drawWish(now) {
    const elapsed = now - state.startedAt;
    if (elapsed < state.blessingStart) {
      wishNode.style.opacity = '0';
      return;
    }

    particleContext.clearRect(0, 0, state.width, state.height);

    const sinceStart = elapsed - state.blessingStart;
    const nextIndex = Math.floor(sinceStart / state.wishCycle) % wishes.length;
    if (nextIndex !== state.wishIndex) {
      state.wishIndex = nextIndex;
      prepareWish(nextIndex);
    }

    const phase = (sinceStart % state.wishCycle) / state.wishCycle;
    const reveal = easeOut(phase / 0.24);
    const dissolve = smooth((phase - 0.63) / 0.37);
    // Keep the solid glyphs readable for roughly 1.5 seconds while their
    // surrounding particles have already started to scatter.
    // Keep the solid blessing readable for almost the whole card phase;
    // only the final moments dissolve into particles.
    const textDissolve = smooth((phase - 0.93) / 0.07);
    wishNode.style.opacity = `${clamp((0.18 + reveal * 0.82) * (1 - textDissolve * 0.98))}`;
    wishNode.style.visibility = 'visible';
    wishNode.style.display = 'block';
    wishNode.style.zIndex = '20';
    wishNode.style.transform = `translate(-50%, -50%) scale(${0.985 + reveal * 0.015 - dissolve * 0.018})`;
    wishNode.style.filter = `blur(${dissolve * 1.2}px)`;

    particleContext.save();
    particleContext.globalCompositeOperation = 'lighter';
    for (const particle of state.wishParticles) {
      const scatter = dissolve * 34;
      const jitterX = Math.sin(particle.seed + now * 0.0014) * scatter;
      const jitterY = Math.cos(particle.seed * 1.8 + now * 0.0011) * scatter;
      const x = particle.x + (particle.targetX - particle.x) * reveal + jitterX;
      const y = particle.y + (particle.targetY - particle.y) * reveal + jitterY;
      particleContext.globalAlpha = (0.28 + reveal * 0.7) * (1 - dissolve * 0.96);
      particleContext.fillStyle = particle.color;
      particleContext.fillRect(x, y, particle.size, particle.size);
    }

    // Solid readable glyphs sit above the dissolving particles.
    if (state.wishLayout) {
      particleContext.globalCompositeOperation = 'source-over';
      particleContext.globalAlpha = clamp((0.92 + reveal * 0.08) * (1 - dissolve * 0.98));
      particleContext.font = state.wishLayout.font;
      particleContext.textAlign = 'center';
      particleContext.textBaseline = 'middle';
      particleContext.lineWidth = 2.2;
      particleContext.strokeStyle = 'rgba(43, 10, 35, 0.96)';
      const textGradient = particleContext.createLinearGradient(state.width * 0.25, 0, state.width * 0.75, 0);
      textGradient.addColorStop(0, '#ffd06f');
      textGradient.addColorStop(0.5, '#fff3c1');
      textGradient.addColorStop(1, '#f19ab6');
      particleContext.fillStyle = textGradient;
      state.wishLayout.lines.forEach((line, lineIndex) => {
        const y = state.height * 0.51 + (lineIndex - (state.wishLayout.lines.length - 1) / 2) * state.wishLayout.lineHeight;
        particleContext.strokeText(line, state.width / 2, y);
        particleContext.fillText(line, state.width / 2, y);
      });
    }

    particleContext.restore();
  }

  function updateStatus(now) {
    if (now - state.lastStatusUpdate < 250) return;
    state.lastStatusUpdate = now;
    const elapsed = now - state.startedAt;
    if (elapsed < state.showStartDelay) {
      statusNode.textContent = `烟火秀即将开始 · ${Math.ceil((state.showStartDelay - elapsed) / 1000)}s`;
    } else if (elapsed < state.blessingStart) {
      const remaining = Math.ceil((state.blessingStart - elapsed) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = String(remaining % 60).padStart(2, '0');
      statusNode.textContent = `烟火秀进行中 · ${minutes}:${seconds}`;
    } else {
      statusNode.textContent = '生日快乐 · 星光祝福中';
    }
  }

  function playBirthdaySong() {
    if (!state.soundEnabled || state.musicStarted) return;
    stopFireworkBgm();
    state.musicStarted = true;
    birthdaySong.currentTime = 0;
    const playPromise = birthdaySong.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        state.musicStarted = false;
      });
    }
  }

  function unlockSound() {
    state.soundEnabled = true;
    if (window.soundManager && typeof window.soundManager.registerInteraction === 'function') {
      window.soundManager.registerInteraction();
    }
    if (typeof window.toggleSound === 'function') window.toggleSound(true);
    soundButton.setAttribute('aria-pressed', 'true');
    soundButton.classList.add('is-enabled');
    soundButton.innerHTML = '<span aria-hidden="true">♫</span> 声音已开启';
    const elapsed = performance.now() - state.startedAt;
    if (elapsed >= state.blessingStart) playBirthdaySong();
    else if (elapsed >= state.showStartDelay) playFireworkBgm();
  }

  function frame(now) {
    const elapsed = now - state.startedAt;
    if (elapsed >= state.showStartDelay) startFireworkShow();
    if (elapsed >= state.showStartDelay && elapsed < state.blessingStart) playFireworkBgm();
    if (elapsed >= state.blessingStart) startBlessing();
    if (elapsed < state.showStartDelay || introNode.style.opacity !== '0') drawIntro(now);
    if (elapsed >= state.blessingStart) drawWish(now);
    updateStatus(now);
    if (elapsed >= state.blessingStart) playBirthdaySong();
    requestAnimationFrame(frame);
  }

  soundButton.addEventListener('click', unlockSound);
  document.addEventListener('pointerdown', (event) => {
    if (event.target !== soundButton && !state.soundEnabled) unlockSound();
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  if (typeof window.setFireworkShowRunning === 'function') {
    window.setFireworkShowRunning(false);
  }
  resize();
  requestAnimationFrame(frame);
})();
