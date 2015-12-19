/*
 * Game Core
 *
 */

window.game = window.game || {};

window.game.core = function () {
	_game = {
		// Attributes
        scale : 1,
        collide : 0,
        MIN_Edible_Ratio: .5, //ratio of deible fishes to total
        fishQuantity: 10, //number of fishes spawning
        fishes: [], //array of the enmies

//_________TODO__MAKE_AN_AUTOMATIC_PLAYER_ENEMY________________
//________________________________________________________________
		player: {
			// Attributes
			scale: 1,

			// Player entity including mesh and rigid body
			model: null,
			mesh: null,
			shape: null,
			rigidBody: null,

			// Player mass which affects other rigid bodies in the world
			mass: 3,

			// HingeConstraint to limit player's air-twisting
			orientationConstraint: null,

			// Jump flags
			isGrounded: false,
			jumpHeight: 38,

			// Configuration for player speed (acceleration and maximum speed)
			speed: 1.5,
			speedMax: 45,
			// Configuration for player rotation (rotation acceleration and maximum rotation speed)
			rotationSpeed: 0.007,
			rotationSpeedMax: 0.04,
			// Rotation values
			rotationRadians: new THREE.Vector3(0, 0, 0),
			rotationAngleX: null,
			rotationAngleY: null,
			// Damping which means deceleration	(values between 0.8 and 0.98 are recommended)
			damping: 0.9,
			// Damping or easing for player rotation
			rotationDamping: 0.8,
			// Acceleration values
			acceleration: 0,
			rotationAcceleration: 0,
			// Enum for an easier method access to acceleration/rotation
			playerAccelerationValues: {
				position: {
					acceleration: "acceleration",
					speed: "speed",
					speedMax: "speedMax"
				},
				rotation: {
					acceleration: "rotationAcceleration",
					speed: "rotationSpeed",
					speedMax: "rotationSpeedMax"
				}
			},

			// Third-person camera configuration
			playerCoords: null,
			cameraCoords: null,
			// Camera offsets behind the player (horizontally and vertically)
			cameraOffsetH: 240,
			cameraOffsetV: 140,

			// Keyboard configuration for game.events.js (controlKeys must be associated to game.events.keyboard.keyCodes)
			controlKeys: {
				forward: "w",
				backward: "s",
				left: "a",
				right: "d",
				jump: "space"
			},
			
			// Methods
			create: function() {
				// Create a global physics material for the player which will be used as ContactMaterial for all other objects in the level

				// Create a player character based on an imported 3D model that was already loaded as JSON into game.models.player

//___________________TO_DO__THIS_IS_WHERE_OUT_NEW_SHADER_GOES______________________________________________________
//_________________________________________________________________________________________________________________
				_game.player.model = _three.createModel(window.game.models.player, 12, [
					new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan, shading: THREE.SmoothShading}),
					new THREE.MeshLambertMaterial({ color: window.game.static.colors.green, shading: THREE.SmoothShading })
				]);

				// Create the shape, mesh and rigid body for the player character and assign the physics material to it
				_game.player.shape = new CANNON.Box(_game.player.model.halfExtents);
				_game.player.rigidBody = new CANNON.RigidBody(_game.player.mass, _game.player.shape, _cannon.createPhysicsMaterial(_cannon.playerPhysicsMaterial));
				_game.player.rigidBody.position.set(50, 50, 0);
				_game.player.mesh = _cannon.addVisual(_game.player.rigidBody, null, _game.player.model.mesh);
                _game.player.mesh.scale.set(_game.player.scale, _game.player.scale, _game.player.scale);

				// Create a HingeConstraint to limit player's air-twisting - this needs improvement
				_game.player.orientationConstraint = new CANNON.HingeConstraint(_game.player.rigidBody, new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(0, 0, 1), _game.player.rigidBody, new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 0, 1));
				_cannon.world.addConstraint(_game.player.orientationConstraint);

				_game.player.rigidBody.postStep = function() {
					// Reset player's angularVelocity to limit possible exceeding rotation and
					_game.player.rigidBody.angularVelocity.z = 0;

					// update player's orientation afterwards
					_game.player.updateOrientation();
				};

				// Collision event listener for the jump mechanism
				_game.player.rigidBody.addEventListener("collide", function(event) {

					// Checks if player's is on ground
					if (!_game.player.isGrounded) {
						// Ray intersection test to check if player is colliding with an object beneath him
						_game.player.isGrounded = (new CANNON.Ray(_game.player.mesh.position, new CANNON.Vec3(0, 0, -1)).intersectBody(event.contact.bi).length > 0);
					}
				});
			},
            
            objectCollide : function(other) {
                console.log("testing collision");
                if(other.scale/_game.player.scale < .66){
                	_game.player.scale = _game.player.scale + 0.02;
                	_game.player.mesh.scale.set(_game.player.scale, _game.player.scale, _game.player.scale);
                	_cannon.removeVisual(other.rigidBody);
                	_game.fishes.splice(other.id, 1);
                }
            	else if(_game.player.scale/other.scale < .66){
            		_game.destroy();
            	}
                _game.collide = 0;
            },

			update: function() {
				// Basic game logic to update player and camera
				_game.player.processUserInput();
				_game.player.accelerate();
				_game.player.rotate();
				_game.player.updateCamera();

				// Level-specific logic
				_game.player.checkGameOver();
			},
			updateCamera: function() {
				// Calculate camera coordinates by using Euler radians from player's last rotation
				_game.player.cameraCoords = window.game.helpers.polarToCartesian(_game.player.cameraOffsetH, _game.player.rotationRadians.z);

				// Apply camera coordinates to camera position
				_three.camera.position.x = _game.player.mesh.position.x + _game.player.cameraCoords.x;
				_three.camera.position.y = _game.player.mesh.position.y + _game.player.cameraCoords.y;
				_three.camera.position.z = _game.player.mesh.position.z + _game.player.cameraOffsetV;

				// Place camera focus on player mesh
				_three.camera.lookAt(_game.player.mesh.position);
			},
			updateAcceleration: function(values, direction) {
				// Distinguish between acceleration/rotation and forward/right (1) and backward/left (-1)
				if (direction === 1) {
					// Forward/right
					if (_game.player[values.acceleration] > -_game.player[values.speedMax]) {
						if (_game.player[values.acceleration] >= _game.player[values.speedMax] / 2) {
							_game.player[values.acceleration] = -(_game.player[values.speedMax] / 4);
						} else {
							_game.player[values.acceleration] -= _game.player[values.speed];
						}
					} else {
						_game.player[values.acceleration] = -_game.player[values.speedMax];
					}
				} else {
					// Backward/left
					if (_game.player[values.acceleration] < _game.player[values.speedMax]) {
						if (_game.player[values.acceleration] <= -(_game.player[values.speedMax] / 2)) {
							_game.player[values.acceleration] = _game.player[values.speedMax] / 4;
						} else {
							_game.player[values.acceleration] += _game.player[values.speed];
						}
					} else {
						_game.player[values.acceleration] = _game.player[values.speedMax];
					}
				}
			},
