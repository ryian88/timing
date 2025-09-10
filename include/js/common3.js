const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const scoreDisplay = document.querySelector(".score");
const result = document.querySelector(".result");
const targetTime = document.querySelector(".targetTime");
const currentTime = document.querySelector(".currentTime");
const startBtn = document.querySelector(".start");
const retryBtn = document.querySelector(".retry");
const nextBtn = document.querySelector(".next");

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
    this.load.image("monster", "assets/monster.png");
  }

  create() {
    this.setupGame();
    this.createAnimations();
    this.createGround();
    this.createPlayer();
    this.createButton();
    this.createCandyGroup();
    this.createMonsterGroup();
    this.setupInput();
    this.stopped = false;
  }

  setupGame(resetScore = true) {
    this.targetTime = (Math.random() * 6 + 3).toFixed(3); // 3~9초 랜덤 숫자
    targetTime.textContent = this.targetTime;
    this.currentTime = 0;
    currentTime.textContent = "0.000";
    if (resetScore) this.score = 0;
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
    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 100, "dude");
    // this.player.setBounce(0.2);
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
    this.button = this.physics.add.staticSprite(GAME_WIDTH / 2, GAME_HEIGHT - 250, "button");
    this.physics.add.collider(this.player, this.button, this.hitButton, null, this);
  }

  createCandyGroup() {
    this.candies = this.physics.add.group();
    this.physics.add.overlap(this.player, this.candies, this.collectCandy, null, this);
  }

  createMonsterGroup() {
    this.monsters = this.physics.add.group();
    this.physics.add.collider(this.player, this.monsters, this.hitMonster, null, this);
    this.physics.add.collider(this.monsters, this.ground);
    this.physics.add.collider(this.monsters, this.monsters);
    this.physics.add.collider(this.monsters, this.candies);
    // this.physics.add.overlap(
    //   this.monsters,
    //   this.candies,
    //   (monster, candy) => {
    //     candy.setVelocityY(-candy.body.velocity.y); // 반대로 튕기게
    //   },
    //   null,
    //   this
    // );
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

    // 몬스터가 화면 아래로 가면 위로 리셋
    this.monsters.children.iterate(monster => {
      if (monster.y > GAME_HEIGHT - 50) {
        monster.y = -100; // 다시 하늘에서 떨어지게
        monster.body.velocity.y = 0; // 기존 속도 초기화
        monster.body.updateFromGameObject();
      }
    });
  }

  handlePlayerMovement() {
    const speed = 300;
    let vx = 0;
    let anim = "turn";

    if (this.cursors.left.isDown) (vx = -speed), (anim = this.player.change ? "left_alt" : "left");
    else if (this.cursors.right.isDown) (vx = speed), (anim = this.player.change ? "right_alt" : "right");
    else anim = this.player.change ? "turn_alt" : "turn";

    this.player.setVelocityX(vx);
    this.player.anims.play(anim, true);

    if (this.cursors.up.isDown && this.player.body.touching.down) this.player.setVelocityY(-330);
    if (this.cursors.down.isDown) this.player.setVelocityY(800);
  }

  hitButton() {
    if (!this.stopped) {
      this.stopped = true;
      this.checkResult();
      setGameState("star");

      // 이미지 변경
      this.player.setTexture("dude_change");
      this.player.change = true;
    }
  }

  // 점수 증가
  collectCandy(player, candy) {
    const scoreMap = { candy_fail: 1, candy_normal: 10, candy_rare: 30 };
    this.score += scoreMap[candy.texture.key] || 0; // 캔디 종류에 맞는 점수 부여 (없으면 0점)
    scoreDisplay.textContent = `Score: ${this.score}`;
    candy.disableBody(true, true); // 먹은 캔디 제거
  }

  hitMonster(player, monster) {
    this.stopped = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    result.textContent = "Game Over!";
    setGameState("gameover");
    this.setupRetry();
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
    const total = 20;
    const probTable = {
      0: { fail: 1, normal: 0, rare: 0 },
      1: { fail: 0.5, normal: 0.4, rare: 0.1 },
      2: { fail: 0.2, normal: 0.5, rare: 0.3 },
      3: { fail: 0, normal: 0.3, rare: 0.7 },
      4: { fail: 0, normal: 0, rare: 1 },
    };

    let spawned = 0;
    this.time.addEvent({
      delay: 150,
      repeat: total - 1,
      callback: () => {
        spawned++;

        let type = Math.random() < probTable[stage].fail ? "candy_fail" : Math.random() < probTable[stage].fail + probTable[stage].normal ? "candy_normal" : "candy_rare";
        const candy = this.candies.create(this.button.x + Phaser.Math.Between(-20, 20), this.button.y - 30, type);
        const radius = candy.displayWidth / 2;
        candy.body.setCircle(radius); // 충돌 영역
        candy.body.setGravityY(500); // 중력
        candy.setBounce(1); // 바운스
        candy.setCollideWorldBounds(true); // 벽과 충돌
        candy.setAngularVelocity(Phaser.Math.Between(-200, 200)); // 회전

        const angle = Phaser.Math.Between(-40, -140); // 퍼짐 각도 (왼쪽 위~오른쪽 위)
        const speed = Phaser.Math.Between(600, 800); // 위로 뿜는 속도
        this.physics.velocityFromAngle(angle, speed, candy.body.velocity);
      },
    });

    this.physics.add.collider(this.candies, this.ground);
    this.physics.add.collider(this.candies, this.candies);
    this.physics.add.collider(this.candies, this.button);
  }

  startStageTimer(stage) {
    let remaining = 10; // 항상 10초로 고정
    result.textContent = `${remaining.toFixed(3)}`;

    this.timerEvent = this.time.addEvent({
      delay: 10,
      loop: true,
      callback: () => {
        remaining -= 0.01;
        if (remaining <= 0) {
          remaining = 0;
          this.timerEvent.remove();
          this.nextGame();
        }
        result.textContent = `${remaining.toFixed(3)}`;
      },
    });
  }

  nextGame() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.candies.children.iterate(c => {
      c.setVelocity(0, 0);
      c.body.allowGravity = false;
    });
    nextBtn.onclick = () => {
      setGameState("playing");
      this.physics.resume();
      this.player.clearTint();
      this.candies.clear(true, true); // 이전 사탕 제거
      this.button.destroy();
      this.createButton();
      this.setupGame(false); // 점수 유지
      this.stopped = false;

      // 새 몬스터 추가
      const monster = this.monsters.create(Phaser.Math.Between(50, GAME_WIDTH - 50), -100, "monster");
      monster.setBounce(0.4);
      monster.setScale(0.12);
      monster.setCollideWorldBounds(true);
      monster.setVelocity(Phaser.Math.Between(-100, 100), 20);
      monster.setGravityY(200);

      this.monsters.children.iterate(m => {
        m.y = -100;
        m.body.updateFromGameObject(); // 물리엔진 좌표 갱신
      });
    };
    setGameState("nextlevel");
  }

  endGame() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.candies.children.iterate(c => {
      c.setVelocity(0, 0);
      c.body.allowGravity = false;
    });
    setGameState("gameover");
    this.setupRetry();
  }

  setupRetry() {
    retryBtn.onclick = () => {
      setGameState("playing");
      if (this.monsters) this.monsters.clear(true, true);
      this.scene.start("GameScene");
    };
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
