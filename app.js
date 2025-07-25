import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDz6LLkJ-eNIfB-fdLzvjp6UUXEHtTsnUM",
  authDomain: "cw55hf8nvt.firebaseapp.com",
  projectId: "cw55hf8nvt",
  storageBucket: "cw55hf8nvt.appspot.com",
  messagingSenderId: "535503702954",
  appId: "1:535503702954:web:bc505ed998e875168e79d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postList = document.getElementById("post-list");
const locationList = document.getElementById("location-list");
const cityMap = new Map();

const querySnapshot = await getDocs(collection(db, "posts"));
querySnapshot.forEach((doc) => {
  const data = doc.data();
  const div = document.createElement("div");
  div.innerHTML = `<a href="post.html?id=${doc.id}">${data.title} - $${data.price} (${data.location})</a>`;
  postList.appendChild(div);

  // Build city map
  if (data.location) {
    cityMap.set(data.location, true);
  }
});

// Populate location list
cityMap.forEach((_, city) => {
  const li = document.createElement("li");
  li.innerHTML = `<a href="#">${city}</a>`;
  locationList.appendChild(li);
});