//_____________________TO_DO_FOR_AUTOMATIC_PLAYER_ENEMIES_NEED_T0_WITE_AN_AI_FUNCTION_INSTED_OF_USER_INPUT
//__________________________________________________________________________________________________________
			processUserInput: function() {
				// Jump
				if (_events.keyboard.pressed[_game.player.controlKeys.jump]) {
					_game.player.jump();
				}

				// Movement: forward, backward, left, right
				if (_events.keyboard.pressed[_game.player.controlKeys.forward]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.position, 1);

					// Reset orientation in air
					if (!_cannon.getCollisions(_game.player.rigidBody.index)) {
						_game.player.rigidBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), _game.player.rotationRadians.z);
					}
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.backward]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.position, -1);
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.right]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.rotation, 1);
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.left]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.rotation, -1);
				}
			},
			accelerate: function() {
				// Calculate player coordinates by using current acceleration Euler radians from player's last rotation
				_game.player.playerCoords = window.game.helpers.polarToCartesian(_game.player.acceleration, _game.player.rotationRadians.z);

				// Set actual XYZ velocity by using calculated Cartesian coordinates
				_game.player.rigidBody.velocity.set(_game.player.playerCoords.x, _game.player.playerCoords.y, _game.player.rigidBody.velocity.z);

				// Damping
				if (!_events.keyboard.pressed[_game.player.controlKeys.forward] && !_events.keyboard.pressed[_game.player.controlKeys.backward]) {
					_game.player.acceleration *= _game.player.damping;
				}
			},
			rotate: function() {
				// Rotate player around Z axis
				_cannon.rotateOnAxis(_game.player.rigidBody, new CANNON.Vec3(0, 0, 1), _game.player.rotationAcceleration);

				// Damping
				if (!_events.keyboard.pressed[_game.player.controlKeys.left] && !_events.keyboard.pressed[_game.player.controlKeys.right]) {
					_game.player.rotationAcceleration *= _game.player.rotationDamping;
				}
			},
			jump: function() {
				// Perform a jump if player has collisions and the collision contact is beneath him (ground)
				if (_cannon.getCollisions(_game.player.rigidBody.index) && _game.player.isGrounded) {
					_game.player.isGrounded = false;
					_game.player.rigidBody.velocity.z = _game.player.jumpHeight;
				}
			},
			updateOrientation: function() {
				// Convert player's Quaternion to Euler radians and save them to _game.player.rotationRadians
				_game.player.rotationRadians = new THREE.Euler().setFromQuaternion(_game.player.rigidBody.quaternion);

				// Round angles
				_game.player.rotationAngleX = Math.round(window.game.helpers.radToDeg(_game.player.rotationRadians.x));
				_game.player.rotationAngleY = Math.round(window.game.helpers.radToDeg(_game.player.rotationRadians.y));

				// Prevent player from being upside-down on a slope - this needs improvement
				if ((_cannon.getCollisions(_game.player.rigidBody.index) &&
					((_game.player.rotationAngleX >= 90) ||
						(_game.player.rotationAngleX <= -90) ||
						(_game.player.rotationAngleY >= 90) ||
						(_game.player.rotationAngleY <= -90)))
					)
				{
					// Reset orientation
					_game.player.rigidBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), _game.player.rotationRadians.z);
				}
			},


