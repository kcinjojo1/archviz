const viewer = document.getElementById("viewer");
const home = document.getElementById("home");
const tourInfo = document.getElementById("tour-info");
let historyStack = [];
let scene,
  camera,
  renderer,
  sphere,
  hotspots = [];
let currentImageIndex = 0;
let isTourPlaying = false;
let lon = 0,
  lat = 0,
  phi = 0,
  theta = 0;
let isUserInteracting = false;
let lastMouseX = 0,
  lastMouseY = 0;

const images = [
  {
    url: "/static/images/DJI_0633.JPG",
    hotspots: [],
    title: "CN TOWER",
  },
  {
    url: "/static/images/img.jpg",
    hotspots: [],
    title: "Downtown Hamilton View",
  },
  {
    url: "/static/images/img2.jpg",
    hotspots: [],
    title: "Billy Bishop Airport",
  },
  {
    url: "/static/images/fort_york.jpg",
    hotspots: [],
    title: "Fort York"
  },  
];

const hotspotData = [
  {
    id: 1,
    name: "CN Tower",
    category: "landmarks",
    lon: 267,
    lat: 14,
    imageIndex: 0,
    info: "Click to view Downtown Hamilton up close.",
    targetImageIndex: 1,
    targetLon: 75,
    targetLat: 15,
  },
  {
    id: 2,
    name: "Billy Bishop Airport",
    category: "landmarks",
    lon: 210,
    lat: 8,
    imageIndex: 0,
    info: "Click to view Billy Bishop Airport.",
    targetImageIndex: 2,
    targetLon: 0,
    targetLat: 0,
  },
  {
    id: 3,
    name: "Fort York",
    category: "heritage",
    lon: 217,      // 👈 You can adjust this to place the hotspot visually
    lat: -15,       // 👈 You can tweak this too
    imageIndex: 0, // Assuming it's placed in the same view as CN Tower
    info: "Fort York is an early‑19th‑century military fortification in Toronto, featuring stone‑lined earthworks and eight historic buildings, part of the Fort York National Historic Site.",
    targetImageIndex: 3, // index in images array
    targetLon: 0,
    targetLat: 0,
  },  
  {
    id: 4,
    name: "Greenwood Residence",
    category: "heritage",  // or use "landmarks", "nature", etc. based on your filter toggle
    lon: 198,
    lat: -1,
    imageIndex: 0, // Assuming this pointer appears on CN Tower scene
    info: "Greenwood Residence offers eco-friendly living with solar panels, rainwater harvesting, and energy-efficient architecture for sustainable urban life.",
    targetImageIndex: 3, // Navigate to fort_york.jpg
    targetLon: 0,
    targetLat: 0,
  },
  {
    id: 5,
    name: "EcoView Towers",
    category: "heritage",
    lon: 187,
    lat: -6,
    imageIndex: 0,
    info: "EcoView Towers leads the way in sustainable high-rise living, with smart HVAC, green rooftops, and reduced carbon emissions for a healthier future.",
    targetImageIndex: 3,
    targetLon: 0,
    targetLat: 0,
  },
  {
    id: 6,
    name: "Verdant Heights",
    category: "heritage",
    lon: 153,
    lat: -9,
    imageIndex: 0,
    info: "Verdant Heights blends luxury with sustainability—solar panels, water recycling, and energy-efficient design make it the smart choice for future-focused homeowners.",
    targetImageIndex: 3,
    targetLon: 15,
    targetLat: 5,
  },
  {
    id: 7,
    name: "Solaris Plaza",
    category: "heritage",
    lon: 140,
    lat: -2,
    imageIndex: 0,
    info: "Solaris Plaza offers next-gen commercial spaces with green certification, passive cooling, and unbeatable utility savings—an ideal space for eco-conscious businesses.",
    targetImageIndex: 3,
    targetLon: -10,
    targetLat: -5,
  },
  {
    id: 8,
    name: "Aurora Residences",
    category: "heritage",
    lon: 128,
    lat: -4,
    imageIndex: 0,
    info: "Aurora Residences redefine modern living with green walls, smart lighting, and rainwater harvesting—designed for buyers who value both comfort and the planet.",
    targetImageIndex: 3,
    targetLon: 25,
    targetLat: 10,
  },    
];

// Inject hotspots into corresponding image objects
hotspotData.forEach((hotspot) => {
  images[hotspot.imageIndex].hotspots.push(hotspot);
});

function updateCompass() {
  const compassNeedle = document.querySelector('.compass-needle');
  if (compassNeedle) {
    // Convert longitude to compass rotation
    // lon = 0 should point North, so we need to rotate accordingly
    const rotation = -lon; // Negative because compass rotates opposite to camera
    compassNeedle.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }
}

function initViewer() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  viewer.appendChild(renderer.domElement);

  loadCurrentImage();

  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, 1);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mouseleave", onMouseUp);
  renderer.domElement.addEventListener("wheel", onMouseWheel);

  renderer.domElement.addEventListener("touchstart", onTouchStart);
  renderer.domElement.addEventListener("touchmove", onTouchMove);
  renderer.domElement.addEventListener("touchend", onTouchEnd);

  tourInfo.style.display = "block";
  setTimeout(() => {
    tourInfo.style.display = "none";
  }, 5000);

  updateHotspots();
  updateCompass();
  animate();
}

