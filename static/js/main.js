
// ===== GLOBAL VARIABLES =====
const viewer = document.getElementById("viewer");
const home = document.getElementById("home");
const tourInfo = document.getElementById("tour-info");

function toggleControlsMenu() {
  const menu = document.getElementById('controls-menu');
  menu.classList.toggle('active');
}

// Three.js components
let scene, camera, renderer, sphere;
let hotspots = [];
let map, rippleBusinessesVisible = false;

// Navigation state
let currentImageIndex = 0;
let historyStack = [];
let isTourPlaying = false;
let lon = 0, lat = 0, phi = 0, theta = 0;

// Interaction state
let isUserInteracting = false;
let lastMouseX = 0, lastMouseY = 0;

// ===== IMAGE DATA =====
const images = [
  {
    url: STATIC_URLS.DJI_0633,
    hotspots: [],
    title: "CN TOWER",
  },
  {
    url: STATIC_URLS.img,
    hotspots: [],
    title: "Downtown Hamilton View",
  },
  {
    url: STATIC_URLS.img2,
    hotspots: [],
    title: "Billy Bishop Airport",
  },
  {
    url: STATIC_URLS.fort_york,
    hotspots: [],
    title: "Fort York"
  },  
  {
    url: STATIC_URLS.DJI_0639, // Add DJI_0639 image
    hotspots: [], // Add hotspots if needed in the future
    title: "CN Tower Alternate View",
  },
 
];

// ===== HOTSPOT DATA =====
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
    lon: 217,
    lat: -15,
    imageIndex: 0,
    info: "Fort York is an early‑19th‑century military fortification in Toronto, featuring stone‑lined earthworks and eight historic buildings, part of the Fort York National Historic Site.",
    targetImageIndex: 3,
    targetLon: 0,
    targetLat: 0,
  },  
  {
    id: 4,
    name: "Greenwood Residence",
    category: "heritage",
    lon: 198,
    lat: -1,
    imageIndex: 0,
    info: "Greenwood Residence offers eco-friendly living with solar panels, rainwater harvesting, and energy-efficient architecture for sustainable urban life.",
    targetImageIndex: 3,
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

// ===== INITIALIZATION =====
// Inject hotspots into corresponding image objects
hotspotData.forEach((hotspot) => {
  images[hotspot.imageIndex].hotspots.push(hotspot);
});

// ===== COMPASS FUNCTIONALITY =====
function updateCompass() {
  const compassNeedle = document.querySelector('.compass-needle');
  if (compassNeedle) {
    const rotation = -lon;
    compassNeedle.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }
}

// ===== THREE.JS VIEWER INITIALIZATION =====
function initViewer() {
  // Initialize Three.js scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  // Get panorama section for proper sizing
  const panoramaSection = document.getElementById('panorama-section');
  const panoramaRect = panoramaSection.getBoundingClientRect();
  
  renderer.setSize(panoramaRect.width, panoramaRect.height);
  renderer.setClearColor(0x000000, 1);
  panoramaSection.appendChild(renderer.domElement);

  // Load initial image and setup camera
  loadCurrentImage();
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, 1);

  // Setup responsive resizing
  setupEventListeners();
  
  // Initialize components
  initMap();
  updateHotspots();
  updateCompass();
  
  // Show tour info temporarily
  showTourInfo();
  
  // Start animation loop
  animate();
}

function setupEventListeners() {
  window.addEventListener("resize", updateRendererSize);
  renderer.domElement.addEventListener("mousedown", (event) => {
    onMouseDown(event);
    document.getElementById('controls-menu').classList.remove('active'); // Close menu on interaction
  });
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mouseleave", onMouseUp);
  renderer.domElement.addEventListener("wheel", onMouseWheel);
  renderer.domElement.addEventListener("touchstart", (event) => {
    onTouchStart(event);
    document.getElementById('controls-menu').classList.remove('active'); // Close menu on touch
  });
  renderer.domElement.addEventListener("touchmove", onTouchMove);
  renderer.domElement.addEventListener("touchend", onTouchEnd);
}

