import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 850,
  });

  win.loadFile("dist/index.html");
}

app.whenReady().then(createWindow);
