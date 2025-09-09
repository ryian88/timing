const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const scoreDisplay = document.querySelector(".score");
const result = document.querySelector(".result");
const targetTime = document.querySelector(".targetTime");
const currentTime = document.querySelector(".currentTime");
const startBtn = document.querySelector(".start");
const retryBtn = document.querySelector(".retry");

function setGameState(newState) {
  document.getElementById("wrap").dataset.state = newState;
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    startBtn.onclick = () => {
      setGameState("playing");
      this.scene.start("GameScene");
    };
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.spritesheet("dude", "assets/dude.png", { frameWidth: 284, frameHeight: 300 });
    this.load.spritesheet("dude_change", "assets/dude_change.png", { frameWidth: 284, frameHeight: 300 });
    this.load.image("ground", "assets/platform.png");
    this.load.image("button", "assets/item.png");
    this.load.image("candy_normal", "assets/candy.png");
    this.load.image("candy_rare", "assets/candy_rare.png");
    this.load.image("candy_fail", "assets/candy_fail.png");
  }

  create() {
    this.setupGame();
    this.createAnimations();
    this.createGround();
    this.createPlayer();
    this.createButton();
    this.createCandyGroup();
    this.setupInput();
    this.stopped = false;
  }

  setupGame() {
    this.targetTime = (Math.random() * 6 + 3).toFixed(3); // 3~9초 랜덤 숫자
    targetTime.textContent = this.targetTime;
    this.currentTime = 0;
    currentTime.textContent = "0.000";
    this.score = 0;
    scoreDisplay.textContent = `Score: ${this.score}`;
  }

  // 플레이어 애니메이션
  createAnimations() {
    const types = [
      { prefix: "", sprite: "dude" },
      { prefix: "_alt", sprite: "dude_change" },
    ];

    const actions = [
      { key: "left", start: 0, end: 3, frameRate: 10, repeat: -1 },
      { key: "turn", start: 4, end: 4, frameRate: 20, repeat: 0 },
      { key: "right", start: 5, end: 8, frameRate: 10, repeat: -1 },
    ];

    types.forEach(type => {
      actions.forEach(action => {
        this.anims.create({
          key: action.key + type.prefix,
          frames: this.anims.generateFrameNumbers(type.sprite, { start: action.start, end: action.end }),
          frameRate: action.frameRate,
          repeat: action.repeat,
        });
      });
    });
  }

  // 플레이어 생성
  createPlayer() {
    this.player = this.physics.add.sprite(Phaser.Math.Between(50, GAME_WIDTH - 50), GAME_HEIGHT - 100, "dude");
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.15);
    this.physics.add.collider(this.player, this.ground);
  }

  createGround() {
    this.ground = this.physics.add.staticGroup();
    this.ground
      .create(GAME_WIDTH / 2, GAME_HEIGHT - 40, "ground")
      .setScale(GAME_WIDTH, 2)
      .refreshBody();
  }

  // stop 버튼 생성
  createButton() {
    this.button = this.physics.add.staticSprite(Phaser.Math.Between(50, GAME_WIDTH - 50), Phaser.Math.Between(GAME_HEIGHT - 150, GAME_HEIGHT - 200), "button");
    this.physics.add.collider(this.player, this.button, this.hitButton, null, this);
  }

  createCandyGroup() {
    this.candies = this.physics.add.group();
    this.physics.add.overlap(this.player, this.candies, this.collectCandy, null, this);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(time, delta) {
    if (!this.stopped) {
      this.currentTime += delta / 1000;
      currentTime.textContent = this.currentTime.toFixed(3);
      if (this.currentTime >= 10) {
        this.stopped = true;
        this.endGame();
        return;
      }
    }
    this.handlePlayerMovement();
  }

  handlePlayerMovement() {
    const speed = 300;
    let vx = 0,
      anim = "turn";

    if (this.cursors.left.isDown) (vx = -speed), (anim = this.player.change ? "left_alt" : "left");
    else if (this.cursors.right.isDown) (vx = speed), (anim = this.player.change ? "right_alt" : "right");
    else anim = this.player.change ? "turn_alt" : "turn";

    this.player.setVelocityX(vx);
    this.player.anims.play(anim, true);

    if (this.cursors.up.isDown && this.player.body.touching.down) this.player.setVelocityY(-330);
    if (this.cursors.down.isDown) this.player.setVelocityY(600);
  }

  hitButton() {
    if (!this.stopped) {
      this.stopped = true;
      this.checkResult();
      setGameState("star");

      // 이미지 변경
      this.player.setTexture("dude_change");
      // 상태 플래그
      this.player.change = true;

      this.button.destroy();
    }
  }

  // 점수 증가
  collectCandy(player, candy) {
    const scoreMap = { candy_fail: 1, candy_normal: 10, candy_rare: 30 };
    this.score += scoreMap[candy.texture.key] || 0; // 캔디 종류에 맞는 점수 부여 (없으면 0점)
    scoreDisplay.textContent = `Score: ${this.score}`;
    candy.disableBody(true, true); // 먹은 캔디 제거
  }

  checkResult() {
    const targetStr = parseFloat(this.targetTime).toFixed(3);
    const currentStr = parseFloat(this.currentTime).toFixed(3);
    let currentHTML = "",
      correct = true,
      stage = 0;

    for (let i = 0; i < currentStr.length; i++) {
      if (correct && targetStr[i] === currentStr[i]) {
        currentHTML += `<span style="color:#0f0">${currentStr[i]}</span>`;
        stage = i;
      } else {
        currentHTML += `<span style="color:rgba(255,255,255,0.3)">${currentStr[i]}</span>`;
        correct = false;
      }
    }
    currentTime.innerHTML = currentHTML;

    this.spawnCandies(stage);
    this.startStageTimer(stage);
  }

  // 캔디 생성
  spawnCandies(stage) {
    const total = 10;
    const probTable = {
      0: { fail: 1, normal: 0, rare: 0 },
      1: { fail: 0.5, normal: 0.4, rare: 0.1 },
      2: { fail: 0.2, normal: 0.5, rare: 0.3 },
      3: { fail: 0, normal: 0.3, rare: 0.7 },
      4: { fail: 0, normal: 0, rare: 1 },
    };
    for (let i = 0; i < total; i++) {
      const rand = Math.random();
      const p = probTable[stage];
      let type = rand < p.fail ? "candy_fail" : rand < p.fail + p.normal ? "candy_normal" : "candy_rare";
      const candy = this.candies.create(Phaser.Math.Between(50, GAME_WIDTH - 50), Phaser.Math.Between(0, 300), type);
      const radius = candy.displayWidth / 2;
      candy.body.setCircle(radius);
      candy.body.setGravityY(500);
      candy.setBounce(1);
      candy.setCollideWorldBounds(true);
      candy.setVelocity(Phaser.Math.Between(-200, 200), 20);
      candy.setAngularVelocity(Phaser.Math.Between(-200, 200));
    }
    this.physics.add.collider(this.candies, this.ground);
    this.physics.add.collider(this.candies, this.candies);
  }

  startStageTimer(stage) {
    let remaining = { 0: 10, 1: 11, 2: 12, 3: 13, 4: 20 }[stage];
    result.textContent = `${remaining.toFixed(3)}`;
    this.timerEvent = this.time.addEvent({
      delay: 10,
      loop: true,
      callback: () => {
        remaining -= 0.01;
        if (remaining <= 0) {
          remaining = 0;
          this.timerEvent.remove();
          this.endGame();
        }
        result.textContent = `${remaining.toFixed(3)}`;
      },
    });
  }

  endGame() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.candies.children.iterate(c => {
      c.setVelocity(0, 0);
      c.body.allowGravity = false;
    });
    retryBtn.onclick = () => {
      setGameState("playing");
      this.scene.start("GameScene");
    };
    setGameState("gameover");
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#222222",
  physics: { default: "arcade", arcade: { gravity: { y: 300 }, debug: false } },
  parent: "game-container",
  scene: [MenuScene, GameScene],
};

new Phaser.Game(config);