function loadCurrentImage() {
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    images[currentImageIndex].url,
    (texture) => {
      const material = new THREE.MeshBasicMaterial({ map: texture });
      if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      console.log(`Loaded: ${images[currentImageIndex].title}`);
    },
    undefined,
    (error) => {
      console.error("Error loading texture:", error);
      const material = new THREE.MeshBasicMaterial({ color: 0x4a90e2 });
      if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
    }
  );
}

function updateHotspots() {
  hotspots.forEach((h) => {
    scene.remove(h.object);
    if (h.element) h.element.remove();
  });
  hotspots = [];

  const filters = {
    landmarks: document.getElementById("landmarks")?.checked ?? true,
    nature: document.getElementById("nature")?.checked ?? true,
    heritage: document.getElementById("heritage")?.checked ?? true,
    waterfront: document.getElementById("waterfront")?.checked ?? true,
  };

  images[currentImageIndex].hotspots.forEach((hotspot) => {
    if (filters[hotspot.category] && hotspot.imageIndex === currentImageIndex) {
      const hotspotObj = createHotspot(hotspot);
      hotspots.push(hotspotObj);
    }
  });
}

function createHotspot(hotspot) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(20, 20, 1);

  const radius = 499;
  const phi = THREE.MathUtils.degToRad(90 - hotspot.lat);
  const theta = THREE.MathUtils.degToRad(hotspot.lon);
  sprite.position.setFromSphericalCoords(radius, phi, theta);

  scene.add(sprite);

  const specialTooltip = (
    hotspot.name === "Fork Yort" ||
    hotspot.name === "EcoTowers" ||
    hotspot.name === "Greenwoods"
  );

  const tooltipClass = specialTooltip ? "tooltip special-tooltip" : "tooltip";

  const hotspotUI = document.createElement("div");
  hotspotUI.className = "hotspot-ui-container";
  hotspotUI.innerHTML = `
    <div class="hotspot-icon top-left" data-type="notes">
      <div class="icon-circle">📎</div>
      <div class="tooltip tooltip-above">Buy ${hotspot.name} Tickets</div>
    </div>
    <div class="hotspot-icon top-right" data-type="documents">
      <div class="icon-circle">📄</div>
      <div class="tooltip tooltip-above">View ${hotspot.name} Brochure (PDF)</div>
    </div>
    <div class="hotspot-icon bottom-left ${hotspot.info ? "has-info" : ""}" data-type="photos">
      <div class="icon-circle">🖼️</div>
      <div class="${tooltipClass}">
        ${hotspot.info ? hotspot.info : `${hotspot.name} Description & Images`}
      </div>
    </div>
    <div class="hotspot-icon bottom-right" data-type="multimedia">
      <div class="icon-circle">▶️</div>
      <div class="tooltip">Watch ${hotspot.name} Introduction Video</div>
    </div>
    <div class="central-arrow" data-type="navigate">
      <div class="arrow-shape">
        <div class="arrow-text">${hotspot.name.split(" ").join("<br/>")}</div>
        <div class="arrow-pointer"></div>
      </div>
    </div>
  `;

  document.body.appendChild(hotspotUI);

  hotspotUI.querySelectorAll("[data-type]").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = icon.getAttribute("data-type");
      handleHotspotIconClick(type, hotspot);
    });
  });


  // Position update function
  function updateHotspotUIPosition() {
    const vector = sprite.position.clone();
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    hotspotUI.style.left = x + "px";
    hotspotUI.style.top = y + "px";
    hotspotUI.style.display = vector.z < 1 ? "block" : "none";
  }

  return {
    object: sprite,
    data: hotspot,
    element: hotspotUI,
    updatePosition: updateHotspotUIPosition,
  };
}

function handleHotspotIconClick(type, hotspot) {
  console.log(`Clicked ${type} icon for ${hotspot.name}`);

  switch (type) {
    case "notes":
      window.open("https://www.cntower.ca/buy-your-tickets-here", "_blank");
      break;

    case "documents":
      window.open("/static/docs/CN_Tower.pdf", "_blank");
      break;

    case "photos":
      alert("Photos feature - coming soon!");
      break;

    case "multimedia":
      window.open("https://youtu.be/7XmPxiYfzPE?si=hS_BUadvJPFi9Y82", "_blank");
      break;

    case "navigate":
      if (typeof hotspot.targetImageIndex !== "undefined") {
        historyStack.push(currentImageIndex);
        currentImageIndex = hotspot.targetImageIndex;
        lon = hotspot.targetLon ?? 0;
        lat = hotspot.targetLat ?? 0;
        loadCurrentImage();
        updateHotspots();
        updateCompass();
      }
      break;
  }
}

function onMouseDown(event) {
  event.preventDefault();
  isUserInteracting = true;
  isTourPlaying = false;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  renderer.domElement.style.cursor = "grabbing";
}

