import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore/lite';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

window.onbeforeunload = function() {window.scrollTo(0,0);}

const firebaseConfig = {
  apiKey: "AIzaSyBqyJXvncDK3ZmaJC2xw4tKzEDg8WHyQdU",
  authDomain: "play.doomscroll.xyz",
  projectId: "doomscroll-efa6f",
  storageBucket: "doomscroll-efa6f.appspot.com",
  messagingSenderId: "501882648257",
  appId: "1:501882648257:web:707dcf1320ec2cef76c640",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getFirestore(app);
const auth = getAuth(app);
