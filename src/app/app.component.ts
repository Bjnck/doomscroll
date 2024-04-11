import {Component} from '@angular/core';
import {interval, map, Observable} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = "Dᛜᛜmᛇcrᛜᛂᛂ";

  boxPerLevel: number = 5;
  timePerLevel: number = 10;

  //https://symbl.cc/en/collections/simvoli-vk/
  symbols: string[] = ["ᛄ", "ᛇ", "ᛂ"];
  symbolsAdditional: string[] = ["ᛚ", "ᛢ", "ᛮ", "ᛛ", "ᚾ", "ᛀ", "ᛁ", "ᛃ", "ᛑ", "ᛙ", "ᛜ",];

  colors: string[] = ["green", "red", "blue", "purple", "cyan", "orange"];

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
        color: this.randomColor()
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
  clickCount: number = 0;

  startGameClick() {
    if (this.tutorialComplete) {
      this.fillBoxes();
      this.currentLevel++;
      this.startTimer(0);
    }
  }

  restartGameClick() {
    this.currentLevel = 0;
    this.levels = [this.generateLevel(this.currentLevel + 1)];
    this.levelTime = new Date();
    this.timer = undefined;
    this.gameOver = false;
    this.clickCount = 0;

    const element = document.querySelector('#start');
    if (element)
      element.scrollIntoView();
  }

  startTimer(previousLevelRemaining: number) {
    let date = new Date();
    date.setSeconds(date.getSeconds() + this.timePerLevel + previousLevelRemaining);
    this.levelTime = date;

    let level = this.getCurrentLevel();
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

  getCurrentLevel(): Level | undefined {
    return this.levels.at(this.currentLevel - 1);
  }

  getNextLevel(): Level | undefined {
    return this.levels.at(this.currentLevel);
  }

  generateLevel(num: number): Level {
    return {
      num: num,
      completed: false,
      model: this.randomSymbol(),
      boxes: this.generateEmptyBoxes(),
      endTime: new Date(),
      timeRemaining: 0
    };
  }

  generateEmptyBoxes(): Box[] {
    let symbols: Box[] = [];
    const n = this.boxPerLevel;
    for (let i = 0; i < n; i++) {
      symbols.push({
        symbol: -1,
        color: -1
      });
    }
    return symbols;
  }

  fillBoxes() {
    let level = this.getNextLevel();
    if (level) {
      for (const box of level.boxes) {
        box.symbol = this.randomSymbolFromOrigin(level.model);
        box.color = this.randomColor();
      }
    }
  }

  boxClick(level: Level, box: Box) {
    if (level.num == this.currentLevel && !this.gameOver) {
      this.clickCount++;
      box.symbol = this.applyModuloSymbol(box.symbol + 1);
      box.color = this.randomColorFromOrigin(box.color);
    }
  }

  isLevelComplete(): boolean {
    let level = this.getCurrentLevel();
    if (level) {
      for (const box of level.boxes) {
        if (box.symbol != level.model)
          return false;
      }
      return true;
    }
    return false;
  }

  levelEndClick() {
    if (this.isLevelComplete()) {
      let level = this.getCurrentLevel();
      if (level) {
        this.clickCount++;
        level.completed = true;
        this.fillBoxes();
        this.currentLevel++;

        let timeRemaining: number = level.endTime.getTime() - new Date().getTime();
        if (timeRemaining > 0)
          level.timeRemaining = Math.ceil(timeRemaining / 1000);

        this.startTimer(level.timeRemaining);
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
  timeRemaining: number
}

interface Box {
  symbol: number;
  color: number;
}
