import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

window.onbeforeunload = function() {window.scrollTo(0,0);}


const firebaseConfig = {
  apiKey: "AIzaSyBqyJXvncDK3ZmaJC2xw4tKzEDg8WHyQdU",
  authDomain: "doomscroll.xyz",
  databaseURL: "https://doomscroll-efa6f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "doomscroll-efa6f",
  storageBucket: "doomscroll-efa6f.appspot.com",
  messagingSenderId: "501882648257",
  appId: "1:501882648257:web:707dcf1320ec2cef76c640",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const auth = getAuth(app);