//________________________NEED_NEED_NEW_CHECK_GAME_OVER_LOGIC_WHEN_EATEN____________________________________
//___________________________________________________________________________________________________
			checkGameOver: function () {
				// Example game over mechanism which resets the game if the player is falling beneath -800
				if (_game.player.mesh.position.z <= -800) {
					_game.destroy();
				}
			}
		},

//_________TODO__MAKE_AN_AUTOMATIC_PLAYER_ENEMY________________
//________________________________________________________________
		playerAutomatic: {
			// Attributes
			id: 0,
			scale: 0.5,
			// Player entity including mesh and rigid body
			model: null,
			mesh: null,
			shape: null,
			rigidBody: null,
			// Player mass which affects other rigid bodies in the world
			mass: 3,

			// HingeConstraint to limit player's air-twisting
			orientationConstraint: null,

			// Jump flags
			isGrounded: false,
			jumpHeight: 38,

			// Configuration for player speed (acceleration and maximum speed)
			speed: 1.5,
			speedMax: 45,
			// Configuration for player rotation (rotation acceleration and maximum rotation speed)
			rotationSpeed: 0.007,
			rotationSpeedMax: 0.04,
			// Rotation values
			rotationRadians: new THREE.Vector3(0, 0, 0),
			rotationAngleX: null,
			rotationAngleY: null,
			// Damping which means deceleration	(values between 0.8 and 0.98 are recommended)
			damping: 0.9,
			// Damping or easing for player rotation
			rotationDamping: 0.8,
			// Acceleration values
			acceleration: 0,
			rotationAcceleration: 0,
			//Ai Values
			turn: false,
			direcion: 0,
			canjump: 1,
			// Enum for an easier method access to acceleration/rotation
			playerAccelerationValues: {
				position: {
					acceleration: "acceleration",
					speed: "speed",
					speedMax: "speedMax"
				},
				rotation: {
					acceleration: "rotationAcceleration",
					speed: "rotationSpeed",
					speedMax: "rotationSpeedMax"
				}
			},

			// Methods
			create: function(x, y, z, s) {
				// Create a player character based on an imported 3D model that was already loaded as JSON into game.models.player

//___________________TO_DO__THIS_IS_WHERE_OUT_NEW_SHADER_GOES______________________________________________________
//_________________________________________________________________________________________________________________
				this.scale = s;
                this.color = _game.getObjectColor(this.scale, _game.player.scale);
				this.model = _three.createModel(window.game.models.player, 12, [
					new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan, shading: THREE.SmoothShading }),
					new THREE.MeshLambertMaterial({ color: this.color, shading: THREE.SmoothShading })
				]);

				// Create the shape, mesh and rigid body for the player character and assign the physics material to it
				this.shape = new CANNON.Box(this.model.halfExtents);
				this.rigidBody = new CANNON.RigidBody(this.mass, this.shape, _cannon.createPhysicsMaterial(_cannon.playerPhysicsMaterial));
				this.rigidBody.position.set(x, y, z);
				this.mesh = _cannon.addVisual(this.rigidBody, null, this.model.mesh);
                this.mesh.scale.set(s, s, s);

				// Create a HingeConstraint to limit player's air-twisting - this needs improvement
				this.orientationConstraint = new CANNON.HingeConstraint(this.rigidBody, new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(0, 0, 1), this.rigidBody, new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 0, 1));
				_cannon.world.addConstraint(this.orientationConstraint);
				this.rigidBody.parent = this;
				this.rigidBody.postStep = function() {
					// Reset player's angularVelocity to limit possible exceeding rotation and
					this.parent.rigidBody.angularVelocity.z = 0;

					// update player's orientation afterwards
					this.parent.updateOrientation();
				};