function updateRendererSize() {
  const panoramaSection = document.getElementById('panorama-section');
  const panoramaRect = panoramaSection.getBoundingClientRect();
  camera.aspect = panoramaRect.width / panoramaRect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(panoramaRect.width, panoramaRect.height);
}

function showTourInfo() {
  tourInfo.style.display = "block";
  setTimeout(() => {
    tourInfo.style.display = "none";
  }, 5000);
}

// ===== IMAGE LOADING =====
function loadCurrentImage() {
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  const textureLoader = new THREE.TextureLoader();
  const imageUrl = images[currentImageIndex].url;
  
  console.log(`Attempting to load image: ${imageUrl}`);
  
  textureLoader.load(
    imageUrl,
    (texture) => {
      console.log(`Successfully loaded image: ${imageUrl}`);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      
      if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }
      
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      console.log(`Rendered: ${images[currentImageIndex].title}`);
    },
    (progress) => {
      console.log(`Loading progress for ${imageUrl}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
    },
    (error) => {
      console.error(`Error loading image: ${imageUrl}`, error);
      const material = new THREE.MeshBasicMaterial({ color: 0x4a90e2 });
      
      if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }
      
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      console.log(`Fallback blue material applied for: ${images[currentImageIndex].title}`);
    }
  );
}

// ===== HOTSPOT MANAGEMENT =====
function updateHotspots() {
  // Clear existing hotspots
  hotspots.forEach((h) => {
    scene.remove(h.object);
    if (h.element) h.element.remove();
  });
  hotspots = [];

  // Get filter states
  const filters = {
    landmarks: document.getElementById("landmarks")?.checked ?? true,
    nature: document.getElementById("nature")?.checked ?? true,
    heritage: document.getElementById("heritage")?.checked ?? true,
    waterfront: document.getElementById("waterfront")?.checked ?? true,
  };

  // Create hotspots for current image
  images[currentImageIndex].hotspots.forEach((hotspot) => {
    if (filters[hotspot.category] && hotspot.imageIndex === currentImageIndex) {
      const hotspotObj = createHotspot(hotspot);
      hotspots.push(hotspotObj);
    }
  });

  updateMapMarkers();
}

function createHotspot(hotspot) {
  // Create hotspot sprite
  const sprite = createHotspotSprite();
  positionHotspotSprite(sprite, hotspot);
  scene.add(sprite);

  // Create hotspot UI
  const hotspotUI = createHotspotUI(hotspot);
  const panoramaSection = document.getElementById('panorama-section');
  panoramaSection.appendChild(hotspotUI);

  // Add event listeners
  addHotspotEventListeners(hotspotUI, hotspot);

  // Return hotspot object with update function
  return {
    object: sprite,
    data: hotspot,
    element: hotspotUI,
    updatePosition: () => updateHotspotUIPosition(sprite, hotspotUI),
  };
}

function createHotspotSprite() {
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
  
  return sprite;
}

function positionHotspotSprite(sprite, hotspot) {
  const radius = 499;
  const phi = THREE.MathUtils.degToRad(90 - hotspot.lat);
  const theta = THREE.MathUtils.degToRad(hotspot.lon);
  sprite.position.setFromSphericalCoords(radius, phi, theta);
}

function createHotspotUI(hotspot) {
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

  return hotspotUI;
}

function addHotspotEventListeners(hotspotUI, hotspot) {
  hotspotUI.querySelectorAll("[data-type]").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = icon.getAttribute("data-type");
      handleHotspotIconClick(type, hotspot);
    });
  });
}

function updateHotspotUIPosition(sprite, hotspotUI) {
  const panoramaSection = document.getElementById('panorama-section');
  const panoramaRect = panoramaSection.getBoundingClientRect();
  
  const vector = sprite.position.clone();
  vector.project(camera);
  
  // Calculate position relative to panorama section
  const x = (vector.x * 0.5 + 0.5) * panoramaRect.width;
  const y = (vector.y * -0.5 + 0.5) * panoramaRect.height;
  
  // Check if hotspot is within panorama bounds and in front of camera
  const isVisible = vector.z < 1 && 
                   x >= 60 && x <= panoramaRect.width - 60 && 
                   y >= 60 && y <= panoramaRect.height - 60;
  
  if (isVisible) {
    hotspotUI.style.left = x + "px";
    hotspotUI.style.top = y + "px";
    hotspotUI.style.display = "block";
  } else {
    hotspotUI.style.display = "none";
  }
}

// ===== HOTSPOT INTERACTIONS =====
function handleHotspotIconClick(type, hotspot) {
  console.log(`Clicked ${type} icon for ${hotspot.name}`);
  
  switch (type) {
    case "notes":
      window.open("https://www.cntower.ca/buy-your-tickets-here", "_blank");
      break;
    case "documents":
      console.log(`Opening PDF: ${STATIC_URLS.cn_tower_pdf}`);
      window.open(STATIC_URLS.cn_tower_pdf, "_blank");
      break;
    case "photos":
      alert("Photos feature - coming soon!");
      break;
    case "multimedia":
      window.open("https://youtu.be/7XmPxiYfzPE?si=hS_BUadvJPFi9Y82", "_blank");
      break;
    case "navigate":
      navigateToHotspot(hotspot);
      break;
  }
}

function navigateToHotspot(hotspot) {
  if (typeof hotspot.targetImageIndex !== "undefined") {
    historyStack.push(currentImageIndex);
    currentImageIndex = hotspot.targetImageIndex;
    lon = hotspot.targetLon ?? 0;
    lat = hotspot.targetLat ?? 0;
    loadCurrentImage();
    updateHotspots();
    updateCompass();
  }
}

// ===== MAP FUNCTIONALITY =====
function initMap() {
  map = L.map('interactive-map').setView([43.6426, -79.3871], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Add landmark markers
  addLandmarkMarkers();
}

function addLandmarkMarkers() {
  const landmarks = [
    { name: "CN Tower", lat: 43.6426, lng: -79.3871, category: "landmark", hotspotId: 1 },
    { name: "Billy Bishop Airport", lat: 43.6275, lng: -79.3962, category: "landmark", hotspotId: 2 },
    { name: "Fort York", lat: 43.6387, lng: -79.4013, category: "heritage", hotspotId: 3 }
  ];

  landmarks.forEach(landmark => {
    const marker = L.marker([landmark.lat, landmark.lng], {
      icon: L.divIcon({
        className: 'custom-marker-icon',
        html: `<div class="pulsing-marker" style="width: 20px; height: 20px; background: ${landmark.category === 'heritage' ? '#8e44ad' : '#e74c3c'}; border-radius: 50%; border: 3px solid white;"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      })
    }).addTo(map);

    marker.bindPopup(`
      <div style="text-align: center; color: white;">
        <h4 style="margin: 5px 0; color: #005cbf;">${landmark.name}</h4>
        <button onclick="navigateToHotspotById(${landmark.hotspotId})" 
                style="background: #003087; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          View in 360°
        </button>
      </div>
    `);
  });
}

