document.addEventListener("DOMContentLoaded", () => {
  // Canvas要素とコンテキストを取得
  const canvas = document.getElementById("fireworksCanvas");
  const ctx = canvas.getContext("2d");
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Canvasのサイズをウィンドウサイズに合わせる
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 花火プログラムを格納する配列
  let fireworkProgram = [];
  let currentFireworkId = 0;

  // 現在の爆発アニメーションを管理する配列
  let explosions = [];
  const dragonParticles = [];
  const activeDragonFountains = [];

  // UI要素
  const fireworkControls = document.getElementById("fireworkControls");

  if (fireworkControls) {
    fireworkControls.style.display = "flex";
    fireworkControls.style.flexDirection = "column";
    fireworkControls.style.overflowY = "auto";
    fireworkControls.style.gap = "8px";
  }

  const addFireworkButton = document.getElementById("addFireworkButton");
  const runButton = document.getElementById("runButton");
  const saveButton = document.getElementById("saveButton");

  // 花火の選択肢
  const types = ["maru", "hunshutsu", "moji/emoji"];
  const colors = ["red", "blue", "yellow", "green", "white", "purple", "pink"];
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
        if (sound === "無音") continue; // 無音はスキップ

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

  // 花火発ごとにUIを生成する関数
  function addFireworkToUI(firework) {
    // デバッグ用
    console.log("addFireworkToUI firework:", firework);
    console.log("firework.type:", firework.type);

    const fireworkRow = document.createElement("div");
    fireworkRow.id = `firework-${firework.id}`;
    fireworkRow.className =
      "w-full flex-shrink-0 flex items-center space-x-2 mb-2 bg-gray-700 p-2 rounded-md";
    fireworkRow.innerHTML = `
      <span class="w-8 text-white font-bold">${firework.id + 1}</span>
      <input type="number" class="timing-input w-20 p-1 rounded bg-gray-800 text-white" value="${
        firework.timing
      }" min="0">
      <select class="type-select p-1 rounded bg-gray-800 text-white">
        ${types
          .map(
            (type) =>
              `<option value="${type}" ${
                firework.type === type ? "selected" : ""
              }>${type}</option>`
          )
          .join("")}
      </select>
      <select class="color-select p-1 rounded bg-gray-800 text-white">
        ${colors
          .map(
            (color) =>
              `<option value="${color}" ${
                firework.color === color ? "selected" : ""
              }>${color}</option>`
          )
          .join("")}
      </select>
      <select class="sound-select p-1 rounded bg-gray-800 text-white">
        ${sounds
          .map(
            (sound) =>
              `<option value="${sound}" ${
                firework.sound === sound ? "selected" : ""
              }>${sound}</option>`
          )
          .join("")}
      </select>
      <input type="number" class="position-x-input w-16 p-1 rounded bg-gray-800 text-white" value="${Math.round(
        firework.position.x * 100
      )}" min="0" max="100">
      <input type="number" class="position-y-input w-16 p-1 rounded bg-gray-800 text-white" value="${Math.round(
        firework.position.y * 100
      )}" min="0" max="100">
      <button class="remove-button bg-red-600 hover:bg-red-700 text-white p-1 rounded">削除</button>
    `;

    // 絵文字入力欄（初期は非表示）
    const emojiInput = document.createElement("input");
    emojiInput.type = "text";
    emojiInput.className = "emoji-input p-1 rounded bg-gray-800 text-white";
    emojiInput.placeholder = "絵文字入力";
    emojiInput.style.width = "50px";
    emojiInput.style.display = "none";
    emojiInput.value = firework.emoji || "🌸";
    fireworkRow.appendChild(emojiInput);

    fireworkControls.appendChild(fireworkRow);

    // Remove
    const removeButton = fireworkRow.querySelector(".remove-button");
    removeButton.addEventListener("click", () => {
      const index = fireworkProgram.findIndex((f) => f.id === firework.id);
      if (index > -1) {
        fireworkProgram.splice(index, 1);
        fireworkRow.remove();
      }
    });

    // type選択時に絵文字入力欄の表示切り替え
    const typeSelect = fireworkRow.querySelector(".type-select");
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value === "moji/emoji") {
        emojiInput.style.display = "inline-block";
        const fw = fireworkProgram.find((f) => f.id === firework.id);
        emojiInput.value = fw.emoji || "🌸";
      } else {
        emojiInput.style.display = "none";
      }
      updateFireworkProgramFromUI();
    });

    // 絵文字入力時にfireworkProgramに反映
    emojiInput.addEventListener("input", () => {
      const fw = fireworkProgram.find((f) => f.id === firework.id);
      if (fw) fw.emoji = emojiInput.value;
    });

    // 初期表示時にタイプによって絵文字入力欄の表示制御
    if (firework.type === "moji/emoji") {
      emojiInput.style.display = "inline-block";
    }

    // Updates（他input/selectの変更でfireworkProgram更新）
    const inputs = fireworkRow.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("change", updateFireworkProgramFromUI);
    });
  }

  // 初期プログラム
  const initialFirework = {
    id: currentFireworkId++,
    timing: 1000,
    color: "white",
    sound: "打ち上げ花火",
    position: { x: 0.5, y: 0.8 },
    type: "maru",
    emoji: "", // emojiタイプがなくなったため、初期値は空
    hasExploded: false,
  };
  fireworkProgram.push(initialFirework);
  addFireworkToUI(initialFirework);

  // 追加ボタン
  addFireworkButton.addEventListener("click", () => {
    const newFirework = {
      id: currentFireworkId++,
      timing:
        fireworkProgram.length > 0
          ? fireworkProgram[fireworkProgram.length - 1].timing + 1000
          : 1000,
      color: "white",
      sound: "和太鼓でドン",
      position: { x: 0.5, y: 0.8 },
      type: "maru",
      emoji: "",
      hasExploded: false,
    };
    fireworkProgram.push(newFirework);
    addFireworkToUI(newFirework);
  });

  // UI からの更新
  function updateFireworkProgramFromUI() {
    fireworkControls.querySelectorAll(".flex.items-center").forEach((row) => {
      const id = parseInt(row.id.replace("firework-", ""), 10);
      const firework = fireworkProgram.find((f) => f.id === id);
      if (firework) {
        firework.timing = parseInt(
          row.querySelector(".timing-input").value,
          10
        );
        firework.type = row.querySelector(".type-select").value;
        firework.color = row.querySelector(".color-select").value;
        firework.sound = row.querySelector(".sound-select").value;
        firework.position.x =
          parseInt(row.querySelector(".position-x-input").value, 10) / 100;
        firework.position.y =
          parseInt(row.querySelector(".position-y-input").value, 10) / 100;

        const emojiInput = row.querySelector(".emoji-input");
        if (emojiInput && firework.type === "moji/emoji") {
          firework.emoji = emojiInput.value || "🌸";
        } else {
          firework.emoji = "";
        }
      }
    });
  }

  // 再生機能
  let isPlaying = false;
  let startTime = null;

  function playFireworks() {
    if (isPlaying) return;
    updateFireworkProgramFromUI();
    isPlaying = true;
    startTime = Date.now();
    explosions = [];
    dragonParticles.length = 0;
    activeDragonFountains.length = 0;
    fireworkProgram.forEach((f) => (f.hasExploded = false));

    function animate() {
      if (!isPlaying) return;
      const elapsedTime = Date.now() - startTime;
      fireworkProgram.forEach((firework) => {
        if (elapsedTime >= firework.timing && !firework.hasExploded) {
          const explosionPosition = {
            x: firework.position.x * canvas.width,
            y: firework.position.y * canvas.height,
          };
          createExplosion(
            explosionPosition,
            firework.color,
            firework.type,
            firework.emoji,
            firework.sound // 💡 soundを渡す
          );
          // playSound(firework.sound); // 💥 この行は削除
          firework.hasExploded = true;
        }
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      activeDragonFountains.forEach(fountain => {
        if (fountain.active) {
          launchDragonFountain(fountain.x, fountain.y, fountain.color);
        }
      });

      updateExplosions();
      requestAnimationFrame(animate);
    }

    animate();
  }

  // Particle class for maru
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

  // DragonParticle class for hunshutsu
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

  // EmojiParticle class for moji/emoji fireworks
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

  // EmojiFirework class
  class EmojiFirework {
    constructor(
      targetX,
      targetY,
      size,
      text = "🌸",
      outline = false,
      color = "#ff6666",
      sound
    ) {
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
      this.sound = sound;  // 🔹 保存しておく

      this.textCanvas = document.createElement("canvas");
      this.textCanvas.width = 200;
      this.textCanvas.height = 200;
      this.textCtx = this.textCanvas.getContext("2d");
    }

    explode() {
      this.createTextParticles(this.text);
      this.exploded = true;
      if (this.sound) {
        playSound(this.sound);  // 🔊 頂点で音を鳴らす
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
        ctx.strokeText(
          char,
          this.textCanvas.width / 2,
          this.textCanvas.height / 2
        );
      }
      ctx.fillText(char, this.textCanvas.width / 2, this.textCanvas.height / 2);

      const imgData = ctx.getImageData(
        0,
        0,
        this.textCanvas.width,
        this.textCanvas.height
      ).data;
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
            this.particles.push(
              new EmojiParticle(fx, fy, this.targetX, this.targetY, color)
            );
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

  // Explosion generation
  function createExplosion(position, color, type = "maru", emoji = "🌸", sound = "") {
    if (type === "hunshutsu") {
      const fountain = {
        x: position.x,
        y: position.y,
        color: color,
        active: true,
      };
      activeDragonFountains.push(fountain);
      
      setTimeout(() => {
        fountain.active = false;
      }, 5000);

      // 💡 修正箇所: hunshutsuタイプの花火の音を鳴らす
      playSound(sound);

    } else if (type === "moji/emoji") {
      const outline = true;
      const size = 80 + Math.random() * 40;
      // 💡 EmojiFireworkにサウンド名を渡す
      explosions.push(
        new EmojiFirework(position.x, position.y, size, emoji, outline, color, sound)
      );
    } else {
      const particles = [];
      const particleCount = 50 + Math.random() * 50;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(position.x, position.y, color));
      }
      explosions.push(particles);
      // 💡 maruタイプの花火は打ち上がった瞬間に音を鳴らす
      playSound(sound);
    }
  }

  function launchDragonFountain(x, y,color) {
    for (let i = 0; i < 5; i++) {
      dragonParticles.push(new DragonParticle(x, y,color));
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

  // Sound playback
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

  // CSRF helper
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // 実行ボタン
  runButton.addEventListener("click", () => {
    if (!isPlaying) {
      runButton.textContent = "終了";
      playFireworks();
    } else {
      runButton.textContent = "実行";
      isPlaying = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // 保存ボタン
  saveButton.addEventListener("click", () => {
    updateFireworkProgramFromUI();
    const title = prompt("花火プログラムのタイトルを入力してください：");
    if (!title) return;
    const description = prompt("花火プログラムの説明を入力してください：");
    const programData = JSON.stringify(
      fireworkProgram.map((f) => ({
        timing: f.timing,
        color: f.color,
        sound: f.sound,
        position: f.position,
        type: f.type,
        emoji: f.emoji || "",
      }))
    );
    const csrfToken = getCookie("csrftoken");
    fetch("/create_firework/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        title: title,
        description: description,
        program_data: programData,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("花火プログラムが保存されました！");
          window.location.href = "/mypage/";
        } else {
          alert("保存に失敗しました。");
        }
      })
      .catch((error) => {
        console.error("保存エラー:", error);
        alert("保存中にエラーが発生しました。");
      });
  });
});