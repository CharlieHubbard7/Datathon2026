# 🌍 3D Globe Severity Heatmap

An interactive 3D globe visualization that displays global severity data as a heatmap overlaid on a rotating, zoomable Earth with country boundaries.

This project renders a realistic globe using web-based 3D graphics and overlays:

* **Country outlines** mapped accurately to the globe surface
* **Severity heatmap data** visualized geographically
* **Interactive controls** for rotation and zoom

---

## ✨ Features

* 🌐 **3D Interactive Globe** (rotate, pan, zoom)
* 🗺️ **Accurate Country Borders** rendered from GeoJSON data
* 🔥 **Severity Heatmap Overlay** mapped to latitude/longitude
* 🎨 Clean visual layering (heatmap + country outlines)
* ⚡ WebGL-powered performance using modern JS libraries

---

## 🛠️ Tech Stack

* **Three.js** – 3D rendering and scene management
* **GeoJSON** – Country boundary data
* **JavaScript / HTML / CSS** – Core application logic and UI
* *(Optional)* D3.js – For geographic projections and data mapping

---

## 📸 Preview

> *(Add screenshots or a demo GIF here to showcase the globe and heatmap)*

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v16+ recommended)
* A modern web browser with WebGL support

### Installation

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
npm install
```

### Run Locally

```bash
npm run dev
```

Then open your browser at:

```
http://localhost:3000
```

---

## 🗺️ How Country Borders Are Rendered

* Country boundary data is loaded from a **GeoJSON world dataset**
* Coordinates are converted from latitude/longitude to spherical positions
* Borders are drawn as thin line geometries slightly above the globe surface
* Lines are rendered subtly to avoid obscuring the heatmap

---

## 🔥 Heatmap Data

* Severity values are mapped to geographic coordinates
* Data is visualized using color intensity on the globe surface
* Supports dynamic or real-time data updates

You can modify the heatmap source in:

```
/src/data/
```

---

## 📁 Project Structure

```
├── public/
│   └── assets/
│       └── geojson/
│           └── countries.geojson
├── src/
│   ├── globe/
│   │   ├── Globe.js
│   │   ├── HeatmapLayer.js
│   │   └── CountryOutlines.js
│   ├── data/
│   └── index.js
├── package.json
└── README.md
```

---

## 🧩 Customization

* Adjust globe radius, colors, or lighting in `Globe.js`
* Change border thickness or color in `CountryOutlines.js`
* Plug in new datasets to visualize different metrics globally

---

## 🧠 Future Improvements

* Tooltips on hover (country name + severity)
* Time-based animations for severity changes
* Mobile performance optimizations
* Texture-based map rendering

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙌 Acknowledgments

* Natural Earth & GeoJSON contributors
* Three.js community
* Open-source data visualization tools

---

Built with curiosity, caffeine, and a love for maps 🌎
