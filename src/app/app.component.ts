import {Component} from '@angular/core';
import {interval, map, Observable} from "rxjs";
import {TranslateService} from "@ngx-translate/core";
import {getAuth, signInAnonymously, onAuthStateChanged} from "firebase/auth";
import {Auth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, linkWithRedirect} from "@firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  UpdateData,
  DocumentData,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer
} from "firebase/firestore";

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

  //pre-load images
  images = [
    "../assets/background/model.png",
    "../assets/background/symbol.png",
    "../assets/menu/english.png",
    "../assets/menu/french.png",
    "../assets/menu/google.webp",
    "../assets/menu/music.png",
    "../assets/menu/music-off.png",
    "../assets/menu/sound.png",
    "../assets/menu/sound-off.png",
    "../assets/menu/tutorial.png",
    "../assets/menu/start.png",
    "../assets/menu/restart.png",
    "../assets/menu/skull-red.png",
    "../assets/menu/skull-green.png",
    "../assets/menu/settings.png",
    "../assets/menu/timer.png",
    "../assets/menu/ranking.png",
    "../assets/menu/medal-gold.png",
    "../assets/menu/medal-silver.png",
    "../assets/menu/medal-bronze.png",
    "../assets/menu/rank-1.png",
    "../assets/menu/rank-2.png",
    "../assets/menu/rank-3.png"];

  constructor(translate: TranslateService) {
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

        this.getScore(user.uid);
      }
    });
    //this is to handle link to existing account
    getRedirectResult(this.auth)
      .then((credential) => {
        if (credential) {
          let name: string | null = credential.user.providerData[0].displayName;
          if (name != null)
            this.updateName(credential.user.uid, name);
        }
      })
      .catch((error) => {
        if (error.toString().includes("auth/credential-already-in-use")) {
          localStorage.removeItem(this.recordPointsStorageKey);
          localStorage.removeItem(this.recordLevelStorageKey);
          localStorage.removeItem(this.recordDateStorageKey);
          this.googleAuthClick(true);
        }
      });

    //audio
    this.musicAudio.load();
    this.levelAudio.load();
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
  db = getFirestore();
  recordLevelStorageKey: string = "record_level";
  recordPointsStorageKey: string = "record_points";
  recordDateStorageKey: string = "record_date";
  rankingStorageKey: string = "ranking";
  top10StorageKey: string = "top10";

  getScore(userId: string) {
    let points: string | null = localStorage.getItem(this.recordPointsStorageKey);
    if (points == null) {

      let ref = doc(this.db, "users", userId);
      getDoc(ref)
        .then((snapshot) => {
          if (snapshot.exists()) {
            localStorage.setItem(this.recordPointsStorageKey, snapshot.data()['points']);
            localStorage.setItem(this.recordLevelStorageKey, snapshot.data()['level']);
            localStorage.setItem(this.recordDateStorageKey, snapshot.data()['date']);

            if (this.displayName != null && snapshot.data()['name'] != this.displayName) {
              const data: UpdateData<any> = {name: this.displayName};
              updateDoc(ref, data)
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

  updateName(userId: string, name: string) {
    let ref = doc(this.db, "users", userId);
    const data: UpdateData<any> = {name: this.displayName};
    updateDoc(ref, data)
      .catch((error) => {
        console.error(error);
      });
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

  getBestDate(): number {
    let recordStorage: string | null = localStorage.getItem(this.recordDateStorageKey);
    let record: number = 0;
    if (recordStorage != null)
      record = +recordStorage;

    return record;
  }

  getRanking(): number {
    let recordStorage: string | null = localStorage.getItem(this.rankingStorageKey);
    let record: number = 0;
    if (recordStorage != null)
      record = +recordStorage;

    return record;
  }

  getTop10(): Rank[] {
    let top10: string | null = localStorage.getItem(this.top10StorageKey);
    if (top10 == null)
      return [];
    else
      return JSON.parse(top10);
  }

  persistScore(level: number, points: number) {
    let recordPointsStorage: string | null = localStorage.getItem(this.recordPointsStorageKey);
    let recordPoints: number = 0;
    if (recordPointsStorage != null)
      recordPoints = +recordPointsStorage;

    if (points > recordPoints) {
      let date: number = Date.now();
      localStorage.setItem(this.recordPointsStorageKey, "" + points);
      localStorage.setItem(this.recordLevelStorageKey, "" + level);
      localStorage.setItem(this.recordDateStorageKey, "" + date);

      let name: string = "Anonymous";
      if (this.displayName != null)
        name = this.displayName;

      const docData: DocumentData = {
        name: name,
        level: level,
        points: points,
        date: date,
      };
      setDoc(doc(this.db, "users", <string>this.auth.currentUser?.uid), docData)
        .catch((error) => {
          console.error(error);
        }).catch((error) => console.log(error));
    }
  }

  //ranking
  showRanking: boolean = false;
  rankInProgress: boolean = false;
  top10InProgress: boolean = false;

  rankingToggleClick() {
    if (!this.showRanking) {

      //get rank
      if (this.getBestPoints() > 0) {
        this.rankInProgress = true;

        const queryRankMore = query(
          collection(this.db, "users"),
          where("points", ">", this.getBestPoints()));
        getCountFromServer(queryRankMore)
          .then((snapshot) => {
            let more: number = snapshot.data().count;

            const queryRankEquals = query(
              collection(this.db, "users"),
              where("points", "==", this.getBestPoints()),
              where("date", "<", this.getBestDate()));
            getCountFromServer(queryRankEquals)
              .then((snapshot) => {
                let equals: number = snapshot.data().count;
                let rank: number = more + equals + 1; //+1 because rank of the player
                localStorage.setItem(this.rankingStorageKey, "" + rank);
                this.rankInProgress = false;
              })
              .catch((error) => console.log(error));
          })
          .catch((error) => console.log(error));
      }

      //get top10
      this.top10InProgress = true;

      const queryTop10 = query(
        collection(this.db, "users"),
        orderBy("points", "desc"),
        orderBy("date", "asc"),
        limit(10));
      getDocs(queryTop10)
        .then((snapshot) => {
          let top10: Rank[] = [];
          let i: number = 0;
          snapshot.forEach((doc) => {
            top10.push({
              rank: ++i,
              name: doc.data()['name'],
              level: doc.data()['level'],
              points: doc.data()['points'],
              date: doc.data()['date'],
            });
          });
          localStorage.setItem(this.top10StorageKey, JSON.stringify(top10));
          this.top10InProgress = false;
        })
        .catch((error) => console.log(error));

      this.showRanking = true;
    } else
      this.showRanking = false;
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

  //audio
  //https://www.filippovicarelli.com/8bit-game-background-music
  musicAudio = new Audio("../assets/audio/sacrifice.wav");
  levelAudio = new Audio("../assets/audio/explosion.wav");
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

  refresh(): void {
    window.location.reload();
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
      if (this.sound){
        let hit = new Audio("../assets/audio/hit.wav");
        hit.play();
      }

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
        // if (this.symbols.length == 6) {
        //   this.symbols = this.symbols.sort(() => Math.random() - 0.5);
        //   let remove = this.symbols.pop();
        //
        //   this.symbolsAdditional = this.symbolsAdditional.sort(() => Math.random() - 0.5);
        //   let add = this.symbolsAdditional.pop();
        //
        //   if (add && remove) {
        //     this.symbols.push(add);
        //     this.symbolsAdditional.push(remove);
        //   }
        // } else {
        this.symbolsAdditional = this.symbolsAdditional.sort(() => Math.random() - 0.5);
        let add = this.symbolsAdditional.pop();
        if (add)
          this.symbols.push(add);
        // }
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
      if (this.sound){
        let hit = new Audio("../assets/audio/hit.wav");
        hit.play();
      }

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

interface Rank {
  rank: number;
  name: string;
  level: number;
  points: number;
  date: number;
}
