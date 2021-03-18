/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const fetchWechat = require('fetch-wechat');
const tf = require('@tensorflow/tfjs-core');
const webgl = require('@tensorflow/tfjs-backend-webgl');
const plugin = require('./plugin/index.js');
const ENABLE_DEBUG = true;
//app.js
App({
  globalData: {
    localStorageIO: plugin.localStorageIO,
    fileStorageIO: plugin.fileStorageIO,
  },
  onLaunch: async function () {
  /*
  Note Since the latest version of WeChat’s OffscreenCanvas will become invalid when the page jumps,
  Setting tfjs in the onLaunch function of app.js will cause the applet to exit or make an operation error after the page jumps.
  It is recommended to call the configPlugin function in the onLoad of the page using tfjs.
  */
    plugin.configPlugin({
      fetchFunc: fetchWechat.fetchFunc(),
      tf,
      webgl,
      canvas: wx.createOffscreenCanvas()
    },
      ENABLE_DEBUG);

    /*
   Note that using WASM can only import the tfjs library of 2.0.0 for the time being. Because 2.0.1 version wasm has compatibility issues with WeChat.
     The GPU of low-end mobile phones is often weaker than the CPU, and WASM backend runs on the CPU, which provides another acceleration platform for low-end mobile phones.
    const info = wx.getSystemInfoSync();
    console.log(info.platform);
    if (info.platform == 'android') {
      setWasmPath(
          'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@2.0.0/wasm-out/tfjs-backend-wasm.wasm',
          true);
      await tf.setBackend('wasm');
      console.log('set wasm as backend');
    }
    */
  }
})
