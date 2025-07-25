import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDz6LLkJ-eNIfB-fdLzvjp6UUXEHtTsnUM",
  authDomain: "cw55hf8nvt.firebaseapp.com",
  projectId: "cw55hf8nvt",
  storageBucket: "cw55hf8nvt.appspot.com",
  messagingSenderId: "535503702954",
  appId: "1:535503702954:web:bc505ed998e875168e79d3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

const postRef = doc(db, "posts", postId);
const postSnap = await getDoc(postRef);

if (postSnap.exists()) {
  const data = postSnap.data();
  document.getElementById("post").innerHTML = `
    <h2>${data.title}</h2>
    <p><strong>Price:</strong> $${data.price}</p>
    <p><strong>Location:</strong> ${data.location}</p>
    <p>${data.description}</p>
  `;

  if (data.lat && data.lng) {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: data.lat, lng: data.lng },
      zoom: 12,
      disableDefaultUI: true,
    });
    new google.maps.Marker({ position: { lat: data.lat, lng: data.lng }, map });
  }
} else {
  document.getElementById("post").textContent = "Post not found.";
}