//________________TODO_EDIT_COLLIDE_FUNCTION_TO_EAT_OR_BE_EATEN
//____________________________________________________________________________________________________________________________

				// Collision event listener for the jump mechanism
				var self = this;
				this.rigidBody.addEventListener("collide", function(event) {
					var collisionValue = 3 + _game.fishes.length;

					switch(event.with.id) {
						case 0 :
                        	//self.collideFunction(event); 
                        	if(!_game.collide) {
                                _game.collide = 1;
                                _game.player.objectCollide(self);
                            }
                            break;
                    }

					// Checks if player's is on ground
					if (!self.isGrounded) {

						// Ray intersection test to check if player is colliding with an object beneath him
						self.isGrounded = (new CANNON.Ray(self.mesh.position, new CANNON.Vec3(0, 0, -1)).intersectBody(event.contact.bi).length > 0);
					}
				});
			},

			update: function() {
				// Basic game logic to update player and camera
				this.think();
				this.accelerate();
				this.rotate();

			},
			
			updateAcceleration: function(values, direction) {
				// Distinguish between acceleration/rotation and forward/right (1) and backward/left (-1)
				if (direction === 1) {
					// Forward/right
					if (this[values.acceleration] > -this[values.speedMax]) {
						if (this[values.acceleration] >= this[values.speedMax] / 2) {
							this[values.acceleration] = -(this[values.speedMax] / 4);
						} else {
							this[values.acceleration] -= this[values.speed];
						}
					} else {
						this[values.acceleration] = -this[values.speedMax];
					}
				} else {
					// Backward/left
					if (this[values.acceleration] < this[values.speedMax]) {
						if (this[values.acceleration] <= -(this[values.speedMax] / 2)) {
							this[values.acceleration] = this[values.speedMax] / 4;
						} else {
							this[values.acceleration] += this[values.speed];
						}
					} else {
						this[values.acceleration] = this[values.speedMax];
					}
				}
			},
