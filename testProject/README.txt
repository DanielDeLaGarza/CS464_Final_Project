**********************************
* Jaron Shelman + Daniel De La Garza
* CS464 -- 001 Intro to Computer Graphics
* December 18th, 2015
* Final Project
**********************************

==== DISCUSSION ====

 Our project consists of one .html file located at the root of the project as final.html
  this html file is the starting point of our final project, loading up the required javascript
  files that perform the rendering.
  
 The final.html also contains a small style.css sheet. Which is responsable for making the welcome
  splash element appear over the top of the rendering area, and then fade_out once we tell it to.

 Our project is built using a couple different libraries to aid in object creation and collision
  detection. We decided to use these libraries for our little game because we didn't have to
  completely reivent the wheel to get basic game functionaly working. Instead we could focus more
  on the game logic and the physical rendering of our objects.

 The library that handles collision detection is called Cannon.js. Which comes with some example
  meshes that we used to derive the mesh we currently use for our game. We wanted to spend more time
  on our object meshes to make them look more like fish, but we decied the spaceship looking mesh
  worked pretty good. So we kept it around. Each mesh is made up of two different material sections.
  One to simulate a cockpit, which is uniformly shaded across the entire set of objects. The other is
  the body of the mesh.
  
 The body of the player object is always shaded the same, but the rest of the
  objects are shaded to some degree based on the size of the object relative to the player object at
  it's creation. The more variation an object has from the player color, the greater it's difference in
  size from the player. This color doesn't change if the player gets larger. But that is a feature we
  would like to look more into.

-- Game Logic --

 Our game is a pretty simple game with very few controls. You can move the player object, (the object
  always in the center of the screen) with the W A S D keys. You also have the option to JUMP if you
  want to by pressing the space bar.

 The goal of the game is to get as big as you possibly can. And the only way you can get bigger is by
  ramming into other objects that are smaller than you. But you have to be careful as if you run into
  an object that's much bigger than you then you'll be eaten. If you're eaten don't worry, as a new
  player object is quickly generated for you in the center of the play field.

 The play area of the game is bounded on all four sides by semi-transparent glass walls. Which keep the
  player and the other objects from launching off the sides into the infinite space.

 The other objects in the game are controlled by a fairly dumb AI structure. Future updates to the game
  might improve this AI to make them aggressive and non-agressive based off of their size and your size.


== CONCLUSION ==

 All and all we hope that you enjoy our little game and that you are able to waste many hours of time
  ramming into little spaceships.
