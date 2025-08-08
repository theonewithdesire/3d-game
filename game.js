class ChickenHunter3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();

        // Game state
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.chickens = [];
        this.houses = [];
        this.trees = [];
        this.totalChickens = 20;
        this.isPointerLocked = false;
        this.isPaused = false;
        this.gameStartTime = Date.now();
        this.gameTime = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.worldSize = 500; // Much bigger world

        // Shooting system
        this.ammo = 30;
        this.maxAmmo = 30;
        this.isReloading = false;
        this.reloadTime = 2000; // 2 seconds
        this.lastShotTime = 0;
        this.shotCooldown = 100; // 100ms between shots

        // Movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isRunning = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.walkSpeed = 200;
        this.runSpeed = 400;

        // Mouse/touch controls
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        this.mouseSensitivity = 0.002;
        this.isMobile = window.matchMedia('(pointer: coarse)').matches || /Mobi|Android/i.test(navigator.userAgent);
        this.touchLookActive = false;
        this.touchLastX = 0;
        this.touchLastY = 0;
        this.joystick = { active: false, dx: 0, dy: 0 };

        // Chicken AI
        this.chickenAttackTimer = 0;
        this.chickenAttackInterval = 8000; // Attack every 8 seconds

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2));
        this.renderer.setClearColor(0x87CEEB); // Sky blue
        this.renderer.shadowMap.enabled = !this.isMobile; // performance
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(0, 8, 15);

        // Create day scene
        this.createDayScene();
        this.createTerrain();
        this.createHouses();
        this.createTrees();
        this.createEnvironmentDetails();

        // Setup controls
        this.setupControls();
        if (this.isMobile) {
            this.setupMobileControls();
        }

        // Start game loop
        this.animate();

        // Show startup menu
        this.showStartupMenu();
    }

    showStartupMenu() {
        document.getElementById('startupMenu').style.display = 'flex';
        document.getElementById('menuBar').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('ammoCounter').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('quickMenu').style.display = 'none';
        const reloadText = document.getElementById('reloadText');
        if (this.isMobile && reloadText) reloadText.textContent = 'Tap 🔄 to reload';
    }

    startGame() {
        this.gameStarted = true;
        this.gameStartTime = Date.now();

        // Hide startup menu and show game UI
        document.getElementById('startupMenu').style.display = 'none';
        document.getElementById('menuBar').style.display = 'flex';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('ammoCounter').style.display = 'block';
        const instructions = document.getElementById('instructions');
        if (this.isMobile) {
            instructions.innerHTML = '<strong>🎮 CONTROLS</strong><br>Left joystick: Move | Right screen: Look<br>Tap 🔫: Shoot | Tap 🔄: Reload | Tap ⏸️: Menu';
        }
        instructions.style.display = 'block';
        document.getElementById('quickMenu').style.display = 'flex';

        // Mobile in-game UI
        const lookArea = document.getElementById('lookArea');
        const mobileControls = document.getElementById('mobileControls');
        const mobileButtons = document.getElementById('mobileButtons');
        if (this.isMobile) {
            lookArea.style.display = 'block';
            mobileControls.style.display = 'block';
            mobileButtons.style.display = 'flex';
        }

        // Create chickens
        this.createChickens();

        // Request pointer lock (desktop only)
        if (!this.isMobile) {
            document.body.requestPointerLock();
        }

        this.updateUI();
    }

    showMainMenu() {
        this.gameStarted = false;
        this.gameOver = false;
        document.exitPointerLock();

        // Clear chickens
        this.chickens.forEach(chicken => {
            this.scene.remove(chicken);
        });
        this.chickens = [];

        // Reset game state
        this.score = 0;
        this.lives = this.maxLives;
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.isPaused = false;

        // Hide mobile controls
        const lookArea = document.getElementById('lookArea');
        const mobileControls = document.getElementById('mobileControls');
        const mobileButtons = document.getElementById('mobileButtons');
        if (lookArea) lookArea.style.display = 'none';
        if (mobileControls) mobileControls.style.display = 'none';
        if (mobileButtons) mobileButtons.style.display = 'none';

        // Show startup menu
        this.showStartupMenu();
        document.getElementById('gameOverScreen').style.display = 'none';
    }

    showInstructions() {
        alert(`🎮 HOW TO PLAY CHICKEN HUNTER 3D

🎯 OBJECTIVE:
Hunt down all the chickens in the vast countryside!

🕹️ CONTROLS:
• ${this.isMobile ? 'Left joystick - Move' : 'WASD - Move around'}
• ${this.isMobile ? 'Right screen - Look' : 'Shift - Run faster'}
• ${this.isMobile ? 'Tap 🔫 - Shoot' : 'Mouse - Look around / Click - Shoot'}
• ${this.isMobile ? 'Tap 🔄 - Reload' : 'R - Reload weapon'}
• ${this.isMobile ? 'Tap ⏸️ - Pause/Menu' : 'ESC - Pause/Menu'}

⚠️ BEWARE:
• Some chickens are aggressive and will attack you!
• You have 3 lives - don't let them get too close
• You have limited ammo - make every shot count
• The world is huge - explore and hunt strategically

🏆 SCORING:
• Each chicken killed = 15 points
• Survive as long as possible for bonus points

Good luck, hunter! 🐔🔫`);
    }

    showSettings() {
        const sensitivity = prompt('🎛️ GAME SETTINGS\n\nMouse/Look Sensitivity (0.001 - 0.01):', this.mouseSensitivity);
        if (sensitivity && !isNaN(sensitivity)) {
            this.mouseSensitivity = Math.max(0.001, Math.min(0.01, parseFloat(sensitivity)));
        }

        const worldSize = prompt('🌍 World Size (300 - 1000):', this.worldSize);
        if (worldSize && !isNaN(worldSize)) {
            this.worldSize = Math.max(300, Math.min(1000, parseInt(worldSize)));
        }
    }

    createDayScene() {
        // Day sky with gradient
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x87CEEB) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Sun
        const sunGeometry = new THREE.SphereGeometry(10, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(200, 150, -300);
        this.scene.add(sun);

        // Ambient light (bright for day)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Sunlight
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        sunLight.position.set(200, 150, -300);
        sunLight.castShadow = !this.isMobile;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1000;
        sunLight.shadow.camera.left = -200;
        sunLight.shadow.camera.right = 200;
        sunLight.shadow.camera.top = 200;
        sunLight.shadow.camera.bottom = -200;
        this.scene.add(sunLight);

        // Add clouds
        this.createClouds();
    }

    createClouds() {
        const cloudGeometry = new THREE.SphereGeometry(15, 8, 6);
        const cloudMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const cloudCount = this.isMobile ? 12 : 20;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 800,
                50 + Math.random() * 50,
                (Math.random() - 0.5) * 800
            );
            cloud.scale.set(
                1 + Math.random() * 2,
                0.5 + Math.random() * 0.5,
                1 + Math.random() * 2
            );
            this.scene.add(cloud);
        }
    }

    createTerrain() {
        // Main ground - much bigger
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize * 2, this.worldSize * 2, 80, 80);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x4a7c59,
            transparent: true
        });

        // Add some height variation to ground
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.random() * 3 - 1.5; // More varied terrain
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add grass patches
        this.createGrassPatches();

        // Add hills and valleys
        this.createHills();
    }

    createHills() {
        const hills = this.isMobile ? 10 : 15;
        for (let i = 0; i < hills; i++) {
            const hillGeometry = new THREE.SphereGeometry(20 + Math.random() * 30, 16, 12);
            const hillMaterial = new THREE.MeshLambertMaterial({ color: 0x3a6b47 });
            const hill = new THREE.Mesh(hillGeometry, hillMaterial);

            hill.position.set(
                (Math.random() - 0.5) * this.worldSize * 1.5,
                -10 - Math.random() * 10,
                (Math.random() - 0.5) * this.worldSize * 1.5
            );
            hill.scale.y = 0.3 + Math.random() * 0.4;
            hill.receiveShadow = true;
            hill.castShadow = true;
            this.scene.add(hill);
        }
    }

    createGrassPatches() {
        const grassGeometry = new THREE.PlaneGeometry(8, 8);
        const grassMaterial = new THREE.MeshLambertMaterial({
            color: 0x2d5a3d,
            transparent: true,
            opacity: 0.8
        });

        const count = this.isMobile ? 180 : 300;
        for (let i = 0; i < count; i++) {
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(
                (Math.random() - 0.5) * this.worldSize * 1.8,
                0.1,
                (Math.random() - 0.5) * this.worldSize * 1.8
            );
            grass.rotation.x = -Math.PI / 2;
            grass.rotation.z = Math.random() * Math.PI * 2;
            this.scene.add(grass);
        }
    }

    createTrees() {
        // Generate many more trees across the bigger world
        const numTrees = this.isMobile ? 50 : 80;
        for (let i = 0; i < numTrees; i++) {
            const x = (Math.random() - 0.5) * this.worldSize * 1.6;
            const z = (Math.random() - 0.5) * this.worldSize * 1.6;

            // Don't place trees too close to center (spawn area)
            if (Math.sqrt(x * x + z * z) > 50) {
                this.createTree(x, z);
            }
        }
    }

    createTree(x, z) {
        const tree = new THREE.Group();

        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Tree leaves
        const leavesGeometry = new THREE.SphereGeometry(6, 8, 6);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 10;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);

        tree.position.set(x, 0, z);
        this.scene.add(tree);
        this.trees.push(tree);
    }

    createHouses() {
        // Generate more houses spread across the bigger world
        const numHouses = this.isMobile ? 16 : 25;
        for (let i = 0; i < numHouses; i++) {
            const angle = (i / numHouses) * Math.PI * 2;
            const distance = 80 + Math.random() * (this.worldSize * 0.6);
            const x = Math.cos(angle) * distance + (Math.random() - 0.5) * 100;
            const z = Math.sin(angle) * distance + (Math.random() - 0.5) * 100;
            this.createHouse(x, z, i);
        }
    }

    createHouse(x, z, index) {
        const house = new THREE.Group();

        // House base with different colors
        const colors = [0x8B4513, 0xA0522D, 0xCD853F, 0xD2691E, 0xDEB887];
        const baseGeometry = new THREE.BoxGeometry(10, 8, 10);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: colors[index % colors.length] });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 4;
        base.castShadow = true;
        base.receiveShadow = true;
        house.add(base);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(8, 5, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 10.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        house.add(roof);

        // Door
        const doorGeometry = new THREE.BoxGeometry(2, 4, 0.2);
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 2, 5.1);
        house.add(door);

        // Windows
        const windowGeometry = new THREE.PlaneGeometry(2, 2);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB });

        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(3, 5, 5.01);
        house.add(window1);

        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(-3, 5, 5.01);
        house.add(window2);

        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
        const chimneyMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(3, 12, 3);
        chimney.castShadow = true;
        house.add(chimney);

        house.position.set(x, 0, z);
        this.scene.add(house);
        this.houses.push(house);
    }

    createEnvironmentDetails() {
        // Add rocks across the bigger world
        const rockCount = this.isMobile ? 70 : 100;
        for (let i = 0; i < rockCount; i++) {
            const rockGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 2, 8, 6);
            const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(
                (Math.random() - 0.5) * this.worldSize * 1.8,
                0.5,
                (Math.random() - 0.5) * this.worldSize * 1.8
            );
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }

        // Add flowers across the bigger world
        const flowerCount = this.isMobile ? 130 : 200;
        for (let i = 0; i < flowerCount; i++) {
            const flowerGeometry = new THREE.SphereGeometry(0.4, 8, 6);
            const flowerColors = [0xff69b4, 0xff1493, 0xffd700, 0xff4500, 0x9370db];
            const flowerMaterial = new THREE.MeshBasicMaterial({
                color: flowerColors[Math.floor(Math.random() * flowerColors.length)]
            });
            const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
            flower.position.set(
                (Math.random() - 0.5) * this.worldSize * 1.6,
                0.4,
                (Math.random() - 0.5) * this.worldSize * 1.6
            );
            this.scene.add(flower);
        }

        // Add bushes
        const bushCount = this.isMobile ? 40 : 60;
        for (let i = 0; i < bushCount; i++) {
            const bushGeometry = new THREE.SphereGeometry(2 + Math.random() * 2, 8, 6);
            const bushMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5a3d });
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.position.set(
                (Math.random() - 0.5) * this.worldSize * 1.4,
                1,
                (Math.random() - 0.5) * this.worldSize * 1.4
            );
            bush.scale.y = 0.6;
            bush.castShadow = true;
            bush.receiveShadow = true;
            this.scene.add(bush);
        }
    }

    createChickens() {
        for (let i = 0; i < this.totalChickens; i++) {
            this.createChicken();
        }
    }

    createChicken() {
        const chicken = new THREE.Group();

        // Chicken body (more detailed)
        const bodyGeometry = new THREE.SphereGeometry(1.2, 12, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 0.8, 1.3);
        body.castShadow = true;
        body.receiveShadow = true;
        chicken.add(body);

        // Chicken head
        const headGeometry = new THREE.SphereGeometry(0.7, 10, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1, 1.2);
        head.castShadow = true;
        chicken.add(head);

        // Beak
        const beakGeometry = new THREE.ConeGeometry(0.25, 0.5, 6);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 1, 1.8);
        beak.rotation.x = Math.PI / 2;
        chicken.add(beak);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.12, 6, 4);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.25, 1.2, 1.5);
        chicken.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.25, 1.2, 1.5);
        chicken.add(rightEye);

        // Comb (red thing on head)
        const combGeometry = new THREE.SphereGeometry(0.3, 6, 4);
        const combMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const comb = new THREE.Mesh(combGeometry, combMaterial);
        comb.position.set(0, 1.5, 1);
        comb.scale.set(1, 0.5, 0.5);
        chicken.add(comb);

        // Wings
        const wingGeometry = new THREE.SphereGeometry(0.6, 8, 6);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });

        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.8, 0.3, 0);
        leftWing.scale.set(0.8, 0.6, 1.2);
        leftWing.castShadow = true;
        chicken.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.8, 0.3, 0);
        rightWing.scale.set(0.8, 0.6, 1.2);
        rightWing.castShadow = true;
        chicken.add(rightWing);

        // Tail feathers
        const tailGeometry = new THREE.ConeGeometry(0.4, 1.5, 6);
        const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.5, -1.5);
        tail.rotation.x = -Math.PI / 6;
        tail.castShadow = true;
        chicken.add(tail);

        // Position chicken randomly across the bigger world
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.worldSize * 0.7) + 30;
        chicken.position.set(
            Math.cos(angle) * distance,
            1.2,
            Math.sin(angle) * distance
        );

        // Add movement and AI properties
        chicken.userData = {
            moveSpeed: 0.03 + Math.random() * 0.04,
            direction: Math.random() * Math.PI * 2,
            changeDirectionTimer: 0,
            alive: true,
            aggressive: Math.random() < 0.3, // 30% chance to be aggressive
            attackCooldown: 0,
            health: 1,
            originalY: chicken.position.y
        };

        this.scene.add(chicken);
        this.chickens.push(chicken);
    }

    setupControls() {
        // Pointer lock & click to shoot
        document.addEventListener('click', (event) => {
            if (this.gameOver) return;

            if (!this.isPointerLocked && !this.isMobile) {
                document.body.requestPointerLock();
            } else if (!this.isPaused) {
                this.shoot();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
        });

        // Mouse movement (desktop)
        document.addEventListener('mousemove', (event) => {
            if (this.isMobile) return;
            if (!this.isPointerLocked || this.isPaused) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= movementX * this.mouseSensitivity;
            this.euler.x -= movementY * this.mouseSensitivity;
            this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        });

        // Keyboard controls
        const onKeyDown = (event) => {
            if (this.gameOver) return;

            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isRunning = true;
                    break;
                case 'KeyR':
                    this.reload();
                    break;
                case 'Escape':
                    document.exitPointerLock();
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isRunning = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupMobileControls() {
        const lookArea = document.getElementById('lookArea');
        const stickBase = document.getElementById('moveStickBase');
        const stick = document.getElementById('moveStick');
        const shootBtn = document.getElementById('shootBtn');
        const reloadBtn = document.getElementById('reloadBtn');
        const pauseBtn = document.getElementById('pauseBtn');

        // Look control on right half
        const onLookStart = (e) => {
            this.touchLookActive = true;
            const t = e.touches ? e.touches[0] : e;
            this.touchLastX = t.clientX;
            this.touchLastY = t.clientY;
        };
        const onLookMove = (e) => {
            if (!this.touchLookActive || this.isPaused) return;
            const t = e.touches ? e.touches[0] : e;
            const dx = t.clientX - this.touchLastX;
            const dy = t.clientY - this.touchLastY;
            this.touchLastX = t.clientX;
            this.touchLastY = t.clientY;

            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= dx * this.mouseSensitivity * 0.7;
            this.euler.x -= dy * this.mouseSensitivity * 0.7;
            this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        };
        const onLookEnd = () => { this.touchLookActive = false; };
        ['touchstart','mousedown'].forEach(ev => lookArea.addEventListener(ev, onLookStart, { passive: true }));
        ['touchmove','mousemove'].forEach(ev => lookArea.addEventListener(ev, onLookMove, { passive: true }));
        ['touchend','mouseup','mouseleave','touchcancel'].forEach(ev => lookArea.addEventListener(ev, onLookEnd));

        // Movement joystick (fixed base)
        const radius = 50; // must match CSS ~ 56px stick
        const moveStart = (e) => {
            e.preventDefault();
            this.joystick.active = true;
        };
        const moveMove = (e) => {
            if (!this.joystick.active) return;
            const t = e.touches ? e.touches[0] : e;
            const r = stickBase.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = t.clientX - cx;
            const dy = t.clientY - cy;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const clamped = Math.min(dist, radius);
            const innerX = Math.cos(angle) * clamped;
            const innerY = Math.sin(angle) * clamped;
            stick.style.transform = `translate(calc(-50% + ${innerX}px), calc(-50% + ${innerY}px))`;
            this.joystick.dx = innerX / radius;
            this.joystick.dy = innerY / radius;
        };
        const moveEnd = () => {
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            stick.style.transform = 'translate(-50%, -50%)';
        };
        stickBase.addEventListener('touchstart', moveStart, { passive: false });
        stickBase.addEventListener('touchmove', moveMove, { passive: false });
        stickBase.addEventListener('touchend', moveEnd);
        stickBase.addEventListener('touchcancel', moveEnd);

        // Buttons
        shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.shoot(); }, { passive: false });
        reloadBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.reload(); }, { passive: false });
        pauseBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.togglePause(); }, { passive: false });
    }

    shoot() {
        const currentTime = Date.now();

        // Check cooldown and ammo
        if (currentTime - this.lastShotTime < this.shotCooldown || this.ammo <= 0 || this.isReloading) {
            return;
        }

        this.lastShotTime = currentTime;
        this.ammo--;

        // Create raycaster from camera
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Check for chicken intersections
        const aliveChickens = this.chickens.filter(chicken => chicken.userData.alive);
        const intersects = raycaster.intersectObjects(aliveChickens, true);

        let hit = false;
        if (intersects.length > 0) {
            // Find the chicken that was hit
            let hitChicken = intersects[0].object;
            while (hitChicken.parent && !hitChicken.userData.alive) {
                hitChicken = hitChicken.parent;
            }

            if (hitChicken.userData && hitChicken.userData.alive) {
                this.killChicken(hitChicken);
                hit = true;
            }
        }

        // Create muzzle flash and bullet trail
        this.createMuzzleFlash();
        this.createBulletTrail(hit);
        this.playShootSound();

        this.updateUI();

        // Auto-reload if empty
        if (this.ammo === 0) {
            setTimeout(() => this.reload(), 500);
        }
    }

    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;

        this.isReloading = true;
        document.getElementById('reloadIndicator').style.display = 'block';

        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            document.getElementById('reloadIndicator').style.display = 'none';
            this.updateUI();
        }, this.reloadTime);
    }

    killChicken(chicken) {
        chicken.userData.alive = false;
        this.score += 15;

        // Enhanced death animation
        const deathTween = () => {
            const startY = chicken.position.y;
            const startTime = Date.now();
            const duration = 1500;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress < 1) {
                    chicken.position.y = startY - progress * 3;
                    chicken.rotation.z = progress * Math.PI * 2;
                    chicken.rotation.x = progress * Math.PI;

                    // Fade out
                    chicken.children.forEach(child => {
                        if (child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 1 - progress;
                        }
                    });

                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(chicken);
                    const index = this.chickens.indexOf(chicken);
                    if (index > -1) {
                        this.chickens.splice(index, 1);
                    }
                }
            };
            animate();
        };

        deathTween();
        this.updateUI();

        // Check win condition
        if (this.chickens.filter(c => c.userData.alive).length === 0) {
            setTimeout(() => {
                this.showGameOver(true);
            }, 1000);
        }
    }

    createMuzzleFlash() {
        const flashGeometry = new THREE.SphereGeometry(0.8, 8, 6);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);

        // Position flash in front of camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        flash.position.copy(this.camera.position).add(direction.multiplyScalar(3));

        this.scene.add(flash);

        // Animate flash
        let opacity = 0.9;
        const flashAnimation = () => {
            opacity -= 0.1;
            flash.material.opacity = opacity;
            flash.scale.multiplyScalar(1.2);

            if (opacity > 0) {
                requestAnimationFrame(flashAnimation);
            } else {
                this.scene.remove(flash);
            }
        };
        flashAnimation();
    }

    createBulletTrail(hit) {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        const startPos = this.camera.position.clone();
        const endPos = startPos.clone().add(direction.multiplyScalar(100));

        const trailGeometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
        const trailMaterial = new THREE.LineBasicMaterial({
            color: hit ? 0xff0000 : 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);

        this.scene.add(trail);

        // Remove trail after short time
        setTimeout(() => {
            this.scene.remove(trail);
        }, 150);
    }

    playShootSound() {
        // Simple audio feedback using Web Audio API
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            // Audio not supported, continue silently
        }
    }

    updateMovement(delta) {
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        if (this.isMobile) {
            // Joystick -> WASD mapping
            const dead = 0.08;
            const dx = Math.abs(this.joystick.dx) > dead ? this.joystick.dx : 0;
            const dy = Math.abs(this.joystick.dy) > dead ? this.joystick.dy : 0;
            const mag = Math.min(1, Math.hypot(dx, dy));

            // Move relative to camera orientation
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0; forward.normalize();
            const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).negate();

            const desired = new THREE.Vector3();
            desired.addScaledVector(forward, mag * (dy));
            desired.addScaledVector(right, mag * (dx));
            if (desired.lengthSq() > 0.0001) desired.normalize();

            this.direction.copy(desired);
        } else {
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();
        }

        const currentSpeed = this.isRunning && !this.isMobile ? this.runSpeed : this.walkSpeed;

        if (this.direction.z !== 0) this.velocity.z -= this.direction.z * currentSpeed * delta;
        if (this.direction.x !== 0) this.velocity.x -= this.direction.x * currentSpeed * delta;

        this.camera.translateX(this.velocity.x * delta);
        this.camera.translateZ(this.velocity.z * delta);

        // Keep camera above ground with slight head bobbing
        const bobAmount = (this.direction.lengthSq() > 0.0001) ? Math.sin(Date.now() * 0.01) * 0.1 : 0;
        this.camera.position.y = Math.max(this.camera.position.y, 3 + bobAmount);

        // Boundary checking - much bigger world
        const maxDistance = this.worldSize * 0.9;
        this.camera.position.x = Math.max(-maxDistance, Math.min(maxDistance, this.camera.position.x));
        this.camera.position.z = Math.max(-maxDistance, Math.min(maxDistance, this.camera.position.z));
    }

    updateChickens(delta) {
        this.chickenAttackTimer += delta * 1000;

        this.chickens.forEach(chicken => {
            if (!chicken.userData.alive) return;

            // Update direction change timer
            chicken.userData.changeDirectionTimer += delta;
            chicken.userData.attackCooldown -= delta * 1000;

            // Aggressive chicken behavior
            if (chicken.userData.aggressive && this.chickenAttackTimer > this.chickenAttackInterval) {
                const distanceToPlayer = chicken.position.distanceTo(this.camera.position);
                if (distanceToPlayer < 30 && chicken.userData.attackCooldown <= 0) {
                    // Move towards player
                    const direction = new THREE.Vector3()
                        .subVectors(this.camera.position, chicken.position)
                        .normalize();

                    chicken.position.add(direction.multiplyScalar(chicken.userData.moveSpeed * 2));
                    chicken.lookAt(this.camera.position);

                    // Attack if close enough
                    if (distanceToPlayer < 5) {
                        this.takeDamage();
                        chicken.userData.attackCooldown = 3000; // 3 second cooldown
                    }
                } else {
                    // Normal movement
                    this.moveChickenNormally(chicken, delta);
                }
            } else {
                // Normal movement
                this.moveChickenNormally(chicken, delta);
            }

            // Add slight bobbing animation
            chicken.position.y = chicken.userData.originalY + Math.sin(Date.now() * 0.005 + chicken.position.x) * 0.15;
        });

        // Reset attack timer
        if (this.chickenAttackTimer > this.chickenAttackInterval) {
            this.chickenAttackTimer = 0;
        }
    }

    moveChickenNormally(chicken, delta) {
        // Change direction randomly
        if (chicken.userData.changeDirectionTimer > 3 + Math.random() * 4) {
            chicken.userData.direction = Math.random() * Math.PI * 2;
            chicken.userData.changeDirectionTimer = 0;
        }

        // Move chicken
        const moveX = Math.cos(chicken.userData.direction) * chicken.userData.moveSpeed;
        const moveZ = Math.sin(chicken.userData.direction) * chicken.userData.moveSpeed;

        chicken.position.x += moveX;
        chicken.position.z += moveZ;

        // Keep chickens in bounds
        const maxDistance = this.worldSize * 0.8;
        if (Math.abs(chicken.position.x) > maxDistance || Math.abs(chicken.position.z) > maxDistance) {
            chicken.userData.direction += Math.PI;
        }

        // Rotate chicken to face movement direction
        chicken.rotation.y = chicken.userData.direction;
    }

    takeDamage() {
        this.lives--;
        this.updateUI();

        // Screen flash effect
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'red';
        flash.style.opacity = '0.5';
        flash.style.zIndex = '250';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);

        setTimeout(() => {
            document.body.removeChild(flash);
        }, 200);

        if (this.lives <= 0) {
            this.showGameOver(false);
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('chickensLeft').textContent =
            this.chickens.filter(c => c.userData.alive).length;
        document.getElementById('ammoCount').textContent = `${this.ammo}/${this.maxAmmo}`;

        // Update life bar
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < this.lives) {
                heart.classList.remove('lost');
            } else {
                heart.classList.add('lost');
            }
        });

        // Update timer
        if (!this.gameOver) {
            this.gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = this.gameTime % 60;
            document.getElementById('timer').textContent =
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.querySelector('#menuButtons .menu-btn');
        pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';

        if (this.isPaused) {
            document.exitPointerLock();
        }
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.lives = this.maxLives;
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.isPaused = false;
        this.gameOver = false;
        this.gameStartTime = Date.now();
        this.gameTime = 0;

        // Clear existing chickens
        this.chickens.forEach(chicken => {
            this.scene.remove(chicken);
        });
        this.chickens = [];

        // Create new chickens
        this.createChickens();

        // Reset camera position
        this.camera.position.set(0, 5, 10);
        this.camera.rotation.set(0, 0, 0);

        // Hide game over screen
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('reloadIndicator').style.display = 'none';

        // Reset UI
        const pauseBtn = document.querySelector('#menuButtons .menu-btn');
        pauseBtn.textContent = '⏸️ Pause';

        this.updateUI();
    }

    toggleSettings() {
        // Simple settings toggle (could be expanded)
        const sensitivity = prompt('Enter mouse sensitivity (0.001 - 0.01):', this.mouseSensitivity);
        if (sensitivity && !isNaN(sensitivity)) {
            this.mouseSensitivity = Math.max(0.001, Math.min(0.01, parseFloat(sensitivity)));
        }
    }

    showGameOver(won) {
        this.gameOver = true;
        document.exitPointerLock();

        const gameOverScreen = document.getElementById('gameOverScreen');
        const gameOverTitle = document.getElementById('gameOverTitle');
        const gameOverMessage = document.getElementById('gameOverMessage');

        if (won) {
            gameOverTitle.textContent = 'Victory!';
            gameOverTitle.style.color = '#27ae60';
            gameOverMessage.textContent = 'You eliminated all the chickens!';
        } else {
            gameOverTitle.textContent = 'Game Over!';
            gameOverTitle.style.color = '#e74c3c';
            gameOverMessage.textContent = 'You ran out of lives!';
        }

        document.getElementById('finalScore').textContent = this.score;
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('finalTime').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;

        gameOverScreen.style.display = 'flex';
    }

    toggleQuickMenu() {
        const quickMenu = document.getElementById('quickMenu');
        const isVisible = quickMenu.style.display === 'flex';
        quickMenu.style.display = isVisible ? 'none' : 'flex';
    }

    toggleMap() {
        // Simple mini-map toggle (placeholder for future implementation)
        alert('🗺️ Mini-map feature coming soon!\n\nFor now, use the vast countryside to explore and hunt chickens across the expanded world.');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPaused || this.gameOver) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const delta = this.clock.getDelta();

        if (this.isPointerLocked && this.gameStarted) {
            this.updateMovement(delta);
        }

        if (this.gameStarted) {
            this.updateChickens(delta);
            this.updateUI();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
const game = new ChickenHunter3D();