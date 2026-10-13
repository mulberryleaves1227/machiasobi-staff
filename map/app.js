// app.js — 会場マップ画面（Vue）
// 画面の状態（見出し・お知らせ・現在地ボタン）だけをここで持つ。
// 地図の中身は lib/venue-map.js、ピンのデータは lib/kml.js、開催回の選び方は lib/event-select.js。
// 開催回の登録は data/map_events.json に1件追加するだけ。

import { createApp } from 'https://unpkg.com/vue@3.5.43/dist/vue.esm-browser.prod.js';
import { loadCurrentEvent } from './lib/event-select.js';
import { fetchMyMap } from './lib/kml.js';
import { geoErrorMessage, geoUnavailableMessage } from './lib/geo-message.js';
import { createVenueMap } from './lib/venue-map.js';

const MYMAP_VIEWER = 'https://www.google.com/maps/d/viewer?mid=';

// MapLibre の地図は Vue のリアクティブにすると壊れるので、data ではなくここで持つ
let venueMap = null;

createApp({
  data() {
    return {
      eventLabel: '',  // 見出しの「Vol.31」部分
      mymapUrl: '#',   // 「Googleマップで開く」のリンク先
      toast: '',       // 地図の上に出すお知らせ（空なら出さない）
      locating: false, // 現在地を表示中か
    };
  },

  computed: {
    // 現在地ボタンの文言
    locateLabel() {
      return this.locating ? '📍 現在地を表示中' : '📍 現在地を取得';
    },
  },

  // 画面ができたら地図を作り、現在地が使えるか確認し、開催回のピンを読み込む
  async mounted() {
    venueMap = createVenueMap(this.$refs.map, {
      onLocateStart: () => { this.locating = true; this.toast = '現在地を取得しています…'; },
      onLocateEnd: () => { this.locating = false; },
      onLocated: () => { this.toast = ''; },
      onLocateError: code => { this.locating = false; this.toast = geoErrorMessage(code); },
    });
    this.toast = (await geoUnavailableMessage()) || '';
    this.loadEvent();
  },

  methods: {
    // 表示する開催回を決め、見出し・リンクを更新して、マイマップのピンを地図に載せる
    async loadEvent() {
      try {
        const ev = await loadCurrentEvent(queryParam('event'));
        if (!ev) return;
        this.eventLabel = ev.label;
        this.mymapUrl = MYMAP_VIEWER + encodeURIComponent(ev.mymap_id);
        document.title = `マチ★アソビ ${ev.label} 会場マップ`;
        await venueMap.showFeatures(await fetchMyMap(ev.mymap_id));
      } catch (err) {
        console.error('会場マップの読み込みに失敗', err);
      }
    },

    // 「📍 現在地を取得」ボタン：現在地の表示を開始する（表示中ならやめる）
    toggleLocate() {
      venueMap.toggleLocate();
    },
  },
}).mount('#app');
