import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.146.0/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'https://unpkg.com/three@0.146.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.146.0/examples/jsm/webxr/XRControllerModelFactory.js';

let container;
let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let raycaster;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

let controls, group;

init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffcccc);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    const floorGeometry = new THREE.PlaneGeometry(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xf7c4c8,
        roughness: 1.0,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = - Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(3, 6, 0);
    light.castShadow = true;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = - 2;
    light.shadow.camera.right = 2;
    light.shadow.camera.left = - 2;
    light.shadow.mapSize.set(4096, 4096);
    scene.add(light);

    group = new THREE.Object3D();
    scene.add(group);

    const paintGeometry = new THREE.BoxGeometry(1, 1, 0.0125);
    paintGeometry.antialias = true;
    const paintTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/GanyuHail/nb/main/src/weOpMin.jpg');
    const paintMaterial = new THREE.MeshBasicMaterial({ map: paintTexture });
    paintMaterial.metalness = 0;
    paintMaterial.roughness = 0.5;
    const paintMesh = new THREE.Mesh(paintGeometry, paintMaterial);
    //scene.add(paintMesh);
    paintGeometry.userData = { URL: "https://github.com/GanyuHail/nb/blob/main/src/weOpMin.jpg" };

    paintMesh.position.x = 0;
    paintMesh.position.y = 1.25;
    paintMesh.position.z = -1.1;

    paintMesh.castShadow = true;
    paintMesh.receiveShadow = true;

    group.add(paintMesh);

    const geometries = [
        //new THREE.BoxGeometry(0.2, 0.2, 0.2),
        //new THREE.ConeGeometry(0.2, 0.2, 64),
        //new THREE.CylinderGeometry(0.2, 0.2, 0.2, 64),
        new THREE.IcosahedronGeometry(0.2, 8),
        //new THREE.TorusGeometry(0.2, 0.04, 64, 32)
    ];

    for (let i = 0; i < 50; i++) {

        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xF7A8B8 * 0xF7A8B8,
            roughness: 0.7,
            metalness: 0.0
        });

        const object = new THREE.Mesh(geometry, material);

        object.position.x = Math.random() * 4 - 2;
        object.position.y = Math.random() * 2;
        object.position.z = Math.random() * 4 - 2;

        object.rotation.x = Math.random() * 2 * Math.PI;
        object.rotation.y = Math.random() * 2 * Math.PI;
        object.rotation.z = Math.random() * 2 * Math.PI;

        object.scale.setScalar(Math.random() + 0.1);

        object.castShadow = true;
        object.receiveShadow = true;

        group.add(object);
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));

    // controllers

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, - 1)]);
    const line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 5;
    line.color = 0xf7c4c8;

    controller1.add(line.clone());
    controller2.add(line.clone());

    raycaster = new THREE.Raycaster();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// obj selector

function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;
        object.material.emissive.b = 1;
        controller.attach(object);
        controller.userData.selected = object;

        const paintMesh = intersection.paintMesh;
        paintMesh.material.emissive.b = 1;
        controller.attach(paintMesh);
        controller.userData.selected = paintMesh;
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    if (controller.userData.selected !== undefined) {

        const object = controller.userData.selected;
        object.material.emissive.b = 0;
        group.attach(object);

        controller.userData.selected = undefined;
    }
}

function getIntersections(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(group.children, false);
}

function intersectObjects(controller) {

    if (controller.userData.selected !== undefined) return;
    const line = controller.getObjectByName('line');
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;

        if (object.material.emissive != undefined) {
            object.material.emissive.r = 1;
            intersected.push(object)
        }

        else {

        const paintMesh = intersection.paintMesh;
        if (paintMesh == undefined) {
            return
        }
        paintMesh.material.emissive.r = 1;
        intersected.push(paintMesh);
        }

        line.scale.z = intersection.distance;
    } else {
        line.scale.z = 5;
    }
}

function cleanIntersected() {
    while (intersected.length) {

        const object = intersected.pop();
        object.material.emissive.r = 0;

        const paintMesh = intersected.pop();
        paintMesh.material.emissive.r = 0;
        if (paintMesh == undefined) {
            return
        }

    }
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    cleanIntersected();
    intersectObjects(controller1);
    intersectObjects(controller2);
    renderer.render(scene, camera);
}