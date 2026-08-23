# स्वरAJ Music Website

Professional responsive music website for desktop and mobile.

## Project structure

```text
swaraj/
├── index.html
├── styles.css
├── script.js
├── server.js
├── package.json
├── render.yaml
├── images/
│   └── default-cover.svg
└── songs/
    ├── Love/
    ├── Bhakti/
    ├── Energetic/
    └── Emotional/
```

## Add 100+ songs

Put your legally owned/licensed MP3 files into `songs/`.

Example:

```text
songs/Bhakti/Jai Ganesh Jai Ganesh.mp3
songs/Love/Tere Bin Adhura.mp3
songs/Energetic/Dance Song.mp3
songs/Emotional/Dil Ke Raste.mp3
```

The server scans the folder automatically. No song list needs to be hardcoded.

Folder names become categories. If an MP3 is directly inside `songs/`, the server also tries to infer a category from its filename.

## Local run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

Songs API:

```text
http://localhost:3000/api/songs
```

Categories API:

```text
http://localhost:3000/api/categories
```

## Render

Create a Web Service from the GitHub repository.

Build Command:
```text
npm install
```

Start Command:
```text
node server.js
```

No PORT environment variable is required; Render supplies it automatically.

### Important for 100+ songs

If your MP3 files are stored in GitHub, they are deployed with the project. Do not put copyrighted/commercial music in the repository unless you have permission.

For a large library, use a persistent object/file-storage solution later instead of relying on Git alone.
