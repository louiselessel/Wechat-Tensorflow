// Re-Written for Tensorflow Body-pix
const bodyPix = require('@tensorflow-models/body-pix/dist');
require('@tensorflow/tfjs-backend-webgl');
console.log(bodyPix);

let advice = null; 
let net;
let canvas;
canvas = document.getElementById('canvasWebGL');
let img;
//img = './japan.png';
//img = new Image();
//img.src = './japan.png'; // replace with camera image, (called frame?)
//img = document.getElementById('image');
//img = getElementById('image');
console.log(img);
console.log(canvas);

// MODEL CONFIG OPTIONS
// outputStride Can be one of 8, 16, 32. 
// It specifies the output stride of the BodyPix model. The smaller the value, 
// the larger the output resolution, and more accurate the model at the cost of speed. 
// Set this to a larger value to increase speed at the cost of accuracy.
const outputStride = 16;
// The model multiplier can be one of 1.01, 1.0, 0.75, or 0.50 
// (The value is used only by the MobileNetV1 architecture and not by the ResNet architecture).
// It is the float multiplier for the depth (number of channels) for all convolution ops. 
// The larger the value, the larger the size of the layers, and more accurate the model at 
// the cost of speed. Set this to a smaller value to increase speed at the cost of accuracy.
const multiplier = 0.5;
const quantBytes = 4; // 4 is fastest
const maxPoses = 50;

let personSegmentation;
let partSegmentation;
const architecture = 'MobileNetV1'

function setStatus(text) {
  // make this actually update texts
}

async function main() {
  drawImageOnCanvas();
  await loadModelAndDrawOutput(architecture, 'segmentMultiPerson', 'maskBackground');
}

const SEGMENT_MULTI_PERSON = 'segmentMultiPerson';
const SEGMENT_MULTI_PERSON_PARTS = 'segmentMultiPersonParts';

const segmentationThreshold = 0.50;

async function loadFrame(frame) {
  img = frame;
}

async function loadModelAndDrawOutput(architecture, segmentationMethod, drawingMethod) {
  drawImageOnCanvas();
  setStatus('loading the model...');

  if (net) {
    // dispose 
    net.dispose();
  }

  net = await bodyPix.load({
    architecture,
    multiplier,
    outputStride,
    quantBytes
  });
  
  await performSegmentationAndDrawOutput(segmentationMethod, drawingMethod);

  setStatus('');
}
main();


async function performSegmentationAndDrawOutput(segmentationMethod, drawingMethod) {
  drawImageOnCanvas();
  await performSegmentation(segmentationMethod);
  drawOutput(drawingMethod);
}

async function performSegmentation(segmentationMethod) {
  setStatus('estimating segmentation...');
  if (segmentationMethod === SEGMENT_MULTI_PERSON)
    personSegmentation = await net.segmentMultiPerson(img, {
      segmentationThreshold,
      maxDetections: maxPoses
    });
  else if (segmentationMethod === SEGMENT_MULTI_PERSON_PARTS)
    partSegmentation = await net.segmentMultiPersonParts(img, {segmentationThreshold,
    maxDetections: maxPoses});
}


function drawOutput(drawingMethod) {
  setStatus('drawing results...');
  const outputFunctions = {
     maskBackground,
     maskPeople,
     drawBokehEffect,
     replaceBackground,
     drawPartSegmentation,
     drawColoredPartMap,
     maskFace,
     maskBody
  };

  outputFunction = outputFunctions[drawingMethod];
  outputFunction();
  setStatus('');
}

const flipHorizontal = false;

function maskBackground() { 
  const foreground =  {r: 0, g: 0, b: 0, a: 0} 
  const background = {r: 0, g: 0, b: 0, a: 255} 
  const mask = bodyPix.toMask(personSegmentation, foreground, background);
  
  // the opacity of the mask
  const opacity = 1;
  // how much to blur the mask edges by
  const maskBlurAmount = 3;
  // if the output should be flipped horizontally,
  
  bodyPix.drawMask(
    canvas, img, mask, opacity, maskBlurAmount,
    flipHorizontal);
}

function maskPeople() {
  const foreground =  {r: 255, g: 0, b: 255, a: 255} 
  const background = {r: 0, g: 0, b: 0, a: 0} 
  
  const mask = bodyPix.toMask(personSegmentation, foreground, background, true);
  
  // the opacity of the mask
  const opacity = 0.8;
  // how much to blur the mask edges by
  const maskBlurAmount = 1;
  
  bodyPix.drawMask(
    canvas, img, mask, opacity, maskBlurAmount,
    flipHorizontal);
}

function replaceBackground() {
  const foreground =  {r: 0, g: 0, b: 0, a: 255} 
  const background = {r: 0, g: 0, b: 0, a: 0} 
  const mask = bodyPix.toMask(personSegmentation, foreground, background);

  const sunsetImage = document.getElementById('sunset');
  
  const maskCanvas = document.getElementById('offScreen');
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  maskCanvas.getContext('2d').putImageData(mask, 0, 0);
  
  const ctx = canvas.getContext('2d');

  // draw the source image onto the canvas
  ctx.drawImage(img, 0, 0);
  // mask the image by drawing the mask onto the canvas
  // using "destination-in" compositing, which only keeps
  // the source image where the mask and the image overlap.
  ctx.globalCompositeOperation = 'destination-in';
  // blur the mask to soften the edges before drawing it 
  ctx.filter = 'blur(3px)';
  ctx.drawImage(maskCanvas, 0, 0)
  ctx.filter = '';
  // draw the background behing the masked people
  // by using "destination-over" compositing, which 
  // draws an image behind the existing image.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(sunsetImage, 0, 0);
  ctx.restore();
}

