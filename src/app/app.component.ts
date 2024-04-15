import {Component} from '@angular/core';
import {interval, map, Observable} from "rxjs";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = "Dᛜᛜmᛇcrᛜᛂᛂ";

  boxPerLevel: number = 5;
  timePerLevel: number = 15;
  levelsForNewSymbols: number = 3;
  levelForRotation: number = 20;

  translate: TranslateService;
  language: string = "en";
  supportedLanguages: string[] = ["en", "fr"];

  //https://symbl.cc/en/collections/simvoli-vk/
  symbols: string[] = ["ᛄ", "ᛇ", "ᛂ"];
  symbolsAdditional: string[] = ["ᛚ", "ᛢ", "ᛮ", "ᛛ", "ᚾ", "ᛀ", "ᛁ", "ᛃ", "ᛑ", "ᛙ", "ᛜ",];

  colors: string[] = ["green", "red", "blue", "purple", "cyan", "orange"];

  constructor(translate: TranslateService) {
    this.translate = translate;
    let language: string = navigator.language.slice(0, 2);
    if (this.supportedLanguages.findIndex(l => l === language) > 0) {
      this.language = language;
      translate.use(this.language);
    }

    //  todo init symbols and levels (copy restart strategy) + scroll back to top
  }

  languageClick() {
    let index = this.supportedLanguages.findIndex(l => l === this.language);
    let language = this.supportedLanguages.at((index + 1) % (this.supportedLanguages.length));
    if (language) {
      this.language = language;
      this.translate.use(this.language);
    }
  }

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

  startGameClick() {
    if (this.tutorialComplete) {
      this.fillLevel(this.currentLevel + 1);
      this.currentLevel++;
      this.startTimer();
    }
  }

  restartGameClick() {
    this.currentLevel = 0;
    this.levels = [this.generateLevel(this.currentLevel + 1)];
    this.levelTime = new Date();
    this.timer = undefined;
    this.gameOver = false;
    this.points = 0;

    this.symbols = ["ᛄ", "ᛇ", "ᛂ"];
    this.symbolsAdditional = ["ᛚ", "ᛢ", "ᛮ", "ᛛ", "ᚾ", "ᛀ", "ᛁ", "ᛃ", "ᛑ", "ᛙ", "ᛜ",];

    const element = document.querySelector('#start');
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
  }

  getPoints(): number {
    let points = 100 * (this.currentLevel - 1);
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
