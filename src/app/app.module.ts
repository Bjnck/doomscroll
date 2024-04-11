import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {ShareButtonsModule} from "ngx-sharebuttons/buttons";
import {ShareIconsModule} from "ngx-sharebuttons/icons";

@NgModule({
  declarations: [
    AppComponent
  ],
    imports: [
        BrowserModule, InfiniteScrollModule, ShareButtonsModule, ShareIconsModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