//_____________________TO_DO_FOR_AUTOMATIC_PLAYER_ENEMIES_NEED_T0_WITE_AN_AI_FUNCTION_INSTED_OF_USER_INPUT
//__________________________________________________________________________________________________________
			think: function() {
				//calculate if player is close here
				//console.log(this);
				x = _game.player.mesh.position.x - this.mesh.position.x;
				y =  _game.player.mesh.position.y; - this.mesh.position.y;
				distance = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));

				//if far way from player
				if(!(distance < 150)){
					if(randTimeSince()){
					this.turn = !this.turn;
					this.direction = Math.random() -0.5;
					this.canjump = Math.random();
					}

					if(this.direction > 0){
						this.updateAcceleration(this.playerAccelerationValues.rotation, -1);
					}
					else if(this.direction < 0){
						this.updateAcceleration(this.playerAccelerationValues.rotation, 1);
					}
					if(!this.turn){
						this.updateAcceleration(this.playerAccelerationValues.position, 1);
					}
				
					if(this.canjump < 0.05){
						this.jump();
					}
				}
				//close to player
				else{
					myDirection = this.mesh.rotation.z ;
					

					if(x > 0 && y > 0){
						angleBetweenUs = Math.sin(y,distance);
						targetDirection = angleBetweenUs -  myDirection;

					}
					else if(x < 0 && y > 0){
						angleBetweenUs = window.game.helpers.degToRad(180)  - Math.sin(y,distance);
						targetDirection = angleBetweenUs - myDirection;

					}
					else if(x < 0 && y < 0){
						angleBetweenUs = -window.game.helpers.degToRad(180)  + Math.sin(y,distance);
						targetDirection = angleBetweenUs - myDirection;
						
					}
					else{
						angleBetweenUs = -Math.sin(y,distance);
						targetDirection = angleBetweenUs - myDirection;

					}
					// try to move away from player

					//calculate the direction away from player
					//change direction until it is close enough to the direction away
					//if close enough randomize direction away a tad bit
				}
				
			},
			accelerate: function() {
				// Calculate player coordinates by using current acceleration Euler radians from player's last rotation
				this.playerCoords = window.game.helpers.polarToCartesian(this.acceleration, this.rotationRadians.z);

				// Set actual XYZ velocity by using calculated Cartesian coordinates
				this.rigidBody.velocity.set(this.playerCoords.x, this.playerCoords.y, this.rigidBody.velocity.z);

			    this.acceleration *= this.damping;
			},
			rotate: function() {
				// Rotate player around Z axis
				_cannon.rotateOnAxis(this.rigidBody, new CANNON.Vec3(0, 0, 1), this.rotationAcceleration);
			    this.rotationAcceleration *= this.rotationDamping;
			},
			jump: function() {
				// Perform a jump if player has collisions and the collision contact is beneath him (ground)
				if (_cannon.getCollisions(this.rigidBody.index) && this.isGrounded) {
					this.isGrounded = false;
					this.rigidBody.velocity.z = this.jumpHeight;
				}
			},
			updateOrientation: function() {
				// Convert player's Quaternion to Euler radians and save them to this.rotationRadians
				this.rotationRadians = new THREE.Euler().setFromQuaternion(this.rigidBody.quaternion);

				// Round angles
				this.rotationAngleX = Math.round(window.game.helpers.radToDeg(this.rotationRadians.x));
				this.rotationAngleY = Math.round(window.game.helpers.radToDeg(this.rotationRadians.y));

				// Prevent player from being upside-down on a slope - this needs improvement
				if ((_cannon.getCollisions(this.rigidBody.index) &&
					((this.rotationAngleX >= 90) ||
						(this.rotationAngleX <= -90) ||
						(this.rotationAngleY >= 90) ||
						(this.rotationAngleY <= -90)))
					)
				{
					// Reset orientation
					this.rigidBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.rotationRadians.z);
				}
			},
		},


		level: {
			// Methods
			create: function() {
				// Create a solid material for all objects in the world
				_cannon.solidMaterial = _cannon.createPhysicsMaterial(new CANNON.Material("solidMaterial"), 0, 0.1);

				// Define floor settings
				var floorSize = 800;
				var floorHeight = 20;

				// Add a floor
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, floorSize, floorHeight)),
					mass: 0,
					position: new CANNON.Vec3(0, 0, -floorHeight),
					meshMaterial: new THREE.MeshLambertMaterial({ color: window.game.static.colors.black }),
					physicsMaterial: _cannon.solidMaterial
				});

				// Add some boxes
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, 50, 150)),
					mass: 0,
					position: new CANNON.Vec3(0, floorSize, 0),
					meshMaterial: new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan }),
					physicsMaterial: _cannon.solidMaterial
				});
				// Add some boxes
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, 50, 150)),
					mass: 0,
					position: new CANNON.Vec3(0, -floorSize, 0),
					meshMaterial: new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan }),
					physicsMaterial: _cannon.solidMaterial
				});

				// Add some boxes
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(50, floorSize, 150)),
					mass: 0,
					position: new CANNON.Vec3(floorSize, 0, 0),
					meshMaterial: new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan }),
					physicsMaterial: _cannon.solidMaterial
				});
				// Add some boxes
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(50, floorSize, 150)),
					mass: 0,
					position: new CANNON.Vec3(-floorSize, 0, 0),
					meshMaterial: new THREE.MeshLambertMaterial({ color: window.game.static.colors.cyan }),
					physicsMaterial: _cannon.solidMaterial
				});

				// Grid Helper
				var grid = new THREE.GridHelper(floorSize, floorSize / 10);
				grid.position.z = 0.5;
				grid.rotation.x = window.game.helpers.degToRad(90);
				_three.scene.add(grid);
			}
		},

		// Methods
		init: function(options) {
			// Setup necessary game components (_events, _three, _cannon, _ui)
			_game.initComponents(options);

			_game.player.create();
			
			for(var i =0; i < _game.fishQuantity; i++){
				_game.addFishKeepRatio();
			}

			_game.level.create();

			// Initiate the game loop
			_game.loop();
		},
		destroy: function() {
			// Pause animation frame loop
			window.cancelAnimationFrame(_animationFrameLoop);

			// Destroy THREE.js scene and Cannon.js world and recreate them
			_cannon.destroy();
			_cannon.setup();
			_three.destroy();
			_three.setup();

			// Recreate player and level objects by using initial values which were copied at the first start
			
			_game.player = window.game.helpers.cloneObject(_gameDefaults.player);
			_game.level = window.game.helpers.cloneObject(_gameDefaults.level);

			// Create player and level again
			_game.player.create();

			for(var i =0; i < _game.fishQuantity; i++){
				_game.addFishKeepRatio();
			}

			_game.level.create();

			// Continue with the game loop
			_game.loop();
		},
		loop: function() {
			// Assign an id to the animation frame loop
			_animationFrameLoop = window.requestAnimationFrame(_game.loop);

			// Update Cannon.js world and player state
			_cannon.updatePhysics();
			_game.player.update();

            for(var i = 0; i < _game.fishes.length; i++){
            	_game.fishes[i].update();
            }

			// Render visual scene
			_three.render();
		},
		initComponents: function (options) {
			// Reference game components one time
			_events = window.game.events();
			_three = window.game.three();
			_cannon = window.game.cannon();
			_ui = window.game.ui();

			// Setup lights for THREE.js
			_three.setupLights = function () {
				var hemiLight = new THREE.HemisphereLight(window.game.static.colors.white, window.game.static.colors.white, 0.6);
				hemiLight.position.set(0, 0, -1);
				_three.scene.add(hemiLight);

				var pointLight = new THREE.PointLight(window.game.static.colors.white, 0.5);
				pointLight.position.set(0, 0, 500);
				_three.scene.add(pointLight);
			};

			// Initialize components with options
			_three.init(options);
			_cannon.init(_three);
            //initialize the playerPhysicsMaterial
		    _cannon.playerPhysicsMaterial = new CANNON.Material("playerMaterial");
			_ui.init();
			_events.init();

			// Add specific events for key down
			_events.onKeyDown = function () {
				if (!_ui.hasClass("infoboxIntro", "fade-out")) {
					_ui.fadeOut("infoboxIntro");
				}
			};
		},

        /**
         * Derives the color of the object based off of the difference between the provided sizes.
         */
        getObjectColor : function(object_size, base_size) {
            var base_color = 0x0f0f0f;
                difference = 0;
            if(object_size > base_size) {
                //the object is bigger, and will be shaded darker
                difference = object_size - base_size;
                return base_color - (0x010101 * difference);

            } else {
                //the object is smaller, and will be shaded lighter
                difference = base_size - object_size;
                return base_color + (0x010101 * difference);
            }
        },

		edibleRatio: function(){
			var unedible = 0;
			var edible = 0;

			for (var i = 0; i < _game.fishes.length; i++){
				console.log(_game.fishes[i].scale/_game.player.scale);
				if(_game.fishes[i].scale/_game.player.scale < 1){
					edible++;
				}
				else{
					unedible++;
				}
			}
			console.log(edible);
			console.log(unedible);
			console.log(edible/(unedible + unedible));
			return edible/(unedible + unedible);
		},
		addFish: function(edible){
			console.log("adding fish");
			var size = 1;
			if(edible){
				size = Math.random() * (_game.player.scale*0.6 - _game.player.scale*0.3) + _game.player.scale*0.3;

			}
			else{
				size = Math.random()*(_game.player.scale*1.8 - _game.player.scale*0.7) + _game.player.scale*0.7;
			}
			_game.fishes[_game.fishes.length] = window.game.helpers.cloneObject(_gameDefaults.playerAutomatic);
			_game.fishes[_game.fishes.length-1].create(Math.random()*700,Math.random()*700,0, size);
			_game.fishes[_game.fishes.length - 1].id = _game.fishes.length - 1;
		},
		addFishKeepRatio: function(){
			if(_game.edibleRatio() < _game.MIN_Edible_Ratio){
				_game.addFish(true);
			}
			else{
				_game.addFish(false);
			}
		}
	};

	// Internal variables
	var _events;
	var _three;
	var _cannon;
	var _ui;
	var _animationFrameLoop;
	// Game defaults which will be set one time after first start

//__________TO_DO_INSTANCIATE_AUTOMATIC_PLAYERS
	var _gameDefaults = {
		player: window.game.helpers.cloneObject(_game.player),
		playerAutomatic: window.game.helpers.cloneObject(_game.playerAutomatic),
		level: window.game.helpers.cloneObject(_game.level)
	};

	randTimeSince = (function () {
    var lastCall = 0;
    return function () {  	
        if (new Date() - lastCall < Math.random() * (5000))
            return false;
        lastCall = new Date();
        return true;
    }
	})();

	return _game;
};