function drawColoredPartMap() {
  const coloredPartImage = bodyPix.toColoredPartMask(partSegmentation);
  const opacity = 0.7;
  const flipHorizontal = false;
  const maskBlurAmount = 0;
  // Draw the colored part image on top of the original image onto a canvas.
  // The colored part image will be drawn semi-transparent, with an opacity of
  // 0.7, allowing for the original image to be visible under.
  bodyPix.drawMask(
      canvas, img, coloredPartImage, opacity, maskBlurAmount,
      flipHorizontal);
}

function maskFace() {
  const bodyPartIds = [0, 1];
  const partColor =  {r: 255, g: 0, b: 255, a: 255} 

  maskBodyPart(bodyPartIds, partColor);
}

function maskBody() {
  const bodyPartIds = [12, 13];
  const partColor =  {r: 0, g: 255, b: 0, a: 255} 

  maskBodyPart(bodyPartIds, partColor);
}

function maskBodyPart(bodyPartIds, partColor) {
  const background = {r: 0, g: 0, b: 0, a: 0} 
  
  const mask = bodyPix.toMask(partSegmentation, partColor, background, true, bodyPartIds);
  
  // the opacity of the mask
  const opacity = 1;
  // how much to blur the mask edges by
  const maskBlurAmount = 0;
  // if the output should be flipped horizontally,
  
  bodyPix.drawMask(
    canvas, img, mask, opacity, maskBlurAmount,
    flipHorizontal);
}

function drawBokehEffect() {
   if (!personSegmentation) {
    return;
  }
  
  const backgroundBlurAmount = 4;
  const edgeBlurAmount = 3;
  const flipHorizontal = false;
  
  // draw the image with the background blurred onto the canvas. The edge between the person and blurred background is blurred by 3 pixels.
  bodyPix.drawBokehEffect(
    canvas, img, personSegmentation, backgroundBlurAmount, edgeBlurAmount, flipHorizontal);
}

function drawImageOnCanvas() {
  //canvas.width = image.width;
  //canvas.height = image.height;
  //canvas.getContext('2d').drawImage(img, 0, 0);
}

const warm = [
  [110, 64, 170], [106, 72, 183], [100, 81, 196], [92, 91, 206],
  [84, 101, 214], [75, 113, 221], [66, 125, 224], [56, 138, 226],
  [48, 150, 224], [40, 163, 220], [33, 176, 214], [29, 188, 205],
  [26, 199, 194], [26, 210, 182], [28, 219, 169], [33, 227, 155],
  [41, 234, 141], [51, 240, 128], [64, 243, 116], [79, 246, 105],
  [96, 247, 97],  [115, 246, 91], [134, 245, 88], [155, 243, 88]
];

function drawPartSegmentation() {
  if (!partSegmentation)
    return;
  
  // the colored part image is an rgb image with a corresponding color from thee rainbow colors for each part at each pixel, and black pixels where there is no part.
  const coloredPartImage = bodyPix.toColoredPartMask(partSegmentation, warm);
  const opacity = 1;
  const flipHorizontal = false;
  const maskBlurAmount = 0;
  
  const canvas = getCanvas();
  
  // draw the colored part image on top of the original image onto a canvas.  The colored part image will be drawn semi-transparent, with an opacity of 0.7, allowing for the original image to be visible under.
  bodyPix.drawMask(
    canvas, img.canvas, coloredPartImage, opacity, maskBlurAmount,
    flipHorizontal);
}

const facePartIds = [0, 1];
const torsoPartIds = [12, 13];
const armPartIds = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function blurBodyParts() {
  if (!partSegmentation) return;
  
}

function getCanvas() {
  return document.getElementsByTagName('canvas')[0];
}

module.exports = { loadModelAndDrawOutput, main };

// Body Part Ids
// | Part Id | Part Name          |
// |---------|--------------------|
// |-1       | (no body part)     |
// | 0       | leftFace           |
// | 1       | rightFace          |
// | 2       | rightUpperLegFront |
// | 3       | rightLowerLegBack  |
// | 4       | rightUpperLegBack  |
// | 5       | leftLowerLegFront  |
// | 6       | leftUpperLegFront  |
// | 7       | leftUpperLegBack   |
// | 8       | leftLowerLegBack   |
// | 9       | rightFeet          |
// | 10      | rightLowerLegFront |
// | 11      | leftFeet           |
// | 12      | torsoFront         |
// | 13      | torsoBack          |
// | 14      | rightUpperArmFront |
// | 15      | rightUpperArmBack  |
// | 16      | rightLowerArmBack  |
// | 17      | leftLowerArmFront  |
// | 18      | leftUpperArmFront  |
// | 19      | leftUpperArmBack   |
// | 20      | leftLowerArmBack   |
// | 21      | rightHand          |
// | 22      | rightLowerArmFront |
// | 23      | leftHand           |


/*

///__________________

const faceLandmarksDetection = require('@tensorflow-models/face-landmarks-detection');
const { initThree } = require('../../package_face_3d_mask/utils/modelBusiness');
require('@tensorflow/tfjs-backend-webgl');
const detectionConfidence = 0.8;
const maxFaces = 1;
var model;

async function loadModel() {
  model = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
      shouldLoadIrisModel: false,
      detectionConfidence: detectionConfidence,
      maxFaces: maxFaces,
    });
  console.log('facemesh model is loaded.');
}

async function detect(frame) {
  if (!model) {
    console.log('facemesh model has not been loaded.');
    return;
  }
  var start = new Date();
  const predictions = await model.estimateFaces({
    input: frame,
    predictIrises: false,
  });
  var end = new Date() - start;
  //console.log('detect', end, 'ms');

  return { prediction: predictions[0] };
}

module.exports = { loadModel, detect };
*/