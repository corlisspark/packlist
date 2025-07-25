import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value;

  await addDoc(collection(db, "posts"), { title, price, location, description });
  alert("Post submitted!");
  window.location.href = "index.html";
});