function onMouseMove(event) {
  if (!isUserInteracting) return;
  event.preventDefault();

  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;

  lon -= deltaX * 0.5;
  lat += deltaY * 0.5;
  lat = Math.max(-85, Math.min(85, lat));

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  
  updateCompass();
}

function onMouseUp(event) {
  event.preventDefault();
  isUserInteracting = false;
  renderer.domElement.style.cursor = "grab";
}

function onTouchStart(event) {
  event.preventDefault();
  if (event.touches.length === 1) {
    isUserInteracting = true;
    isTourPlaying = false;
    lastMouseX = event.touches[0].clientX;
    lastMouseY = event.touches[0].clientY;
  }
}

function onTouchMove(event) {
  if (!isUserInteracting || event.touches.length !== 1) return;
  event.preventDefault();

  const deltaX = event.touches[0].clientX - lastMouseX;
  const deltaY = event.touches[0].clientY - lastMouseY;

  lon -= deltaX * 0.5;
  lat += deltaY * 0.5;
  lat = Math.max(-85, Math.min(85, lat));

  lastMouseX = event.touches[0].clientX;
  lastMouseY = event.touches[0].clientY;
  
  updateCompass();
}

function onTouchEnd(event) {
  event.preventDefault();
  isUserInteracting = false;
}

function onMouseWheel(event) {
  event.preventDefault();
  camera.fov += event.deltaY * 0.05;
  camera.fov = THREE.MathUtils.clamp(camera.fov, 10, 75);
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);

  phi = THREE.MathUtils.degToRad(90 - lat);
  theta = THREE.MathUtils.degToRad(lon);
  camera.position.setFromSphericalCoords(1, phi, theta);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);

  // Update hotspot UI positions
  hotspots.forEach((h) => {
    if (h.updatePosition) {
      h.updatePosition();
    }
  });

  if (typeof TWEEN !== "undefined") {
    TWEEN.update();
  }
}

function changeImage(direction) {
  if (direction === -1 && historyStack.length > 0) {
    // Go back using history
    currentImageIndex = historyStack.pop();
  } else {
    // Default circular logic
    currentImageIndex =
      (currentImageIndex + direction + images.length) % images.length;
  }

  // ✅ Reset camera orientation if returning to image index 0
  if (currentImageIndex === 0) {
    lon = 0;
    lat = 0;
  }

  loadCurrentImage();
  updateHotspots();
  updateCompass();

  tourInfo.textContent = `Now viewing: ${images[currentImageIndex].title}`;
  tourInfo.style.display = "block";
  setTimeout(() => {
    tourInfo.style.display = "none";
  }, 3000);
}

function startTour() {
  console.log("Starting Hamilton Virtual Tour");
  home.style.display = "none";
  viewer.style.display = "block";
  initViewer();
}

function goHome() {
  home.style.display = "flex";
  viewer.style.display = "none";
  stopGuidedTour();

  if (renderer) {
    viewer.removeChild(renderer.domElement);
    renderer.dispose();
  }
  if (sphere) {
    sphere.geometry.dispose();
    sphere.material.dispose();
  }

  hotspots.forEach((h) => h.element.remove());
  hotspots = [];
  historyStack = [];
}

function playGuidedTour() {
  if (isTourPlaying) return;
  isTourPlaying = true;
  let index = 0;
  const tourHotspots = hotspotData.filter(
    (h) => h.imageIndex === currentImageIndex
  );

  if (tourHotspots.length === 0) {
    isTourPlaying = false;
    tourInfo.style.display = "none";
    return;
  }

  tourInfo.textContent = `Guided tour: ${tourHotspots.length} stops in ${images[currentImageIndex].title}`;
  tourInfo.style.display = "block";

  function nextHotspot() {
    if (!isTourPlaying || index >= tourHotspots.length) {
      isTourPlaying = false;
      tourInfo.style.display = "none";
      return;
    }

    const hotspot = tourHotspots[index];

    tourInfo.textContent = `Stop ${index + 1}/${tourHotspots.length}: ${
      hotspot.name
    }`;

    if (typeof TWEEN !== "undefined") {
      new TWEEN.Tween({ lon: lon, lat: lat })
        .to({ lon: hotspot.lon, lat: hotspot.lat }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ lon: newLon, lat: newLat }) => {
          lon = newLon;
          lat = newLat;
          updateCompass();
        })
        .onComplete(() => {
          setTimeout(() => {
            index++;
            nextHotspot();
          }, 3000);
        })
        .start();
    } else {
      setTimeout(() => {
        index++;
        nextHotspot();
      }, 3000);
    }
  }

  nextHotspot();
}

function stopGuidedTour() {
  isTourPlaying = false;
  tourInfo.style.display = "none";
  if (typeof TWEEN !== "undefined") {
    TWEEN.removeAll();
  }
}

function rotateTo180() {
  const delta = 180;
  const targetLon = lon + delta;

  if (typeof TWEEN !== "undefined") {
    new TWEEN.Tween({ lon: lon })
      .to({ lon: targetLon }, 2000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(({ lon: newLon }) => {
        lon = newLon;
        updateCompass();
      })
      .start();
  } else {
    lon = targetLon;
    updateCompass();
  }
}