function updateMapMarkers() {
  console.log('Map markers updated for current view');
}

function navigateToHotspotById(hotspotId) {
  const hotspot = hotspotData.find(h => h.id === hotspotId);
  if (hotspot) {
    navigateToHotspot(hotspot);
  }
}

function toggleRippleRootBusinesses() {
  rippleBusinessesVisible = !rippleBusinessesVisible;
  const button = document.getElementById('toggle-businesses');
  const legend = document.querySelector('.ripple-legend');
  
  if (rippleBusinessesVisible) {
    button.textContent = 'Hide RippleRoot Businesses';
    button.classList.add('active');
    legend.style.display = 'flex';
    addBusinessMarkers();
  } else {
    button.textContent = 'Show RippleRoot Businesses';
    button.classList.remove('active');
    legend.style.display = 'none';
    removeBusinessMarkers();
  }
}

function addBusinessMarkers() {
  const businesses = [
    { name: "RippleRoot Cafe", lat: 43.6435, lng: -79.3880 },
    { name: "Tech Hub Downtown", lat: 43.6448, lng: -79.3850 },
    { name: "Green Office Space", lat: 43.6410, lng: -79.3890 }
  ];
  
  businesses.forEach(business => {
    const marker = L.marker([business.lat, business.lng], {
      icon: L.divIcon({
        className: 'custom-marker-icon business-marker',
        html: `<div style="width: 16px; height: 16px; background: #f39c12; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    marker.bindPopup(`
      <div style="text-align: center;">
        <h4 style="margin: 5px 0; color: #f39c12;">${business.name}</h4>
        <p style="margin: 5px 0; font-size: 12px;">RippleRoot Partner Business</p>
      </div>
    `);
  });
}

function removeBusinessMarkers() {
  map.eachLayer(layer => {
    if (layer.options && layer.options.icon && 
        layer.options.icon.options.className === 'custom-marker-icon business-marker') {
      map.removeLayer(layer);
    }
  });
}

// ===== MOUSE AND TOUCH EVENTS =====
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

// ===== ANIMATION LOOP =====
function animate() {
  requestAnimationFrame(animate);
  
  // Update camera position
  phi = THREE.MathUtils.degToRad(90 - lat);
  theta = THREE.MathUtils.degToRad(lon);
  camera.position.setFromSphericalCoords(1, phi, theta);
  camera.lookAt(0, 0, 0);
  
  // Render scene
  renderer.render(scene, camera);
  
  // Update hotspot positions
  hotspots.forEach((h) => {
    if (h.updatePosition) {
      h.updatePosition();
    }
  });
  
  // Update TWEEN animations
  if (typeof TWEEN !== "undefined") {
    TWEEN.update();
  }
}

// ===== NAVIGATION FUNCTIONS =====
function changeImage(direction) {
  if (direction === -1 && historyStack.length > 0) {
    currentImageIndex = historyStack.pop();
  } else {
    currentImageIndex = (currentImageIndex + direction + images.length) % images.length;
  }
  
  if (currentImageIndex === 0) {
    lon = 0;
    lat = 0;
  }
  
  loadCurrentImage();
  updateHotspots();
  updateCompass();
  
  // Show current location info
  tourInfo.textContent = `Now viewing: ${images[currentImageIndex].title}`;
  tourInfo.style.display = "block";
  setTimeout(() => {
    tourInfo.style.display = "none";
  }, 3000);
}

function startTour() {
  console.log("Starting Toronto Virtual Tour");
  home.style.display = "none";
  viewer.style.display = "block";
  initViewer();
}

function goHome() {
  home.style.display = "flex";
  viewer.style.display = "none";
  stopGuidedTour();
  
  // Cleanup Three.js resources
  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
    renderer.dispose();
  }
  
  if (sphere) {
    sphere.geometry.dispose();
    sphere.material.dispose();
  }
  
  // Cleanup hotspots
  hotspots.forEach((h) => {
    if (h.element && h.element.parentNode) {
      h.element.parentNode.removeChild(h.element);
    }
  });
  hotspots = [];
  
  // Cleanup map
  if (map) {
    map.remove();
    map = null;
  }
  
  // Reset state
  historyStack = [];
  currentImageIndex = 0;
  lon = 0;
  lat = 0;
}

// ===== GUIDED TOUR FUNCTIONS =====
function playGuidedTour() {
  if (isTourPlaying) return;
  
  isTourPlaying = true;
  let index = 0;
  const tourHotspots = hotspotData.filter(h => h.imageIndex === currentImageIndex);
  
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
    tourInfo.textContent = `Stop ${index + 1}/${tourHotspots.length}: ${hotspot.name}`;
    
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

function viewFromHere() {
  historyStack.push(currentImageIndex); // Save current image to history
  currentImageIndex = images.findIndex(image => image.url === STATIC_URLS.DJI_0639); // Find index of DJI_0639
  lon = 180; // Rotate view to face the city side
  lat = 0;   // Reset vertical view
  loadCurrentImage();
  updateHotspots();
  updateCompass();
  tourInfo.textContent = `Now viewing: ${images[currentImageIndex].title}`;
  tourInfo.style.display = "block";
  setTimeout(() => {
    tourInfo.style.display = "none";
  }, 3000);
}
