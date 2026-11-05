// Entry point: the first file that runs. It puts the React app into the page.
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css"; // all styling for the app

// index.html has <div id="app">; React draws the whole app inside it.
createRoot(document.getElementById("app")).render(<App />);
