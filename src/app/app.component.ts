import {Component} from '@angular/core';
import {interval, map, Observable} from "rxjs";
import {TranslateService} from "@ngx-translate/core";
import {getDatabase, ref, set, orderByChild, query, get, update} from "firebase/database";
import {getAuth, signInAnonymously, onAuthStateChanged} from "firebase/auth";
import {v4 as uuidv4} from 'uuid';
import {Auth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, linkWithRedirect} from "@firebase/auth";
import {formatDate} from "@angular/common";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = "Dᛜᛜmᛇcrᛜᛂᛂ";

  //game parameters
  boxPerLevel: number = 5;
  timePerLevel: number = 15;
  levelsForNewSymbols: number = 3;
  levelForRotation: number = 20;
  //https://symbl.cc/en/collections/simvoli-vk/
  startSymbolsPool = ["ᛄ", "ᛇ", "ᛂ"];
  additionalSymbolsPool = ["ᛚ", "ᛢ", "ᛮ", "ᛛ", "ᚾ", "ᛀ", "ᛁ", "ᛃ", "ᛑ", "ᛙ", "ᛜ"];
  colors: string[] = ["green", "red", "blue", "purple", "cyan", "orange"];

  constructor(translate: TranslateService) {
    //auth
    this.auth.languageCode = this.language;
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log(user)
        if (!user.isAnonymous) {
          if (user.displayName != null)
            this.setDisplayName(user.displayName);
          else {
            let displayName: string | null = user.providerData[0].displayName;
            if (displayName != null)
              this.setDisplayName(displayName);
          }
        }

        this.getScore();
      }
    });
    //this is to handle link to existing account
    getRedirectResult(this.auth)
      .catch((error) => {
        if(error.toString().includes("auth/credential-already-in-use")){
          localStorage.removeItem(this.scoreIdLocalStorageKey);
          this.googleAuthClick(true);
        }
      });

    //translation
    this.translate = translate;
    let language: string | null = localStorage.getItem(this.languageLocalStorageKey);
    if (language == null) {
      language = navigator.language.slice(0, 2);
    }
    if (this.supportedLanguages.findIndex(l => l === language) > 0) {
      this.language = language;
      translate.use(this.language);
      this.auth.languageCode = this.language;
    }

    //audio
    this.musicAudio.load();
    this.levelAudio.load();
    this.hitAudio.load();
    this.overAudio.load();
    this.musicAudio.loop = true;
    let music: string | null = localStorage.getItem(this.musicLocalStorageKey);
    if (music != null)
      this.music = music == "true";
    let sound: string | null = localStorage.getItem(this.soundLocalStorageKey);
    if (sound != null)
      this.sound = sound == "true";
  }

  //auth
  auth: Auth = getAuth();
  displayName: string | null = null;

  setDisplayName(displayName: string) {
    let indexSpace = displayName.indexOf(" ");
    if (indexSpace > 0)
      this.displayName = displayName.slice(0, indexSpace + 2) + ".";
    else
      this.displayName = displayName;
  }

  anonymousUser() {
    if (this.auth.currentUser == null) {
      signInAnonymously(this.auth)
        .catch((error) => {
          console.log(error);
        });
    }
  }

  googleAuthClick(forceRedirect: boolean) {
    const provider = new GoogleAuthProvider();

    if (forceRedirect || this.auth.currentUser == null)
      signInWithRedirect(this.auth, provider);

    else if (this.auth.currentUser?.isAnonymous)
      linkWithRedirect(this.auth.currentUser, provider)
        .catch((result) => console.log(result));
  }

  //score
  db = getDatabase();
  scoreIdLocalStorageKey: string = "score_id";
  recordLevelStorageKey: string = "record_level";
  recordPointsStorageKey: string = "record_points";
  rankingStorageKey: string = "ranking";

  getScore() {
    let scoreId: string | null = localStorage.getItem(this.scoreIdLocalStorageKey);
    if (scoreId == null) {
      get(ref(this.db, 'users/' + this.auth.currentUser?.uid))
        .then((snapshot) => {
          if (snapshot.exists()) {
            localStorage.setItem(this.scoreIdLocalStorageKey, snapshot.val().score.id);
            localStorage.setItem(this.recordPointsStorageKey, snapshot.val().score.points);
            localStorage.setItem(this.recordLevelStorageKey, snapshot.val().score.level);

            if (this.displayName != null && snapshot.val().name != this.displayName) {
              update(ref(this.db, 'users/' + this.auth.currentUser?.uid),
                {name: this.displayName})
                .catch((error) => {
                  console.error(error);
                });
            }

          } else {
            console.log("No data available");
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  getBestLevel(): number {
    let recordStorage: string | null = localStorage.getItem(this.recordLevelStorageKey);
    let record: number = 0;
    if (recordStorage != null)
      record = +recordStorage;

    return record;
  }

  getBestPoints(): number {
    let recordStorage: string | null = localStorage.getItem(this.recordPointsStorageKey);
    let record: number = 0;
    if (recordStorage != null)
      record = +recordStorage;

    return record;
  }

  persistScore(level: number, points: number) {
    let recordPointsStorage: string | null = localStorage.getItem(this.recordPointsStorageKey);
    let recordPoints: number = 0;
    if (recordPointsStorage != null)
      recordPoints = +recordPointsStorage;

    if (points > recordPoints) {
      localStorage.setItem(this.recordPointsStorageKey, "" + points);
      localStorage.setItem(this.recordLevelStorageKey, "" + level);

      let scoreId: string | null = localStorage.getItem(this.scoreIdLocalStorageKey);
      if (scoreId == null) {
        scoreId = uuidv4();
        localStorage.setItem(this.scoreIdLocalStorageKey, scoreId);
      }

      set(ref(this.db, 'users/' + this.auth.currentUser?.uid), {
        name: "Anonymous",
        score: {
          level: level,
          points: points,
          date: formatDate(Date.now(), 'yyyy-MM-dd', "en-US"),
          id: scoreId,
        }
      }).catch((error) => {
        console.error(error);
      });
    }
  }

  //leaderboard
  showLeader: boolean = false;

  leaderToggleClick() {
    //todo if true then first calculate rank and get top 10
    // then display
    this.showLeader = !this.showLeader;
  }

  //settings
  showSettings: boolean = false;

  settingsToggleClick() {
    this.showSettings = !this.showSettings;
  }

  //translation
  translate: TranslateService;
  language: string = "en";
  supportedLanguages: string[] = ["en", "fr"];
  languageLocalStorageKey: string = "language";

  languageClick() {
    let index = this.supportedLanguages.findIndex(l => l === this.language);
    let language = this.supportedLanguages.at((index + 1) % (this.supportedLanguages.length));
    if (language) {
      this.language = language;
      this.translate.use(this.language);
      localStorage.setItem(this.languageLocalStorageKey, this.language);
      this.auth.languageCode = this.language;
    }
  }

  //
  // list() {
  //   const auth = getAuth();
  //
  //   signInAnonymously(auth)
  //     .then(() => {
  //       // Signed in..
  //     })
  //     .catch((error) => {
  //       const errorCode = error.code;
  //       const errorMessage = error.message;
  //       console.log(errorMessage)
  //       // ...
  //     });
  //
  //
  //   const db = getDatabase();
  //   const list = query(ref(db, 'scores/'), orderByChild('points'));
  //   console.log(list.ref.toJSON())
  //
  //   get(list).then((snapshot) => {
  //     if (snapshot.exists()) {
  //       console.log(snapshot.val());
  //     } else {
  //       console.log("No data available");
  //     }
  //   }).catch((error) => {
  //     console.error(error);
  //   });
  // }


  //audio
  //https://www.filippovicarelli.com/8bit-game-background-music
  musicAudio = new Audio("../assets/audio/sacrifice.wav");
  levelAudio = new Audio("../assets/audio/explosion.wav");
  hitAudio = new Audio("../assets/audio/hit.wav");
  overAudio = new Audio("../assets/audio/game-over.mp3");
  music: boolean = true;
  musicLocalStorageKey: string = "music";
  sound: boolean = true;
  soundLocalStorageKey: string = "sound";

  musicToggleClick() {
    if (this.music)
      this.musicAudio.pause();
    else if (this.currentLevel > 0 && !this.gameOver)
      this.musicAudio.play();

    this.music = !this.music;
    localStorage.setItem(this.musicLocalStorageKey, String(this.music));
  }

  soundToggleClick() {
    this.sound = !this.sound;
    localStorage.setItem(this.soundLocalStorageKey, String(this.sound));
  }

  //game setup
  initGame() {
    this.currentLevel = 0;
    this.levels = [this.generateLevel(this.currentLevel + 1)];
    this.levelTime = new Date();
    this.timer = undefined;
    this.gameOver = false;
    this.points = 0;
    this.previousRecord = this.getBestPoints();
    this.symbols = JSON.parse(JSON.stringify(this.startSymbolsPool));
    this.symbolsAdditional = JSON.parse(JSON.stringify(this.additionalSymbolsPool));
  }

  symbols: string[] = JSON.parse(JSON.stringify(this.startSymbolsPool));
  symbolsAdditional: string[] = JSON.parse(JSON.stringify(this.additionalSymbolsPool));

  randomSymbol(): number {
    return Math.floor(Math.random() * (this.symbols.length));
  }

  randomSymbolFromOrigin(origin: number): number {
    return this.applyModuloSymbol(origin + Math.round(Math.random() * (this.symbols.length - 2) + 1));
  }

  applyModuloSymbol(val: number): number {
    return (val % this.symbols.length)
  }

  getColorPosition(color: string): number {
    return this.colors.findIndex(c => c === color);
  }

  randomColor(): number {
    return Math.floor(Math.random() * (this.colors.length - 1));
  }

  randomColorFromOrigin(origin: number): number {
    return this.applyModuloColor(origin + Math.round(Math.random() * (this.colors.length - 2) + 1));
  }

  applyModuloColor(val: number): number {
    return (val % this.colors.length)
  }

  //tutorial
  showTutorial: boolean = false;
  tutorialComplete: boolean = true;
  tutorialModel: number = this.randomSymbol();
  tutorials: Box[] = this.generateTutorials();

  generateTutorials(): Box[] {
    let boxes: Box[] = [];
    for (let i = 0; i < this.boxPerLevel; i++) {
      boxes.push({
        symbol: this.randomSymbolFromOrigin(this.tutorialModel),
        color: this.randomColor(),
        rotate: 0
      });
    }
    return boxes;
  }

  tutorialToggleClick() {
    this.showTutorial = !this.showTutorial;
    this.tutorialComplete = !this.showTutorial;

    if (this.showTutorial) {
      this.initGame();
      this.musicAudio.pause();
    }
  }

  tutorialEndClick() {
    if (this.isTutorialComplete()) {
      this.tutorialComplete = true;
    }
  }

  tutorialBoxClick(box: Box) {
    if (!this.tutorialComplete) {
      box.symbol = this.applyModuloSymbol(box.symbol + 1);
      box.color = this.randomColorFromOrigin(box.color);
      box.rotate = Math.random();
    }
  }

  isTutorialComplete(): boolean {
    for (const box of this.tutorials) {
      if (box.symbol != this.tutorialModel)
        return false;
    }
    return true;
  }

  //levels
  currentLevel: number = 0;
  levels: Level[] = [this.generateLevel(this.currentLevel + 1)];

  levelTime: Date = new Date();
  timer: Observable<number> | undefined;
  gameOver: boolean = false;
  points: number = 0;
  previousRecord: number = this.getBestPoints();

  startGameClick() {
    if (this.tutorialComplete) {
      if (this.sound)
        this.levelAudio.play();
      if (this.music)
        this.musicAudio.play();

      this.fillLevel(this.currentLevel + 1);
      this.currentLevel++;
      this.startTimer();

      this.anonymousUser();
    }
  }

  restartGameClick() {
    this.initGame();

    this.showTutorial = false;
    this.showSettings = false;

    const element = document.querySelector('#title');
    if (element)
      element.scrollIntoView();
  }

  startTimer() {
    let date = new Date();
    date.setSeconds(date.getSeconds() + this.timePerLevel);
    this.levelTime = date;

    let level = this.getLevel(this.currentLevel);
    if (level)
      level.endTime = date;

    this.timer = interval(30).pipe(
      map((timer) => {
        let remaining = this.levelTime.getTime() - Date.now();
        if (remaining < 0) {
          this.timeIsUp();
          return 0;
        }
        return remaining;
      })
    );
  }

  timeIsUp() {
    this.gameOver = true;
    if (this.sound)
      this.overAudio.play();
    this.musicAudio.pause();

    this.persistScore(this.currentLevel, this.getPoints());
  }

  getPoints(): number {
    let points = 150 * (this.currentLevel - 1);
    for (let i = 0; i < this.currentLevel; i++) {
      let level = this.levels[i];
      points += level.points;
    }

    return points;
  }

  shareContent(level: number, points: number): any {
    return {
      level: level,
      points: points
    }
  }

  getLevel(num: number): Level {
    let level = this.levels.at(num - 1);
    if (level)
      return level;
    return this.generateLevel(num);
  }

  generateLevel(num: number): Level {
    return {
      num: num,
      completed: false,
      model: -1,
      boxes: this.generateEmptyBoxes(),
      endTime: new Date(),
      points: 0,
      symbol: -1
    };
  }

  fillLevel(num: number) {
    let level = this.getLevel(num);
    if (level) {
      let symbol: number = -1;
      if (level.num % this.levelsForNewSymbols == 0) {
        if (this.symbols.length == 6) {
          this.symbols = this.symbols.sort(() => Math.random() - 0.5);
          let remove = this.symbols.pop();

          this.symbolsAdditional = this.symbolsAdditional.sort(() => Math.random() - 0.5);
          let add = this.symbolsAdditional.pop();

          if (add && remove) {
            this.symbols.push(add);
            this.symbolsAdditional.push(remove);
          }
        } else {
          this.symbolsAdditional = this.symbolsAdditional.sort(() => Math.random() - 0.5);
          let add = this.symbolsAdditional.pop();
          if (add)
            this.symbols.push(add);
        }
        symbol = this.symbols.length - 1;
      }

      level.model = this.randomSymbol();
      level.symbol = symbol;

      for (const box of level.boxes) {
        box.symbol = this.randomSymbolFromOrigin(level.model);
        box.color = this.randomColor();
        if (level.num >= this.levelForRotation)
          box.rotate = Math.random();
      }
    }
  }

  generateEmptyBoxes(): Box[] {
    let symbols: Box[] = [];
    const n = this.boxPerLevel;
    for (let i = 0; i < n; i++) {
      symbols.push({
        symbol: -1,
        color: -1,
        rotate: 0
      });
    }
    return symbols;
  }

  boxClick(level: Level, box: Box) {
    if (level.num == this.currentLevel && !this.gameOver) {
      if (this.sound)
        this.hitAudio.play();

      box.symbol = this.applyModuloSymbol(box.symbol + 1);
      box.color = this.randomColorFromOrigin(box.color);
      if (level.num >= this.levelForRotation)
        box.rotate = Math.random();
    }
  }

  isLevelComplete(num: number): boolean {
    let level = this.getLevel(num);
    if (level) {
      for (const box of level.boxes) {
        if (box.symbol != level.model)
          return false;
      }
      return true;
    }
    return false;
  }

  levelEndClick(num: number) {
    if (this.isLevelComplete(num)) {
      let level = this.getLevel(num);
      if (level) {
        if (this.sound)
          this.levelAudio.play();

        let timeRemaining: number = level.endTime.getTime() - new Date().getTime();
        if (timeRemaining > 0)
          level.points = Math.ceil(timeRemaining / 100); //10 points per second left

        level.completed = true;

        this.fillLevel(num + 1);
        this.currentLevel++;
        this.startTimer();
      }
    }
  }

  onScroll() {
    if (!this.gameOver) {
      this.levels.push(this.generateLevel(this.levels.length + 1));
    }
  }
}

interface Level {
  num: number;
  completed: boolean;
  model: number;
  boxes: Box[];
  endTime: Date;
  points: number;
  symbol: number;
}

interface Box {
  symbol: number;
  color: number;
  rotate: number;
}
