document.addEventListener('DOMContentLoaded', () => {
    // 再生モーダル関連の要素
    const modal = document.getElementById('playback-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const canvas = document.getElementById('playbackCanvas');
    const playBtn = document.getElementById('play-button');
    const stopBtn = document.getElementById('stop-button');
    const playbackTitle = document.getElementById('playback-title');

    // Canvasの初期化
    const ctx = canvas.getContext('2d');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    let isPlaying = false;
    let startTime = null;
    
    // アニメーション管理用の配列
    let explosions = [];
    const dragonParticles = [];
    const activeDragonFountains = [];
    
    let fireworkProgram = [];

    const sounds = [
        "和太鼓でドン",
        "打ち上げ花火",
        "チーン2",
        "ジャン！",
        "シャキーン2",
        "キラッ1",
        "きらーん2",
        "ドラゴン",
        "無音",
    ];
    const soundBuffers = {};

  // 音源ファイルの事前読み込み
  async function loadSounds() {
    try {
      for (const sound of sounds) {
        if (sound === "なし") continue; // 無音はスキップ

        const response = await fetch(`/static/audio/${sound}.mp3`);

        if (!response.ok) {
          console.warn(`音声ファイルが見つかりませんでした: ${sound}.mp3`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        soundBuffers[sound] = await audioCtx.decodeAudioData(arrayBuffer);
      }
    } catch (error) {
      console.error("音声の読み込み中にエラーが発生しました:", error);
    }
  }

    loadSounds();

    // --- 花火アニメーションの描画ロジック ---

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.speed = Math.random() * 5 + 1;
            this.angle = Math.random() * Math.PI * 2;
            this.size = Math.random() * 3 + 1;
            this.alpha = 1;
        }

        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.speed *= 0.95;
            this.alpha -= 0.01;
            if (this.alpha < 0) this.alpha = 0;
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    class DragonParticle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = -Math.random() * 3.5 - 2.5;
            this.alpha = 1;
            this.color = color;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.06;
            this.alpha = Math.max(0, this.alpha - 0.01);
        }
        draw() {
            if (this.alpha <= 0) return;
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    class EmojiParticle {
        constructor(x, y, cx, cy, color) {
            this.x = x;
            this.y = y;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.hypot(dx, dy);
            const minSpeed = 0.02;
            const maxSpeed = 5.0;
            const normalizedDist = Math.min(dist / 100, 1);
            const speed = minSpeed + normalizedDist * (maxSpeed - minSpeed);

            if (dist !== 0) {
                this.vx = (dx / dist) * speed;
                this.vy = (dy / dist) * speed;
            } else {
                this.vx = (Math.random() - 0.5) * minSpeed;
                this.vy = (Math.random() - 0.5) * minSpeed;
            }
            this.alpha = 1;
            this.color = color;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.alpha -= 0.008;
        }
        draw(ctx) {
            if (this.alpha <= 0) return;
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    class EmojiFirework {
        constructor(targetX, targetY, size, text = "🌸", outline = false, color = "#ff6666", sound) {
            this.x = targetX;
            this.y = canvas.height;
            this.targetX = targetX;
            this.targetY = targetY;
            this.size = size;
            this.text = text;
            this.outline = outline;
            this.vy = -5;
            this.exploded = false;
            this.particles = [];
            this.color = color;
            this.sound = sound;

            this.textCanvas = document.createElement("canvas");
            this.textCanvas.width = 200;
            this.textCanvas.height = 200;
            this.textCtx = this.textCanvas.getContext("2d");
        }

        explode() {
            this.createTextParticles(this.text);
            this.exploded = true;
            if (this.sound) {
                playSound(this.sound);
            }
        }

        createTextParticles(char) {
            const ctx = this.textCtx;
            ctx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
            ctx.font = "180px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = this.color;

            if (this.outline) {
                ctx.lineWidth = 8;
                ctx.strokeStyle = this.color;
                ctx.strokeText(char, this.textCanvas.width / 2, this.textCanvas.height / 2);
            }
            ctx.fillText(char, this.textCanvas.width / 2, this.textCanvas.height / 2);

            const imgData = ctx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height).data;
            const step = 8;
            const spread = this.size / 180;

            for (let y = 0; y < this.textCanvas.height; y += step) {
                for (let x = 0; x < this.textCanvas.width; x += step) {
                    const i = (y * this.textCanvas.width + x) * 4;
                    const alpha = imgData[i + 3];
                    if (alpha > 128) {
                        const fx = this.targetX + (x - this.textCanvas.width / 2) * spread;
                        const fy = this.targetY + (y - this.textCanvas.height / 2) * spread;
                        const color = this.color;
                        this.particles.push(new EmojiParticle(fx, fy, this.targetX, this.targetY, color));
                    }
                }
            }
        }
        update() {
            if (!this.exploded) {
                this.y += this.vy;
                if (this.y <= this.targetY) this.explode();
            } else {
                this.particles.forEach((p) => p.update());
                this.particles = this.particles.filter((p) => p.alpha > 0);
            }
        }
        draw(ctx) {
            if (!this.exploded) {
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                this.particles.forEach((p) => p.draw(ctx));
            }
        }
    }

    function createExplosion(position, color, type = "maru", emoji = "🌸", sound = "") {
        if (type === "hunshutsu") {
            const fountain = {
                x: position.x,
                y: position.y,
                color: color,
                active: true,
            };
            activeDragonFountains.push(fountain);
            playSound(sound);
            
            setTimeout(() => {
                fountain.active = false;
            }, 5000);

            // 💡 修正箇所: hunshutsuタイプの花火の音を鳴らす
            playSound(sound);

        } else if (type === "moji/emoji") {
            const outline = true;
            const size = 80 + Math.random() * 40;
            explosions.push(new EmojiFirework(position.x, position.y, size, emoji, outline, color, sound));
        } else { // maru
            const particles = [];
            const particleCount = 50 + Math.random() * 50;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(position.x, position.y, color));
            }
            explosions.push(particles);
            playSound(sound);
        }
    }
    
    function launchDragonFountain(x, y, color) {
        for (let i = 0; i < 5; i++) {
            dragonParticles.push(new DragonParticle(x, y, color));
        }
    }
    
    function updateExplosions() {
        explosions = explosions.filter((particles) => {
            if (particles instanceof EmojiFirework) {
                particles.update();
                particles.draw(ctx);
                return particles.particles.length > 0 || !particles.exploded;
            } else {
                particles.forEach((p) => {
                    p.update();
                    p.draw();
                });
                return particles.some((p) => p.alpha > 0);
            }
        });
        for (let i = dragonParticles.length - 1; i >= 0; i--) {
            const p = dragonParticles[i];
            p.update();
            p.draw();
            if (p.alpha <= 0) dragonParticles.splice(i, 1);
        }
        for (let i = activeDragonFountains.length - 1; i >= 0; i--) {
            if (!activeDragonFountains[i].active) {
                activeDragonFountains.splice(i, 1);
            }
        }
    }

    // --- 既存の再生ロジック ---

    // 音を再生する関数
    function playSound(soundName) {
        const buffer = soundBuffers[soundName];
        if (!buffer) {
            console.error(`Sound buffer for '${soundName}' not found.`);
            return;
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
    }
    
    function playProgram() {
        if (isPlaying) return;

        isPlaying = true;
        startTime = Date.now();
        explosions = [];
        dragonParticles.length = 0;
        activeDragonFountains.length = 0;
        fireworkProgram.forEach(f => f.hasExploded = false);

        function animate() {
            if (!isPlaying) return;

            const elapsedTime = Date.now() - startTime;
            
            fireworkProgram.forEach(firework => {
                if (elapsedTime >= firework.timing && !firework.hasExploded) {
                    const explosionPosition = { 
                        x: firework.position.x * canvas.width, 
                        y: firework.position.y * canvas.height
                    };
                    createExplosion(explosionPosition, firework.color, firework.type, firework.emoji, firework.sound);
                    firework.hasExploded = true;
                }
            });
            
            // 💡 hunshutsuタイプの花火をアニメーションループ内で描画する処理を追加
            activeDragonFountains.forEach(fountain => {
                if (fountain.active) {
                    launchDragonFountain(fountain.x, fountain.y, fountain.color);
                }
            });

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            updateExplosions();

            requestAnimationFrame(animate);
        }

        animate();
    }
    
    playBtn.addEventListener('click', playProgram);

    stopBtn.addEventListener('click', () => {
        isPlaying = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        explosions = [];
        dragonParticles.length = 0;
        activeDragonFountains.length = 0;
    });

    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const programId = e.currentTarget.dataset.programId;
            if (!programId) return;

            try {
                const response = await fetch(`/program/${programId}/`);
                const data = await response.json();
                
                if (data.program_data) {
                    fireworkProgram = JSON.parse(data.program_data);
                    fireworkProgram.forEach(f => f.hasExploded = false);
                    
                    playbackTitle.textContent = data.title;
                    modal.style.display = 'flex';

                    canvas.width = canvas.parentElement.clientWidth;
                    canvas.height = canvas.parentElement.clientHeight;

                    playProgram();
                } else {
                    console.error('Program data not found');
                }
            } catch (error) {
                console.error('Error fetching firework program:', error);
            }
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        isPlaying = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        explosions = [];
        dragonParticles.length = 0;
        activeDragonFountains.length = 0;
    });

    // 画像・動画用モーダル処理
    const mediaModal = document.getElementById('media-modal');
    const mediaCloseBtn = document.getElementById('media-close-btn');
    const mediaImg = document.getElementById('media-modal-img');
    const mediaVideo = document.getElementById('media-modal-video');

    document.querySelectorAll('.media-open').forEach(el => {
    el.addEventListener('click', () => {
    const type = el.dataset.type;
    const src = el.dataset.src;


      if (type === 'image') {
        mediaVideo.pause();
        mediaVideo.classList.add('hidden');
        mediaImg.src = src;
        mediaImg.classList.remove('hidden');
      } else if (type === 'video') {
        mediaImg.classList.add('hidden');
        mediaVideo.src = src;
        mediaVideo.classList.remove('hidden');
        mediaVideo.play();
      }

      mediaModal.classList.remove('hidden');
      mediaModal.classList.add('flex');
    });

    });

    mediaCloseBtn.addEventListener('click', () => {
    mediaModal.classList.add('hidden');
    mediaModal.classList.remove('flex');
    mediaVideo.pause();
    mediaVideo.src = '';
    mediaImg.src = '';
    });

    mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) {
    mediaCloseBtn.click();
    }
    });
});